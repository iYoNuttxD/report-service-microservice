const Report = require('../../../../domain/entities/Report')
const Period = require('../../../../domain/value-objects/Period')
const logger = require('../../../../infra/utils/logger')

class AggregateEventsUseCase {
  constructor ({ repository, aggregationStrategy, metricsCollector }) {
    this.repository = repository
    this.aggregationStrategy = aggregationStrategy
    this.metricsCollector = metricsCollector
  }

  async execute (event, subject) {
    const startTime = Date.now()

    try {
      // Check idempotency
      if (!event.id) {
        logger.warn('Event without ID received, skipping', { subject })
        return { success: false, reason: 'no_event_id' }
      }

      const alreadyProcessed = await this.repository.isEventProcessed(event.id)
      if (alreadyProcessed) {
        logger.debug('Event already processed (idempotent)', { eventId: event.id })
        this.metricsCollector.incrementCounter('events_skipped', { event_type: subject })
        return { success: true, reason: 'already_processed' }
      }

      // Determine period (default: daily)
      const eventDate = event.timestamp ? new Date(event.timestamp) : new Date()
      const period = Period.daily(eventDate)

      // Find or create report for this period
      const reportType = this._determineReportType(subject)
      let report = await this._findOrCreateReport(reportType, period)

      // Aggregate event data
      const updatedIndicators = this.aggregationStrategy.aggregate(
        subject,
        event,
        report.indicators
      )

      // Update report
      if (report.id) {
        await this.repository.updateIndicators(report.id, updatedIndicators)
      } else {
        report.indicators = updatedIndicators
        report = await this.repository.save(report)
      }

      // Mark event as processed
      await this.repository.markEventProcessed(event.id)

      // Record metrics
      this.metricsCollector.incrementCounter('events_processed', {
        event_type: subject,
        source: 'nats'
      })

      const duration = Date.now() - startTime
      this.metricsCollector.recordHistogram('aggregation_duration', duration, {
        event_type: subject
      })

      logger.info('Event aggregated successfully', {
        eventId: event.id,
        reportId: report.id,
        reportType,
        duration
      })

      return { success: true, reportId: report.id }
    } catch (error) {
      logger.error('Error aggregating event', {
        eventId: event?.id,
        subject,
        error: error.message
      })
      throw error
    }
  }

  _determineReportType (subject) {
    // Map NATS subjects to report types
    if (subject.startsWith('orders.')) return 'orders'
    if (subject.startsWith('delivery.')) return 'delivery'
    if (subject.startsWith('notification.')) return 'notifications'
    return 'general'
  }

  async _findOrCreateReport (type, period) {
    // Try to find existing report for this period
    const existing = await this.repository.findByFilters({
      type,
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      limit: 1
    })

    if (existing.data.length > 0) {
      return existing.data[0]
    }

    // Create new report
    return Report.create({
      type,
      periodStart: period.start,
      periodEnd: period.end,
      indicators: {},
      metadata: { createdBy: 'aggregator' }
    })
  }
}

module.exports = AggregateEventsUseCase

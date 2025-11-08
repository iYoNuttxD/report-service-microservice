const client = require('prom-client')
const MetricsCollectorPort = require('../../../domain/ports/MetricsCollectorPort')
const logger = require('../../utils/logger')

class MetricsCollector extends MetricsCollectorPort {
  constructor () {
    super()
    this.register = new client.Registry()

    // Set default labels
    this.register.setDefaultLabels({
      app: 'report-service'
    })

    // Collect default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register: this.register })

    // Initialize custom metrics
    this._initializeMetrics()

    logger.info('Metrics collector initialized')
  }

  _initializeMetrics () {
    // Counter for reports generated
    this.reportsGeneratedCounter = new client.Counter({
      name: 'reports_generated_total',
      help: 'Total number of reports generated',
      labelNames: ['type', 'status'],
      registers: [this.register]
    })

    // Counter for events processed
    this.eventsProcessedCounter = new client.Counter({
      name: 'events_processed_total',
      help: 'Total number of events processed',
      labelNames: ['event_type', 'source'],
      registers: [this.register]
    })

    // Counter for skipped events (idempotency)
    this.eventsSkippedCounter = new client.Counter({
      name: 'events_skipped_idempotent_total',
      help: 'Total number of events skipped due to idempotency',
      labelNames: ['event_type'],
      registers: [this.register]
    })

    // Histogram for aggregation duration
    this.aggregationDurationHistogram = new client.Histogram({
      name: 'aggregation_duration_ms',
      help: 'Duration of event aggregation in milliseconds',
      labelNames: ['event_type'],
      buckets: [10, 50, 100, 500, 1000, 5000],
      registers: [this.register]
    })

    // Gauge for active reports
    this.activeReportsGauge = new client.Gauge({
      name: 'active_reports_count',
      help: 'Number of active reports',
      labelNames: ['type'],
      registers: [this.register]
    })

    // Counter for HTTP requests
    this.httpRequestsCounter = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.register]
    })

    // Histogram for HTTP request duration
    this.httpRequestDurationHistogram = new client.Histogram({
      name: 'http_request_duration_ms',
      help: 'Duration of HTTP requests in milliseconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [10, 50, 100, 500, 1000, 5000],
      registers: [this.register]
    })
  }

  incrementCounter (name, labels = {}) {
    try {
      switch (name) {
        case 'reports_generated':
          this.reportsGeneratedCounter.inc(labels)
          break
        case 'events_processed':
          this.eventsProcessedCounter.inc(labels)
          break
        case 'events_skipped':
          this.eventsSkippedCounter.inc(labels)
          break
        case 'http_requests':
          this.httpRequestsCounter.inc(labels)
          break
        default:
          logger.warn(`Unknown counter metric: ${name}`)
      }
    } catch (error) {
      logger.error('Error incrementing counter', { name, error: error.message })
    }
  }

  recordHistogram (name, value, labels = {}) {
    try {
      switch (name) {
        case 'aggregation_duration':
          this.aggregationDurationHistogram.observe(labels, value)
          break
        case 'http_request_duration':
          this.httpRequestDurationHistogram.observe(labels, value)
          break
        default:
          logger.warn(`Unknown histogram metric: ${name}`)
      }
    } catch (error) {
      logger.error('Error recording histogram', { name, error: error.message })
    }
  }

  setGauge (name, value, labels = {}) {
    try {
      switch (name) {
        case 'active_reports':
          this.activeReportsGauge.set(labels, value)
          break
        default:
          logger.warn(`Unknown gauge metric: ${name}`)
      }
    } catch (error) {
      logger.error('Error setting gauge', { name, error: error.message })
    }
  }

  async getMetrics () {
    return this.register.metrics()
  }

  getRegister () {
    return this.register
  }
}

module.exports = MetricsCollector

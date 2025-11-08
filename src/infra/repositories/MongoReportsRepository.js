const { ObjectId } = require('mongodb')
const ReportsRepositoryPort = require('../../domain/ports/ReportsRepositoryPort')
const Report = require('../../domain/entities/Report')
const logger = require('../utils/logger')

class MongoReportsRepository extends ReportsRepositoryPort {
  constructor (db) {
    super()
    this.db = db
    this.collection = db.collection('reports')
    this.inboxCollection = db.collection('events_inbox')
  }

  async save (report) {
    try {
      const doc = {
        type: report.type,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        generatedAt: report.generatedAt,
        indicators: report.indicators,
        metadata: report.metadata,
        status: report.status
      }

      const result = await this.collection.insertOne(doc)
      report.id = result.insertedId.toString()

      logger.debug('Report saved', { reportId: report.id, type: report.type })
      return report
    } catch (error) {
      logger.error('Error saving report', { error: error.message })
      throw error
    }
  }

  async findById (id) {
    try {
      const doc = await this.collection.findOne({ _id: new ObjectId(id) })
      if (!doc) return null

      return new Report({
        id: doc._id.toString(),
        type: doc.type,
        periodStart: doc.periodStart,
        periodEnd: doc.periodEnd,
        generatedAt: doc.generatedAt,
        indicators: doc.indicators,
        metadata: doc.metadata,
        status: doc.status
      })
    } catch (error) {
      logger.error('Error finding report by id', { id, error: error.message })
      return null
    }
  }

  async findByFilters ({ type, periodStart, periodEnd, status, page = 1, limit = 10 }) {
    try {
      const filter = {}
      if (type) filter.type = type
      if (status) filter.status = status
      if (periodStart || periodEnd) {
        filter.periodStart = {}
        if (periodStart) filter.periodStart.$gte = new Date(periodStart)
        if (periodEnd) filter.periodStart.$lte = new Date(periodEnd)
      }

      const skip = (page - 1) * limit
      const [docs, total] = await Promise.all([
        this.collection
          .find(filter)
          .sort({ generatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments(filter)
      ])

      const reports = docs.map(doc => new Report({
        id: doc._id.toString(),
        type: doc.type,
        periodStart: doc.periodStart,
        periodEnd: doc.periodEnd,
        generatedAt: doc.generatedAt,
        indicators: doc.indicators,
        metadata: doc.metadata,
        status: doc.status
      }))

      return {
        data: reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      logger.error('Error finding reports by filters', { error: error.message })
      throw error
    }
  }

  async updateIndicators (reportId, indicators) {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(reportId) },
        { $set: { indicators, updatedAt: new Date() } }
      )
      logger.debug('Report indicators updated', { reportId })
    } catch (error) {
      logger.error('Error updating report indicators', { reportId, error: error.message })
      throw error
    }
  }

  async deleteById (id) {
    try {
      await this.collection.deleteOne({ _id: new ObjectId(id) })
      logger.debug('Report deleted', { reportId: id })
    } catch (error) {
      logger.error('Error deleting report', { id, error: error.message })
      throw error
    }
  }

  async getAggregatedMetrics ({ from, to }) {
    try {
      const filter = {}
      if (from || to) {
        filter.periodStart = {}
        if (from) filter.periodStart.$gte = new Date(from)
        if (to) filter.periodStart.$lte = new Date(to)
      }

      const reports = await this.collection.find(filter).toArray()

      // Aggregate metrics from all reports
      const metrics = {
        totalReports: reports.length,
        reportsByType: {},
        aggregatedIndicators: {}
      }

      reports.forEach(report => {
        // Count by type
        metrics.reportsByType[report.type] = (metrics.reportsByType[report.type] || 0) + 1

        // Aggregate indicators
        if (report.indicators) {
          Object.keys(report.indicators).forEach(key => {
            if (typeof report.indicators[key] === 'number') {
              metrics.aggregatedIndicators[key] = (metrics.aggregatedIndicators[key] || 0) + report.indicators[key]
            }
          })
        }
      })

      return metrics
    } catch (error) {
      logger.error('Error getting aggregated metrics', { error: error.message })
      throw error
    }
  }

  async markEventProcessed (eventId) {
    try {
      await this.inboxCollection.insertOne({
        eventId,
        processedAt: new Date()
      })
      return true
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key - event already processed
        return false
      }
      throw error
    }
  }

  async isEventProcessed (eventId) {
    const doc = await this.inboxCollection.findOne({ eventId })
    return !!doc
  }
}

module.exports = MongoReportsRepository

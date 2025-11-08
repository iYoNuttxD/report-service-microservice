const logger = require('../../../../infra/utils/logger')

class QueryMetricsUseCase {
  constructor ({ repository }) {
    this.repository = repository
  }

  async execute ({ from, to }) {
    try {
      logger.debug('Querying metrics', { from, to })

      const metrics = await this.repository.getAggregatedMetrics({ from, to })

      logger.info('Metrics queried successfully', {
        totalReports: metrics.totalReports
      })

      return metrics
    } catch (error) {
      logger.error('Error querying metrics', { error: error.message })
      throw error
    }
  }
}

module.exports = QueryMetricsUseCase

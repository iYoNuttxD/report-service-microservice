const logger = require('../../../../infra/utils/logger')

class QueryReportsUseCase {
  constructor ({ repository }) {
    this.repository = repository
  }

  async execute ({ type, from, to, status, page = 1, limit = 10 }) {
    try {
      logger.debug('Querying reports', { type, from, to, status, page, limit })

      const result = await this.repository.findByFilters({
        type,
        periodStart: from,
        periodEnd: to,
        status,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      })

      logger.info('Reports queried successfully', {
        type,
        count: result.data.length,
        total: result.pagination.total
      })

      return result
    } catch (error) {
      logger.error('Error querying reports', { error: error.message })
      throw error
    }
  }
}

module.exports = QueryReportsUseCase

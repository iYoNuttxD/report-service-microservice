const logger = require('../../../../infra/utils/logger')

function getReportsHandler (queryReportsUseCase) {
  return async (req, res) => {
    try {
      const { type, from, to, status, page, limit } = req.query

      const result = await queryReportsUseCase.execute({
        type,
        from,
        to,
        status,
        page: page || 1,
        limit: limit || 10
      })

      res.json({
        data: result.data.map(r => r.toJSON()),
        pagination: result.pagination
      })
    } catch (error) {
      logger.error('Error in getReportsHandler', { error: error.message })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

module.exports = getReportsHandler

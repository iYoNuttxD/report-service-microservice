const logger = require('../../../../infra/utils/logger')

function getMetricsHandler (queryMetricsUseCase) {
  return async (req, res) => {
    try {
      const { from, to } = req.query

      const metrics = await queryMetricsUseCase.execute({ from, to })

      res.json(metrics)
    } catch (error) {
      logger.error('Error in getMetricsHandler', { error: error.message })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

module.exports = getMetricsHandler

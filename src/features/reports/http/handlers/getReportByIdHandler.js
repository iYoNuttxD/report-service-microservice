const logger = require('../../../../infra/utils/logger')

function getReportByIdHandler (repository) {
  return async (req, res) => {
    try {
      const { id } = req.params

      const report = await repository.findById(id)

      if (!report) {
        return res.status(404).json({ error: 'Report not found' })
      }

      res.json(report.toJSON())
    } catch (error) {
      logger.error('Error in getReportByIdHandler', { error: error.message })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

module.exports = getReportByIdHandler

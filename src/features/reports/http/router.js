const express = require('express')
const getReportsHandler = require('./handlers/getReportsHandler')
const getReportByIdHandler = require('./handlers/getReportByIdHandler')
const getMetricsHandler = require('./handlers/getMetricsHandler')

function createReportsRouter (container) {
  const router = express.Router()

  // Pega as instâncias corretamente do container
  const queryReportsUseCase = container.get('queryReportsUseCase')
  const queryMetricsUseCase = container.get('queryMetricsUseCase')
  const repository = container.get('repository')

  // GET /api/v1/reports - List/query reports
  router.get('/', getReportsHandler(queryReportsUseCase))

  // GET /api/v1/reports/metrics - Aggregated metrics
  router.get('/metrics', getMetricsHandler(queryMetricsUseCase))

  // GET /api/v1/reports/:id - Get single report
  router.get('/:id', getReportByIdHandler(repository))

  return router
}

module.exports = createReportsRouter

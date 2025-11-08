const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const swaggerUi = require('swagger-ui-express')
const yaml = require('yaml')
const fs = require('fs')
const path = require('path')
const logger = require('../infra/utils/logger')
const createReportsRouter = require('../features/reports/http/router')

function createApp (container) {
  const app = express()

  // Security middleware
  app.use(helmet())

  // CORS
  // Note: CORS origin is configurable via environment variable
  // Set CORS_ORIGIN to specific domain(s) in production (e.g., https://your-domain.com)
  // Default '*' is for development convenience only
  const corsEnabled = process.env.CORS_ENABLED !== 'false'
  if (corsEnabled) {
    const corsOrigin = process.env.CORS_ORIGIN || '*'
    app.use(cors({ origin: corsOrigin }))
  }

  // Body parsing
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Rate limiting
  const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
  const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  const limiter = rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMaxRequests,
    message: 'Too many requests from this IP, please try again later'
  })
  app.use('/api/', limiter)

  // Request logging middleware
  app.use((req, res, next) => {
    const startTime = Date.now()

    res.on('finish', () => {
      const duration = Date.now() - startTime
      const metricsCollector = container.get('metricsCollector')

      metricsCollector.incrementCounter('http_requests', {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode
      })

      metricsCollector.recordHistogram('http_request_duration', duration, {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode
      })

      logger.info('HTTP request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration
      })
    })

    next()
  })

  // API version
  const apiVersion = process.env.API_VERSION || 'v1'

  // Health check endpoint
  app.get(`/api/${apiVersion}/health`, (req, res) => {
    const mongoConnection = container.get('mongoConnection')
    const eventSubscriber = container.get('eventSubscriber')

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoConnection.isConnected() ? 'connected' : 'disconnected',
        nats: eventSubscriber.isConnected() ? 'connected' : 'disconnected'
      }
    }

    const statusCode = health.services.mongodb === 'connected' ? 200 : 503
    res.status(statusCode).json(health)
  })

  // Metrics endpoint
  const metricsEnabled = process.env.METRICS_ENABLED !== 'false'
  if (metricsEnabled) {
    const metricsPath = process.env.METRICS_PATH || `/api/${apiVersion}/metrics`
    app.get(metricsPath, async (req, res) => {
      try {
        const metricsCollector = container.get('metricsCollector')
        const metrics = await metricsCollector.getMetrics()
        res.set('Content-Type', metricsCollector.getRegister().contentType)
        res.end(metrics)
      } catch (error) {
        logger.error('Error serving metrics', { error: error.message })
        res.status(500).json({ error: 'Error serving metrics' })
      }
    })
  }

  // Swagger/OpenAPI documentation
  // Note: OpenAPI spec is intentionally public for API documentation purposes
  // This endpoint serves a static YAML file and does not require rate limiting
  try {
    const openApiPath = path.join(__dirname, '../../openapi.yaml')
    if (fs.existsSync(openApiPath)) {
      const openApiSpec = yaml.parse(fs.readFileSync(openApiPath, 'utf8'))
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec))
      app.get('/api-docs/openapi.yaml', (req, res) => {
        res.setHeader('Content-Type', 'text/yaml')
        res.sendFile(openApiPath)
      })
      logger.info('Swagger UI available at /api-docs')
    } else {
      logger.warn('OpenAPI spec not found, Swagger UI not available')
    }
  } catch (error) {
    logger.warn('Could not load OpenAPI spec', { error: error.message })
  }

  // Authentication middleware (optional)
  const jwtAuthVerifier = container.get('jwtAuthVerifier')
  if (jwtAuthVerifier.jwtRequired) {
    app.use(`/api/${apiVersion}/reports`, jwtAuthVerifier.middleware())
  }

  // Feature routes
  app.use(`/api/${apiVersion}/reports`, createReportsRouter(container))

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Error handler
  app.use((err, req, res, _next) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path
    })
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}

module.exports = createApp

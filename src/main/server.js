require('dotenv').config()

const Container = require('./container')
const createApp = require('./app')
const setupSubscribers = require('./subscribers')
const ensureIndexes = require('../infra/db/ensureIndexes')
const logger = require('../infra/utils/logger')

async function startServer () {
  try {
    logger.info('Starting Report Service...')

    // Initialize container
    const container = new Container()
    await container.initialize()

    // Ensure MongoDB indexes
    const db = container.get('db')
    await ensureIndexes(db)

    // Setup NATS subscribers
    try {
      await setupSubscribers(container)
    } catch (error) {
      logger.warn('Could not setup NATS subscribers, continuing without them', {
        error: error.message
      })
    }

    // Create and start Express app
    const app = createApp(container)
    const port = process.env.PORT || 3010

    const server = app.listen(port, () => {
      logger.info(`Report Service listening on port ${port}`, {
        env: process.env.NODE_ENV || 'development',
        port
      })
    })

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, starting graceful shutdown`)

      server.close(() => {
        logger.info('HTTP server closed')
      })

      try {
        await container.close()
        logger.info('Graceful shutdown completed')
        process.exit(0)
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message })
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    // Unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise })
    })

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack })
      process.exit(1)
    })
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack })
    process.exit(1)
  }
}

// Start the server
startServer()

const { connect, StringCodec } = require('nats')
const EventSubscriberPort = require('../../../domain/ports/EventSubscriberPort')
const logger = require('../../utils/logger')

class NatsEventSubscriber extends EventSubscriberPort {
  constructor () {
    super()
    this.connection = null
    this.subscriptions = []
    this.sc = StringCodec()
  }

  async connect () {
    try {
      const natsUrl = process.env.NATS_URL || 'nats://localhost:4222'
      const reconnectEnabled = process.env.NATS_RECONNECT_ENABLED !== 'false'
      const maxReconnectAttempts = parseInt(process.env.NATS_MAX_RECONNECT_ATTEMPTS || '10', 10)

      logger.info('Connecting to NATS', { url: natsUrl })

      this.connection = await connect({
        servers: natsUrl,
        reconnect: reconnectEnabled,
        maxReconnectAttempts,
        waitOnFirstConnect: true
      })

      logger.info('NATS connected successfully')

      // Handle connection events
      this._setupConnectionHandlers()

      return this.connection
    } catch (error) {
      logger.error('NATS connection error', { error: error.message })
      throw error
    }
  }

  _setupConnectionHandlers () {
    if (!this.connection) return

    ;(async () => {
      for await (const status of this.connection.status()) {
        logger.info(`NATS connection status: ${status.type}`, {
          data: status.data
        })
      }
    })().catch(err => {
      logger.error('Error in NATS status handler', { error: err.message })
    })
  }

  async subscribe (subjects, handler) {
    if (!this.connection) {
      throw new Error('NATS not connected. Call connect() first.')
    }

    try {
      const subjectsArray = Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim())
      const queueGroup = process.env.NATS_QUEUE_GROUP || 'report-service'

      logger.info('Subscribing to NATS subjects', { subjects: subjectsArray, queueGroup })

      for (const subject of subjectsArray) {
        const sub = this.connection.subscribe(subject, { queue: queueGroup })
        this.subscriptions.push(sub)

        ;(async () => {
          for await (const msg of sub) {
            try {
              const data = this.sc.decode(msg.data)
              const event = JSON.parse(data)

              logger.debug('Received NATS message', { subject: msg.subject, eventId: event.id })

              await handler(event, msg.subject)
            } catch (error) {
              logger.error('Error processing NATS message', {
                subject: msg.subject,
                error: error.message
              })
            }
          }
        })().catch(err => {
          logger.error('Error in NATS subscription handler', { subject, error: err.message })
        })

        logger.info(`Subscribed to subject: ${subject}`)
      }
    } catch (error) {
      logger.error('Error subscribing to NATS', { error: error.message })
      throw error
    }
  }

  async unsubscribe () {
    for (const sub of this.subscriptions) {
      await sub.unsubscribe()
    }
    this.subscriptions = []
    logger.info('Unsubscribed from all NATS subjects')
  }

  async close () {
    try {
      await this.unsubscribe()
      if (this.connection) {
        await this.connection.close()
        logger.info('NATS connection closed')
      }
    } catch (error) {
      logger.error('Error closing NATS connection', { error: error.message })
      throw error
    }
  }

  isConnected () {
    return this.connection && !this.connection.isClosed()
  }
}

module.exports = NatsEventSubscriber

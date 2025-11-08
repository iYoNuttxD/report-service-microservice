const logger = require('../infra/utils/logger')

async function setupSubscribers (container) {
  try {
    const eventSubscriber = container.get('eventSubscriber')
    const aggregateEventsUseCase = container.get('aggregateEventsUseCase')

    // Connect to NATS
    await eventSubscriber.connect()

    // Get subjects from environment
    const subjects = process.env.NATS_SUBJECTS || 'orders.created,orders.updated,delivery.completed,notification.sent'

    // Subscribe to events
    await eventSubscriber.subscribe(subjects, async (event, subject) => {
      try {
        await aggregateEventsUseCase.execute(event, subject)
      } catch (error) {
        logger.error('Error handling event in subscriber', {
          eventId: event?.id,
          subject,
          error: error.message
        })
      }
    })

    logger.info('Event subscribers setup successfully')
  } catch (error) {
    logger.error('Error setting up subscribers', { error: error.message })
    throw error
  }
}

module.exports = setupSubscribers

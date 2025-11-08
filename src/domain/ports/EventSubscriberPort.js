/**
 * Port for NATS event subscription
 */
class EventSubscriberPort {
  async subscribe (_subjects, _handler) {
    throw new Error('Method not implemented')
  }

  async unsubscribe () {
    throw new Error('Method not implemented')
  }

  async close () {
    throw new Error('Method not implemented')
  }
}

module.exports = EventSubscriberPort

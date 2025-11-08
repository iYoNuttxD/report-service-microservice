/**
 * Strategy pattern for different aggregation types
 */
class AggregationStrategy {
  constructor () {
    this.strategies = {}
  }

  register (eventType, aggregateFn) {
    this.strategies[eventType] = aggregateFn
  }

  aggregate (eventType, event, currentIndicators) {
    const strategy = this.strategies[eventType]
    if (!strategy) {
      // Default: count events
      return {
        ...currentIndicators,
        totalEvents: (currentIndicators.totalEvents || 0) + 1,
        eventCounts: {
          ...(currentIndicators.eventCounts || {}),
          [eventType]: ((currentIndicators.eventCounts || {})[eventType] || 0) + 1
        }
      }
    }
    return strategy(event, currentIndicators)
  }

  hasStrategy (eventType) {
    return !!this.strategies[eventType]
  }
}

module.exports = AggregationStrategy

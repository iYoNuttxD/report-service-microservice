// Infrastructure
const MongoConnection = require('../infra/db/connection')
const MongoReportsRepository = require('../infra/repositories/MongoReportsRepository')
const NatsEventSubscriber = require('../infra/adapters/nats/NatsEventSubscriber')
const AuthPolicyClient = require('../infra/adapters/opa/AuthPolicyClient')
const JwtAuthVerifier = require('../infra/adapters/auth/JwtAuthVerifier')
const MetricsCollector = require('../infra/adapters/metrics/MetricsCollector')

// Domain
const AggregationStrategy = require('../domain/services/AggregationStrategy')

// Use Cases
const AggregateEventsUseCase = require('../features/reports/application/use-cases/AggregateEventsUseCase')
const QueryReportsUseCase = require('../features/reports/application/use-cases/QueryReportsUseCase')
const QueryMetricsUseCase = require('../features/reports/application/use-cases/QueryMetricsUseCase')

const logger = require('../infra/utils/logger')

class Container {
  constructor () {
    this.instances = {}
  }

  async initialize () {
    try {
      logger.info('Initializing dependency injection container')

      // Initialize database
      const db = await MongoConnection.connect()
      this.instances.db = db
      this.instances.mongoConnection = MongoConnection

      // Initialize repository
      this.instances.repository = new MongoReportsRepository(db)

      // Initialize adapters
      this.instances.metricsCollector = new MetricsCollector()
      this.instances.authPolicyClient = new AuthPolicyClient()
      this.instances.jwtAuthVerifier = new JwtAuthVerifier()
      this.instances.eventSubscriber = new NatsEventSubscriber()

      // Initialize domain services
      this.instances.aggregationStrategy = new AggregationStrategy()
      this._registerAggregationStrategies()

      // Initialize use cases
      this.instances.aggregateEventsUseCase = new AggregateEventsUseCase({
        repository: this.instances.repository,
        aggregationStrategy: this.instances.aggregationStrategy,
        metricsCollector: this.instances.metricsCollector
      })

      this.instances.queryReportsUseCase = new QueryReportsUseCase({
        repository: this.instances.repository
      })

      this.instances.queryMetricsUseCase = new QueryMetricsUseCase({
        repository: this.instances.repository
      })

      logger.info('Container initialized successfully')
    } catch (error) {
      logger.error('Error initializing container', { error: error.message })
      throw error
    }
  }

  _registerAggregationStrategies () {
    const strategy = this.instances.aggregationStrategy

    // Register custom aggregation strategies for different event types
    strategy.register('orders.created', (event, indicators) => {
      return {
        ...indicators,
        totalOrders: (indicators.totalOrders || 0) + 1,
        ordersCreated: (indicators.ordersCreated || 0) + 1,
        totalOrderValue: (indicators.totalOrderValue || 0) + (event.data?.total || 0)
      }
    })

    strategy.register('orders.updated', (event, indicators) => {
      return {
        ...indicators,
        totalOrders: (indicators.totalOrders || 0) + 1,
        ordersUpdated: (indicators.ordersUpdated || 0) + 1
      }
    })

    strategy.register('delivery.completed', (event, indicators) => {
      return {
        ...indicators,
        deliveriesCompleted: (indicators.deliveriesCompleted || 0) + 1,
        totalDeliveryTime: (indicators.totalDeliveryTime || 0) + (event.data?.duration || 0)
      }
    })

    strategy.register('notification.sent', (event, indicators) => {
      return {
        ...indicators,
        notificationsSent: (indicators.notificationsSent || 0) + 1,
        notificationsByType: {
          ...(indicators.notificationsByType || {}),
          [event.data?.type || 'unknown']: ((indicators.notificationsByType || {})[event.data?.type || 'unknown'] || 0) + 1
        }
      }
    })

    logger.info('Aggregation strategies registered')
  }

  get (name) {
    if (!this.instances[name]) {
      throw new Error(`Instance '${name}' not found in container`)
    }
    return this.instances[name]
  }

  async close () {
    logger.info('Closing container dependencies')

    if (this.instances.eventSubscriber) {
      await this.instances.eventSubscriber.close()
    }

    if (this.instances.mongoConnection) {
      await this.instances.mongoConnection.disconnect()
    }

    logger.info('Container closed')
  }
}

module.exports = Container

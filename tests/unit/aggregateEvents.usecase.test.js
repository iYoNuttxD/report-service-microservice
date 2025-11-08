const AggregateEventsUseCase = require('../../src/features/reports/application/use-cases/AggregateEventsUseCase')
const Report = require('../../src/domain/entities/Report')

describe('AggregateEventsUseCase', () => {
  let useCase
  let mockRepository
  let mockAggregationStrategy
  let mockMetricsCollector

  beforeEach(() => {
    mockRepository = {
      isEventProcessed: jest.fn(),
      markEventProcessed: jest.fn(),
      findByFilters: jest.fn(),
      save: jest.fn(),
      updateIndicators: jest.fn()
    }

    mockAggregationStrategy = {
      aggregate: jest.fn()
    }

    mockMetricsCollector = {
      incrementCounter: jest.fn(),
      recordHistogram: jest.fn()
    }

    useCase = new AggregateEventsUseCase({
      repository: mockRepository,
      aggregationStrategy: mockAggregationStrategy,
      metricsCollector: mockMetricsCollector
    })
  })

  describe('execute', () => {
    it('should skip event without ID', async () => {
      const event = { data: 'test' }

      const result = await useCase.execute(event, 'test.subject')

      expect(result.success).toBe(false)
      expect(result.reason).toBe('no_event_id')
      expect(mockRepository.isEventProcessed).not.toHaveBeenCalled()
    })

    it('should skip already processed event (idempotency)', async () => {
      const event = { id: 'event-123', data: 'test' }
      mockRepository.isEventProcessed.mockResolvedValue(true)

      const result = await useCase.execute(event, 'test.subject')

      expect(result.success).toBe(true)
      expect(result.reason).toBe('already_processed')
      expect(mockRepository.isEventProcessed).toHaveBeenCalledWith('event-123')
      expect(mockMetricsCollector.incrementCounter).toHaveBeenCalledWith('events_skipped', {
        event_type: 'test.subject'
      })
    })

    it('should aggregate new event successfully', async () => {
      const event = {
        id: 'event-123',
        timestamp: '2023-11-08T12:00:00.000Z',
        data: { total: 100 }
      }

      mockRepository.isEventProcessed.mockResolvedValue(false)
      mockRepository.findByFilters.mockResolvedValue({
        data: [],
        pagination: { total: 0 }
      })

      const savedReport = new Report({
        id: 'report-123',
        type: 'orders',
        periodStart: new Date('2023-11-08T00:00:00.000Z'),
        periodEnd: new Date('2023-11-08T23:59:59.999Z'),
        indicators: { totalOrders: 1 }
      })
      mockRepository.save.mockResolvedValue(savedReport)

      mockAggregationStrategy.aggregate.mockReturnValue({
        totalOrders: 1
      })

      const result = await useCase.execute(event, 'orders.created')

      expect(result.success).toBe(true)
      expect(result.reportId).toBe('report-123')
      expect(mockRepository.save).toHaveBeenCalled()
      expect(mockRepository.markEventProcessed).toHaveBeenCalledWith('event-123')
      expect(mockMetricsCollector.incrementCounter).toHaveBeenCalledWith('events_processed', {
        event_type: 'orders.created',
        source: 'nats'
      })
    })

    it('should update existing report indicators', async () => {
      const event = {
        id: 'event-456',
        timestamp: '2023-11-08T12:00:00.000Z',
        data: { total: 100 }
      }

      const existingReport = new Report({
        id: 'report-123',
        type: 'orders',
        periodStart: new Date('2023-11-08T00:00:00.000Z'),
        periodEnd: new Date('2023-11-08T23:59:59.999Z'),
        indicators: { totalOrders: 5 }
      })

      mockRepository.isEventProcessed.mockResolvedValue(false)
      mockRepository.findByFilters.mockResolvedValue({
        data: [existingReport],
        pagination: { total: 1 }
      })

      mockAggregationStrategy.aggregate.mockReturnValue({
        totalOrders: 6
      })

      const result = await useCase.execute(event, 'orders.created')

      expect(result.success).toBe(true)
      expect(mockRepository.updateIndicators).toHaveBeenCalledWith('report-123', {
        totalOrders: 6
      })
      expect(mockRepository.markEventProcessed).toHaveBeenCalledWith('event-456')
    })
  })

  describe('_determineReportType', () => {
    it('should map subjects to report types correctly', () => {
      expect(useCase._determineReportType('orders.created')).toBe('orders')
      expect(useCase._determineReportType('orders.updated')).toBe('orders')
      expect(useCase._determineReportType('delivery.completed')).toBe('delivery')
      expect(useCase._determineReportType('notification.sent')).toBe('notifications')
      expect(useCase._determineReportType('unknown.event')).toBe('general')
    })
  })
})

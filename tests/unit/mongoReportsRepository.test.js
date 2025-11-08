const MongoReportsRepository = require('../../src/infra/repositories/MongoReportsRepository')
const Report = require('../../src/domain/entities/Report')

describe('MongoReportsRepository', () => {
  let repository
  let mockDb
  let mockCollection
  let mockInboxCollection

  beforeEach(() => {
    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn()
    }

    mockInboxCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn()
    }

    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'events_inbox') return mockInboxCollection
        return mockCollection
      })
    }

    repository = new MongoReportsRepository(mockDb)
  })

  describe('save', () => {
    it('should save a report and return it with id', async () => {
      const report = Report.create({
        type: 'orders',
        periodStart: '2023-11-08T00:00:00.000Z',
        periodEnd: '2023-11-08T23:59:59.999Z',
        indicators: { totalOrders: 10 }
      })

      mockCollection.insertOne.mockResolvedValue({
        insertedId: { toString: () => 'mock-id-123' }
      })

      const savedReport = await repository.save(report)

      expect(savedReport.id).toBe('mock-id-123')
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'orders',
          indicators: { totalOrders: 10 }
        })
      )
    })
  })

  describe('findById', () => {
    it('should find report by id', async () => {
      const mockId = '507f1f77bcf86cd799439011' // Valid 24-char hex string
      const mockDoc = {
        _id: { toString: () => mockId },
        type: 'orders',
        periodStart: new Date('2023-11-08T00:00:00.000Z'),
        periodEnd: new Date('2023-11-08T23:59:59.999Z'),
        generatedAt: new Date(),
        indicators: { totalOrders: 10 },
        metadata: {},
        status: 'generated'
      }

      mockCollection.findOne.mockResolvedValue(mockDoc)

      const report = await repository.findById(mockId)

      expect(report).toBeInstanceOf(Report)
      expect(report.id).toBe(mockId)
      expect(report.type).toBe('orders')
    })

    it('should return null if report not found', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      const report = await repository.findById('507f1f77bcf86cd799439012')

      expect(report).toBeNull()
    })
  })

  describe('markEventProcessed', () => {
    it('should mark event as processed', async () => {
      mockInboxCollection.insertOne.mockResolvedValue({ insertedId: 'inbox-id' })

      const result = await repository.markEventProcessed('event-123')

      expect(result).toBe(true)
      expect(mockInboxCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'event-123'
        })
      )
    })

    it('should return false for duplicate event', async () => {
      mockInboxCollection.insertOne.mockRejectedValue({ code: 11000 })

      const result = await repository.markEventProcessed('event-123')

      expect(result).toBe(false)
    })
  })

  describe('isEventProcessed', () => {
    it('should return true if event exists', async () => {
      mockInboxCollection.findOne.mockResolvedValue({ eventId: 'event-123' })

      const result = await repository.isEventProcessed('event-123')

      expect(result).toBe(true)
    })

    it('should return false if event does not exist', async () => {
      mockInboxCollection.findOne.mockResolvedValue(null)

      const result = await repository.isEventProcessed('event-123')

      expect(result).toBe(false)
    })
  })
})

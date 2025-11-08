const QueryReportsUseCase = require('../../src/features/reports/application/use-cases/QueryReportsUseCase')

describe('QueryReportsUseCase', () => {
  let useCase
  let mockRepository

  beforeEach(() => {
    mockRepository = {
      findByFilters: jest.fn()
    }

    useCase = new QueryReportsUseCase({
      repository: mockRepository
    })
  })

  describe('execute', () => {
    it('should query reports with filters', async () => {
      const mockResult = {
        data: [
          {
            id: 'report-1',
            type: 'orders',
            indicators: { totalOrders: 10 }
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1
        }
      }

      mockRepository.findByFilters.mockResolvedValue(mockResult)

      const result = await useCase.execute({
        type: 'orders',
        from: '2023-11-01',
        to: '2023-11-08',
        page: 1,
        limit: 10
      })

      expect(result).toEqual(mockResult)
      expect(mockRepository.findByFilters).toHaveBeenCalledWith({
        type: 'orders',
        periodStart: '2023-11-01',
        periodEnd: '2023-11-08',
        status: undefined,
        page: 1,
        limit: 10
      })
    })

    it('should use default pagination values', async () => {
      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      }

      mockRepository.findByFilters.mockResolvedValue(mockResult)

      await useCase.execute({})

      expect(mockRepository.findByFilters).toHaveBeenCalledWith({
        type: undefined,
        periodStart: undefined,
        periodEnd: undefined,
        status: undefined,
        page: 1,
        limit: 10
      })
    })

    it('should handle repository errors', async () => {
      mockRepository.findByFilters.mockRejectedValue(new Error('Database error'))

      await expect(useCase.execute({})).rejects.toThrow('Database error')
    })
  })
})

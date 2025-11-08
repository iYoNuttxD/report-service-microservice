/**
 * Repository port for Reports persistence
 */
class ReportsRepositoryPort {
  async save (_report) {
    throw new Error('Method not implemented')
  }

  async findById (_id) {
    throw new Error('Method not implemented')
  }

  async findByFilters ({ type: _type, periodStart: _periodStart, periodEnd: _periodEnd, status: _status, page: _page, limit: _limit }) {
    throw new Error('Method not implemented')
  }

  async updateIndicators (_reportId, _indicators) {
    throw new Error('Method not implemented')
  }

  async deleteById (_id) {
    throw new Error('Method not implemented')
  }

  async getAggregatedMetrics ({ from: _from, to: _to }) {
    throw new Error('Method not implemented')
  }
}

module.exports = ReportsRepositoryPort

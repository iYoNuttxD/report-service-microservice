class Report {
  constructor ({ id, type, periodStart, periodEnd, generatedAt, indicators, metadata, status }) {
    this.id = id
    this.type = type
    this.periodStart = periodStart
    this.periodEnd = periodEnd
    this.generatedAt = generatedAt || new Date()
    this.indicators = indicators || {}
    this.metadata = metadata || {}
    this.status = status || 'generated'
  }

  static create ({ type, periodStart, periodEnd, indicators, metadata }) {
    if (!type) {
      throw new Error('Report type is required')
    }
    if (!periodStart || !periodEnd) {
      throw new Error('Period start and end dates are required')
    }
    if (new Date(periodStart) > new Date(periodEnd)) {
      throw new Error('Period start must be before period end')
    }

    return new Report({
      type,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      generatedAt: new Date(),
      indicators: indicators || {},
      metadata: metadata || {},
      status: 'generated'
    })
  }

  toJSON () {
    return {
      id: this.id,
      type: this.type,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      generatedAt: this.generatedAt,
      indicators: this.indicators,
      metadata: this.metadata,
      status: this.status
    }
  }
}

module.exports = Report

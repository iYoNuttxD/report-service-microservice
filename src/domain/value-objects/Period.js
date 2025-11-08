class Period {
  constructor (start, end) {
    if (!start || !end) {
      throw new Error('Period start and end are required')
    }

    this.start = new Date(start)
    this.end = new Date(end)

    if (this.start > this.end) {
      throw new Error('Period start must be before end')
    }
  }

  static fromDates (start, end) {
    return new Period(start, end)
  }

  static daily (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    return new Period(start, end)
  }

  static hourly (date) {
    const start = new Date(date)
    start.setMinutes(0, 0, 0)
    const end = new Date(date)
    end.setMinutes(59, 59, 999)
    return new Period(start, end)
  }

  contains (date) {
    const checkDate = new Date(date)
    return checkDate >= this.start && checkDate <= this.end
  }

  overlaps (otherPeriod) {
    return this.start <= otherPeriod.end && this.end >= otherPeriod.start
  }

  toJSON () {
    return {
      start: this.start.toISOString(),
      end: this.end.toISOString()
    }
  }
}

module.exports = Period

/**
 * Port for metrics collection (Prometheus)
 */
class MetricsCollectorPort {
  incrementCounter (_name, _labels) {
    throw new Error('Method not implemented')
  }

  recordHistogram (_name, _value, _labels) {
    throw new Error('Method not implemented')
  }

  setGauge (_name, _value, _labels) {
    throw new Error('Method not implemented')
  }

  getMetrics () {
    throw new Error('Method not implemented')
  }
}

module.exports = MetricsCollectorPort

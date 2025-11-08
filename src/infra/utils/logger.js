const winston = require('winston')

const logLevel = process.env.LOG_LEVEL || 'info'

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'report-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, correlationId, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : ''
          const corrId = correlationId ? `[${correlationId}]` : ''
          return `${timestamp} [${service}] ${level}: ${corrId} ${message} ${metaStr}`
        })
      )
    })
  ]
})

// Mask sensitive data
const maskSensitiveData = (data) => {
  if (!data || typeof data !== 'object') return data

  const masked = { ...data }
  const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apiKey']

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***MASKED***'
    }
  }

  return masked
}

logger.info = (message, meta = {}) => {
  logger.log('info', message, maskSensitiveData(meta))
}

logger.error = (message, meta = {}) => {
  logger.log('error', message, maskSensitiveData(meta))
}

logger.warn = (message, meta = {}) => {
  logger.log('warn', message, maskSensitiveData(meta))
}

logger.debug = (message, meta = {}) => {
  logger.log('debug', message, maskSensitiveData(meta))
}

module.exports = logger

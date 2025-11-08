const { MongoClient } = require('mongodb')
const logger = require('../utils/logger')

class MongoConnection {
  constructor () {
    this.client = null
    this.db = null
  }

  async connect () {
    try {
      const uri = process.env.REPORTS_MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017'
      const dbName = process.env.REPORTS_MONGO_DB_NAME || 'reports_db'

      logger.info('Connecting to MongoDB', { uri: uri.replace(/\/\/.*@/, '//***@'), dbName })

      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      })

      await this.client.connect()
      this.db = this.client.db(dbName)

      logger.info('MongoDB connected successfully', { dbName })

      return this.db
    } catch (error) {
      logger.error('MongoDB connection error', { error: error.message })
      throw error
    }
  }

  async disconnect () {
    if (this.client) {
      await this.client.close()
      logger.info('MongoDB disconnected')
    }
  }

  getDb () {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.db
  }

  isConnected () {
    return this.client && this.client.topology && this.client.topology.isConnected()
  }
}

module.exports = new MongoConnection()

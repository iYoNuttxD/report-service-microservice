const logger = require('../utils/logger')

async function safeCreateIndex (collection, keys, options) {
  try {
    await collection.createIndex(keys, options)
  } catch (error) {
    const msg = String(error.message || '')

    // Se o índice equivalente já existe com outro nome/opções, só loga e segue
    if (
      msg.includes('Index already exists with a different name') ||
      error.codeName === 'IndexOptionsConflict'
    ) {
      logger.warn('Index already exists, skipping creation', {
        collection: collection.collectionName,
        keys,
        options,
        error: msg
      })
      return
    }

    // Qualquer outro erro ainda deve quebrar pra não mascarar problema real
    throw error
  }
}

/**
 * Ensure MongoDB indexes for reports collection
 */
async function ensureIndexes (db) {
  try {
    const reportsCollection = db.collection('reports')
    const eventsInboxCollection = db.collection('events_inbox')

    // Index for querying reports by type and period
    await safeCreateIndex(
      reportsCollection,
      { type: 1, periodStart: 1, periodEnd: 1 },
      { name: 'reports_type_period_idx' }
    )

    // Index for querying by status
    await safeCreateIndex(
      reportsCollection,
      { status: 1, generatedAt: -1 },
      { name: 'reports_status_generated_idx' }
    )

    // TTL index for retention policy (if RETENTION_DAYS is set)
    const retentionDays = parseInt(process.env.RETENTION_DAYS || '0', 10)
    if (retentionDays > 0) {
      await safeCreateIndex(
        reportsCollection,
        { generatedAt: 1 },
        {
          name: 'reports_ttl_idx',
          expireAfterSeconds: retentionDays * 24 * 60 * 60
        }
      )
      logger.info(`Created TTL index for reports with ${retentionDays} days retention`)
    }

    // Index for events inbox idempotency
    await safeCreateIndex(
      eventsInboxCollection,
      { eventId: 1 },
      { name: 'events_inbox_eventid_idx', unique: true }
    )

    // TTL index for events inbox
    const inboxTTLDays = parseInt(process.env.EVENT_INBOX_TTL_DAYS || '30', 10)
    await safeCreateIndex(
      eventsInboxCollection,
      { processedAt: 1 },
      {
        name: 'events_inbox_ttl_idx',
        expireAfterSeconds: inboxTTLDays * 24 * 60 * 60
      }
    )

    logger.info('MongoDB indexes created successfully')
  } catch (error) {
    logger.error('Error creating MongoDB indexes', { error: error.message })
    throw error
  }
}

module.exports = ensureIndexes

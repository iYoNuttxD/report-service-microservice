const axios = require('axios')
const AuthPolicyClientPort = require('../../../domain/ports/AuthPolicyClientPort')
const logger = require('../../utils/logger')

class AuthPolicyClient extends AuthPolicyClientPort {
  constructor () {
    super()
    this.opaUrl = process.env.OPA_URL || 'http://localhost:8181'
    this.policyPath = process.env.OPA_POLICY_PATH || '/v1/data/reports/allow'
    this.failOpen = process.env.OPA_FAIL_OPEN !== 'false'
    this.timeout = parseInt(process.env.OPA_TIMEOUT_MS || '3000', 10)
  }

  async authorize ({ user, action, resource }) {
    try {
      const input = {
        user: user || {},
        action,
        resource
      }

      logger.debug('OPA authorization request', { action, resource, userId: user?.id })

      const response = await axios.post(
        `${this.opaUrl}${this.policyPath}`,
        { input },
        {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const allowed = response.data?.result === true

      logger.debug('OPA authorization result', { allowed, action, resource })

      return allowed
    } catch (error) {
      logger.error('OPA authorization error', {
        error: error.message,
        action,
        resource,
        failOpen: this.failOpen
      })

      // Fail open/closed based on configuration
      if (this.failOpen) {
        logger.warn('OPA error - failing open (allowing request)')
        return true
      } else {
        logger.warn('OPA error - failing closed (denying request)')
        return false
      }
    }
  }

  isEnabled () {
    return !!process.env.OPA_URL
  }
}

module.exports = AuthPolicyClient

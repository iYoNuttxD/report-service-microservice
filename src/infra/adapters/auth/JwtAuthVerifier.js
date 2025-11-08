const jwt = require('jsonwebtoken')
const jwksClient = require('jwks-rsa')
const logger = require('../../utils/logger')

class JwtAuthVerifier {
  constructor () {
    this.jwtRequired = process.env.AUTH_JWT_REQUIRED === 'true'
    this.issuer = process.env.AUTH_JWT_ISSUER
    this.audience = process.env.AUTH_JWT_AUDIENCE
    this.jwksUri = process.env.AUTH_JWKS_URI
    this.secret = process.env.AUTH_JWT_SECRET

    if (this.jwksUri) {
      this.jwksClient = jwksClient({
        jwksUri: this.jwksUri,
        cache: true,
        cacheMaxAge: 600000 // 10 minutes
      })
    }
  }

  async verify (token) {
    if (!this.jwtRequired) {
      logger.debug('JWT verification disabled')
      return { verified: true, payload: null }
    }

    if (!token) {
      return { verified: false, error: 'No token provided' }
    }

    try {
      // Remove Bearer prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '')

      let decoded
      if (this.jwksUri) {
        // Use JWKS
        decoded = await this._verifyWithJwks(cleanToken)
      } else if (this.secret) {
        // Use secret (dev only)
        decoded = jwt.verify(cleanToken, this.secret, {
          issuer: this.issuer,
          audience: this.audience
        })
      } else {
        throw new Error('No JWT verification method configured')
      }

      logger.debug('JWT verified successfully', { userId: decoded.sub })

      return {
        verified: true,
        payload: decoded
      }
    } catch (error) {
      logger.error('JWT verification failed', { error: error.message })
      return {
        verified: false,
        error: error.message
      }
    }
  }

  async _verifyWithJwks (token) {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          this.jwksClient.getSigningKey(header.kid, (err, key) => {
            if (err) {
              return callback(err)
            }
            const signingKey = key.publicKey || key.rsaPublicKey
            callback(null, signingKey)
          })
        },
        {
          issuer: this.issuer,
          audience: this.audience,
          algorithms: ['RS256']
        },
        (err, decoded) => {
          if (err) {
            return reject(err)
          }
          resolve(decoded)
        }
      )
    })
  }

  extractUser (payload) {
    if (!payload) return null

    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || []
    }
  }

  middleware () {
    return async (req, res, next) => {
      const token = req.headers.authorization

      const result = await this.verify(token)

      if (!result.verified && this.jwtRequired) {
        return res.status(401).json({ error: 'Unauthorized', message: result.error })
      }

      if (result.verified) {
        req.user = this.extractUser(result.payload)
      }

      next()
    }
  }
}

module.exports = JwtAuthVerifier

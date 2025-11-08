/**
 * Port for OPA-based authorization
 */
class AuthPolicyClientPort {
  async authorize ({ user: _user, action: _action, resource: _resource }) {
    throw new Error('Method not implemented')
  }
}

module.exports = AuthPolicyClientPort

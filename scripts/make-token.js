const jwt = require('jsonwebtoken')
const secret = 'glorie-secret-key-2024-change-in-production'

// Create a valid NextAuth JWT session token for admin
const token = jwt.sign(
  {
    name: 'Admin',
    email: 'admin@glorie.com',
    sub: 'cmcjt6a1q0000ti8r1234567',
    role: 'ADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
    jti: 'test-jti-' + Date.now()
  },
  secret,
  { algorithm: 'HS256' }
)

console.log('ADMIN_TOKEN=' + token)

// Also create agent token
const agentToken = jwt.sign(
  {
    name: 'Agent Demo',
    email: 'agent@glorie.com',
    sub: 'cmcjt6a1q0000ti8r7654321',
    role: 'AGENT',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
    jti: 'test-jti-agent-' + Date.now()
  },
  secret,
  { algorithm: 'HS256' }
)

console.log('AGENT_TOKEN=' + agentToken)

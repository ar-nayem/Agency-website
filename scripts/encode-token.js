const { encode } = require('next-auth/jwt')

const secret = 'glorie-secret-key-2024-change-in-production'
const ADMIN_ID = '32f1c9a0-8e98-4c3f-9277-ef3c03ad10a2'

async function main() {
  const adminToken = await encode({
    token: { name: 'Admin', email: 'admin@glorie.com', sub: ADMIN_ID, role: 'ADMIN' },
    secret
  })
  console.log('ADMIN_TOKEN=' + adminToken)
}

main().catch(console.error)

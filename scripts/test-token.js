const { getToken } = require('next-auth/jwt')

const secret = 'glorie-secret-key-2024-change-in-production'
const tokenStr = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQWRtaW4iLCJlbWFpbCI6ImFkbWluQGdsb3JpZS5jb20iLCJzdWIiOiJjbWNqdDZhMXEwMDAwdGk4cjEyMzQ1NjciLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3ODQ5OTU5MTcsImV4cCI6MTc4NTA4MjMxNywianRpIjoidGVzdC0xNzg0OTk1OTE3In0.fS0aa6B3UxxNSHp1CY1Q6h41Sbo7qzLsy6EsE52BHOQ'

async function test() {
  // Test with different cookie names NextAuth might use
  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    '__Host-next-auth.session-token',
  ]

  for (const name of cookieNames) {
    const req = { headers: { cookie: name + '=' + tokenStr } }
    const token = await getToken({ req, secret })
    console.log(name, '=>', token ? JSON.stringify(token) : 'null')
  }

  // Also check if the environment variable is set
  console.log('NEXTAUTH_SECRET env:', process.env.NEXTAUTH_SECRET || 'NOT SET')
}

test().catch(e => console.error('Error:', e.message))

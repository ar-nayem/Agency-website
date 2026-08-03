const nextAuthPkg = require('next-auth/package.json')
console.log('NextAuth version:', nextAuthPkg.version)

// Check how getToken works
const fs = require('fs')
const jwtPath = require.resolve('next-auth/jwt/index.js')
console.log('JWT module path:', jwtPath)
const jwtSrc = fs.readFileSync(jwtPath, 'utf8')
console.log('getToken found at lines:', jwtSrc.split('\n').map((l, i) => l.includes('getToken') ? i+1 : null).filter(Boolean))

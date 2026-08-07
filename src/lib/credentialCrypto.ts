import crypto from 'crypto'

function getKey(): Buffer {
  const secret = process.env.PORTAL_ENCRYPTION_KEY
  if (!secret) {
    throw new Error('PORTAL_ENCRYPTION_KEY is not set — required to store portal credentials')
  }
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptCredential(plain: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptCredential(encoded: string): string {
  const key = getKey()
  const raw = Buffer.from(encoded, 'base64')
  const iv = raw.subarray(0, 12)
  const authTag = raw.subarray(12, 28)
  const encrypted = raw.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

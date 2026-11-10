const crypto = require('crypto'); const env = require('../config/env'); const AppError = require('../utils/AppError');
function key() {
  const value = env.credentialEncryptionKey;
  if (!value) throw new AppError('Credential encryption is not configured.', 503, 'CREDENTIAL_ENCRYPTION_UNAVAILABLE');
  let bytes; if (/^[a-f\d]{64}$/i.test(value)) bytes = Buffer.from(value, 'hex'); else { try { bytes = Buffer.from(value, 'base64'); } catch {} }
  if (!bytes || bytes.length !== 32) throw new AppError('CREDENTIAL_ENCRYPTION_KEY must encode exactly 32 bytes.', 503, 'CREDENTIAL_ENCRYPTION_UNAVAILABLE');
  return bytes;
}
function encrypt(value) { if (!value) return undefined; const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv); const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]); return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64')).join('.'); }
function decrypt(value) { if (!value) return undefined; try { const [iv, tag, data] = value.split('.').map((part) => Buffer.from(part, 'base64')); const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv); decipher.setAuthTag(tag); return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'); } catch { throw new AppError('Stored integration credential cannot be decrypted.', 500, 'CREDENTIAL_DECRYPTION_FAILED'); } }
module.exports = { encrypt, decrypt };

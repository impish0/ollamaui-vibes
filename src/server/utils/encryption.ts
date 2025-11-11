import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!'; // Should be 32 bytes for AES-256
const ALGORITHM = 'aes-256-cbc';

// Ensure key is exactly 32 bytes
const KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

/**
 * Encrypt an API key for secure storage
 */
export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return IV + encrypted data (IV needed for decryption)
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an API key from storage
 */
export function decryptApiKey(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask an API key for display (show first/last few chars)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length < 8) return '***';
  return apiKey.slice(0, 4) + '...' + apiKey.slice(-4);
}

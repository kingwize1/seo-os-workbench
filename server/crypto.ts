import crypto from 'node:crypto';

const DEFAULT_ENC_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function createSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashToken(rawToken: string): string {
  const secret = process.env.SESSION_SECRET || 'dev-session-secret';
  return crypto.createHmac('sha256', secret).update(rawToken).digest('hex');
}

export function sha256Hex(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// --- AES-256-GCM Secret Encryption for Server-Only Provider Credentials ---
function getEncryptionKey(): Buffer {
  const hex = process.env.SECRETS_ENCRYPTION_KEY || DEFAULT_ENC_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, 'hex');
  }
  return crypto.createHash('sha256').update(hex).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Malformed encrypted credential payload');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// --- HMAC-SHA256 Webhook Signing & Timing-Safe Verification ---
export function signWebhookPayload(rawPayload: string, secret: string, timestamp?: number): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedContent = `${ts}.${rawPayload}`;
  const sig = crypto.createHmac('sha256', secret).update(signedContent).digest('hex');
  return `t=${ts},v1=${sig}`;
}

export function verifyWebhookSignature(
  rawPayload: string,
  signatureHeader: string | undefined,
  secret: string,
  toleranceSeconds = 300
): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((kv) => {
      const idx = kv.indexOf('=');
      return idx === -1 ? [kv.trim(), ''] : [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
    })
  );
  const ts = Number(parts.t);
  const v1 = parts.v1;
  if (!ts || !v1 || Number.isNaN(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSeconds) return false;

  const expected = crypto.createHmac('sha256', secret).update(`${ts}.${rawPayload}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

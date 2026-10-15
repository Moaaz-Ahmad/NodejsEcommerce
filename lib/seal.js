// Authenticated encryption (AES-256-GCM) for data kept in the database. Pure crypto: no database, no HTTP.
// Used for login sessions, so what a session holds (who is signed in, their role) cannot be read by someone who
// can only read the database, and cannot be changed, or moved into another session, without being noticed.
const crypto = require('crypto');
const { sessionSecret } = require('../config');

// A key of its own, derived from the session secret, so the key that signs the cookie is never also used to encrypt
const KEY = crypto.createHmac('sha256', sessionSecret).update('simplecom stored data encryption key').digest(); // 32 bytes
const VERSION = 'v1'; // lets the format change later without mistaking old values for new ones
const IV_BYTES = 12;
const TAG_BYTES = 16;

// Encrypt text. `context` (the session id) is bound to the result: it must be given again to open it, so a sealed
// value copied into a different record cannot be opened there. Output: v1.<iv>.<tag>.<ciphertext> (base64url parts)
exports.seal = (text, context) => {
  const iv = crypto.randomBytes(IV_BYTES); // new and random every time, so equal text gives different output
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(String(context)));
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
};

// Decrypt. Returns the text, or null when the value is not in this format, was altered, was made with another
// key, or belongs to a different context
exports.unseal = (token, context) => {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 4 || parts[0] !== VERSION) return null;
    const [, iv, tag, encrypted] = parts.map((p, i) => (i === 0 ? p : Buffer.from(p, 'base64url')));
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv, { authTagLength: TAG_BYTES });
    decipher.setAAD(Buffer.from(String(context)));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return null; // wrong key, altered data or wrong context: the authentication check failed
  }
};

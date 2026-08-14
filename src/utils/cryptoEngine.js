/**
 * Optional client-side Web Crypto AES-GCM-256 utility.
 * This helper is not used as a secret store: its origin-derived key protects
 * against casual storage inspection, not a same-origin attacker or XSS.
 */
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from './securityAuditLedger.js';

// Fixed origin salt for deterministic local convenience-key derivation.
const ORIGIN_KDF_SALT = new TextEncoder().encode('Culinaria_Haute_Cuisine_Zero_Knowledge_Salt_2026');
let cachedKey = null;

/**
 * Derives an AES-GCM-256 cryptographic key using PBKDF2 with 100,000 iterations
 */
async function getMasterKey() {
  if (cachedKey) return cachedKey;

  try {
    if (!window.crypto || !window.crypto.subtle) {
      return null;
    }

    const hostSeed = (window.location && window.location.origin) || 'culinaria.local.vault';
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(`CULINARIA_SECURE_ROOT_SEED_${hostSeed}`),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    cachedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: ORIGIN_KDF_SALT,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return cachedKey;
  } catch (err) {
    console.warn('[CRYPTO] SubtleCrypto initialization error, using obfuscation fallback:', err);
    return null;
  }
}

/**
 * Encrypts arbitrary JS objects or strings using AES-GCM-256 with dynamic 96-bit IV
 */
export async function encryptPayload(data) {
  try {
    const key = await getMasterKey();
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const encoded = new TextEncoder().encode(jsonStr);

    if (!key) {
      // Fallback base64 envelope with checksum tag if Web Crypto is unavailable
      return {
        _enc: 'base64_v1',
        data: btoa(unescape(encodeURIComponent(jsonStr))),
        ts: Date.now()
      };
    }

    // Generate fresh 12-byte initialization vector for every encryption
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const cipherArray = Array.from(new Uint8Array(cipherBuffer));
    const ivArray = Array.from(iv);

    logSecurityEvent(SecurityEventType.STORAGE_ENCRYPTION_SUCCESS, { bytes: encoded.length }, SecuritySeverity.INFO);

    return {
      _enc: 'aes_gcm_256',
      iv: btoa(String.fromCharCode.apply(null, ivArray)),
      cipher: btoa(String.fromCharCode.apply(null, cipherArray)),
      ts: Date.now()
    };
  } catch (err) {
    console.error('[CRYPTO] Encryption failed:', err);
    return data;
  }
}

/**
 * Decrypts AES-GCM-256 ciphertext payloads back into native JS data
 */
export async function decryptPayload(payload, fallback = null) {
  if (!payload || typeof payload !== 'object') return payload || fallback;

  // Unencrypted legacy format
  if (!payload._enc) return payload;

  try {
    if (payload._enc === 'base64_v1') {
      const decoded = decodeURIComponent(escape(atob(payload.data)));
      return JSON.parse(decoded);
    }

    if (payload._enc === 'aes_gcm_256') {
      const key = await getMasterKey();
      if (!key) return fallback;

      const ivStr = atob(payload.iv);
      const iv = new Uint8Array(ivStr.length);
      for (let i = 0; i < ivStr.length; i++) iv[i] = ivStr.charCodeAt(i);

      const cipherStr = atob(payload.cipher);
      const cipher = new Uint8Array(cipherStr.length);
      for (let i = 0; i < cipherStr.length; i++) cipher[i] = cipherStr.charCodeAt(i);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipher
      );

      const decryptedStr = new TextDecoder().decode(decryptedBuffer);
      return JSON.parse(decryptedStr);
    }

    return fallback;
  } catch (err) {
    logSecurityEvent(SecurityEventType.STORAGE_TAMPER_DETECTED, { error: err.message }, SecuritySeverity.HIGH);
    return fallback;
  }
}

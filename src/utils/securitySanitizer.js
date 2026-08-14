/**
 * Enterprise Security Sanitizer & Defense Engine
 * Protects against XSS, Prototype Pollution, Tabnabbing, and Input Tampering
 * Complies with OWASP Top 10 client-side security guidelines.
 */
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from './securityAuditLedger.js';

// Disallowed dangerous protocol schemes
const DANGEROUS_PROTOCOLS = /^(javascript|vbscript|data|file):/i;

// Disallowed prototype pollution keys & accessor methods
const POLLUTION_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__'
]);

/**
 * W3C Trusted Types Policy Initialization
 */
let trustedPolicy = null;
if (typeof window !== 'undefined' && window.trustedTypes && window.trustedTypes.createPolicy) {
  try {
    trustedPolicy = window.trustedTypes.createPolicy('culinaria-policy', {
      createHTML: (string) => sanitizeHtml(string),
      createScriptURL: (string) => sanitizeUrl(string)
    });
    logSecurityEvent(SecurityEventType.TRUSTED_TYPE_INITIALIZED, { policy: 'culinaria-policy' });
  } catch (e) {
    // Policy may already be registered
  }
}

/**
 * Escapes raw strings for safe DOM insertion
 */
export function sanitizeHtml(str) {
  if (str === null || str === undefined) return '';
  const clean = String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;')
    .replace(/=/g, '&#61;');
  
  return clean;
}

/**
 * Validates and sanitizes URLs to prevent javascript: pseudo-protocol attacks
 */
export function sanitizeUrl(url, fallback = '#') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  
  if (DANGEROUS_PROTOCOLS.test(trimmed)) {
    logSecurityEvent(SecurityEventType.XSS_PAYLOAD_BLOCKED, { url: trimmed }, SecuritySeverity.HIGH);
    console.warn(`[SECURITY] Blocked dangerous protocol in URL: ${trimmed}`);
    return fallback;
  }

  // Only allow valid http/https or relative paths
  if (/^(https?:\/\/|\/|\.\/|#)/i.test(trimmed)) {
    return trimmed;
  }

  return fallback;
}

/**
 * Validates strictly alphanumeric IDs (for recipe queries)
 */
export function sanitizeIdentifier(id) {
  if (!id) return '';
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
}

/**
 * Enforces strict input length constraints and sanitizes text
 */
export function sanitizeTextInput(input, maxLength = 120) {
  if (!input || typeof input !== 'string') return '';
  return sanitizeHtml(input.trim().slice(0, maxLength));
}

/**
 * Deep-clean objects against Prototype Pollution attacks
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = Object.create(null);
  for (const key of Object.keys(obj)) {
    if (!POLLUTION_KEYS.has(key)) {
      clean[key] = sanitizeObject(obj[key]);
    }
  }
  return clean;
}

/**
 * Calculates a lightweight 32-bit checksum for local storage tamper-proofing
 */
export function computeIntegrityHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Memory rate limiter for client-side storage writes
 */
class RateLimiter {
  constructor(maxEvents = 60, intervalMs = 10000) {
    this.maxEvents = maxEvents;
    this.intervalMs = intervalMs;
    this.timestamps = [];
  }

  canExecute() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.intervalMs);
    if (this.timestamps.length >= this.maxEvents) {
      logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, { limit: this.maxEvents }, SecuritySeverity.MEDIUM);
      console.warn('[SECURITY] Storage rate limit reached. Throttling excessive mutations.');
      return false;
    }
    this.timestamps.push(now);
    return true;
  }
}

export const storageRateLimiter = new RateLimiter();

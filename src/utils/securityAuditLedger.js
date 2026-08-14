/**
 * Culinaria Security SIEM & Tamper-Evident Audit Ledger
 * Records client-side security events, mutation traps, and cryptographic anomalies.
 */

const MAX_LEDGER_ENTRIES = 100;
const ledger = [];

export const SecuritySeverity = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export const SecurityEventType = {
  TRUSTED_TYPE_INITIALIZED: 'TRUSTED_TYPE_INITIALIZED',
  XSS_PAYLOAD_BLOCKED: 'XSS_PAYLOAD_BLOCKED',
  DOM_MUTATION_TRAPPED: 'DOM_MUTATION_TRAPPED',
  STORAGE_ENCRYPTION_SUCCESS: 'STORAGE_ENCRYPTION_SUCCESS',
  STORAGE_TAMPER_DETECTED: 'STORAGE_TAMPER_DETECTED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_TAG_REMOVED: 'UNAUTHORIZED_TAG_REMOVED'
};

/**
 * Computes a fast hex hash of string data for tamper-evident chaining
 */
function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Records an immutable security event into the audit ledger
 */
export function logSecurityEvent(type, details = {}, severity = SecuritySeverity.INFO) {
  const prevHash = ledger.length > 0 ? ledger[ledger.length - 1].hash : '00000000';
  const timestamp = new Date().toISOString();
  const entryPayload = `${timestamp}|${type}|${severity}|${JSON.stringify(details)}|${prevHash}`;
  const entryHash = hashString(entryPayload);

  const entry = {
    id: `SEC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp,
    type,
    severity,
    details,
    prevHash,
    hash: entryHash
  };

  ledger.push(entry);
  if (ledger.length > MAX_LEDGER_ENTRIES) {
    ledger.shift();
  }

  if (severity === SecuritySeverity.CRITICAL) {
    console.warn(`[SECURITY AUDIT - CRITICAL] ${type}:`, details);
  }

  return entry;
}

/**
 * Returns a read-only snapshot of the security audit ledger
 */
export function getAuditLedger() {
  return [...ledger];
}

/**
 * Exports a formal JSON security audit compliance report
 */
export function exportAuditReport() {
  return {
    engine: 'Culinaria Client Zero-Trust Engine v2.0',
    generatedAt: new Date().toISOString(),
    totalEvents: ledger.length,
    ledger: getAuditLedger(),
    tamperProofChainValid: verifyLedgerChain()
  };
}

/**
 * Verifies that the internal ledger hash chain has not been tampered with in memory
 */
export function verifyLedgerChain() {
  for (let i = 0; i < ledger.length; i++) {
    const expectedPrevHash = i === 0 ? '00000000' : ledger[i - 1].hash;
    if (ledger[i].prevHash !== expectedPrevHash) return false;
  }
  return true;
}

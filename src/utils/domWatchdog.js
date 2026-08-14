/**
 * Real-Time DOM Mutation Watchdog & Anti-Injection Guard
 * Intercepts unauthorized runtime node insertions, inline event handler injections, and untrusted frames.
 */
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from './securityAuditLedger.js';

const DISALLOWED_TAGS = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'BASE']);
const INLINE_EVENT_REGEX = /^on[a-z]+/i;

let isWatchdogActive = false;
let observer = null;

/**
 * Inspects an individual DOM node and its attributes for malicious vectors
 */
function inspectNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

  const tagName = node.tagName.toUpperCase();

  // Block unauthorized executable tags injected dynamically outside bundler
  if (DISALLOWED_TAGS.has(tagName)) {
    if (tagName === 'SCRIPT') {
      const src = node.getAttribute('src') || '';
      // Allow Vite bundled assets or inline JSON data scripts
      const isBundle = src.includes('/assets/') || node.type === 'application/ld+json' || node.type === 'application/json';
      if (!isBundle) {
        node.remove();
        logSecurityEvent(SecurityEventType.UNAUTHORIZED_TAG_REMOVED, { tag: tagName, src }, SecuritySeverity.CRITICAL);
        return;
      }
    } else {
      node.remove();
      logSecurityEvent(SecurityEventType.UNAUTHORIZED_TAG_REMOVED, { tag: tagName }, SecuritySeverity.HIGH);
      return;
    }
  }

  // Scan and strip inline event attributes (e.g. <img onerror="..." />)
  if (node.attributes) {
    const attrsToRemove = [];
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      if (INLINE_EVENT_REGEX.test(attr.name)) {
        attrsToRemove.push(attr.name);
      }
    }

    for (const attrName of attrsToRemove) {
      const val = node.getAttribute(attrName);
      node.removeAttribute(attrName);
      logSecurityEvent(SecurityEventType.DOM_MUTATION_TRAPPED, { attr: attrName, val: val ? val.slice(0, 40) : '' }, SecuritySeverity.HIGH);
    }
  }

  // Recursively inspect children
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      inspectNode(node.children[i]);
    }
  }
}

/**
 * Initializes the autonomous DOM Watchdog
 */
export function initDomWatchdog() {
  if (isWatchdogActive || typeof window === 'undefined' || !window.MutationObserver) return;

  observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const addedNode of mutation.addedNodes) {
          inspectNode(addedNode);
        }
      } else if (mutation.type === 'attributes') {
        if (INLINE_EVENT_REGEX.test(mutation.attributeName)) {
          mutation.target.removeAttribute(mutation.attributeName);
          logSecurityEvent(SecurityEventType.DOM_MUTATION_TRAPPED, { attr: mutation.attributeName }, SecuritySeverity.HIGH);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur',
      'onmouseenter', 'onmouseleave', 'onkeydown', 'onkeyup', 'src', 'href'
    ]
  });

  isWatchdogActive = true;
  console.log('[SECURITY] DOM Mutation Watchdog & Anti-Injection Guard armed.');
}

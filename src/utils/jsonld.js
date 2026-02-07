/**
 * @module utils/jsonld
 * Shared JSON-LD value extraction helpers for SKOS/XKOS data.
 * Works in both Node.js (snapshot script) and browser (Vite) contexts.
 */

/**
 * Extract a plain string from a JSON-LD value.
 * Handles plain strings, {@language, @value} objects, and {@value} objects.
 * @param {string|Object|null} val - A JSON-LD value
 * @returns {string} The extracted plain string, or '' if null/undefined
 */
export function str(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val['@value']) return val['@value'];
  return '';
}

/**
 * Extract the @id URI from a JSON-LD reference.
 * Handles plain strings and {@id} reference objects.
 * @param {string|Object|null} val - A JSON-LD reference
 * @returns {string|null} The extracted URI, or null if not found
 */
export function refId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  return val['@id'] || null;
}

/**
 * Normalize a value to an array.
 * Handles null/undefined (→ []), single values (→ [val]), and existing arrays.
 * @param {*} val - The value to normalize
 * @returns {Array} The value as an array
 */
export function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

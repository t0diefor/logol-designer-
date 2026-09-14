/**
 * Identifier generation.
 *
 * IDs are generated on the client so that a record is addressable the instant
 * it is created, with no round trip -- which is what makes the app work
 * offline and keeps the eventual Supabase sync a simple upsert rather than an
 * id-reconciliation problem.
 */

/** Returns a RFC 4122 v4 UUID, falling back where `crypto.randomUUID` is absent. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback for older browsers and non-secure contexts.
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  throw new Error('No secure random source available for id generation')
}

/** Current time as an ISO 8601 string -- the timestamp format used everywhere. */
export function nowIso(): string {
  return new Date().toISOString()
}

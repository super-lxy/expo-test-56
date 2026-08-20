/**
 * Secure ID generation utilities
 *
 * Uses cryptographically secure random values to prevent collisions
 * and ensure unpredictability of generated IDs.
 */

/**
 * Generates a cryptographically secure unique ID
 * Format: {timestamp}-{random-hex}
 *
 * @returns A unique ID string
 *
 * @example
 * const id = generateSecureId(); // "1724140800000-a3f9c2d1e4b8"
 */
export function generateSecureId(): string {
  const timestamp = Date.now();

  // Generate 6 random bytes (48 bits) for collision resistance
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);

  // Convert to hex string
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${timestamp}-${randomHex}`;
}

/**
 * Generates a UUID v4 compliant identifier
 *
 * @returns A UUID v4 string
 *
 * @example
 * const uuid = generateUUID(); // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 */
export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers and Node 16+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation for older environments
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

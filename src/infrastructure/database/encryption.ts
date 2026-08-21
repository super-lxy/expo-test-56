import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * Database Encryption Key Management
 *
 * Provides secure key generation, storage, and retrieval for database encryption.
 * Uses expo-secure-store for secure key storage on the device.
 */

const ENCRYPTION_KEY_STORAGE_KEY = 'database_encryption_key';
const KEY_LENGTH = 32; // 256-bit key

/**
 * Generates a new encryption key for the database
 * @returns A base64-encoded 256-bit encryption key
 */
async function generateEncryptionKey(): Promise<string> {
  // Generate 32 random bytes (256 bits)
  const randomBytes = await Crypto.getRandomBytesAsync(KEY_LENGTH);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...randomBytes));
}

/**
 * Gets or creates the database encryption key
 *
 * If a key already exists in secure storage, returns it.
 * Otherwise, generates a new key and stores it securely.
 *
 * @returns The database encryption key (base64-encoded)
 */
export async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    // Try to retrieve existing key
    const existingKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);

    if (existingKey) {
      return existingKey;
    }

    // Generate new key if none exists
    const newKey = await generateEncryptionKey();

    // Store securely
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, newKey);

    return newKey;
  } catch (error) {
    console.error('Failed to get or create encryption key:', error);
    throw new Error('无法初始化数据库加密密钥');
  }
}

/**
 * Deletes the encryption key from secure storage
 *
 * WARNING: This will make the encrypted database inaccessible!
 * Only use when resetting the app or during uninstall.
 */
export async function deleteEncryptionKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to delete encryption key:', error);
  }
}

/**
 * Checks if an encryption key exists
 * @returns true if a key exists, false otherwise
 */
export async function hasEncryptionKey(): Promise<boolean> {
  try {
    const key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
    return key !== null;
  } catch {
    return false;
  }
}

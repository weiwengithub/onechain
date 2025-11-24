import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeed } from '@scure/bip39';

import { TRON_HD_PATH } from '@/constants/tron';
import { publicKeyToAddress } from '@/utils/tron/address';

/**
 * Derive TRON private key from mnemonic
 * @param mnemonic - BIP39 mnemonic phrase
 * @param path - HD derivation path (default: TRON_HD_PATH)
 * @returns Private key (hex string without 0x prefix)
 */
export async function derivePrivateKeyFromMnemonic(mnemonic: string, path: string = TRON_HD_PATH): Promise<string> {
  const seed = await mnemonicToSeed(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const derivedKey = hdKey.derive(path);

  if (!derivedKey.privateKey) {
    throw new Error('Failed to derive private key');
  }

  return Buffer.from(derivedKey.privateKey).toString('hex');
}

/**
 * Derive TRON public key from mnemonic
 * @param mnemonic - BIP39 mnemonic phrase
 * @param path - HD derivation path (default: TRON_HD_PATH)
 * @returns Public key (hex string, 64 bytes without prefix)
 */
export async function derivePublicKeyFromMnemonic(mnemonic: string, path: string = TRON_HD_PATH): Promise<string> {
  const seed = await mnemonicToSeed(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const derivedKey = hdKey.derive(path);

  if (!derivedKey.publicKey) {
    throw new Error('Failed to derive public key');
  }

  // Remove 0x04 prefix if present
  const pubKey = Buffer.from(derivedKey.publicKey);
  if (pubKey.length === 65 && pubKey[0] === 0x04) {
    return pubKey.slice(1).toString('hex');
  }

  return pubKey.toString('hex');
}

/**
 * Derive TRON address from mnemonic
 * @param mnemonic - BIP39 mnemonic phrase
 * @param path - HD derivation path (default: TRON_HD_PATH)
 * @returns TRON address (base58)
 */
export async function deriveAddressFromMnemonic(mnemonic: string, path: string = TRON_HD_PATH): Promise<string> {
  const publicKey = await derivePublicKeyFromMnemonic(mnemonic, path);
  return publicKeyToAddress(publicKey);
}

/**
 * Get public key from private key
 * @param privateKey - Private key (hex string without 0x prefix)
 * @returns Public key (hex string, 64 bytes without prefix)
 */
export function getPublicKeyFromPrivateKey(privateKey: string): string {
  const privateKeyHex = privateKey.replace(/^0x/, '');
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');

  const publicKey = secp256k1.getPublicKey(privateKeyBytes, false);

  // Remove 0x04 prefix
  return Buffer.from(publicKey).slice(1).toString('hex');
}

/**
 * Get TRON address from private key
 * @param privateKey - Private key (hex string without 0x prefix)
 * @returns TRON address (base58)
 */
export function getAddressFromPrivateKey(privateKey: string): string {
  const publicKey = getPublicKeyFromPrivateKey(privateKey);
  return publicKeyToAddress(publicKey);
}

/**
 * Generate random private key
 * @returns Random private key (hex string without 0x prefix)
 */
export function generateRandomPrivateKey(): string {
  const privateKey = secp256k1.utils.randomPrivateKey();
  return Buffer.from(privateKey).toString('hex');
}

/**
 * Validate private key format
 * @param privateKey - Private key to validate
 * @returns True if valid, false otherwise
 */
export function isValidPrivateKey(privateKey: string): boolean {
  try {
    const cleanKey = privateKey.replace(/^0x/, '');
    if (cleanKey.length !== 64) return false;

    const keyBytes = Buffer.from(cleanKey, 'hex');
    return secp256k1.utils.isValidPrivateKey(keyBytes);
  } catch {
    return false;
  }
}

/**
 * Encrypt private key (simple XOR encryption for demo purposes)
 * In production, use proper encryption like AES-GCM
 * @param privateKey - Private key to encrypt
 * @param password - Password for encryption
 * @returns Encrypted private key
 */
export function encryptPrivateKey(privateKey: string, password: string): string {
  const keyBuffer = Buffer.from(privateKey, 'hex');
  const passwordHash = sha256(Buffer.from(password));
  const encrypted = Buffer.alloc(keyBuffer.length);

  for (let i = 0; i < keyBuffer.length; i++) {
    encrypted[i] = keyBuffer[i] ^ passwordHash[i % passwordHash.length];
  }

  return encrypted.toString('hex');
}

/**
 * Decrypt private key (simple XOR decryption for demo purposes)
 * In production, use proper decryption like AES-GCM
 * @param encryptedKey - Encrypted private key
 * @param password - Password for decryption
 * @returns Decrypted private key
 */
export function decryptPrivateKey(encryptedKey: string, password: string): string {
  // XOR encryption is symmetric, so decryption is the same as encryption
  return encryptPrivateKey(encryptedKey, password);
}

/**
 * Derive multiple addresses from mnemonic
 * @param mnemonic - BIP39 mnemonic phrase
 * @param count - Number of addresses to derive
 * @param startIndex - Starting index for derivation
 * @returns Array of addresses
 */
export async function deriveMultipleAddresses(mnemonic: string, count: number, startIndex = 0): Promise<string[]> {
  const addresses: string[] = [];

  for (let i = 0; i < count; i++) {
    const path = `m/44'/195'/0'/0/${startIndex + i}`;
    const address = await deriveAddressFromMnemonic(mnemonic, path);
    addresses.push(address);
  }

  return addresses;
}

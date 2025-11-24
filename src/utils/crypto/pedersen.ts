/**
 * Pedersen Hash Implementation
 * Compatible with circomlib and privacy-sui contract
 *
 * Based on Tornado Cash's circomlib implementation
 * Reference: /Users/C/dev/onechain/privacy-sui
 */

// @ts-ignore - circomlib doesn't have TypeScript definitions
import * as circomlib from 'circomlib';
// @ts-ignore - snarkjs doesn't have proper TypeScript definitions
import { bigInt } from 'snarkjs';

/**
 * Pedersen hash function compatible with circomlib
 * @param data - Buffer of bytes to hash
 * @returns BigInt hash result (x-coordinate of BabyJubJub point)
 */
export function pedersenHash(data: Buffer): bigint {
  const hash = circomlib.pedersenHash.hash(data);
  const point = circomlib.babyJub.unpackPoint(hash);
  return BigInt(point[0].toString()); // Return x-coordinate as BigInt
}

/**
 * Convert bigint to little-endian buffer (31 bytes)
 * Compatible with privacy-sui's leInt2Buff
 * @param value - BigInt value
 * @param bytes - Number of bytes (default 31)
 * @returns Buffer in little-endian format
 */
export function bigIntToLeBuffer(value: bigint, bytes: number = 31): Buffer {
  const buffer = Buffer.alloc(bytes);  // Pre-allocate bytes (default 31), all zeros

  let v = value;
  for (let i = 0; i < bytes && v > 0n; i++) {
    buffer[i] = Number(v & 0xFFn);
    v = v >> 8n;
  }

  return buffer;
}

/**
 * Convert little-endian buffer to bigint
 * Inverse of bigIntToLeBuffer
 * Compatible with privacy-sui's leBuff2int
 * @param buffer - Buffer in little-endian format
 * @returns BigInt value
 */
export function leBuff2BigInt(buffer: Buffer): bigint {
  const bigIntValue = bigInt.leBuff2int(buffer);
  return BigInt(bigIntValue.toString());
}

/**
 * Convert Buffer to hex string with fixed length
 * Compatible with privacy-sui's toHex function
 * @param buffer - Buffer to convert
 * @param byteLength - Expected byte length (will pad if shorter)
 * @returns Hex string with 0x prefix
 */
export function toHex(buffer: Buffer, byteLength: number): string {
  const hex = buffer.toString('hex').padStart(byteLength * 2, '0');
  return '0x' + hex;
}

/**
 * Generate random field element (31 bytes)
 * Uses crypto.getRandomValues for secure randomness
 * @returns Random BigInt
 */
export function randomBigInt(): bigint {
  // Generate 31 bytes of random data
  const randomBytes = new Uint8Array(31);

  // Use crypto API (available in both browser and Node.js)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for Node.js without WebCrypto
    const nodeCrypto = require('crypto');
    const bytes = nodeCrypto.randomBytes(31);
    for (let i = 0; i < 31; i++) {
      randomBytes[i] = bytes[i];
    }
  }

  // Convert to BigInt in little-endian format
  let value = BigInt(0);
  for (let i = 0; i < randomBytes.length; i++) {
    value = value | (BigInt(randomBytes[i]) << BigInt(i * 8));
  }

  return value;
}

/**
 * Compute commitment = Pedersen(nullifier || secret)
 * This matches the privacy-sui implementation
 * @param nullifier - 31-byte nullifier as BigInt
 * @param secret - 31-byte secret as BigInt
 * @returns Commitment as hex string
 */
export function computeCommitment(nullifier: bigint, secret: bigint): string {
  // Convert to 31-byte little-endian buffers
  const nullifierBuf = bigIntToLeBuffer(nullifier, 31);
  const secretBuf = bigIntToLeBuffer(secret, 31);

  // Concatenate: preimage = nullifier || secret (62 bytes total)
  const preimage = Buffer.concat([nullifierBuf, secretBuf]);

  // Hash with Pedersen
  const commitment = pedersenHash(preimage);

  // Return as 0x-prefixed hex string (64 characters)
  return '0x' + commitment.toString(16).padStart(64, '0');
}

/**
 * Compute nullifierHash = Pedersen(nullifier)
 * @param nullifier - 31-byte nullifier as BigInt
 * @returns Nullifier hash as hex string
 */
export function computeNullifierHash(nullifier: bigint): string {
  const nullifierBuf = bigIntToLeBuffer(nullifier, 31);
  const hash = pedersenHash(nullifierBuf);
  return '0x' + hash.toString(16).padStart(64, '0');
}

/**
 * Generate deposit secrets (nullifier, secret, commitment, nullifierHash)
 * This is the main function used by VoucherClient
 * @returns Object with all deposit secrets
 */
export function generateDepositSecrets(): {
  nullifier: string;
  secret: string;
  commitment: string;
  nullifierHash: string;
} {
  // Generate random nullifier and secret
  const nullifier = randomBigInt();
  const secret = randomBigInt();

  // Compute derived values
  const commitment = computeCommitment(nullifier, secret);
  const nullifierHash = computeNullifierHash(nullifier);

  return {
    nullifier: '0x' + nullifier.toString(16).padStart(64, '0'),
    secret: '0x' + secret.toString(16).padStart(64, '0'),
    commitment,
    nullifierHash,
  };
}

/**
 * Convert hex string to bytes
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Uint8Array of bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }

  return bytes;
}

/**
 * Convert bytes to hex string
 * @param bytes - Uint8Array or Buffer
 * @returns Hex string with 0x prefix
 */
export function bytesToHex(bytes: Uint8Array | Buffer): string {
  return '0x' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * PedersenUtils object - main export for use in other modules
 * Compatible with the old PoseidonUtils interface
 */
export const PedersenUtils = {
  hash: pedersenHash,
  computeCommitment,
  computeNullifierHash,
  generateDepositSecrets,
  randomBigInt,
  bigIntToLeBuffer,
  leBuff2BigInt,
  toHex,
  hexToBytes,
  bytesToHex,
};

export default PedersenUtils;

import { sha256 } from '@noble/hashes/sha256';
import { base58 } from '@scure/base';
import { keccak_256 } from '@noble/hashes/sha3';

import { TRON_ADDRESS_PREFIX } from '@/constants/tron';

/**
 * Convert hex address to base58 address
 * @param hexAddress - Hex address (with or without 0x prefix, with or without 41 prefix)
 * @returns Base58 encoded TRON address
 */
export function hexToBase58Address(hexAddress: string): string {
  let address = hexAddress.replace(/^0x/, '');

  // Add 41 prefix if not present
  if (!address.startsWith('41')) {
    address = '41' + address;
  }

  const addressBytes = Buffer.from(address, 'hex');
  const hash = sha256(sha256(addressBytes));
  const checksum = hash.slice(0, 4);
  const addressWithChecksum = Buffer.concat([addressBytes, checksum]);

  return base58.encode(addressWithChecksum);
}

/**
 * Convert base58 address to hex address
 * @param base58Address - Base58 encoded TRON address
 * @returns Hex address with 41 prefix
 */
export function base58ToHexAddress(base58Address: string): string {
  const decoded = base58.decode(base58Address);
  const address = decoded.slice(0, -4);
  const checksum = decoded.slice(-4);

  // Verify checksum
  const hash = sha256(sha256(address));
  const expectedChecksum = hash.slice(0, 4);

  if (!Buffer.from(checksum).equals(Buffer.from(expectedChecksum))) {
    throw new Error('Invalid address checksum');
  }

  return Buffer.from(address).toString('hex');
}

/**
 * Convert public key to TRON address
 * @param publicKey - Public key (64 bytes, uncompressed without 04 prefix, or 65 bytes with 04 prefix)
 * @returns Base58 encoded TRON address
 */
export function publicKeyToAddress(publicKey: Uint8Array | string): string {
  let pubKey: Uint8Array;

  if (typeof publicKey === 'string') {
    let hex = publicKey.replace(/^0x/, '');
    // Remove 04 prefix if present
    if (hex.startsWith('04')) {
      hex = hex.slice(2);
    }
    pubKey = new Uint8Array(Buffer.from(hex, 'hex'));
  } else {
    pubKey = publicKey;
    // Remove 04 prefix if present
    if (pubKey.length === 65 && pubKey[0] === 0x04) {
      pubKey = pubKey.slice(1);
    }
  }

  if (pubKey.length !== 64) {
    throw new Error('Invalid public key length');
  }

  // Keccak256 hash of public key
  const hash = keccak_256(pubKey);

  // Take last 20 bytes
  const address = hash.slice(-20);

  // Add TRON mainnet prefix (0x41)
  const addressWithPrefix = new Uint8Array(21);
  addressWithPrefix[0] = TRON_ADDRESS_PREFIX.MAINNET;
  addressWithPrefix.set(address, 1);

  // Double SHA256 for checksum
  const checksumHash = sha256(sha256(addressWithPrefix));
  const checksum = checksumHash.slice(0, 4);

  // Concatenate address and checksum
  const addressWithChecksum = new Uint8Array(25);
  addressWithChecksum.set(addressWithPrefix, 0);
  addressWithChecksum.set(checksum, 21);

  return base58.encode(addressWithChecksum);
}

/**
 * Validate TRON address format
 * @param address - Address to validate (base58 or hex format)
 * @returns true if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  try {
    // Check if hex address
    if (address.startsWith('41') || address.startsWith('0x41')) {
      const hex = address.replace(/^0x/, '');
      if (hex.length !== 42) return false;

      // Try to convert to base58 (will throw if invalid)
      hexToBase58Address(hex);
      return true;
    }

    // Check if base58 address
    if (address.length !== 34) return false;
    if (!address.startsWith('T')) return false;

    // Try to decode (will throw if invalid checksum)
    base58ToHexAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if address is a contract address
 * @param address - Base58 or hex address
 * @returns true if likely a contract address, false otherwise
 */
export function isContractAddress(address: string): boolean {
  // This is a simplified check. In practice, you'd query the blockchain
  // to check if the address has contract code
  return isValidAddress(address);
}

/**
 * Normalize address to base58 format
 * @param address - Address in any format
 * @returns Base58 encoded address
 */
export function normalizeAddress(address: string): string {
  if (address.startsWith('41') || address.startsWith('0x41')) {
    return hexToBase58Address(address);
  }

  if (!isValidAddress(address)) {
    throw new Error('Invalid TRON address');
  }

  return address;
}

/**
 * Get address in hex format (with 0x prefix)
 * @param address - Base58 or hex address
 * @returns Hex address with 0x prefix
 */
export function toHexAddress(address: string): string {
  if (address.startsWith('0x')) {
    return address;
  }

  if (address.startsWith('41')) {
    return '0x' + address;
  }

  return '0x' + base58ToHexAddress(address);
}

/**
 * Truncate address for display
 * @param address - Full address
 * @param startLength - Number of characters to show at start
 * @param endLength - Number of characters to show at end
 * @returns Truncated address
 */
export function truncateAddress(address: string, startLength = 6, endLength = 4): string {
  if (address.length <= startLength + endLength) {
    return address;
  }

  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

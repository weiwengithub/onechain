import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

import type { TronSignedTx, TronTxBase } from '@/types/tron/tx';

/**
 * Sign a TRON transaction
 * @param transaction - Unsigned transaction
 * @param privateKey - Private key (hex string without 0x prefix)
 * @returns Signed transaction
 */
export function signTransaction(transaction: TronTxBase, privateKey: string): TronSignedTx {
  const txID = transaction.txID || calculateTxId(transaction);

  // Remove 0x prefix if present
  const privateKeyHex = privateKey.replace(/^0x/, '');
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');

  // Hash the transaction ID
  const txIdBytes = Buffer.from(txID, 'hex');
  const messageHash = sha256(txIdBytes);

  // Sign the message hash
  const signature = secp256k1.sign(messageHash, privateKeyBytes);

  // Convert signature to DER format
  const signatureBytes = signature.toDERRawBytes();
  const signatureHex = Buffer.from(signatureBytes).toString('hex');

  return {
    ...transaction,
    txID,
    signature: [signatureHex],
  };
}

/**
 * Calculate transaction ID from raw transaction data
 * @param transaction - Transaction object
 * @returns Transaction ID (hex string)
 */
export function calculateTxId(transaction: TronTxBase): string {
  const rawDataHex = transaction.raw_data_hex;
  const rawDataBytes = Buffer.from(rawDataHex, 'hex');
  const hash = sha256(rawDataBytes);
  return Buffer.from(hash).toString('hex');
}

/**
 * Sign a message with private key
 * @param message - Message to sign (string or bytes)
 * @param privateKey - Private key (hex string without 0x prefix)
 * @returns Signature (hex string)
 */
export function signMessage(message: string | Uint8Array, privateKey: string): string {
  // Prepare message
  let messageBytes: Uint8Array;
  if (typeof message === 'string') {
    // Add TRON signed message prefix
    const prefix = '\x19TRON Signed Message:\n';
    const fullMessage = prefix + message.length + message;
    messageBytes = new TextEncoder().encode(fullMessage);
  } else {
    messageBytes = message;
  }

  // Hash the message
  const messageHash = sha256(messageBytes);

  // Remove 0x prefix if present
  const privateKeyHex = privateKey.replace(/^0x/, '');
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');

  // Sign the message hash
  const signature = secp256k1.sign(messageHash, privateKeyBytes);

  // Return signature as hex string
  return Buffer.from(signature.toDERRawBytes()).toString('hex');
}

/**
 * Verify a signature
 * @param message - Original message
 * @param signature - Signature to verify (hex string)
 * @param publicKey - Public key (hex string, 64 bytes without prefix)
 * @returns true if signature is valid, false otherwise
 */
export function verifySignature(message: string | Uint8Array, signature: string, publicKey: string): boolean {
  try {
    // Prepare message
    let messageBytes: Uint8Array;
    if (typeof message === 'string') {
      const prefix = '\x19TRON Signed Message:\n';
      const fullMessage = prefix + message.length + message;
      messageBytes = new TextEncoder().encode(fullMessage);
    } else {
      messageBytes = message;
    }

    // Hash the message
    const messageHash = sha256(messageBytes);

    // Parse signature
    const signatureBytes = Buffer.from(signature, 'hex');
    const sig = secp256k1.Signature.fromDER(signatureBytes);

    // Parse public key
    const publicKeyHex = publicKey.replace(/^0x/, '').replace(/^04/, '');
    const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');

    // Verify signature
    return secp256k1.verify(sig, messageHash, publicKeyBytes);
  } catch {
    return false;
  }
}

/**
 * Recover public key from signature
 * @param message - Original message
 * @param signature - Signature (hex string)
 * @returns Recovered public key (hex string)
 */
export function recoverPublicKey(message: string | Uint8Array, signature: string): string | null {
  try {
    // Prepare message
    let messageBytes: Uint8Array;
    if (typeof message === 'string') {
      const prefix = '\x19TRON Signed Message:\n';
      const fullMessage = prefix + message.length + message;
      messageBytes = new TextEncoder().encode(fullMessage);
    } else {
      messageBytes = message;
    }

    // Hash the message
    const messageHash = sha256(messageBytes);

    // Parse signature
    const signatureBytes = Buffer.from(signature, 'hex');
    const sig = secp256k1.Signature.fromDER(signatureBytes);

    // Try both recovery IDs (0 and 1)
    for (let recovery = 0; recovery <= 1; recovery++) {
      try {
        const publicKey = sig.recoverPublicKey(messageHash);
        if (publicKey) {
          return Buffer.from(publicKey.toRawBytes(false)).toString('hex');
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Sign multiple transactions
 * @param transactions - Array of transactions to sign
 * @param privateKey - Private key (hex string without 0x prefix)
 * @returns Array of signed transactions
 */
export function signTransactions(transactions: TronTxBase[], privateKey: string): TronSignedTx[] {
  return transactions.map((tx) => signTransaction(tx, privateKey));
}

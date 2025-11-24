import type { TronContract, TronRawData, TronTxBase, TronTxParameter } from '@/types/tron/tx';
import { TRON_CONSTANTS, TRC20_METHOD_ID } from '@/constants/tron';
import { base58ToHexAddress } from './address';

/**
 * Build a TRX transfer transaction
 * @param from - Sender address (base58)
 * @param to - Recipient address (base58)
 * @param amount - Amount in SUN (1 TRX = 1,000,000 SUN)
 * @param refBlockBytes - Reference block bytes
 * @param refBlockHash - Reference block hash
 * @param expiration - Transaction expiration timestamp
 * @returns Unsigned transaction
 */
export function buildTrxTransferTx(
  from: string,
  to: string,
  amount: number,
  refBlockBytes: string,
  refBlockHash: string,
  expiration: number,
): TronTxBase {
  const ownerAddress = base58ToHexAddress(from);
  const toAddress = base58ToHexAddress(to);

  const parameter: TronTxParameter = {
    owner_address: ownerAddress,
    to_address: toAddress,
    amount,
  };

  const contract: TronContract = {
    parameter: {
      value: parameter,
      type_url: 'type.googleapis.com/protocol.TransferContract',
    },
    type: 'TransferContract',
  };

  const rawData: TronRawData = {
    contract: [contract],
    ref_block_bytes: refBlockBytes,
    ref_block_hash: refBlockHash,
    expiration,
    timestamp: Date.now(),
  };

  return {
    visible: false,
    raw_data: rawData,
    raw_data_hex: encodeRawData(rawData),
  };
}

/**
 * Build a TRC20 transfer transaction
 * @param from - Sender address (base58)
 * @param to - Recipient address (base58)
 * @param contractAddress - TRC20 contract address (base58)
 * @param amount - Amount in token's smallest unit
 * @param refBlockBytes - Reference block bytes
 * @param refBlockHash - Reference block hash
 * @param expiration - Transaction expiration timestamp
 * @param feeLimit - Fee limit in SUN
 * @returns Unsigned transaction
 */
export function buildTrc20TransferTx(
  from: string,
  to: string,
  contractAddress: string,
  amount: string,
  refBlockBytes: string,
  refBlockHash: string,
  expiration: number,
  feeLimit = 50_000_000,
): TronTxBase {
  const ownerAddress = base58ToHexAddress(from);
  const toAddressHex = base58ToHexAddress(to).replace(/^41/, '');
  const contractAddressHex = base58ToHexAddress(contractAddress);

  // Encode transfer function call
  // transfer(address,uint256)
  const methodId = TRC20_METHOD_ID.TRANSFER;
  const paddedAddress = toAddressHex.padStart(64, '0');
  const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
  const data = methodId + paddedAddress + paddedAmount;

  const parameter: TronTxParameter = {
    owner_address: ownerAddress,
    contract_address: contractAddressHex,
    data,
  };

  const contract: TronContract = {
    parameter: {
      value: parameter,
      type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
    },
    type: 'TriggerSmartContract',
  };

  const rawData: TronRawData = {
    contract: [contract],
    ref_block_bytes: refBlockBytes,
    ref_block_hash: refBlockHash,
    expiration,
    timestamp: Date.now(),
    fee_limit: feeLimit,
  };

  return {
    visible: false,
    raw_data: rawData,
    raw_data_hex: encodeRawData(rawData),
  };
}

/**
 * Build a TRC20 approve transaction
 * @param from - Approver address (base58)
 * @param spender - Spender address (base58)
 * @param contractAddress - TRC20 contract address (base58)
 * @param amount - Amount to approve in token's smallest unit
 * @param refBlockBytes - Reference block bytes
 * @param refBlockHash - Reference block hash
 * @param expiration - Transaction expiration timestamp
 * @param feeLimit - Fee limit in SUN
 * @returns Unsigned transaction
 */
export function buildTrc20ApproveTx(
  from: string,
  spender: string,
  contractAddress: string,
  amount: string,
  refBlockBytes: string,
  refBlockHash: string,
  expiration: number,
  feeLimit = 50_000_000,
): TronTxBase {
  const ownerAddress = base58ToHexAddress(from);
  const spenderAddressHex = base58ToHexAddress(spender).replace(/^41/, '');
  const contractAddressHex = base58ToHexAddress(contractAddress);

  // Encode approve function call
  // approve(address,uint256)
  const methodId = TRC20_METHOD_ID.APPROVE;
  const paddedAddress = spenderAddressHex.padStart(64, '0');
  const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
  const data = methodId + paddedAddress + paddedAmount;

  const parameter: TronTxParameter = {
    owner_address: ownerAddress,
    contract_address: contractAddressHex,
    data,
  };

  const contract: TronContract = {
    parameter: {
      value: parameter,
      type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
    },
    type: 'TriggerSmartContract',
  };

  const rawData: TronRawData = {
    contract: [contract],
    ref_block_bytes: refBlockBytes,
    ref_block_hash: refBlockHash,
    expiration,
    timestamp: Date.now(),
    fee_limit: feeLimit,
  };

  return {
    visible: false,
    raw_data: rawData,
    raw_data_hex: encodeRawData(rawData),
  };
}

/**
 * Encode raw transaction data to hex
 * @param rawData - Raw transaction data
 * @returns Hex encoded string
 */
function encodeRawData(rawData: TronRawData): string {
  // This is a simplified encoding. In production, you would use protobuf encoding
  // For now, we'll return a placeholder that should be replaced with actual protobuf encoding
  const json = JSON.stringify(rawData);
  return Buffer.from(json).toString('hex');
}

/**
 * Calculate transaction expiration time
 * @param delayMs - Delay in milliseconds (default: 60000 = 60 seconds)
 * @returns Expiration timestamp
 */
export function calculateExpiration(delayMs = TRON_CONSTANTS.TRANSACTION_EXPIRATION): number {
  return Date.now() + delayMs;
}

/**
 * Parse TRC20 transfer data
 * @param data - Transaction data (hex string)
 * @returns Parsed transfer info or null
 */
export function parseTrc20TransferData(data: string): { to: string; amount: string } | null {
  try {
    const cleanData = data.replace(/^0x/, '');
    const methodId = cleanData.slice(0, 8);

    if (methodId !== TRC20_METHOD_ID.TRANSFER) {
      return null;
    }

    const toAddress = '41' + cleanData.slice(8, 72).replace(/^0+/, '');
    const amount = BigInt('0x' + cleanData.slice(72, 136)).toString();

    return { to: toAddress, amount };
  } catch {
    return null;
  }
}

/**
 * Parse TRC20 approve data
 * @param data - Transaction data (hex string)
 * @returns Parsed approve info or null
 */
export function parseTrc20ApproveData(data: string): { spender: string; amount: string } | null {
  try {
    const cleanData = data.replace(/^0x/, '');
    const methodId = cleanData.slice(0, 8);

    if (methodId !== TRC20_METHOD_ID.APPROVE) {
      return null;
    }

    const spender = '41' + cleanData.slice(8, 72).replace(/^0+/, '');
    const amount = BigInt('0x' + cleanData.slice(72, 136)).toString();

    return { spender, amount };
  } catch {
    return null;
  }
}

/**
 * Estimate transaction size in bytes
 * @param transaction - Transaction object
 * @returns Estimated size in bytes
 */
export function estimateTxSize(transaction: TronTxBase): number {
  // Simplified estimation based on raw_data_hex length
  return transaction.raw_data_hex.length / 2;
}

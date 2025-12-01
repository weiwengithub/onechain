import type { TronAccountBalance, TronAccountResource, TronTrc20Balance } from '@/types/tron/balance';
import type { TronAccountInfo } from '@/types/tron/api';
import { TRON_RPC_METHOD, TRC20_METHOD_ID } from '@/constants/tron';
import { base58ToHexAddress } from '../address';

/**
 * Fetch TRX balance for an address
 * @param address - TRON address (base58)
 * @param rpcUrl - RPC endpoint URL
 * @returns Account balance in SUN
 */
export async function fetchTrxBalance(address: string, rpcUrl: string): Promise<TronAccountBalance> {
  const hexAddress = base58ToHexAddress(address);

  const url = `${rpcUrl}/${TRON_RPC_METHOD.GET_ACCOUNT}`;
  const requestBody = {
    address: hexAddress,
    visible: false,
  };

  console.log(`[fetchTrxBalance] Requesting ${url}`);
  console.log(`[fetchTrxBalance] Request body:`, requestBody);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`[fetchTrxBalance] Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[fetchTrxBalance] Error response:`, errorText);
    throw new Error(`Failed to fetch balance: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: TronAccountInfo = await response.json();
  console.log(`[fetchTrxBalance] Response data:`, data);

  return {
    address,
    balance: data.balance || 0,
  };
}

/**
 * Fetch TRC20 token balance
 * @param address - Owner address (base58)
 * @param contractAddress - Token contract address (base58)
 * @param rpcUrl - RPC endpoint URL
 * @returns Token balance
 */
export async function fetchTrc20Balance(address: string, contractAddress: string, rpcUrl: string): Promise<string> {
  const ownerAddressHex = base58ToHexAddress(address).replace(/^41/, '');
  const contractAddressHex = base58ToHexAddress(contractAddress);

  // Encode balanceOf(address) call
  const methodId = TRC20_METHOD_ID.BALANCE_OF;
  const paddedAddress = ownerAddressHex.padStart(64, '0');
  const parameter = methodId + paddedAddress;

  const response = await fetch(`${rpcUrl}/${TRON_RPC_METHOD.TRIGGER_CONSTANT_CONTRACT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      owner_address: base58ToHexAddress(address),
      contract_address: contractAddressHex,
      function_selector: 'balanceOf(address)',
      parameter,
      visible: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch TRC20 balance: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.constant_result || data.constant_result.length === 0) {
    return '0';
  }

  // Parse result as uint256
  const balanceHex = data.constant_result[0];
  return BigInt('0x' + balanceHex).toString();
}

/**
 * Fetch account resource (bandwidth and energy)
 * @param address - TRON address (base58)
 * @param rpcUrl - RPC endpoint URL
 * @returns Account resource information
 */
export async function fetchAccountResource(address: string, rpcUrl: string): Promise<TronAccountResource> {
  const hexAddress = base58ToHexAddress(address);

  const response = await fetch(`${rpcUrl}/${TRON_RPC_METHOD.GET_ACCOUNT_RESOURCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address: hexAddress,
      visible: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch account resource: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    freeNetLimit: data.freeNetLimit || 0,
    freeNetUsed: data.freeNetUsed || 0,
    NetLimit: data.NetLimit || 0,
    NetUsed: data.NetUsed || 0,
    EnergyLimit: data.EnergyLimit || 0,
    EnergyUsed: data.EnergyUsed || 0,
    assetNetUsed: data.assetNetUsed,
    assetNetLimit: data.assetNetLimit,
    TotalNetLimit: data.TotalNetLimit || 0,
    TotalNetWeight: data.TotalNetWeight || 0,
    TotalEnergyLimit: data.TotalEnergyLimit || 0,
    TotalEnergyWeight: data.TotalEnergyWeight || 0,
  };
}

/**
 * Fetch multiple TRC20 token balances
 * @param address - Owner address (base58)
 * @param contractAddresses - Array of token contract addresses (base58)
 * @param rpcUrl - RPC endpoint URL
 * @returns Array of token balances
 */
export async function fetchMultipleTrc20Balances(
  address: string,
  contractAddresses: string[],
  rpcUrl: string,
): Promise<Map<string, string>> {
  const balances = new Map<string, string>();

  await Promise.all(
    contractAddresses.map(async (contractAddress) => {
      try {
        const balance = await fetchTrc20Balance(address, contractAddress, rpcUrl);
        balances.set(contractAddress, balance);
      } catch (error) {
        console.error(`Failed to fetch balance for ${contractAddress}:`, error);
        balances.set(contractAddress, '0');
      }
    }),
  );

  return balances;
}

/**
 * Fetch TRC20 token information
 * @param contractAddress - Token contract address (base58)
 * @param rpcUrl - RPC endpoint URL
 * @returns Token information
 */
export async function fetchTrc20TokenInfo(contractAddress: string, rpcUrl: string): Promise<TronTrc20Balance> {
  const contractAddressHex = base58ToHexAddress(contractAddress);

  // Fetch name, symbol, decimals in parallel
  const [name, symbol, decimals] = await Promise.all([
    callTrc20Method(contractAddressHex, TRC20_METHOD_ID.NAME, '', rpcUrl),
    callTrc20Method(contractAddressHex, TRC20_METHOD_ID.SYMBOL, '', rpcUrl),
    callTrc20Method(contractAddressHex, TRC20_METHOD_ID.DECIMALS, '', rpcUrl),
  ]);

  return {
    contract_address: contractAddress,
    name: parseStringResult(name),
    symbol: parseStringResult(symbol),
    decimals: parseInt(decimals || '0', 16),
    balance: '0',
  };
}

/**
 * Call a TRC20 contract method
 * @param contractAddress - Contract address (hex with 41 prefix)
 * @param methodId - Method ID (8 hex characters)
 * @param parameter - Method parameter (hex string)
 * @param rpcUrl - RPC endpoint URL
 * @returns Result (hex string)
 */
async function callTrc20Method(contractAddress: string, methodId: string, parameter: string, rpcUrl: string): Promise<string> {
  const data = methodId + parameter;

  const response = await fetch(`${rpcUrl}/${TRON_RPC_METHOD.TRIGGER_CONSTANT_CONTRACT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      owner_address: contractAddress, // Use contract address as owner for view functions
      contract_address: contractAddress,
      data,
      visible: false,
    }),
  });

  if (!response.ok) {
    return '';
  }

  const result = await response.json();
  return result.constant_result?.[0] || '';
}

/**
 * Parse string result from contract call
 * @param hexResult - Hex encoded result
 * @returns Decoded string
 */
function parseStringResult(hexResult: string): string {
  if (!hexResult) return '';

  try {
    // Skip first 64 characters (offset)
    const lengthHex = hexResult.slice(64, 128);
    const length = parseInt(lengthHex, 16);
    const dataHex = hexResult.slice(128, 128 + length * 2);
    const buffer = Buffer.from(dataHex, 'hex');
    return buffer.toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Fetch TRX balances from multiple RPC endpoints
 * @param address - TRON address (base58)
 * @param rpcUrls - Array of RPC endpoint URLs
 * @param mainAssetDenom - Main asset denomination (e.g., 'TRX' for mainnet, could be different for testnet)
 * @returns Array of balance information
 */
export async function fetchTronBalances(
  address: string,
  rpcUrls: string[],
  mainAssetDenom = 'trx'
): Promise<any[]> {
  console.log(`[fetchTronBalances] Address: ${address}, Asset: ${mainAssetDenom}`);
  console.log(`[fetchTronBalances] Trying ${rpcUrls.length} RPC endpoints`);

  for (const rpcUrl of rpcUrls) {
    try {
      console.log(`[fetchTronBalances] Trying RPC: ${rpcUrl}`);
      const balanceData = await fetchTrxBalance(address, rpcUrl);

      // Balance is in SUN (1 TRX = 1,000,000 SUN)
      const balanceInSun = balanceData.balance.toString();

      console.log(`[fetchTronBalances] Success! Balance: ${balanceInSun} SUN`);

      return [
        {
          coinType: mainAssetDenom,
          totalBalance: balanceInSun,
        },
      ];
    } catch (error) {
      console.error(`[fetchTronBalances] Failed to fetch from ${rpcUrl}:`, error);
      continue;
    }
  }

  // If all RPCs failed, return empty balance
  console.warn(`[fetchTronBalances] All RPCs failed for address ${address}, returning 0 balance`);
  return [
    {
      coinType: mainAssetDenom,
      totalBalance: '0',
    },
  ];
}

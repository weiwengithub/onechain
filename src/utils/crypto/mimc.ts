/**
 * MiMC Sponge Hash Implementation
 * Used for Merkle tree hashing (compatible with privacy-sui contract)
 *
 * Based on Tornado Cash's MiMC implementation
 * Reference: /Users/C/dev/onechain/privacy-sui
 */

// @ts-ignore - snarkjs doesn't have proper TypeScript definitions
import { bn128, bigInt as snarkBigInt } from 'snarkjs';
// @ts-ignore - web3-utils types might be incomplete
import * as Web3Utils from 'web3-utils';

const F = bn128.Fr;
const SEED = 'mimcsponge';
const NROUNDS = 20;

/**
 * Get IV for MiMC
 * @param seed - Seed string (default: 'mimcsponge')
 * @returns BigInt IV value
 */
function getIV(seed: string = SEED): any {
  const c = Web3Utils.keccak256(seed + '_iv');
  const cn = snarkBigInt(Web3Utils.toBN(c).toString());
  const iv = cn.mod(F.q);
  return iv;
}

/**
 * Get round constants
 * @param seed - Seed string (default: 'mimcsponge')
 * @param nRounds - Number of rounds (default: 220)
 * @returns Array of round constants
 */
function getConstants(seed: string = SEED, nRounds: number = NROUNDS): any[] {
  const cts = new Array(nRounds);
  let c = Web3Utils.keccak256(seed);

  for (let i = 1; i < nRounds; i++) {
    c = Web3Utils.keccak256(c);
    const n1 = Web3Utils.toBN(c).mod(Web3Utils.toBN(F.q.toString()));
    const c2 = Web3Utils.padLeft(Web3Utils.toHex(n1), 64);
    cts[i] = snarkBigInt(Web3Utils.toBN(c2).toString());
  }

  cts[0] = snarkBigInt(0);
  cts[nRounds - 1] = snarkBigInt(0);

  return cts;
}

const CTS_VALUES = [
  '0',
  '7120861356467848435263064379192047478074060781135320967663101236819528304084',
  '5024705281721889198577876690145313457398658950011302225525409148828000436681',
  '17980351014018068290387269214713820287804403312720763401943303895585469787384',
  '19886576439381707240399940949310933992335779767309383709787331470398675714258',
  '1213715278223786725806155661738676903520350859678319590331207960381534602599',
  '18162138253399958831050545255414688239130588254891200470934232514682584734511',
  '7667462281466170157858259197976388676420847047604921256361474169980037581876',
  '7207551498477838452286210989212982851118089401128156132319807392460388436957',
  '9864183311657946807255900203841777810810224615118629957816193727554621093838',
  '4798196928559910300796064665904583125427459076060519468052008159779219347957',
  '17387238494588145257484818061490088963673275521250153686214197573695921400950',
  '10005334761930299057035055370088813230849810566234116771751925093634136574742',
  '11897542014760736209670863723231849628230383119798486487899539017466261308762',
  '16771780563523793011283273687253985566177232886900511371656074413362142152543',
  '749264854018824809464168489785113337925400687349357088413132714480582918506',
  '3683645737503705042628598550438395339383572464204988015434959428676652575331',
  '7556750851783822914673316211129907782679509728346361368978891584375551186255',
  '20391289379084797414557439284689954098721219201171527383291525676334308303023',
  '0',
];

const cts = CTS_VALUES.map((value) => snarkBigInt(value));

/**
 * MiMC hash function (single round)
 * @param xL_in - Left input
 * @param xR_in - Right input
 * @param k - Key
 * @returns Object with xL and xR outputs
 */
function hash(xL_in: any, xR_in: any, k: any): { xL: any; xR: any } {
  let xL = snarkBigInt(xL_in);
  let xR = snarkBigInt(xR_in);
  const key = snarkBigInt(k);

  for (let i = 0; i < NROUNDS; i++) {
    const c = cts[i];
    const t = i === 0 || i === NROUNDS - 1 ? F.add(xL, key) : F.add(F.add(xL, key), c);
    const xR_tmp = snarkBigInt(xR);

    if (i < NROUNDS - 1) {
      xR = xL;
      xL = F.add(xR_tmp, F.exp(t, 5));
    } else {
      xR = F.add(xR_tmp, F.exp(t, 5));
    }
  }

  return {
    xL: F.affine(xL),
    xR: F.affine(xR),
  };
}

/**
 * Multi-hash (sponge construction)
 * Hash multiple inputs using MiMC sponge
 * @param arr - Array of inputs to hash
 * @param key - Optional key (default: 0)
 * @param numOutputs - Number of outputs (default: 1)
 * @returns Single BigInt or array of BigInts
 */
export function multiHash(arr: any[], key?: any, numOutputs: number = 1): any {
  if (typeof key === 'undefined') {
    key = F.zero;
  }

  let R = F.zero;
  let C = F.zero;

  for (let i = 0; i < arr.length; i++) {
    R = F.add(R, snarkBigInt(arr[i]));
    const S = hash(R, C, key);
    R = S.xL;
    C = S.xR;
  }

  const outputs = [R];
  for (let i = 1; i < numOutputs; i++) {
    const S = hash(R, C, key);
    R = S.xL;
    C = S.xR;
    outputs.push(R);
  }

  if (numOutputs === 1) {
    return F.affine(outputs[0]);
  } else {
    return outputs.map((x: any) => F.affine(x));
  }
}

/**
 * Hash function for Merkle tree (hashes left and right children)
 * This is the main function used by MerkleTree class
 * @param left - Left child value (string or BigInt)
 * @param right - Right child value (string or BigInt)
 * @returns Hash result as string
 */
export function mimcHashLeftRight(left: string | bigint, right: string | bigint): string {
  const toFieldBigInt = (value: string | bigint): bigint => {
    const bigIntValue =
      typeof value === 'string'
        ? value.startsWith('0x')
          ? BigInt(value)
          : BigInt(value)
        : value;
    const fieldModulus = BigInt(F.q.toString());
    let normalized = bigIntValue % fieldModulus;
    if (normalized < 0) {
      normalized += fieldModulus;
    }
    return normalized;
  };

  const leftField = toFieldBigInt(left);
  const rightField = toFieldBigInt(right);

  const zeroKey = snarkBigInt(0).toString();
  const { xL: r1, xR: c1 } = hash(leftField.toString(), '0', zeroKey);
  const rPlusRight = F.add(snarkBigInt(r1), snarkBigInt(rightField.toString()));
  const { xL: final } = hash(rPlusRight.toString(), snarkBigInt(c1).toString(), zeroKey);

  return final.toString();
}

/**
 * Generate random field element (31 bytes)
 * Uses crypto.getRandomValues for secure randomness
 * @returns Random BigInt
 */
export function randomBigInt(): bigint {
  // Generate 31 bytes of random data (248 bits)
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

  // Convert to BigInt
  let value = BigInt(0);
  for (let i = 0; i < randomBytes.length; i++) {
    value = (value << BigInt(8)) | BigInt(randomBytes[i]);
  }

  // Ensure value is within field
  const fieldModulus = BigInt(F.q.toString());
  value = value % fieldModulus;

  return value;
}

/**
 * Compute commitment = MiMC(nullifier, secret)
 * This matches the privacy-sui contract implementation
 * @param nullifier - Nullifier as BigInt or hex string
 * @param secret - Secret as BigInt or hex string
 * @returns Commitment as hex string
 */
export function computeCommitment(nullifier: bigint | string, secret: bigint | string): string {
  // Convert inputs to BigInt if they're strings
  const nullifierBigInt = typeof nullifier === 'string' ? BigInt(nullifier) : nullifier;
  const secretBigInt = typeof secret === 'string' ? BigInt(secret) : secret;

  // Hash using MiMC multiHash
  const result = multiHash([nullifierBigInt.toString(), secretBigInt.toString()]);

  // Return as hex string
  return '0x' + result.toString(16).padStart(64, '0');
}

/**
 * Compute nullifierHash = MiMC(nullifier)
 * @param nullifier - Nullifier as BigInt or hex string
 * @returns Nullifier hash as hex string
 */
export function computeNullifierHash(nullifier: bigint | string): string {
  // Convert input to BigInt if it's a string
  const nullifierBigInt = typeof nullifier === 'string' ? BigInt(nullifier) : nullifier;

  // Hash using MiMC multiHash
  const result = multiHash([nullifierBigInt.toString()]);

  // Return as hex string
  return '0x' + result.toString(16).padStart(64, '0');
}

/**
 * Generate deposit secrets (nullifier, secret, commitment, nullifierHash)
 * This is the main function used by VoucherClient and PrivacyPoolClient
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
 * Convert big-endian commitment hex string to little-endian field element hex
 * (matches Move utils::bytes32_to_u256 behaviour)
 */
export function commitmentHexToFieldHex(commitmentHex: string): string {
  const bytes = hexToBytes(commitmentHex);
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    const value = BigInt(bytes[bytes.length - 1 - i]);
    result += value << (BigInt(i) * 8n);
  }
  return '0x' + result.toString(16).padStart(64, '0');
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
 * Convert SUI address to field element
 * @param address - SUI address hex string
 * @returns Field element as hex string
 */
export function addressToField(address: string): string {
  // SUI address is already 32 bytes hex
  const hex = address.startsWith('0x') ? address.slice(2) : address;
  const value = BigInt('0x' + hex);
  const fieldModulus = BigInt(F.q.toString());
  const fieldValue = value % fieldModulus;
  return '0x' + fieldValue.toString(16).padStart(64, '0');
}

/**
 * Convert number to field element
 * @param num - Number or BigInt
 * @returns Field element as hex string
 */
export function numberToField(num: number | bigint): string {
  const value = BigInt(num);
  const fieldModulus = BigInt(F.q.toString());
  const fieldValue = value % fieldModulus;
  return '0x' + fieldValue.toString(16).padStart(64, '0');
}

/**
 * MiMCUtils object - main export for use in other modules
 */
export const MiMCUtils = {
  hash,
  multiHash,
  mimcHashLeftRight,
  computeCommitment,
  computeNullifierHash,
  generateDepositSecrets,
  randomBigInt,
  hexToBytes,
  bytesToHex,
  commitmentHexToFieldHex,
  bigIntToLeBuffer,
  addressToField,
  numberToField,
  getIV,
  getConstants,
};

export default MiMCUtils;

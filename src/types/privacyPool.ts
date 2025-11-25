/**
 * Privacy Pool Type Definitions
 * 基于 Tornado Cash 的隐私池类型系统
 */

// Deposit Note 结构
export interface DepositNote {
  id: string;
  network: string;
  amount: string;
  denomination: number; // MIST 单位
  commitment: string;   // 十六进制字符串
  nullifier: string;    // 十六进制字符串
  secret: string;       // 十六进制字符串
  nullifierHash: string; // 十六进制字符串
  leafIndex: number;
  timestamp: number;
  txDigest?: string;
  noteString: string;   // 完整的 note 字符串,用于备份
  spent: boolean;       // 是否已提款
}

// Merkle Tree 节点
export interface MerkleTreeNode {
  value: string;        // 节点哈希值
  left?: MerkleTreeNode;
  right?: MerkleTreeNode;
}

// Merkle Proof
export interface MerkleProof {
  root: string;
  pathElements: string[];
  pathIndices: number[];
  leaf: string;
  leafIndex: number;
}

// ZK Proof 公开输入
export interface ZkProofPublicInputs {
  root: string;
  nullifierHash: string;
  recipient: string;    // 接收地址 (SUI address)
  relayer: string;      // 中继器地址
  fee: string;          // 中继费用
  refund: string;       // Gas 退款
}

// ZK Proof 私密输入
export interface ZkProofPrivateInputs {
  nullifier: string;
  secret: string;
  pathElements: string[];
  pathIndices: number[];
}

// 完整的 ZK Proof
export interface ZkProof {
  proof: Uint8Array;
  publicSignals: ZkProofPublicInputs;
}

// Groth16 Proof 格式 (snarkjs 输出)
export interface Groth16Proof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
}

// 存款事件
export interface DepositEvent {
  commitment: string;
  amount: number;
  leafIndex: number;
  timestamp: number;
}

// 提款事件
export interface WithdrawalEvent {
  nullifierHash: string;
  recipient: string;
  amount: number;
  timestamp: number;
}

// Privacy Pool 配置对象状态
export interface PrivacyPoolConfig {
  id: string;
  verifyingKey: Uint8Array;
  merkleTreeRoot: string;
  balance: string;
  totalDeposits: number;
  totalWithdrawals: number;
}

// Merkle Tree 状态
export interface MerkleTreeState {
  height: number;
  nextIndex: number;
  currentRoot: string;
  currentRootIndex: number;
  roots: string[];      // 历史根
  leaves: string[];     // 所有叶子节点
  filledSubtrees: string[]; // 每层最右边的哈希值
  zeros: string[];      // 预计算的零值
}

// 存款交易参数
export interface DepositParams {
  amount: number;       // MIST 单位
  commitment: string;
  coinIds: string[];    // 用于支付的 Coin Object IDs
}

// 提款交易参数
export interface WithdrawParams {
  note: DepositNote;
  recipient: string;    // 接收地址
  relayer?: string;     // 可选中继器
  fee?: number;         // 可选中继费用
}

// 隐私池统计信息
export interface PrivacyPoolStats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalBalance: string;
  anonymitySet: number;  // 匿名集大小 (同面额的存款数)
  avgDepositAmount: string;
  lastDepositTime: number;
  lastWithdrawalTime: number;
}

// 用户隐私池状态
export interface UserPrivacyPoolState {
  deposits: DepositNote[];
  unspentDeposits: DepositNote[];
  totalDeposited: string;
  totalWithdrawn: string;
  pendingDeposits: string[];  // 等待确认的交易
  pendingWithdrawals: string[];
}

// Poseidon Hash 输入
export interface PoseidonHashInput {
  inputs: (string | bigint)[];
}

// 隐私池操作历史
export interface PrivacyPoolTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  timestamp: number;
  txDigest: string;
  status: 'pending' | 'confirmed' | 'failed';
  note?: DepositNote;   // 仅存款有
  recipient?: string;   // 仅提款有
}

// 错误类型
export interface PrivacyPoolError {
  code: number;
  message: string;
  details?: any;
}

// 证明生成进度
export interface ProofGenerationProgress {
  stage: 'preparing' | 'hashing' | 'witness' | 'proof' | 'done';
  progress: number;     // 0-100
  message: string;
}

// 证明生成选项
export interface ProofGenerationOptions {
  onProgress?: (progress: ProofGenerationProgress) => void;
  timeout?: number;     // 毫秒
  useWebWorker?: boolean;
}

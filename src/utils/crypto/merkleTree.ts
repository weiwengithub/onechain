/**
 * Merkle Tree with History Implementation
 * 基于 Tornado Cash / privacy-sui 的 Merkle 树结构，使用 MiMC(20) 哈希。
 *
 * 核心要求：
 * - 零值常量必须与 Move 合约 (marklet_tree_with_history::zeros) 一致；
 * - 插入逻辑与合约保持一致：左节点为空时补全零值，右节点使用 filledSubtrees 缓存；
 * - 根历史长度遵循合约配置 (ROOT_HISTORY_SIZE)。
 */

import type { MerkleTreeState, MerkleProof } from '@/types/privacyPool';
import { PRIVACY_POOL_CONFIG } from '@/constants/privacyPool';
import { MERKLE_ZERO_HASHES } from '@/constants/privacyPoolShared';
import { mimcHashLeftRight } from './mimc';

// 使用 MiMC 作为 Merkle 树的哈希函数
const hashLeftRight = mimcHashLeftRight;

/**
 * 直接使用合约导出的零值常量，取前 height 个即可。
 */
function computeZeros(height: number): string[] {
  if (height > MERKLE_ZERO_HASHES.length) {
    throw new Error(`Merkle tree height ${height} exceeds zero constant table (${MERKLE_ZERO_HASHES.length})`);
  }

  return MERKLE_ZERO_HASHES.slice(0, height);
}

function normalize(value: string | bigint): string {
  if (typeof value === 'string') {
    return value.startsWith('0x') ? BigInt(value).toString() : value;
  }
  return value.toString();
}

/**
 * Merkle Tree 类，实现与 Move 合约相同的状态机。
 */
export class MerkleTree {
  private state: MerkleTreeState;

  constructor(height: number = PRIVACY_POOL_CONFIG.MERKLE_TREE_HEIGHT) {
    const zeros = computeZeros(height);

    this.state = {
      height,
      nextIndex: 0,
      currentRoot: zeros[height - 1],
      currentRootIndex: 0,
      roots: [zeros[height - 1]],
      leaves: [],
      filledSubtrees: [...zeros],
      zeros,
    };
  }

  /**
   * 从状态恢复 Merkle Tree
   */
  static fromState(state: MerkleTreeState): MerkleTree {
    const tree = Object.create(MerkleTree.prototype);
    tree.state = {
      height: state.height,
      nextIndex: state.nextIndex,
      currentRoot: state.currentRoot,
      currentRootIndex: state.currentRootIndex ?? 0,
      roots: [...state.roots],
      leaves: [...state.leaves],
      filledSubtrees: [...state.filledSubtrees],
      zeros: [...state.zeros],
    };
    return tree;
  }

  getState(): MerkleTreeState {
    return {
      height: this.state.height,
      nextIndex: this.state.nextIndex,
      currentRoot: this.state.currentRoot,
      currentRootIndex: this.state.currentRootIndex,
      roots: [...this.state.roots],
      leaves: [...this.state.leaves],
      filledSubtrees: [...this.state.filledSubtrees],
      zeros: [...this.state.zeros],
    };
  }

  /**
   * 插入单个叶子，与 Move 合约 insert 实现对应。
   */
  insert(rawLeaf: string | bigint): number {
    const leaf = normalize(rawLeaf);
    const leafIndex = this.state.nextIndex;

    if (leafIndex >= 2 ** this.state.height) {
      throw new Error('Merkle tree is full');
    }

    this.state.leaves.push(leaf);

    let currentIndex = leafIndex;
    let currentHash = leaf;

    for (let level = 0; level < this.state.height; level++) {
      if (currentIndex % 2 === 0) {
        // 当前节点在左边，右边使用预先计算的零值
        this.state.filledSubtrees[level] = currentHash;
        currentHash = hashLeftRight(currentHash, this.state.zeros[level]);
      } else {
        // 当前节点在右边，左边使用 cached filledSubtrees
        currentHash = hashLeftRight(this.state.filledSubtrees[level], currentHash);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    this.state.currentRoot = currentHash;
    this.state.currentRootIndex = (this.state.currentRootIndex + 1) % PRIVACY_POOL_CONFIG.ROOT_HISTORY_SIZE;
    if (this.state.roots.length < PRIVACY_POOL_CONFIG.ROOT_HISTORY_SIZE) {
      this.state.roots.push(currentHash);
    } else {
      this.state.roots[this.state.currentRootIndex] = currentHash;
    }

    this.state.nextIndex++;

    return leafIndex;
  }

  /**
   * 批量插入叶子（用于重建）
   */
  bulkInsert(leaves: Array<string | bigint>): number[] {
    return leaves.map((leaf) => this.insert(leaf));
  }

  /**
   * 生成 Merkle 证明
   */
  generateProof(leafIndex: number): MerkleProof {
    if (leafIndex < 0 || leafIndex >= this.state.leaves.length) {
      throw new Error('Leaf index out of bounds');
    }

    const pathElements: string[] = [];
    const pathIndices: number[] = [];

    let currentIndex = leafIndex;
    let currentHash = this.state.leaves[leafIndex];

    for (let level = 0; level < this.state.height; level++) {
      const isLeft = currentIndex % 2 === 0;
      pathIndices.push(isLeft ? 0 : 1);

      const sibling = isLeft
        ? this.getNodeAtLevel(level, currentIndex + 1)
        : this.getNodeAtLevel(level, currentIndex - 1);
      pathElements.push(sibling);

      currentHash = isLeft
        ? hashLeftRight(currentHash, pathElements[level])
        : hashLeftRight(pathElements[level], currentHash);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      root: this.getRoot(),
      pathElements,
      pathIndices,
      leaf: this.state.leaves[leafIndex],
      leafIndex,
    };
  }

  /**
   * 验证 Merkle 证明
   */
  verifyProof(proof: MerkleProof, root?: string): boolean {
    const computedRoot = this.computeRootFromProof(proof);
    const targetRoot = root ? normalize(root) : normalize(this.getRoot());
    return computedRoot === targetRoot;
  }

  computeRootFromProof(proof: MerkleProof): string {
    let currentHash = normalize(proof.leaf);

    for (let i = 0; i < proof.pathElements.length; i++) {
      const sibling = normalize(proof.pathElements[i]);
      const isLeft = proof.pathIndices[i] === 0;
      currentHash = isLeft ? hashLeftRight(currentHash, sibling) : hashLeftRight(sibling, currentHash);
    }

    return currentHash;
  }

  isKnownRoot(root: string | bigint): boolean {
    const normalized = normalize(root);
    const history = this.state.roots;
    if (!history.length) {
      return false;
    }

    let index = this.state.currentRootIndex;
    for (let i = 0; i < PRIVACY_POOL_CONFIG.ROOT_HISTORY_SIZE; i++) {
      if (index < history.length && history[index] === normalized) {
        return true;
      }
      if (index === 0) {
        index = PRIVACY_POOL_CONFIG.ROOT_HISTORY_SIZE;
      }
      index -= 1;
    }

    return false;
  }

  getRoot(): string {
    const index = this.state.currentRootIndex;
    return this.state.roots[index] ?? this.state.currentRoot;
  }

  getRoots(): string[] {
    return [...this.state.roots];
  }

  getLeafCount(): number {
    return this.state.leaves.length;
  }

  getLeaves(): string[] {
    return [...this.state.leaves];
  }

  hasLeaf(leaf: string | bigint): boolean {
    const normalized = normalize(leaf);
    return this.state.leaves.includes(normalized);
  }

  getLeafIndex(leaf: string | bigint): number {
    const normalized = normalize(leaf);
    return this.state.leaves.indexOf(normalized);
  }

  clear(): void {
    const zeros = computeZeros(this.state.height);
    this.state = {
      height: this.state.height,
      nextIndex: 0,
      currentRoot: zeros[this.state.height - 1],
      currentRootIndex: 0,
      roots: [zeros[this.state.height - 1]],
      leaves: [],
      filledSubtrees: [...zeros],
      zeros,
    };
  }

  toJSON(): string {
    return JSON.stringify(this.getState());
  }

  static fromJSON(json: string): MerkleTree {
    const state = JSON.parse(json) as MerkleTreeState;
    return MerkleTree.fromState(state);
  }

  /**
   * 递归获取指定层级节点，必要时补零
   */
  private getNodeAtLevel(level: number, index: number): string {
    if (level === 0) {
      return index < this.state.leaves.length ? this.state.leaves[index] : this.state.zeros[0];
    }

    const nodesInLevel = 2 ** (this.state.height - level);
    const leavesInSubtree = 2 ** level;

    if (index >= nodesInLevel) {
      return this.state.zeros[level];
    }

    const startLeafIndex = index * leavesInSubtree;
    if (startLeafIndex >= this.state.leaves.length) {
      return this.state.zeros[level];
    }

    const leftChild = this.getNodeAtLevel(level - 1, index * 2);
    const rightChild = this.getNodeAtLevel(level - 1, index * 2 + 1);
    return hashLeftRight(leftChild, rightChild);
  }
}

export function buildMerkleTreeFromCommitments(
  commitments: Array<string | bigint>,
  height: number = PRIVACY_POOL_CONFIG.MERKLE_TREE_HEIGHT,
): MerkleTree {
  const tree = new MerkleTree(height);
  tree.bulkInsert(commitments);
  return tree;
}

export default MerkleTree;

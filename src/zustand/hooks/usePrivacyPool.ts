/**
 * Privacy Pool Zustand Store
 * 隐私池状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DepositNote,
  PrivacyPoolTransaction,
  UserPrivacyPoolState,
  MerkleTreeState,
} from '@/types/privacyPool';
import { PRIVACY_POOL_STORAGE_KEYS } from '@/constants/privacyPool';

interface PrivacyPoolStore {
  // State from UserPrivacyPoolState
  deposits: DepositNote[];
  unspentDeposits: DepositNote[];
  totalDeposited: string;
  totalWithdrawn: string;
  pendingDeposits: string[];
  pendingWithdrawals: string[];

  // Merkle Tree 状态
  merkleTreeState: MerkleTreeState | null;

  // 交易历史
  transactions: PrivacyPoolTransaction[];

  // 同步状态
  isSyncing: boolean;
  lastSyncTime: number;

  // Actions
  addDeposit: (note: DepositNote) => void;
  updateDeposit: (id: string, updates: Partial<DepositNote>) => void;
  markDepositAsSpent: (id: string) => void;
  removeDeposit: (id: string) => void;

  addTransaction: (tx: PrivacyPoolTransaction) => void;
  updateTransaction: (id: string, updates: Partial<PrivacyPoolTransaction>) => void;

  setMerkleTreeState: (state: MerkleTreeState) => void;
  setSyncing: (syncing: boolean) => void;
  updateLastSyncTime: () => void;

  // Computed
  getUnspentDeposits: () => DepositNote[];
  getDepositById: (id: string) => DepositNote | undefined;
  getTransactionsByType: (type: 'deposit' | 'withdrawal') => PrivacyPoolTransaction[];
  getPendingTransactions: () => PrivacyPoolTransaction[];

  // Bulk operations
  clearAllData: () => void;
  importDeposits: (notes: DepositNote[]) => void;
}

export const usePrivacyPool = create<PrivacyPoolStore>()(
  persist(
    (set, get) => ({
      // Initial state
      deposits: [],
      unspentDeposits: [],
      totalDeposited: '0',
      totalWithdrawn: '0',
      pendingDeposits: [],
      pendingWithdrawals: [],
      merkleTreeState: null,
      transactions: [],
      isSyncing: false,
      lastSyncTime: 0,

      // Actions
      addDeposit: (note) => {
        set((state) => ({
          deposits: [...state.deposits, note],
          unspentDeposits: note.spent
            ? state.unspentDeposits
            : [...state.unspentDeposits, note],
        }));
      },

      updateDeposit: (id, updates) => {
        set((state) => {
          const deposits = state.deposits.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          );

          const unspentDeposits = deposits.filter((d) => !d.spent);

          return { deposits, unspentDeposits };
        });
      },

      markDepositAsSpent: (id) => {
        get().updateDeposit(id, { spent: true });
      },

      removeDeposit: (id) => {
        set((state) => ({
          deposits: state.deposits.filter((d) => d.id !== id),
          unspentDeposits: state.unspentDeposits.filter((d) => d.id !== id),
        }));
      },

      addTransaction: (tx) => {
        set((state) => ({
          transactions: [tx, ...state.transactions].slice(0, 100), // Keep last 100
        }));
      },

      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx
          ),
        }));
      },

      setMerkleTreeState: (merkleTreeState) => {
        set({ merkleTreeState });
      },

      setSyncing: (isSyncing) => {
        set({ isSyncing });
      },

      updateLastSyncTime: () => {
        set({ lastSyncTime: Date.now() });
      },

      // Computed getters
      getUnspentDeposits: () => {
        return get().deposits.filter((d) => !d.spent);
      },

      getDepositById: (id) => {
        return get().deposits.find((d) => d.id === id);
      },

      getTransactionsByType: (type) => {
        return get().transactions.filter((tx) => tx.type === type);
      },

      getPendingTransactions: () => {
        return get().transactions.filter((tx) => tx.status === 'pending');
      },

      // Bulk operations
      clearAllData: () => {
        set({
          deposits: [],
          unspentDeposits: [],
          totalDeposited: '0',
          totalWithdrawn: '0',
          pendingDeposits: [],
          pendingWithdrawals: [],
          merkleTreeState: null,
          transactions: [],
          lastSyncTime: 0,
        });
      },

      importDeposits: (notes) => {
        set((state) => ({
          deposits: [...state.deposits, ...notes],
          unspentDeposits: [
            ...state.unspentDeposits,
            ...notes.filter((n) => !n.spent),
          ],
        }));
      },
    }),
    {
      name: PRIVACY_POOL_STORAGE_KEYS.DEPOSITS,
      partialize: (state) => ({
        deposits: state.deposits,
        transactions: state.transactions,
        merkleTreeState: state.merkleTreeState,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

// Selectors
export const selectUnspentDeposits = (state: PrivacyPoolStore) =>
  state.deposits.filter((d) => !d.spent);

export const selectDepositsByNetwork = (network: string) => (state: PrivacyPoolStore) =>
  state.deposits.filter((d) => d.network === network);

export const selectTotalBalance = (state: PrivacyPoolStore) => {
  const total = state.deposits
    .filter((d) => !d.spent)
    .reduce((sum, d) => sum + d.denomination, 0);
  return `${total / 1e9} SUI`;
};

export const selectRecentTransactions = (limit: number = 10) => (state: PrivacyPoolStore) =>
  state.transactions.slice(0, limit);

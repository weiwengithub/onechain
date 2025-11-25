/**
 * Voucher Zustand Store
 * 支票状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Voucher, VoucherTransaction } from '@/types/voucher';
import { VOUCHER_STORAGE_KEYS } from '@/constants/voucher';

interface VoucherState {
  issuedVouchers: Voucher[];
  redeemedVouchers: Voucher[];
  transactions: VoucherTransaction[];

  addIssuedVoucher: (voucher: Voucher) => void;
  updateIssuedVoucher: (id: string, updates: Partial<Voucher>) => void;
  removeIssuedVoucher: (id: string) => void;

  addRedeemedVoucher: (voucher: Voucher) => void;
  updateRedeemedVoucher: (id: string, updates: Partial<Voucher>) => void;
  removeRedeemedVoucher: (id: string) => void;

  addTransaction: (transaction: VoucherTransaction) => void;
  updateTransaction: (id: string, updates: Partial<VoucherTransaction>) => void;

  getIssuedVoucherById: (id: string) => Voucher | undefined;
  getRedeemedVoucherById: (id: string) => Voucher | undefined;
  getIssuedVoucherByCode: (voucherCode: string) => Voucher | undefined;
  getIssuedVouchersByNetwork: (network: string) => Voucher[];
  getRedeemedVouchersByNetwork: (network: string) => Voucher[];
  getIssuedVouchersByAccount: (accountAddress: string) => Voucher[];
  getRedeemedVouchersByAccount: (accountAddress: string) => Voucher[];
  getTransactionsByVoucherId: (voucherId: string) => VoucherTransaction[];

  clearAll: () => void;
}

export const useVoucherStore = create<VoucherState>()(
  persist(
    (set, get) => ({
      issuedVouchers: [],
      redeemedVouchers: [],
      transactions: [],

      addIssuedVoucher: (voucher) =>
        set((state) => {
          const timestamp = voucher.timestamp ?? Date.now();
          return {
            issuedVouchers: [...state.issuedVouchers, { ...voucher, timestamp }],
          };
        }),

      updateIssuedVoucher: (id, updates) =>
        set((state) => ({
          issuedVouchers: state.issuedVouchers.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          ),
        })),

      removeIssuedVoucher: (id) =>
        set((state) => ({
          issuedVouchers: state.issuedVouchers.filter((v) => v.id !== id),
        })),

      addRedeemedVoucher: (voucher) =>
        set((state) => {
          const redeemTime = voucher.redeemTime ?? Date.now();
          return {
            redeemedVouchers: [
              ...state.redeemedVouchers,
              {
                ...voucher,
                redeemed: true,
                redeemTime,
              },
            ],
          };
        }),

      updateRedeemedVoucher: (id, updates) =>
        set((state) => ({
          redeemedVouchers: state.redeemedVouchers.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          ),
        })),

      removeRedeemedVoucher: (id) =>
        set((state) => ({
          redeemedVouchers: state.redeemedVouchers.filter((v) => v.id !== id),
        })),

      // Add transaction
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [...state.transactions, transaction],
        })),

      // Update transaction
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      getIssuedVoucherById: (id) => {
        return get().issuedVouchers.find((v) => v.id === id);
      },

      getRedeemedVoucherById: (id) => {
        return get().redeemedVouchers.find((v) => v.id === id);
      },

      getIssuedVoucherByCode: (voucherCode) => {
        return get().issuedVouchers.find((v) => v.voucherCode === voucherCode);
      },

      getIssuedVouchersByNetwork: (network) => {
        return get().issuedVouchers.filter((v) => v.network === network);
      },

      getRedeemedVouchersByNetwork: (network) => {
        return get().redeemedVouchers.filter((v) => v.network === network);
      },

      getIssuedVouchersByAccount: (accountAddress) => {
        return get().issuedVouchers.filter((v) => v.accountAddress === accountAddress);
      },

      getRedeemedVouchersByAccount: (accountAddress) => {
        return get().redeemedVouchers.filter((v) => v.accountAddress === accountAddress);
      },

      // Get transactions by voucher ID
      getTransactionsByVoucherId: (voucherId) => {
        return get().transactions.filter((t) => t.voucherId === voucherId);
      },

      // Clear all data
      clearAll: () =>
        set({
          issuedVouchers: [],
          redeemedVouchers: [],
          transactions: [],
        }),
    }),
    {
      name: VOUCHER_STORAGE_KEYS.VOUCHERS,
      migrate: (persistedState: unknown) => {
        const state = persistedState as Partial<VoucherState> & { vouchers?: Voucher[] };
        if (state && state.vouchers && !state.issuedVouchers) {
          const issued = state.vouchers ?? [];
          return {
            ...state,
            issuedVouchers: issued,
            redeemedVouchers: state.redeemedVouchers ?? [],
            vouchers: undefined,
          };
        }
        return state;
      },
    }
  )
);

export const selectIssuedVouchers = (state: VoucherState) => state.issuedVouchers;

export const selectRedeemedVouchers = (state: VoucherState) => state.redeemedVouchers;

export const selectTotalValue = (state: VoucherState) => {
  const total = state.issuedVouchers.reduce((sum, v) => sum + v.denomination, 0);
  return `${total / 1e9} OCT`;
};

export const selectUnredeemedValue = (state: VoucherState) => {
  const total = state.issuedVouchers
    .filter((v) => !v.redeemed)
    .reduce((sum, v) => sum + v.denomination, 0);
  return `${total / 1e9} OCT`;
};

// Hook
export function useVoucher() {
  return useVoucherStore();
}

export default useVoucherStore;

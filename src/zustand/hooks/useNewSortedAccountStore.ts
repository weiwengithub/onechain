import { produce } from 'immer';
import { create } from 'zustand';

import type { NewSortedAccountState, NewSortedAccountStore } from '@/types/store/newSortedAccount';

const initialState: NewSortedAccountState = {
  menmonicRestoreStrings: [],
  privateKeyAccountIds: [],
  zkLoginAccountIds: [],
};

export const useNewSortedAccountStore = create<NewSortedAccountStore>()((set) => ({
  ...initialState,
  updatedNewSortedMnemonicAccounts: async (account) => {
    set((state) =>
      produce(state, (draft) => {
        draft.menmonicRestoreStrings = account;
      }),
    );
  },
  updatedNewSortedPrivateAccounts: async (account) => {
    set((state) =>
      produce(state, (draft) => {
        draft.privateKeyAccountIds = account;
      }),
    );
  },
  updatedNewSortedZkLoginAccounts: async (account) => {
    set((state) =>
      produce(state, (draft) => {
        draft.zkLoginAccountIds = account;
      }),
    );
  },
  resetNewSortedAccount: () => {
    set(initialState);
  },
}));

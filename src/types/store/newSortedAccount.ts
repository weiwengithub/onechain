type NewSortedMnemonicAccount = string[];
type NewSortedPrivatedAccount = string[];
type NewSortedZkLoginAccount = string[];

export interface NewSortedAccountState {
  menmonicRestoreStrings: NewSortedMnemonicAccount;
  privateKeyAccountIds: NewSortedPrivatedAccount;
  zkLoginAccountIds: NewSortedZkLoginAccount;
}

export type NewSortedAccountActions = {
  updatedNewSortedMnemonicAccounts: (newSorted: NewSortedAccountState['menmonicRestoreStrings']) => void;
  updatedNewSortedPrivateAccounts: (newSorted: NewSortedAccountState['privateKeyAccountIds']) => void;
  updatedNewSortedZkLoginAccounts: (newSorted: NewSortedAccountState['zkLoginAccountIds']) => void;
  resetNewSortedAccount: () => void;
};

export type NewSortedAccountStore = NewSortedAccountState & NewSortedAccountActions;

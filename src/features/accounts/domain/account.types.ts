export type AccountType = 'cash' | 'bank' | 'wallet' | 'credit-card' | 'other';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  initialBalanceCents: number;
  currency: string;
};

export type AccountBalance = Account & {
  balanceCents: number;
};

export type AccountDraft = {
  name: string;
  type: AccountType;
  initialBalanceCents: number;
};

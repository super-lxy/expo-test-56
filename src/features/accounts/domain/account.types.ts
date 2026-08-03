/** 账户性质：资产 or 负债 */
export type AccountKind = 'asset' | 'liability';

export type AccountType =
  // 资金 · 资产
  | 'cash'
  | 'bank'
  | 'alipay'
  | 'wechat'
  | 'transit-card'
  | 'meal-card'
  | 'shopping-card'
  | 'housing-fund'
  | 'wallet'
  // 资金 · 负债
  | 'credit-card'
  | 'huabei'
  | 'baitiao'
  // 投资
  | 'fund'
  | 'stock'
  | 'deposit'
  // 应收 / 应付
  | 'receivable'
  | 'payable'
  | 'other';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  kind: AccountKind;
  icon: string;
  color: string;
  initialBalanceCents: number;
  currency: string;
};

export type AccountBalance = Account & {
  balanceCents: number;
};

export type AccountDraft = {
  name: string;
  type: AccountType;
  kind: AccountKind;
  icon: string;
  color: string;
  initialBalanceCents: number;
};

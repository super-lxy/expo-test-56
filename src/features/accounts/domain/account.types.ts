/** 账户性质：资产 or 负债 */
export type AccountKind = 'asset' | 'liability';

/** 资产状态：使用中 / 隐藏 / 封存 */
export type AccountStatus = 'active' | 'hidden' | 'frozen';

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
  | 'douyin-pay'
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
  /** 信用额度（分），仅 hasBillingCycle 类型有意义，null 表示未设置 */
  creditLimitCents: number | null;
  /** 账单日，1-28，null 表示未设置。仅 hasBillingCycle 类型有意义。 */
  statementDay: number | null;
  /** 还款日，1-28，null 表示未设置。仅 hasBillingCycle 类型有意义。 */
  dueDay: number | null;
  /** 资产状态 */
  status: AccountStatus;
  /** 是否计入净资产统计 */
  includeInNetWorth: boolean;
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
  creditLimitCents?: number | null;
  statementDay?: number | null;
  dueDay?: number | null;
  status?: AccountStatus;
  includeInNetWorth?: boolean;
};

import type { AccountBalance, AccountType } from './account.types';

const CREDIT_ACCOUNT_TYPES = new Set<AccountType>([
  'credit-card',
  'huabei',
  'baitiao',
  'douyin-pay',
]);

export function isCreditAccountType(type: AccountType) {
  return CREDIT_ACCOUNT_TYPES.has(type);
}

/** A liability balance is signed: debt is negative, overpayment is positive. */
export function getDebtCents(account: Pick<AccountBalance, 'kind' | 'balanceCents'>) {
  return account.kind === 'liability' ? Math.max(0, -account.balanceCents) : 0;
}

export function getAvailableCreditCents(
  account: Pick<AccountBalance, 'creditLimitCents' | 'kind' | 'balanceCents'>,
) {
  if (account.creditLimitCents === null) return null;
  return Math.max(0, account.creditLimitCents - getDebtCents(account));
}

export function summarizeNetWorth(accounts: AccountBalance[]) {
  const included = accounts.filter((account) => account.includeInNetWorth);
  const totalAssets = included
    .filter((account) => account.kind !== 'liability')
    .reduce((sum, account) => sum + account.balanceCents, 0);
  const totalLiabilities = included.reduce((sum, account) => sum + getDebtCents(account), 0);

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}

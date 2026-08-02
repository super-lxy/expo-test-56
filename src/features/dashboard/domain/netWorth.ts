import type { AccountBalance } from '@/features/accounts/domain/account.types';
import type { Transaction } from '@/features/transactions/domain/transaction.types';

export function buildNetWorthTrend(accounts: AccountBalance[], transactions: Transaction[]) {
  let balance = accounts.reduce((sum, account) => sum + account.initialBalanceCents, 0);
  const values = [balance];

  for (const transaction of [...transactions].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) {
    if (transaction.type === 'income') {
      balance += transaction.amountCents;
    } else if (transaction.type === 'expense') {
      balance -= transaction.amountCents;
    }
    values.push(balance);
  }

  if (values.length === 1) {
    return Array.from({ length: 8 }, () => balance);
  }

  return values.slice(-8);
}

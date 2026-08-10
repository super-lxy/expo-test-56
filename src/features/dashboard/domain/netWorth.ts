import type { AccountBalance } from '@/features/accounts/domain/account.types';
import type { Transaction } from '@/features/transactions/domain/transaction.types';

function getTransactionNetChange(transaction: Transaction, includedAccountIds: Set<string>) {
  const sourceIncluded = includedAccountIds.has(transaction.accountId);

  if (transaction.type === 'income') {
    return sourceIncluded ? transaction.amountCents : 0;
  }
  if (transaction.type === 'expense') {
    return sourceIncluded ? -transaction.amountCents : 0;
  }

  const targetIncluded = transaction.transferAccountId
    ? includedAccountIds.has(transaction.transferAccountId)
    : false;
  const transferredOut = transaction.amountCents + transaction.feeCents - transaction.discountCents;

  return (sourceIncluded ? -transferredOut : 0) + (targetIncluded ? transaction.amountCents : 0);
}

/** 按时间段采样，返回均匀分布的净资产数据点和 X 轴标签 */
export function buildNetWorthByPeriod(
  accounts: AccountBalance[],
  transactions: Transaction[],
  days: number,
): { values: number[]; xLabels: string[] } {
  const now = Date.now();
  const startTime = now - days * 86400 * 1000;
  // 负债账户的初始金额是「欠款」（正数存储），净资产里要减掉
  const initialBalance = accounts.reduce(
    (sum, a) => sum + (a.kind === 'liability' ? -a.initialBalanceCents : a.initialBalanceCents),
    0,
  );

  const includedAccountIds = new Set(accounts.map((account) => account.id));
  const sorted = transactions
    .filter((transaction) => (
      includedAccountIds.has(transaction.accountId)
      || Boolean(transaction.transferAccountId && includedAccountIds.has(transaction.transferAccountId))
    ))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const SAMPLES = 20;
  const values: number[] = [];
  const xLabels: string[] = [];

  for (let i = 0; i <= SAMPLES; i++) {
    const sampleTime = startTime + (i / SAMPLES) * (now - startTime);
    const sampleISO = new Date(sampleTime).toISOString();

    let balance = initialBalance;
    for (const tx of sorted) {
      if (tx.occurredAt > sampleISO) break;
      balance += getTransactionNetChange(tx, includedAccountIds);
    }
    values.push(balance);

    // 只在首、中、末显示日期标签
    if (i === 0 || i === 10 || i === SAMPLES) {
      const d = new Date(sampleTime);
      xLabels.push(`${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`);
    } else {
      xLabels.push('');
    }
  }

  return { values, xLabels };
}

/** 兼容旧版调用（首页最近8笔基于交易次序） */
export function buildNetWorthTrend(accounts: AccountBalance[], transactions: Transaction[]) {
  let balance = accounts.reduce(
    (sum, a) => sum + (a.kind === 'liability' ? -a.initialBalanceCents : a.initialBalanceCents),
    0,
  );
  const values = [balance];

  const includedAccountIds = new Set(accounts.map((account) => account.id));
  const includedTransactions = transactions
    .filter((transaction) => (
      includedAccountIds.has(transaction.accountId)
      || Boolean(transaction.transferAccountId && includedAccountIds.has(transaction.transferAccountId))
    ))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  for (const transaction of includedTransactions) {
    balance += getTransactionNetChange(transaction, includedAccountIds);
    values.push(balance);
  }

  if (values.length === 1) return Array.from({ length: 8 }, () => balance);
  return values.slice(-8);
}

import type { AccountBalance } from '@/features/accounts/domain/account.types';
import type { Transaction } from '@/features/transactions/domain/transaction.types';

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

  const sorted = [...transactions].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const SAMPLES = 20;
  const values: number[] = [];
  const xLabels: string[] = [];

  for (let i = 0; i <= SAMPLES; i++) {
    const sampleTime = startTime + (i / SAMPLES) * (now - startTime);
    const sampleISO = new Date(sampleTime).toISOString();

    let balance = initialBalance;
    for (const tx of sorted) {
      if (tx.occurredAt > sampleISO) break;
      if (tx.type === 'income') balance += tx.amountCents;
      else if (tx.type === 'expense') balance -= tx.amountCents;
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

  for (const transaction of [...transactions].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) {
    if (transaction.type === 'income') balance += transaction.amountCents;
    else if (transaction.type === 'expense') balance -= transaction.amountCents;
    values.push(balance);
  }

  if (values.length === 1) return Array.from({ length: 8 }, () => balance);
  return values.slice(-8);
}

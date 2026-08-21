import type { ReimbursementDraft } from '@/features/transactions/domain/transaction.types';

export function validateReimbursementDraft(draft: ReimbursementDraft) {
  if (!Number.isInteger(draft.amountCents) || draft.amountCents <= 0) {
    return '请输入大于 0 的报销金额';
  }
  if (!draft.receiveAccountId) return '请选择收款账户';
  if (new Set(draft.expenseTransactionIds).size === 0) {
    return '请至少选择一笔需要报销的账单';
  }
  if (Number.isNaN(new Date(draft.occurredAt).getTime())) {
    return '请选择有效的报销时间';
  }
  return null;
}

import type { TransactionDraft } from './transaction.types';

export function validateTransactionDraft(draft: TransactionDraft) {
  if (!Number.isInteger(draft.amountCents) || draft.amountCents <= 0) {
    return '请输入大于 0 的金额';
  }
  if (!draft.categoryId) {
    return '请选择分类';
  }
  if (!draft.accountId) {
    return '请选择账户';
  }
  if (draft.type === 'transfer' && !draft.transferAccountId) {
    return '请选择转入账户';
  }
  if (draft.type === 'transfer' && draft.accountId === draft.transferAccountId) {
    return '转出和转入账户不能相同';
  }
  return null;
}

import { EXTERNAL_TRANSFER_ACCOUNT_ID } from '@/features/accounts/domain/systemAccounts';
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
  if (
    draft.type === 'transfer' &&
    draft.accountId === EXTERNAL_TRANSFER_ACCOUNT_ID &&
    draft.transferAccountId === EXTERNAL_TRANSFER_ACCOUNT_ID
  ) {
    return '至少选择一个具体账户';
  }
  if (draft.type === 'transfer' && draft.accountId === draft.transferAccountId) {
    return '转出和转入账户不能相同';
  }
  if (!Number.isInteger(draft.feeCents ?? 0) || (draft.feeCents ?? 0) < 0) {
    return '手续费不能小于 0';
  }
  if (!Number.isInteger(draft.discountCents ?? 0) || (draft.discountCents ?? 0) < 0) {
    return '优惠不能小于 0';
  }
  if (draft.type === 'transfer' && (draft.discountCents ?? 0) > draft.amountCents + (draft.feeCents ?? 0)) {
    return '优惠不能大于转出金额与手续费之和';
  }
  return null;
}

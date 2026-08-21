import type { ReimbursementDraft } from '@/features/transactions/domain/transaction.types';
import { validateReimbursementDraft } from '../reimbursement.rules';

describe('validateReimbursementDraft', () => {
  const validDraft: ReimbursementDraft = {
    amountCents: 12800,
    sourceAccountId: 'credit-card',
    receiveAccountId: 'cash',
    expenseTransactionIds: ['expense-1'],
    occurredAt: '2026-08-20T10:00:00.000Z',
    note: '',
    excludedFromStats: true,
  };

  it('接受完整的报销草稿', () => {
    expect(validateReimbursementDraft(validDraft)).toBeNull();
  });

  it('拒绝无效金额', () => {
    expect(validateReimbursementDraft({ ...validDraft, amountCents: 0 })).toBe('请输入大于 0 的报销金额');
  });

  it('允许不选择报销账户', () => {
    expect(validateReimbursementDraft({ ...validDraft, sourceAccountId: undefined })).toBeNull();
  });

  it('要求收款账户', () => {
    expect(validateReimbursementDraft({ ...validDraft, receiveAccountId: '' })).toBe('请选择收款账户');
  });

  it('要求至少一笔原支出账单', () => {
    expect(validateReimbursementDraft({ ...validDraft, expenseTransactionIds: [] })).toBe('请至少选择一笔需要报销的账单');
  });

  it('拒绝无效日期', () => {
    expect(validateReimbursementDraft({ ...validDraft, occurredAt: 'invalid' })).toBe('请选择有效的报销时间');
  });
});

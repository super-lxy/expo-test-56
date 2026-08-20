import { validateTransactionDraft } from '../transaction.rules';
import type { TransactionDraft } from '../transaction.types';
import { EXTERNAL_TRANSFER_ACCOUNT_ID } from '@/features/accounts/domain/systemAccounts';

describe('validateTransactionDraft', () => {
  const validDraft: TransactionDraft = {
    type: 'expense',
    amountCents: 10000,
    categoryId: 'food',
    accountId: 'cash',
    occurredAt: new Date().toISOString(),
    note: '午餐',
  };

  describe('金额验证', () => {
    it('应该拒绝负数金额', () => {
      const draft = { ...validDraft, amountCents: -100 };
      expect(validateTransactionDraft(draft)).toBe('请输入大于 0 的金额');
    });

    it('应该拒绝零金额', () => {
      const draft = { ...validDraft, amountCents: 0 };
      expect(validateTransactionDraft(draft)).toBe('请输入大于 0 的金额');
    });

    it('应该拒绝非整数金额', () => {
      const draft = { ...validDraft, amountCents: 10.5 };
      expect(validateTransactionDraft(draft)).toBe('请输入大于 0 的金额');
    });

    it('应该接受正整数金额', () => {
      const draft = { ...validDraft, amountCents: 10000 };
      expect(validateTransactionDraft(draft)).toBeNull();
    });
  });

  describe('分类验证', () => {
    it('应该拒绝空分类', () => {
      const draft = { ...validDraft, categoryId: '' };
      expect(validateTransactionDraft(draft)).toBe('请选择分类');
    });

    it('应该接受有效分类', () => {
      const draft = { ...validDraft, categoryId: 'food-breakfast' };
      expect(validateTransactionDraft(draft)).toBeNull();
    });
  });

  describe('账户验证', () => {
    it('应该拒绝空账户', () => {
      const draft = { ...validDraft, accountId: '' };
      expect(validateTransactionDraft(draft)).toBe('请选择账户');
    });

    it('应该接受有效账户', () => {
      const draft = { ...validDraft, accountId: 'bank-card-001' };
      expect(validateTransactionDraft(draft)).toBeNull();
    });
  });

  describe('转账验证', () => {
    const transferDraft: TransactionDraft = {
      type: 'transfer',
      amountCents: 10000,
      categoryId: 'transfer',
      accountId: 'cash',
      occurredAt: new Date().toISOString(),
      note: '',
    };

    it('应该要求指定转入账户', () => {
      const draft = { ...transferDraft };
      expect(validateTransactionDraft(draft)).toBe('请选择转入账户');
    });

    it('应该拒绝转出和转入账户相同', () => {
      const draft = { ...transferDraft, transferAccountId: 'cash' };
      expect(validateTransactionDraft(draft)).toBe('转出和转入账户不能相同');
    });

    it('应该拒绝两个外部转账端点', () => {
      const draft = {
        ...transferDraft,
        accountId: EXTERNAL_TRANSFER_ACCOUNT_ID,
        transferAccountId: EXTERNAL_TRANSFER_ACCOUNT_ID,
      };
      expect(validateTransactionDraft(draft)).toBe('至少选择一个具体账户');
    });

    it('应该接受有效转账', () => {
      const draft = { ...transferDraft, transferAccountId: 'bank-card' };
      expect(validateTransactionDraft(draft)).toBeNull();
    });
  });

  describe('手续费和优惠验证', () => {
    it('应该拒绝负数手续费', () => {
      const draft = { ...validDraft, feeCents: -100 };
      expect(validateTransactionDraft(draft)).toBe('手续费不能小于 0');
    });

    it('应该拒绝非整数手续费', () => {
      const draft = { ...validDraft, feeCents: 10.5 };
      expect(validateTransactionDraft(draft)).toBe('手续费不能小于 0');
    });

    it('应该拒绝负数优惠', () => {
      const draft = { ...validDraft, discountCents: -100 };
      expect(validateTransactionDraft(draft)).toBe('优惠不能小于 0');
    });

    it('应该拒绝非整数优惠', () => {
      const draft = { ...validDraft, discountCents: 10.5 };
      expect(validateTransactionDraft(draft)).toBe('优惠不能小于 0');
    });

    it('应该接受零手续费和优惠', () => {
      const draft = { ...validDraft, feeCents: 0, discountCents: 0 };
      expect(validateTransactionDraft(draft)).toBeNull();
    });

    it('应该接受正整数手续费和优惠', () => {
      const draft = { ...validDraft, feeCents: 100, discountCents: 50 };
      expect(validateTransactionDraft(draft)).toBeNull();
    });
  });

  describe('转账优惠验证', () => {
    const transferDraft: TransactionDraft = {
      type: 'transfer',
      amountCents: 10000,
      categoryId: 'transfer',
      accountId: 'cash',
      transferAccountId: 'bank-card',
      occurredAt: new Date().toISOString(),
      note: '',
    };

    it('应该拒绝优惠大于转出金额与手续费之和', () => {
      const draft = {
        ...transferDraft,
        feeCents: 100,
        discountCents: 10200, // > 10000 + 100
      };
      expect(validateTransactionDraft(draft)).toBe('优惠不能大于转出金额与手续费之和');
    });

    it('应该接受优惠等于转出金额与手续费之和', () => {
      const draft = {
        ...transferDraft,
        feeCents: 100,
        discountCents: 10100, // = 10000 + 100
      };
      expect(validateTransactionDraft(draft)).toBeNull();
    });

    it('应该接受优惠小于转出金额与手续费之和', () => {
      const draft = {
        ...transferDraft,
        feeCents: 100,
        discountCents: 5000, // < 10000 + 100
      };
      expect(validateTransactionDraft(draft)).toBeNull();
    });
  });

  describe('完整交易验证', () => {
    it('应该接受完整的收入交易', () => {
      const draft: TransactionDraft = {
        type: 'income',
        amountCents: 500000,
        categoryId: 'salary',
        accountId: 'bank-card',
        occurredAt: new Date().toISOString(),
        note: '月薪',
        tagIds: ['work'],
      };
      expect(validateTransactionDraft(draft)).toBeNull();
    });

    it('应该接受完整的支出交易', () => {
      const draft: TransactionDraft = {
        type: 'expense',
        amountCents: 3500,
        categoryId: 'food-breakfast',
        accountId: 'cash',
        occurredAt: new Date().toISOString(),
        note: '早餐',
        tagIds: ['daily'],
      };
      expect(validateTransactionDraft(draft)).toBeNull();
    });

    it('应该接受完整的转账交易', () => {
      const draft: TransactionDraft = {
        type: 'transfer',
        amountCents: 100000,
        categoryId: 'transfer',
        accountId: 'cash',
        transferAccountId: 'bank-card',
        feeCents: 100,
        discountCents: 0,
        occurredAt: new Date().toISOString(),
        note: '存款',
      };
      expect(validateTransactionDraft(draft)).toBeNull();
    });
  });
});

import type { CategoryIconType } from '@/features/categories/domain/category.types';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type Transaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  categoryName: string;
  parentCategoryName: string;
  categoryIcon: string;
  categoryIconType: CategoryIconType;
  categoryColor: string;
  accountId: string;
  accountName: string;
  transferAccountId?: string;
  transferAccountName?: string;
  feeCents: number;
  discountCents: number;
  occurredAt: string;
  note: string;
};

export type TransactionDraft = {
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  accountId: string;
  transferAccountId?: string;
  feeCents?: number;
  discountCents?: number;
  occurredAt: string;
  note: string;
};

export type MonthlySummary = {
  incomeCents: number;
  expenseCents: number;
};

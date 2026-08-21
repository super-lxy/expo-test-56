import type { CategoryIconType } from '@/features/categories/domain/category.types';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionTag = {
  id: string;
  name: string;
  groupName: string;
};

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
  excludedFromStats: boolean;
  isReimbursable: boolean;
  reimbursementSourceAccountId?: string;
  reimbursementSourceAccountName?: string;
  reimbursedExpenseIds: string[];
  tags: TransactionTag[];
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
  tagIds?: string[];
  isReimbursable?: boolean;
};

export type MonthlySummary = {
  incomeCents: number;
  expenseCents: number;
};

export type ReimbursementDraft = {
  amountCents: number;
  sourceAccountId?: string;
  receiveAccountId: string;
  expenseTransactionIds: string[];
  occurredAt: string;
  note: string;
  excludedFromStats: boolean;
};

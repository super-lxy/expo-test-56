export type TransactionType = 'income' | 'expense' | 'transfer';

export type Transaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountId: string;
  accountName: string;
  transferAccountId?: string;
  transferAccountName?: string;
  occurredAt: string;
  note: string;
};

export type TransactionDraft = {
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  accountId: string;
  transferAccountId?: string;
  occurredAt: string;
  note: string;
};

export type MonthlySummary = {
  incomeCents: number;
  expenseCents: number;
};

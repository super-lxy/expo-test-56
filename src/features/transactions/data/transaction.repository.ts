import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  MonthlySummary,
  Transaction,
  TransactionDraft,
} from '../domain/transaction.types';

type TransactionRow = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount_cents: number;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  account_id: string;
  account_name: string;
  transfer_account_id: string | null;
  transfer_account_name: string | null;
  occurred_at: string;
  note: string;
};

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amountCents: row.amount_cents,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    accountId: row.account_id,
    accountName: row.account_name,
    transferAccountId: row.transfer_account_id ?? undefined,
    transferAccountName: row.transfer_account_name ?? undefined,
    occurredAt: row.occurred_at,
    note: row.note,
  };
}

export class TransactionRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(): Promise<Transaction[]> {
    const rows = await this.db.getAllAsync<TransactionRow>(`
      SELECT
        t.id,
        t.type,
        t.amount_cents,
        t.category_id,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        t.account_id,
        a.name AS account_name,
        t.transfer_account_id,
        target_a.name AS transfer_account_name,
        t.occurred_at,
        t.note
      FROM transactions t
      INNER JOIN categories c ON c.id = t.category_id
      INNER JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts target_a ON target_a.id = t.transfer_account_id
      WHERE t.deleted_at IS NULL
      ORDER BY t.occurred_at DESC, t.created_at DESC
    `);
    return rows.map(mapTransaction);
  }

  async create(draft: TransactionDraft) {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await this.db.runAsync(
      `INSERT INTO transactions
       (id, type, amount_cents, category_id, account_id, transfer_account_id, occurred_at, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      draft.type,
      draft.amountCents,
      draft.categoryId,
      draft.accountId,
      draft.transferAccountId ?? null,
      draft.occurredAt,
      draft.note.trim(),
      now,
      now
    );

    return id;
  }

  async getMonthlySummary(date = new Date()): Promise<MonthlySummary> {
    const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString();
    const row = await this.db.getFirstAsync<{ income_cents: number; expense_cents: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) AS income_cents,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents
       FROM transactions
       WHERE deleted_at IS NULL AND occurred_at >= ? AND occurred_at < ?`,
      start,
      end
    );

    return {
      incomeCents: row?.income_cents ?? 0,
      expenseCents: row?.expense_cents ?? 0,
    };
  }

}

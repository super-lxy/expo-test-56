import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  MonthlySummary,
  Transaction,
  TransactionDraft,
} from '../domain/transaction.types';
import type { CategoryIconType } from '@/features/categories/domain/category.types';
import { categoryIconDataUri } from '@/features/categories/data/categoryIconStorage';

type TransactionRow = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount_cents: number;
  category_id: string;
  category_name: string;
  parent_category_name: string | null;
  category_icon: string;
  category_icon_type: CategoryIconType | null;
  category_color: string;
  account_id: string;
  account_name: string;
  transfer_account_id: string | null;
  transfer_account_name: string | null;
  fee_cents: number | null;
  discount_cents: number | null;
  occurred_at: string;
  note: string;
};

type CategoryImageRow = {
  id: string;
  icon_blob: Uint8Array | null;
  icon_mime: string | null;
};

function mapTransaction(row: TransactionRow, imageUri?: string): Transaction {
  return {
    id: row.id,
    type: row.type,
    amountCents: row.amount_cents,
    categoryId: row.category_id,
    categoryName: row.category_name,
    parentCategoryName: row.parent_category_name ?? row.category_name,
    categoryIcon: row.category_icon_type === 'image'
      ? imageUri ?? row.category_icon
      : row.category_icon,
    categoryIconType: row.category_icon_type ?? 'emoji',
    categoryColor: row.category_color,
    accountId: row.account_id,
    accountName: row.account_name,
    transferAccountId: row.transfer_account_id ?? undefined,
    transferAccountName: row.transfer_account_name ?? undefined,
    feeCents: row.fee_cents ?? 0,
    discountCents: row.discount_cents ?? 0,
    occurredAt: row.occurred_at,
    note: row.note,
  };
}

export class TransactionRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(): Promise<Transaction[]> {
    const [rows, categoryImages] = await Promise.all([
      this.db.getAllAsync<TransactionRow>(`
        SELECT
          t.id,
          t.type,
          t.amount_cents,
          t.category_id,
          c.name AS category_name,
          parent_c.name AS parent_category_name,
          c.icon AS category_icon,
          c.icon_type AS category_icon_type,
          c.color AS category_color,
          t.account_id,
          a.name AS account_name,
          t.transfer_account_id,
          target_a.name AS transfer_account_name,
          t.fee_cents,
          t.discount_cents,
          t.occurred_at,
          t.note
        FROM transactions t
        INNER JOIN categories c ON c.id = t.category_id
        LEFT JOIN categories parent_c ON parent_c.id = c.parent_id
        INNER JOIN accounts a ON a.id = t.account_id
        LEFT JOIN accounts target_a ON target_a.id = t.transfer_account_id
        WHERE t.deleted_at IS NULL
        ORDER BY t.occurred_at DESC, t.created_at DESC
      `),
      this.db.getAllAsync<CategoryImageRow>(`
        SELECT id, icon_blob, icon_mime
        FROM categories
        WHERE icon_type = 'image' AND icon_blob IS NOT NULL
      `),
    ]);
    const imageUris = new Map(
      categoryImages.map((category) => [
        category.id,
        categoryIconDataUri(category.icon_blob, category.icon_mime) ?? undefined,
      ])
    );
    return rows.map((row) => mapTransaction(row, imageUris.get(row.category_id)));
  }

  async create(draft: TransactionDraft) {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await this.db.runAsync(
      `INSERT INTO transactions
       (id, type, amount_cents, category_id, account_id, transfer_account_id,
        fee_cents, discount_cents, occurred_at, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      draft.type,
      draft.amountCents,
      draft.categoryId,
      draft.accountId,
      draft.transferAccountId ?? null,
      draft.feeCents ?? 0,
      draft.discountCents ?? 0,
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
        COALESCE(SUM(CASE
          WHEN type = 'expense' THEN amount_cents
          WHEN type = 'transfer' THEN COALESCE(fee_cents, 0)
          ELSE 0
        END), 0) AS expense_cents
       FROM transactions
       WHERE deleted_at IS NULL
         AND category_id != 'initial-balance'
         AND occurred_at >= ? AND occurred_at < ?`,
      start,
      end
    );

    return {
      incomeCents: row?.income_cents ?? 0,
      expenseCents: row?.expense_cents ?? 0,
    };
  }

  async getAllTimeSummary(): Promise<{ totalIncomeCents: number; totalExpenseCents: number }> {
    const row = await this.db.getFirstAsync<{ income_cents: number; expense_cents: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) AS income_cents,
         COALESCE(SUM(CASE
           WHEN type = 'expense' THEN amount_cents
           WHEN type = 'transfer' THEN COALESCE(fee_cents, 0)
           ELSE 0
         END), 0) AS expense_cents
       FROM transactions
       WHERE deleted_at IS NULL AND category_id != 'initial-balance'`
    );
    return {
      totalIncomeCents: row?.income_cents ?? 0,
      totalExpenseCents: row?.expense_cents ?? 0,
    };
  }

}

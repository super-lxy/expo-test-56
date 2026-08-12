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

type TransactionTagRow = {
  transaction_id: string;
  id: string;
  name: string;
  group_name: string;
};

type CategoryImageRow = {
  id: string;
  icon_blob: Uint8Array | null;
  icon_mime: string | null;
};

type TransactionDetailRow = TransactionRow & {
  category_icon_blob: Uint8Array | null;
  category_icon_mime: string | null;
};

function mapTransaction(row: TransactionRow, imageUri?: string, tags: Transaction['tags'] = []): Transaction {
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
    tags,
  };
}

export class TransactionRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getById(id: string): Promise<Transaction | null> {
    const row = await this.db.getFirstAsync<TransactionDetailRow>(`
      SELECT
        t.id,
        t.type,
        t.amount_cents,
        t.category_id,
        c.name AS category_name,
        parent_c.name AS parent_category_name,
        c.icon AS category_icon,
        c.icon_type AS category_icon_type,
        c.icon_blob AS category_icon_blob,
        c.icon_mime AS category_icon_mime,
        c.color AS category_color,
        t.account_id,
        COALESCE(a.name, '已删除资产') AS account_name,
        t.transfer_account_id,
        target_a.name AS transfer_account_name,
        t.fee_cents,
        t.discount_cents,
        t.occurred_at,
        t.note
      FROM transactions t
      INNER JOIN categories c ON c.id = t.category_id
      LEFT JOIN categories parent_c ON parent_c.id = c.parent_id
      LEFT JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts target_a ON target_a.id = t.transfer_account_id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, id);
    if (!row) return null;
    const tagRows = await this.db.getAllAsync<TransactionTagRow>(
      `SELECT tt.transaction_id, t.id, t.name, g.name AS group_name
       FROM transaction_tags tt
       INNER JOIN tags t ON t.id = tt.tag_id
       INNER JOIN tag_groups g ON g.id = t.group_id
       WHERE tt.transaction_id = ?
       ORDER BY g.sort_order, t.sort_order`,
      id
    );
    const imageUri = row.category_icon_type === 'image'
      ? categoryIconDataUri(row.category_icon_blob, row.category_icon_mime) ?? undefined
      : undefined;
    return mapTransaction(row, imageUri, tagRows.map((tag) => ({
      id: tag.id,
      name: tag.name,
      groupName: tag.group_name,
    })));
  }

  async list(): Promise<Transaction[]> {
    const [rows, categoryImages, tagRows] = await Promise.all([
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
          COALESCE(a.name, '已删除资产') AS account_name,
          t.transfer_account_id,
          target_a.name AS transfer_account_name,
          t.fee_cents,
          t.discount_cents,
          t.occurred_at,
          t.note
        FROM transactions t
        INNER JOIN categories c ON c.id = t.category_id
        LEFT JOIN categories parent_c ON parent_c.id = c.parent_id
        LEFT JOIN accounts a ON a.id = t.account_id
        LEFT JOIN accounts target_a ON target_a.id = t.transfer_account_id
        WHERE t.deleted_at IS NULL
        ORDER BY t.occurred_at DESC, t.created_at DESC
      `),
      this.db.getAllAsync<CategoryImageRow>(`
        SELECT id, icon_blob, icon_mime
        FROM categories
        WHERE icon_type = 'image' AND icon_blob IS NOT NULL
      `),
      this.db.getAllAsync<TransactionTagRow>(`
        SELECT tt.transaction_id, t.id, t.name, g.name AS group_name
        FROM transaction_tags tt
        INNER JOIN tags t ON t.id = tt.tag_id
        INNER JOIN tag_groups g ON g.id = t.group_id
        INNER JOIN transactions tx ON tx.id = tt.transaction_id
        WHERE tx.deleted_at IS NULL
        ORDER BY g.sort_order, t.sort_order
      `),
    ]);
    const imageUris = new Map(
      categoryImages.map((category) => [
        category.id,
        categoryIconDataUri(category.icon_blob, category.icon_mime) ?? undefined,
      ])
    );
    const tagsByTransaction = new Map<string, Transaction['tags']>();
    for (const tag of tagRows) {
      const tags = tagsByTransaction.get(tag.transaction_id) ?? [];
      tags.push({ id: tag.id, name: tag.name, groupName: tag.group_name });
      tagsByTransaction.set(tag.transaction_id, tags);
    }
    return rows.map((row) => mapTransaction(row, imageUris.get(row.category_id), tagsByTransaction.get(row.id)));
  }

  async create(draft: TransactionDraft) {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
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
      await this.replaceTags(transaction, id, draft.tagIds ?? [], now);
    });

    return id;
  }

  async softDelete(id: string) {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE transactions
       SET deleted_at = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      now,
      now,
      id
    );
  }

  async update(id: string, draft: TransactionDraft) {
    const now = new Date().toISOString();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE transactions
         SET type = ?, amount_cents = ?, category_id = ?, account_id = ?,
             transfer_account_id = ?, fee_cents = ?, discount_cents = ?,
             occurred_at = ?, note = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
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
        id
      );
      await this.replaceTags(transaction, id, draft.tagIds ?? [], now);
    });
  }

  private async replaceTags(db: SQLiteDatabase, transactionId: string, tagIds: string[], now: string) {
    await db.runAsync(`DELETE FROM transaction_tags WHERE transaction_id = ?`, transactionId);
    for (const tagId of [...new Set(tagIds)]) {
      await db.runAsync(
        `INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id, created_at)
         SELECT ?, id, ? FROM tags WHERE id = ? AND archived_at IS NULL`,
        transactionId,
        now,
        tagId
      );
    }
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

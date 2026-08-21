import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  MonthlySummary,
  ReimbursementDraft,
  Transaction,
  TransactionDraft,
} from '../domain/transaction.types';
import type { CategoryIconType } from '@/features/categories/domain/category.types';
import { categoryIconDataUri } from '@/features/categories/data/categoryIconStorage';
import { generateSecureId } from '@/shared/utils/idGenerator';
import { validateReimbursementDraft } from '@/features/reimbursements/domain/reimbursement.rules';

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
  exclude_from_stats: number | null;
  is_reimbursable: number | null;
  reimbursement_source_account_id: string | null;
  reimbursement_source_account_name: string | null;
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

type ReimbursementItemRow = {
  reimbursement_transaction_id: string;
  expense_transaction_id: string;
};

type TransactionDetailRow = TransactionRow & {
  category_icon_blob: Uint8Array | null;
  category_icon_mime: string | null;
};

function mapTransaction(
  row: TransactionRow,
  imageUri?: string,
  tags: Transaction['tags'] = [],
  reimbursedExpenseIds: string[] = [],
): Transaction {
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
    excludedFromStats: (row.exclude_from_stats ?? 0) !== 0,
    isReimbursable: (row.is_reimbursable ?? 0) !== 0,
    reimbursementSourceAccountId: row.reimbursement_source_account_id ?? undefined,
    reimbursementSourceAccountName: row.reimbursement_source_account_name ?? undefined,
    reimbursedExpenseIds,
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
        t.note,
        t.exclude_from_stats,
        t.is_reimbursable,
        t.reimbursement_source_account_id,
        reimbursement_source.name AS reimbursement_source_account_name
      FROM transactions t
      INNER JOIN categories c ON c.id = t.category_id
      LEFT JOIN categories parent_c ON parent_c.id = c.parent_id
      LEFT JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts target_a ON target_a.id = t.transfer_account_id
      LEFT JOIN accounts reimbursement_source ON reimbursement_source.id = t.reimbursement_source_account_id
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
    const reimbursementRows = await this.db.getAllAsync<{ expense_transaction_id: string }>(
      `SELECT expense_transaction_id
       FROM reimbursement_items
       WHERE reimbursement_transaction_id = ?
       ORDER BY created_at`,
      id
    );
    return mapTransaction(row, imageUri, tagRows.map((tag) => ({
      id: tag.id,
      name: tag.name,
      groupName: tag.group_name,
    })), reimbursementRows.map((item) => item.expense_transaction_id));
  }

  async list(): Promise<Transaction[]> {
    const [rows, categoryImages, tagRows, reimbursementRows] = await Promise.all([
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
          t.note,
          t.exclude_from_stats,
          t.is_reimbursable,
          t.reimbursement_source_account_id,
          reimbursement_source.name AS reimbursement_source_account_name
        FROM transactions t
        INNER JOIN categories c ON c.id = t.category_id
        LEFT JOIN categories parent_c ON parent_c.id = c.parent_id
        LEFT JOIN accounts a ON a.id = t.account_id
        LEFT JOIN accounts target_a ON target_a.id = t.transfer_account_id
        LEFT JOIN accounts reimbursement_source ON reimbursement_source.id = t.reimbursement_source_account_id
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
      this.db.getAllAsync<ReimbursementItemRow>(`
        SELECT ri.reimbursement_transaction_id, ri.expense_transaction_id
        FROM reimbursement_items ri
        INNER JOIN transactions reimbursement
          ON reimbursement.id = ri.reimbursement_transaction_id
        WHERE reimbursement.deleted_at IS NULL
        ORDER BY ri.created_at
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
    const expensesByReimbursement = new Map<string, string[]>();
    for (const item of reimbursementRows) {
      const ids = expensesByReimbursement.get(item.reimbursement_transaction_id) ?? [];
      ids.push(item.expense_transaction_id);
      expensesByReimbursement.set(item.reimbursement_transaction_id, ids);
    }
    return rows.map((row) => mapTransaction(
      row,
      imageUris.get(row.category_id),
      tagsByTransaction.get(row.id),
      expensesByReimbursement.get(row.id),
    ));
  }

  async create(draft: TransactionDraft) {
    const now = new Date().toISOString();
    const id = generateSecureId();

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO transactions
         (id, type, amount_cents, category_id, account_id, transfer_account_id,
          fee_cents, discount_cents, occurred_at, note, exclude_from_stats,
          is_reimbursable, reimbursement_source_account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, ?, ?)`,
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
        draft.type === 'expense' && draft.isReimbursable ? 1 : 0,
        now,
        now
      );
      await this.replaceTags(transaction, id, draft.tagIds ?? [], now);
    });

    return id;
  }

  async softDelete(id: string) {
    const now = new Date().toISOString();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      // 删除报销记录后释放原支出账单，使它们可以再次选择报销。
      await transaction.runAsync(
        `DELETE FROM reimbursement_items WHERE reimbursement_transaction_id = ?`,
        id
      );
      await transaction.runAsync(
        `UPDATE transactions
         SET deleted_at = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
        now,
        now,
        id
      );
    });
  }

  async update(id: string, draft: TransactionDraft) {
    const now = new Date().toISOString();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE transactions
         SET type = ?, amount_cents = ?, category_id = ?, account_id = ?,
             transfer_account_id = ?, fee_cents = ?, discount_cents = ?,
             occurred_at = ?, note = ?, exclude_from_stats = 0,
             is_reimbursable = ?, reimbursement_source_account_id = NULL, updated_at = ?
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
        draft.type === 'expense' && draft.isReimbursable ? 1 : 0,
        now,
        id
      );
      await this.replaceTags(transaction, id, draft.tagIds ?? [], now);
    });
  }

  async listReimbursableExpenses(reimbursementId?: string): Promise<Transaction[]> {
    const rows = await this.db.getAllAsync<TransactionDetailRow>(`
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
        NULL AS transfer_account_name,
        t.fee_cents,
        t.discount_cents,
        t.occurred_at,
        t.note,
        t.exclude_from_stats,
        t.is_reimbursable,
        t.reimbursement_source_account_id,
        NULL AS reimbursement_source_account_name
      FROM transactions t
      INNER JOIN categories c ON c.id = t.category_id
      LEFT JOIN categories parent_c ON parent_c.id = c.parent_id
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.deleted_at IS NULL
        AND t.type = 'expense'
        AND (
          t.is_reimbursable = 1
          OR EXISTS (
            SELECT 1 FROM reimbursement_items current_ri
            WHERE current_ri.expense_transaction_id = t.id
              AND current_ri.reimbursement_transaction_id = ?
          )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM reimbursement_items ri
          INNER JOIN transactions reimbursement
            ON reimbursement.id = ri.reimbursement_transaction_id
          WHERE ri.expense_transaction_id = t.id
            AND reimbursement.deleted_at IS NULL
            AND ri.reimbursement_transaction_id != ?
        )
      ORDER BY t.occurred_at DESC, t.created_at DESC
    `, reimbursementId ?? '', reimbursementId ?? '');

    return rows.map((row) => mapTransaction(
      row,
      row.category_icon_type === 'image'
        ? categoryIconDataUri(row.category_icon_blob, row.category_icon_mime) ?? undefined
        : undefined,
    ));
  }

  async createReimbursement(draft: ReimbursementDraft) {
    return this.saveReimbursement(null, draft);
  }

  async updateReimbursement(id: string, draft: ReimbursementDraft) {
    return this.saveReimbursement(id, draft);
  }

  private async saveReimbursement(id: string | null, draft: ReimbursementDraft) {
    const expenseIds = [...new Set(draft.expenseTransactionIds)];
    const validationError = validateReimbursementDraft({ ...draft, expenseTransactionIds: expenseIds });
    if (validationError) throw new Error(validationError);

    const reimbursementId = id ?? generateSecureId();
    const now = new Date().toISOString();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const placeholders = expenseIds.map(() => '?').join(', ');
      const validExpenses = await transaction.getAllAsync<{ id: string }>(
        `SELECT expense.id
         FROM transactions expense
         WHERE expense.id IN (${placeholders})
           AND expense.type = 'expense'
           AND (
             expense.is_reimbursable = 1
             OR EXISTS (
               SELECT 1 FROM reimbursement_items current_ri
               WHERE current_ri.expense_transaction_id = expense.id
                 AND current_ri.reimbursement_transaction_id = ?
             )
           )
           AND expense.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1
             FROM reimbursement_items ri
             INNER JOIN transactions reimbursement
               ON reimbursement.id = ri.reimbursement_transaction_id
             WHERE ri.expense_transaction_id = expense.id
               AND reimbursement.deleted_at IS NULL
               AND ri.reimbursement_transaction_id != ?
           )`,
        ...expenseIds,
        reimbursementId,
        reimbursementId
      );
      if (validExpenses.length !== expenseIds.length) {
        throw new Error('部分账单未标记待报销、已删除或已经报销');
      }

      if (id) {
        const existing = await transaction.getFirstAsync<{ id: string }>(
          `SELECT id FROM transactions
           WHERE id = ? AND category_id = 'reimbursement' AND deleted_at IS NULL`,
          id
        );
        if (!existing) throw new Error('报销记录不存在或已删除');
        await transaction.runAsync(
          `UPDATE transactions
           SET type = 'income', amount_cents = ?, category_id = 'reimbursement',
               account_id = ?, transfer_account_id = NULL, fee_cents = 0, discount_cents = 0,
               occurred_at = ?, note = ?, exclude_from_stats = ?, is_reimbursable = 0,
               reimbursement_source_account_id = ?, updated_at = ?
           WHERE id = ?`,
          draft.amountCents,
          draft.receiveAccountId,
          draft.occurredAt,
          draft.note.trim(),
          draft.excludedFromStats ? 1 : 0,
          draft.sourceAccountId ?? null,
          now,
          id
        );
        await transaction.runAsync(
          `DELETE FROM reimbursement_items WHERE reimbursement_transaction_id = ?`,
          id
        );
      } else {
        await transaction.runAsync(
          `INSERT INTO transactions
           (id, type, amount_cents, category_id, account_id, transfer_account_id,
            fee_cents, discount_cents, occurred_at, note, exclude_from_stats,
            is_reimbursable, reimbursement_source_account_id, created_at, updated_at)
           VALUES (?, 'income', ?, 'reimbursement', ?, NULL, 0, 0, ?, ?, ?, 0, ?, ?, ?)`,
          reimbursementId,
          draft.amountCents,
          draft.receiveAccountId,
          draft.occurredAt,
          draft.note.trim(),
          draft.excludedFromStats ? 1 : 0,
          draft.sourceAccountId ?? null,
          now,
          now
        );
      }

      for (const expenseId of expenseIds) {
        await transaction.runAsync(
          `INSERT INTO reimbursement_items
           (reimbursement_transaction_id, expense_transaction_id, created_at)
           VALUES (?, ?, ?)`,
          reimbursementId,
          expenseId,
          now
        );
      }
    });

    return reimbursementId;
  }

  private async replaceTags(db: SQLiteDatabase, transactionId: string, tagIds: string[], now: string) {
    // Remove duplicates
    const uniqueTagIds = [...new Set(tagIds)];

    // Validate all tags exist and are not archived before making any changes
    if (uniqueTagIds.length > 0) {
      const placeholders = uniqueTagIds.map(() => '?').join(', ');
      const validTags = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM tags WHERE id IN (${placeholders}) AND archived_at IS NULL`,
        ...uniqueTagIds
      );

      if (validTags.length !== uniqueTagIds.length) {
        const validIds = new Set(validTags.map(t => t.id));
        const invalidIds = uniqueTagIds.filter(id => !validIds.has(id));
        throw new Error(`标签不存在或已归档: ${invalidIds.join(', ')}`);
      }
    }

    // Delete existing tags
    await db.runAsync(`DELETE FROM transaction_tags WHERE transaction_id = ?`, transactionId);

    // Insert new tags in a batch
    if (uniqueTagIds.length > 0) {
      const values = uniqueTagIds.map(() => '(?, ?, ?)').join(', ');
      const params = uniqueTagIds.flatMap(tagId => [transactionId, tagId, now]);
      await db.runAsync(
        `INSERT INTO transaction_tags (transaction_id, tag_id, created_at) VALUES ${values}`,
        ...params
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
         AND exclude_from_stats = 0
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
       WHERE deleted_at IS NULL
         AND exclude_from_stats = 0
         AND category_id != 'initial-balance'`
    );
    return {
      totalIncomeCents: row?.income_cents ?? 0,
      totalExpenseCents: row?.expense_cents ?? 0,
    };
  }

}

import type { SQLiteDatabase } from 'expo-sqlite';

import type { Account, AccountBalance, AccountDraft, AccountStatus } from '../domain/account.types';
import { isCreditAccountType } from '../domain/account.balances';
import { EXTERNAL_TRANSFER_ACCOUNT_ID } from '../domain/systemAccounts';
import { generateSecureId } from '@/shared/utils/idGenerator';

type AccountRow = {
  id: string;
  name: string;
  type: Account['type'];
  kind: Account['kind'];
  icon: string;
  color: string;
  initial_balance_cents: number;
  currency: string;
  credit_limit_cents: number | null;
      statement_day: number | null;
      due_day: number | null;
      status: AccountStatus;
      include_in_net_worth: number;
      deleted_at: string | null;
};

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    kind: row.kind ?? 'asset',
    icon: row.icon ?? '💰',
    color: row.color ?? '#64748B',
    initialBalanceCents: row.initial_balance_cents,
    currency: row.currency,
    creditLimitCents: row.credit_limit_cents ?? null,
    statementDay: row.statement_day ?? null,
    dueDay: row.due_day ?? null,
    status: row.status ?? 'active',
    includeInNetWorth: (row.include_in_net_worth ?? 1) !== 0,
  };
}

export class AccountRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(): Promise<Account[]> {
    const rows = await this.db.getAllAsync<AccountRow>(
      `SELECT id, name, type, kind, icon, color, initial_balance_cents, currency,
              credit_limit_cents, statement_day, due_day, status, include_in_net_worth, deleted_at
       FROM accounts
       WHERE deleted_at IS NULL AND id != ?
       ORDER BY created_at`,
      EXTERNAL_TRANSFER_ACCOUNT_ID
    );
    return rows.map(mapAccount);
  }

  async listWithBalances(): Promise<AccountBalance[]> {
    // Optimized single query with JOIN to eliminate N+1 problem
    const rows = await this.db.getAllAsync<AccountRow & {
      income_cents: number;
      expense_cents: number;
      transferred_in_cents: number;
      transferred_out_cents: number;
    }>(
      `SELECT
         a.id,
         a.name,
         a.type,
         a.kind,
         a.icon,
         a.color,
         a.initial_balance_cents,
         a.currency,
         a.credit_limit_cents,
         a.statement_day,
         a.due_day,
         a.status,
         a.include_in_net_worth,
         a.deleted_at,
         COALESCE(SUM(CASE WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount_cents ELSE 0 END), 0) AS income_cents,
         COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.account_id = a.id THEN t.amount_cents ELSE 0 END), 0) AS expense_cents,
         COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.transfer_account_id = a.id THEN t.amount_cents ELSE 0 END), 0) AS transferred_in_cents,
         COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.account_id = a.id
           THEN t.amount_cents + COALESCE(t.fee_cents, 0) - COALESCE(t.discount_cents, 0)
           ELSE 0 END), 0) AS transferred_out_cents
       FROM accounts a
       LEFT JOIN transactions t ON (t.account_id = a.id OR t.transfer_account_id = a.id)
         AND t.deleted_at IS NULL
       WHERE a.deleted_at IS NULL AND a.id != ?
       GROUP BY a.id
       ORDER BY a.created_at`,
      EXTERNAL_TRANSFER_ACCOUNT_ID
    );

    return rows.map(row => {
      const account = mapAccount(row);
      const incomeCents = row.income_cents ?? 0;
      const expenseCents = row.expense_cents ?? 0;
      const transferredInCents = row.transferred_in_cents ?? 0;
      const transferredOutCents = row.transferred_out_cents ?? 0;

      const balanceCents = account.kind === 'liability'
        ? -account.initialBalanceCents + incomeCents - expenseCents + transferredInCents - transferredOutCents
        : account.initialBalanceCents + incomeCents - expenseCents + transferredInCents - transferredOutCents;

      return { ...account, balanceCents };
    });
  }

  async create(draft: AccountDraft) {
    const now = new Date().toISOString();
    const id = generateSecureId();
    await this.db.runAsync(
      `INSERT INTO accounts
         (id, name, type, kind, icon, color, initial_balance_cents, currency,
          credit_limit_cents, statement_day, due_day, status, include_in_net_worth, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CNY', ?, ?, ?, ?, ?, ?)`,
      id,
      draft.name.trim(),
      draft.type,
      isCreditAccountType(draft.type) ? 'liability' : draft.kind,
      draft.icon,
      draft.color,
      draft.initialBalanceCents,
      draft.creditLimitCents ?? null,
      draft.statementDay ?? null,
      draft.dueDay ?? null,
      draft.status ?? 'active',
      draft.includeInNetWorth !== false ? 1 : 0,
      now
    );
    return id;
  }

  async updateStatus(id: string, status: AccountStatus) {
    await this.db.runAsync(
      `UPDATE accounts SET status = ? WHERE id = ?`,
      status,
      id
    );
  }

  async deleteAccountOnly(id: string) {
    await this.db.runAsync(
      `UPDATE accounts SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`,
      new Date().toISOString(),
      id
    );
  }

  async deleteAccountAndTransactions(id: string) {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `DELETE FROM transactions
         WHERE account_id = ? OR transfer_account_id = ? OR reimbursement_source_account_id = ?`,
        id,
        id,
        id
      );
      await this.db.runAsync(`DELETE FROM accounts WHERE id = ?`, id);
    });
  }

  async update(id: string, input: {
    name: string;
    creditLimitCents: number | null;
    statementDay: number | null;
    dueDay: number | null;
    status: AccountStatus;
    includeInNetWorth: boolean;
  }) {
    await this.db.runAsync(
      `UPDATE accounts
       SET name = ?, credit_limit_cents = ?, statement_day = ?, due_day = ?,
           status = ?, include_in_net_worth = ?
       WHERE id = ?`,
      input.name.trim(),
      input.creditLimitCents,
      input.statementDay,
      input.dueDay,
      input.status,
      input.includeInNetWorth ? 1 : 0,
      id
    );
  }
}

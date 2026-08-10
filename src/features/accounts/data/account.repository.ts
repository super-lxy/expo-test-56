import type { SQLiteDatabase } from 'expo-sqlite';

import type { Account, AccountBalance, AccountDraft, AccountStatus } from '../domain/account.types';

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
              credit_limit_cents, statement_day, due_day, status, include_in_net_worth
       FROM accounts ORDER BY created_at`
    );
    return rows.map(mapAccount);
  }

  async listWithBalances(): Promise<AccountBalance[]> {
    const accounts = await this.list();
    return Promise.all(
      accounts.map(async (account) => {
        const row = await this.db.getFirstAsync<{
          income_cents: number;
          expense_cents: number;
          transferred_in_cents: number;
          transferred_out_cents: number;
        }>(
          `SELECT
             COALESCE(SUM(CASE WHEN type = 'income' AND account_id = ? THEN amount_cents ELSE 0 END), 0) AS income_cents,
             COALESCE(SUM(CASE WHEN type = 'expense' AND account_id = ? THEN amount_cents ELSE 0 END), 0) AS expense_cents,
             COALESCE(SUM(CASE WHEN type = 'transfer' AND transfer_account_id = ? THEN amount_cents ELSE 0 END), 0) AS transferred_in_cents,
             COALESCE(SUM(CASE WHEN type = 'transfer' AND account_id = ?
               THEN amount_cents + COALESCE(fee_cents, 0) - COALESCE(discount_cents, 0)
               ELSE 0 END), 0) AS transferred_out_cents
           FROM transactions
           WHERE deleted_at IS NULL`,
          account.id, account.id, account.id, account.id
        );

        const incomeCents = row?.income_cents ?? 0;
        const expenseCents = row?.expense_cents ?? 0;
        const transferredInCents = row?.transferred_in_cents ?? 0;
        const transferredOutCents = row?.transferred_out_cents ?? 0;
        const balanceCents = account.kind === 'liability'
          ? -account.initialBalanceCents + incomeCents - expenseCents + transferredInCents - transferredOutCents
          : account.initialBalanceCents + incomeCents - expenseCents + transferredInCents - transferredOutCents;

        return { ...account, balanceCents };
      })
    );
  }

  async create(draft: AccountDraft) {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await this.db.runAsync(
      `INSERT INTO accounts
         (id, name, type, kind, icon, color, initial_balance_cents, currency,
          credit_limit_cents, statement_day, due_day, status, include_in_net_worth, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CNY', ?, ?, ?, ?, ?, ?)`,
      id,
      draft.name.trim(),
      draft.type,
      draft.kind,
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

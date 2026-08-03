import type { SQLiteDatabase } from 'expo-sqlite';

import type { Account, AccountBalance, AccountDraft } from '../domain/account.types';

type AccountRow = {
  id: string;
  name: string;
  type: Account['type'];
  kind: Account['kind'];
  icon: string;
  color: string;
  initial_balance_cents: number;
  currency: string;
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
  };
}

export class AccountRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(): Promise<Account[]> {
    const rows = await this.db.getAllAsync<AccountRow>(
      'SELECT id, name, type, kind, icon, color, initial_balance_cents, currency FROM accounts ORDER BY created_at'
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
             COALESCE(SUM(CASE WHEN type = 'transfer' AND account_id = ? THEN amount_cents ELSE 0 END), 0) AS transferred_out_cents
           FROM transactions
           WHERE deleted_at IS NULL`,
          account.id,
          account.id,
          account.id,
          account.id
        );

        return {
          ...account,
          balanceCents:
            account.initialBalanceCents +
            (row?.income_cents ?? 0) -
            (row?.expense_cents ?? 0) +
            (row?.transferred_in_cents ?? 0) -
            (row?.transferred_out_cents ?? 0),
        };
      })
    );
  }

  async create(draft: AccountDraft) {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await this.db.runAsync(
      `INSERT INTO accounts (id, name, type, kind, icon, color, initial_balance_cents, currency, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CNY', ?)`,
      id,
      draft.name.trim(),
      draft.type,
      draft.kind,
      draft.icon,
      draft.color,
      draft.initialBalanceCents,
      now
    );
    return id;
  }
}

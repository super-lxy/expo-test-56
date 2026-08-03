import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'ledger.db';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 5;
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 1) {
    await addColumnIfMissing(db, 'categories', 'parent_id TEXT');
    await addColumnIfMissing(db, 'transactions', 'transfer_account_id TEXT');
  }

  // v5：账户增加 资产/负债 分类和图标
  if (currentVersion > 0 && currentVersion < 5) {
    await addColumnIfMissing(db, 'accounts', "kind TEXT NOT NULL DEFAULT 'asset'");
    await addColumnIfMissing(db, 'accounts', "icon TEXT NOT NULL DEFAULT '💰'");
    await addColumnIfMissing(db, 'accounts', "color TEXT NOT NULL DEFAULT '#64748B'");
    // 负债的金额统一以正数存储（欠款额），kind 决定加减方向
    await db.runAsync(
      `UPDATE accounts
       SET kind = 'liability', initial_balance_cents = ABS(initial_balance_cents)
       WHERE type = 'credit-card'`
    );
    await db.runAsync(`UPDATE accounts SET icon = '💵', color = '#22C55E' WHERE type = 'cash' AND icon = '💰'`);
  }

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'asset',
      icon TEXT NOT NULL DEFAULT '💰',
      color TEXT NOT NULL DEFAULT '#64748B',
      initial_balance_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'CNY',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_id TEXT,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      category_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      transfer_account_id TEXT,
      occurred_at TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at
      ON transactions(occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at
      ON transactions(deleted_at);
  `);

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO accounts (id, name, type, kind, icon, color, initial_balance_cents, currency, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'cash',
    '现金',
    'cash',
    'asset',
    '💵',
    '#22C55E',
    0,
    'CNY',
    now
  );

  const categories = [
    ['food', '餐饮', 'expense', null, '🍜', '#F97316', 1],
    ['transport', '交通', 'expense', null, '🚕', '#3B82F6', 2],
    ['shopping', '购物', 'expense', null, '🛍️', '#EC4899', 3],
    ['entertainment', '娱乐', 'expense', null, '🎮', '#8B5CF6', 4],
    ['housing', '住宿', 'expense', null, '🏠', '#14B8A6', 5],
    ['daily', '日常', 'expense', null, '📦', '#64748B', 6],
    ['relationships', '人情', 'expense', null, '❤️', '#F97316', 7],
    ['travel', '旅游', 'expense', null, '🎫', '#8B5CF6', 8],
    ['medical', '医疗', 'expense', null, '🏥', '#06B6D4', 9],
    ['membership', '会员/通讯', 'expense', null, '♛', '#EAB308', 10],
    ['salary', '工资', 'income', null, '💰', '#22C55E', 20],
    ['bonus', '奖金', 'income', null, '🎁', '#EAB308', 21],
    ['other-income', '其他收入', 'income', null, '✨', '#06B6D4', 22],
    ['transfer', '账户转账', 'transfer', null, '↔️', '#64748B', 99],
    ['flight', '飞机', 'expense', 'transport', '✈️', '#3B82F6', 30],
    ['subway', '地铁', 'expense', 'transport', '🚇', '#3B82F6', 31],
    ['bus', '公交', 'expense', 'transport', '🚌', '#3B82F6', 32],
    ['taxi', '打车', 'expense', 'transport', '🚕', '#3B82F6', 33],
    ['fuel', '加油', 'expense', 'transport', '⛽', '#3B82F6', 34],
  ] as const;

  for (const [id, name, type, parentId, icon, color, sortOrder] of categories) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories
       (id, name, type, parent_id, icon, color, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      name,
      type,
      parentId,
      icon,
      color,
      sortOrder,
      now
    );
  }

  if (currentVersion < 4) {
    await addDefaultSubcategories(db);
  }

  currentVersion = 5;

  await db.runAsync(
    `UPDATE categories SET parent_id = ? WHERE id IN (?, ?, ?, ?, ?) AND parent_id IS NULL`,
    'transport',
    'flight',
    'subway',
    'bus',
    'taxi',
    'fuel'
  );

  await db.execAsync(`PRAGMA user_version = ${currentVersion}`);
}

async function addColumnIfMissing(db: SQLiteDatabase, table: string, definition: string) {
  try {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  } catch {
    // The column already exists on a fresh database created with the latest schema.
  }
}

async function addDefaultSubcategories(db: SQLiteDatabase) {
  const roots = await db.getAllAsync<{ id: string; name: string; type: string; icon: string; color: string; sort_order: number }>(
    `SELECT id, name, type, icon, color, sort_order
     FROM categories
     WHERE parent_id IS NULL AND type IN ('expense', 'income')`
  );
  const now = new Date().toISOString();
  for (const root of roots) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories
       (id, name, type, parent_id, icon, color, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      `${root.id}-default`,
      root.name,
      root.type,
      root.id,
      root.icon,
      root.color,
      root.sort_order * 100,
      now
    );
  }
}

import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import {
  EXTERNAL_TRANSFER_ACCOUNT_ID,
  EXTERNAL_TRANSFER_ACCOUNT_NAME,
} from '@/features/accounts/domain/systemAccounts';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_EXPENSE_ROOT_RENAMES,
  DEFAULT_EXPENSE_ROOTS,
  LEGACY_EXPENSE_CATEGORY_IDS,
  LEGACY_EXPENSE_ROOT_IDS,
} from './defaultExpenseCategories';

export const DATABASE_NAME = 'ledger.db';
const internalTransferIconAsset = require('../../../assets/images/system/internal-transfer.png');

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 19;
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;
  const isNewDatabase = currentVersion === 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 1) {
    await addColumnIfMissing(db, 'categories', 'parent_id TEXT');
    await addColumnIfMissing(db, 'transactions', 'transfer_account_id TEXT');
  }

  if (currentVersion > 0 && currentVersion < 5) {
    await addColumnIfMissing(db, 'accounts', "kind TEXT NOT NULL DEFAULT 'asset'");
    await addColumnIfMissing(db, 'accounts', "icon TEXT NOT NULL DEFAULT '💰'");
    await addColumnIfMissing(db, 'accounts', "color TEXT NOT NULL DEFAULT '#64748B'");
    await db.runAsync(
      `UPDATE accounts SET kind = 'liability', initial_balance_cents = ABS(initial_balance_cents) WHERE type = 'credit-card'`
    );
    await db.runAsync(`UPDATE accounts SET icon = '💵', color = '#22C55E' WHERE type = 'cash' AND icon = '💰'`);
  }

  if (currentVersion > 0 && currentVersion < 6) {
    await addColumnIfMissing(db, 'accounts', 'statement_day INTEGER');
    await addColumnIfMissing(db, 'accounts', 'due_day INTEGER');
  }

  // v7：信用额度、资产状态、是否计入净资产
  if (currentVersion > 0 && currentVersion < 7) {
    await addColumnIfMissing(db, 'accounts', 'credit_limit_cents INTEGER');
    await addColumnIfMissing(db, 'accounts', "status TEXT NOT NULL DEFAULT 'active'");
    await addColumnIfMissing(db, 'accounts', 'include_in_net_worth INTEGER NOT NULL DEFAULT 1');
  }

  // v8：旧版创建账户时同时保存初始余额和初始调整账单，导致余额被重复计算。
  // 对已经存在对应调整账单的账户，将基准初始余额归零，只保留账单作为余额来源。
  if (currentVersion > 0 && currentVersion < 8) {
    await db.runAsync(`
      UPDATE accounts
      SET initial_balance_cents = 0
      WHERE initial_balance_cents != 0
        AND EXISTS (
          SELECT 1
          FROM transactions
          WHERE transactions.account_id = accounts.id
            AND transactions.category_id = 'initial-balance'
            AND transactions.amount_cents = ABS(accounts.initial_balance_cents)
            AND transactions.deleted_at IS NULL
        )
    `);
  }

  // v9：转账支持手续费与优惠，影响转出账户的实际扣款。
  if (currentVersion > 0 && currentVersion < 9) {
    await addColumnIfMissing(db, 'transactions', 'fee_cents INTEGER NOT NULL DEFAULT 0');
    await addColumnIfMissing(db, 'transactions', 'discount_cents INTEGER NOT NULL DEFAULT 0');
  }

  // v10：分类图标支持 Emoji 与用户上传图片两种类型。
  if (currentVersion > 0 && currentVersion < 10) {
    await addColumnIfMissing(db, 'categories', "icon_type TEXT NOT NULL DEFAULT 'emoji'");
  }

  // v11：自定义分类图片直接保存在 SQLite BLOB 中，迁移数据库即可完整带走图标。
  if (currentVersion > 0 && currentVersion < 11) {
    await addColumnIfMissing(db, 'categories', 'icon_blob BLOB');
    await addColumnIfMissing(db, 'categories', 'icon_mime TEXT');
    await migrateLegacyCategoryIcons(db);
  }

  // v12：初始化与账户转账统一为隐藏的「内部转账」系统分类。
  if (currentVersion > 0 && currentVersion < 12) {
    await db.runAsync(
      `UPDATE categories
       SET name = '内部转账', type = 'transfer', icon = '↔️', icon_type = 'emoji',
           icon_blob = NULL, icon_mime = NULL
       WHERE id IN ('transfer', 'initial-balance')`
    );
    await db.runAsync(
      `UPDATE transactions
       SET note = '资产初始化'
       WHERE category_id = 'initial-balance' AND note = '初始余额'`
    );
  }

  // v14：启用新版支出分类体系，旧分类仅退出选择菜单，历史账单继续保留关联。
  if (currentVersion > 0 && currentVersion < 14) {
    await addColumnIfMissing(db, 'categories', 'is_archived INTEGER NOT NULL DEFAULT 0');
  }

  // v16：支持仅删除资产但保留历史账单。
  if (currentVersion > 0 && currentVersion < 16) {
    await addColumnIfMissing(db, 'accounts', 'deleted_at TEXT');
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
      credit_limit_cents INTEGER,
      statement_day INTEGER,
      due_day INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      include_in_net_worth INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_id TEXT,
      icon TEXT NOT NULL,
      icon_type TEXT NOT NULL DEFAULT 'emoji',
      icon_blob BLOB,
      icon_mime TEXT,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      category_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      transfer_account_id TEXT,
      fee_cents INTEGER NOT NULL DEFAULT 0,
      discount_cents INTEGER NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS tag_groups (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'common',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      FOREIGN KEY (group_id) REFERENCES tag_groups(id)
    );

    CREATE TABLE IF NOT EXISTS transaction_tags (
      transaction_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (transaction_id, tag_id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tags_group_id ON tags(group_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_id ON transaction_tags(tag_id);
  `);

  const now = new Date().toISOString();

  // 用户迁移的是数据库的最终状态。默认账户和普通分类只在首次建库时写入，
  // 后续版本升级不能把用户已经删除的默认内容重新创建出来。
  if (isNewDatabase) {
    await db.runAsync(
       `INSERT OR IGNORE INTO accounts
       (id, name, type, kind, icon, color, initial_balance_cents, currency, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'cash', '现金', 'cash', 'asset', '💵', '#22C55E', 0, 'CNY', now
    );

    const incomeCategories = [
      ['salary', '工资', 'income', null, '💰', '#22C55E', 20],
      ['bonus', '奖金', 'income', null, '🎁', '#EAB308', 21],
      ['other-income', '其他收入', 'income', null, '✨', '#06B6D4', 22],
    ] as const;

    for (const [id, name, type, parentId, icon, color, sortOrder] of incomeCategories) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories
         (id, name, type, parent_id, icon, color, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id, name, type, parentId, icon, color, sortOrder, now
      );
    }
  }

  if (currentVersion < 14) {
    if (!isNewDatabase) {
      await archiveLegacyExpenseCategories(db);
    }
    await seedDefaultExpenseCategories(db, now);
    if (!isNewDatabase) {
      await reparentLegacyCustomCategories(db);
    }
  }

  // v15：恢复一级分类的同名默认子分类、缩短一级名称，并更新「教育」内置图片。
  if (currentVersion < 15) {
    await seedDefaultExpenseCategories(db, now);
    await renameDefaultExpenseRoots(db);
    await persistDefaultExpenseCategoryIcons(db, currentVersion === 14);
  }

  // 隐藏系统分类属于账单数据结构，不在用户分类菜单中，也不允许用户删除。
  await ensureSystemCategories(db, now);
  await persistInternalTransferIcon(db);

  // v17：资产初始化统一为「外部端点 ↔ 具体账户」的特殊转账。
  // 外部端点是隐藏系统账户，不参与资产与净资产展示。
  await ensureExternalTransferAccount(db, now);
  if (currentVersion < 17) {
    await migrateInitialBalancesToTransfers(db);
  }

  // v19：授信额度不是资产。所有循环信贷账户统一归为负债账户；
  // credit_limit_cents 只保留为额度信息，不参与账户余额或净资产计算。
  if (currentVersion < 19) {
    await db.runAsync(
      `UPDATE accounts
       SET kind = 'liability'
       WHERE type IN ('credit-card', 'huabei', 'baitiao', 'douyin-pay')`
    );
  }

  if (isNewDatabase || currentVersion < 4) {
    await addDefaultSubcategories(db);
  }

  currentVersion = 19;

  await db.execAsync(`PRAGMA user_version = ${currentVersion}`);
}

async function ensureExternalTransferAccount(db: SQLiteDatabase, now: string) {
  await db.runAsync(
    `INSERT OR IGNORE INTO accounts
     (id, name, type, kind, icon, color, initial_balance_cents, currency,
      status, include_in_net_worth, created_at)
     VALUES (?, ?, 'other', 'asset', '▤', '#8B95A1', 0, 'CNY', 'hidden', 0, ?)`,
    EXTERNAL_TRANSFER_ACCOUNT_ID,
    EXTERNAL_TRANSFER_ACCOUNT_NAME,
    now
  );
  await db.runAsync(
    `UPDATE accounts
     SET name = ?, status = 'hidden', include_in_net_worth = 0, deleted_at = NULL
     WHERE id = ?`,
    EXTERNAL_TRANSFER_ACCOUNT_NAME,
    EXTERNAL_TRANSFER_ACCOUNT_ID
  );
}

async function migrateInitialBalancesToTransfers(db: SQLiteDatabase) {
  await db.runAsync(
    `UPDATE transactions
     SET type = 'transfer', transfer_account_id = account_id,
         account_id = ?, fee_cents = 0, discount_cents = 0
     WHERE category_id = 'initial-balance' AND type = 'income'`,
    EXTERNAL_TRANSFER_ACCOUNT_ID
  );
  await db.runAsync(
    `UPDATE transactions
     SET type = 'transfer', transfer_account_id = ?,
         fee_cents = 0, discount_cents = 0
     WHERE category_id = 'initial-balance' AND type = 'expense'`,
    EXTERNAL_TRANSFER_ACCOUNT_ID
  );
}

async function renameDefaultExpenseRoots(db: SQLiteDatabase) {
  for (const [id, previousName, nextName] of DEFAULT_EXPENSE_ROOT_RENAMES) {
    await db.runAsync(
      `UPDATE categories SET name = ? WHERE id = ? AND name = ?`,
      nextName,
      id,
      previousName
    );
  }
}

async function seedDefaultExpenseCategories(db: SQLiteDatabase, now: string) {
  for (const category of DEFAULT_EXPENSE_CATEGORIES) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories
       (id, name, type, parent_id, icon, icon_type, icon_blob, icon_mime,
        color, sort_order, is_archived, created_at)
       VALUES (?, ?, 'expense', ?, ?, ?, NULL, ?, ?, ?, 0, ?)`,
      category.id,
      category.name,
      category.parentId,
      category.icon,
      category.iconType,
      category.iconMime,
      category.color,
      category.sortOrder,
      now
    );
  }
}

async function archiveLegacyExpenseCategories(db: SQLiteDatabase) {
  const placeholders = LEGACY_EXPENSE_CATEGORY_IDS.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE categories SET is_archived = 1 WHERE id IN (${placeholders})`,
    ...LEGACY_EXPENSE_CATEGORY_IDS
  );
}

async function reparentLegacyCustomCategories(db: SQLiteDatabase) {
  const placeholders = LEGACY_EXPENSE_ROOT_IDS.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE categories
     SET parent_id = 'expense-other'
     WHERE type = 'expense' AND is_archived = 0 AND parent_id IN (${placeholders})`,
    ...LEGACY_EXPENSE_ROOT_IDS
  );
}

async function persistDefaultExpenseCategoryIcons(db: SQLiteDatabase, refreshEducationIcon: boolean) {
  for (const root of DEFAULT_EXPENSE_ROOTS) {
    const stored = await db.getFirstAsync<{ hasIcon: number }>(
      `SELECT CASE WHEN icon_blob IS NULL THEN 0 ELSE 1 END AS hasIcon
       FROM categories WHERE id = ?`,
      root.id
    );
    const shouldRefreshRoot = refreshEducationIcon && root.id === 'expense-education';
    if (!stored?.hasIcon || shouldRefreshRoot) {
      const data = await readBundledAssetBytes(root.iconAsset);
      await db.runAsync(
        `UPDATE categories
         SET icon = '', icon_type = 'image', icon_blob = ?, icon_mime = 'image/png'
         WHERE id = ?`,
        data,
        root.id
      );
    }

    // 默认子分类始终复制数据库中父分类的当前名称和图片，不直接依赖静态素材。
    await db.runAsync(
      `UPDATE categories
       SET name = (SELECT name FROM categories WHERE id = ?),
           icon = (SELECT icon FROM categories WHERE id = ?),
           icon_type = (SELECT icon_type FROM categories WHERE id = ?),
           icon_blob = (SELECT icon_blob FROM categories WHERE id = ?),
           icon_mime = (SELECT icon_mime FROM categories WHERE id = ?),
           color = (SELECT color FROM categories WHERE id = ?)
       WHERE id = ?`,
      root.id,
      root.id,
      root.id,
      root.id,
      root.id,
      root.id,
      `${root.id}-default`
    );
  }
}

async function ensureSystemCategories(db: SQLiteDatabase, now: string) {
  for (const [id, sortOrder] of [['transfer', 9998], ['initial-balance', 9999]] as const) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories
       (id, name, type, parent_id, icon, icon_type, icon_blob, icon_mime, color, sort_order, created_at)
       VALUES (?, '内部转账', 'transfer', NULL, '', 'image', NULL, 'image/png', '#64748B', ?, ?)`,
      id,
      sortOrder,
      now
    );
  }
}

async function persistInternalTransferIcon(db: SQLiteDatabase) {
  const data = await readBundledAssetBytes(internalTransferIconAsset);

  await db.runAsync(
    `UPDATE categories
     SET icon = '', icon_type = 'image', icon_blob = ?, icon_mime = 'image/png'
     WHERE id IN ('transfer', 'initial-balance') AND icon_blob IS NULL`,
    data
  );
}

async function readBundledAssetBytes(assetModule: number) {
  const moduleAsset = Asset.fromModule(assetModule);

  if (Platform.OS === 'web') {
    const asset = await moduleAsset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  }

  // Standalone Android builds expose bundled images as relative resource names and
  // mark them as downloaded. Re-create the asset from its URI so expo-asset copies
  // the resource to cache and provides the absolute file URI required by File.
  const asset = Platform.OS === 'android' && !moduleAsset.uri.includes(':')
    ? await Asset.fromURI(moduleAsset.uri).downloadAsync()
    : await moduleAsset.downloadAsync();

  if (!asset.localUri) {
    throw new Error(`Bundled asset did not resolve to a local file: ${asset.uri}`);
  }

  return new File(asset.localUri).bytes();
}

async function migrateLegacyCategoryIcons(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ id: string; icon: string }>(
    `SELECT id, icon
     FROM categories
     WHERE icon_type = 'image' AND icon_blob IS NULL AND icon != ''`
  );

  for (const row of rows) {
    try {
      const data = await new File(row.icon).bytes();
      if (!data.length) continue;
      await db.runAsync(
        `UPDATE categories SET icon_blob = ?, icon_mime = ? WHERE id = ?`,
        data,
        imageMimeFromUri(row.icon),
        row.id
      );
    } catch {
      // 旧文件若已丢失则保留原路径，界面仍可按旧方式尝试读取。
    }
  }
}

function imageMimeFromUri(uri: string) {
  const extension = uri.split(/[?#]/, 1)[0].split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'heif') return 'image/heif';
  return 'image/png';
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
    `SELECT root.id, root.name, root.type, root.icon, root.color, root.sort_order
     FROM categories root
     WHERE root.parent_id IS NULL
       AND root.type IN ('expense', 'income')
       AND COALESCE(root.is_archived, 0) = 0
       AND NOT EXISTS (
         SELECT 1 FROM categories child
         WHERE child.parent_id = root.id AND COALESCE(child.is_archived, 0) = 0
       )`
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

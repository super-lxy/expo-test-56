# Quick Ledger - API 接口文档

## 目录

- [1. 概述](#1-概述)
- [2. 数据层接口](#2-数据层接口)
- [3. AI 服务接口](#3-ai-服务接口)
- [4. 原生模块接口](#4-原生模块接口)
- [5. 数据库 Schema](#5-数据库-schema)
- [6. 类型定义](#6-类型定义)

---

## 1. 概述

Quick Ledger 是一个离线优先的本地应用，主要通过 **Repository 模式** 提供数据访问接口，以及通过 **AI API** 实现智能账单识别功能。

### 接口层级

```
┌─────────────────────────────────────┐
│   React Components / Hooks          │
├─────────────────────────────────────┤
│   Repository APIs (Data Layer)     │
├─────────────────────────────────────┤
│   SQLite Database                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   AI Recognition Feature            │
├─────────────────────────────────────┤
│   AI Service API Client             │
├─────────────────────────────────────┤
│   External AI Provider (OpenAI)     │
└─────────────────────────────────────┘
```

---

## 2. 数据层接口

### 2.1 TransactionRepository

**位置**: `src/features/transactions/data/transaction.repository.ts`

#### 2.1.1 list()

获取所有交易记录列表。

**签名**:
```typescript
async list(): Promise<Transaction[]>
```

**返回值**:
```typescript
Transaction[] // 按发生时间倒序排列
```

**示例**:
```typescript
const repo = new TransactionRepository(db);
const transactions = await repo.list();
```

**查询逻辑**:
- 包含已删除交易（`deleted_at IS NULL`）
- 关联分类、账户、标签信息
- 按 `occurred_at DESC, created_at DESC` 排序

**性能考虑**:
- ⚠️ 无分页，加载所有记录
- ✅ 并行查询分类图标和标签
- ✅ 使用索引优化排序

---

#### 2.1.2 getById()

根据 ID 获取单个交易详情。

**签名**:
```typescript
async getById(id: string): Promise<Transaction | null>
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 交易 ID |

**返回值**:
```typescript
Transaction | null // 找不到返回 null
```

**示例**:
```typescript
const transaction = await repo.getById('1724140800000-a3f9c2d1e4b8');
if (transaction) {
  console.log(transaction.amountCents);
}
```

---

#### 2.1.3 create()

创建新交易记录。

**签名**:
```typescript
async create(draft: TransactionDraft): Promise<string>
```

**参数**:
```typescript
interface TransactionDraft {
  type: 'income' | 'expense' | 'transfer';
  amountCents: number;              // 金额（分），必须 > 0
  categoryId: string;               // 分类 ID
  accountId: string;                // 账户 ID
  transferAccountId?: string;       // 转账目标账户（type=transfer 时必填）
  feeCents?: number;                // 手续费（默认 0）
  discountCents?: number;           // 优惠（默认 0）
  occurredAt: string;               // 发生时间（ISO 8601）
  note: string;                     // 备注
  tagIds?: string[];                // 标签 ID 列表
}
```

**返回值**:
```typescript
string // 新创建的交易 ID
```

**示例**:
```typescript
const draft: TransactionDraft = {
  type: 'expense',
  amountCents: 3500, // 35.00 元
  categoryId: 'food-breakfast',
  accountId: 'cash',
  occurredAt: new Date().toISOString(),
  note: '早餐',
  tagIds: ['work-project'],
};

const id = await repo.create(draft);
console.log('Created transaction:', id);
```

**验证规则**: (调用前应先使用 `validateTransactionDraft()`)
- `amountCents` 必须为正整数
- `categoryId` 和 `accountId` 必须存在
- 转账类型必须提供 `transferAccountId`
- 转出账户和转入账户不能相同

**事务保证**:
- ✅ 使用 `withExclusiveTransactionAsync` 确保原子性
- ✅ 交易和标签关联在同一事务中创建

---

#### 2.1.4 update()

更新已有交易记录。

**签名**:
```typescript
async update(id: string, draft: TransactionDraft): Promise<void>
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 交易 ID |
| draft | TransactionDraft | 更新后的数据 |

**示例**:
```typescript
await repo.update('1724140800000-a3f9c2d1e4b8', {
  ...existingTransaction,
  amountCents: 4000,
  note: '早餐（更新）',
});
```

**行为**:
- 更新 `updated_at` 时间戳
- 替换所有标签关联（先删除旧的，再插入新的）
- 只更新未删除的记录

---

#### 2.1.5 softDelete()

软删除交易（标记为已删除，不实际删除数据）。

**签名**:
```typescript
async softDelete(id: string): Promise<void>
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 交易 ID |

**示例**:
```typescript
await repo.softDelete('1724140800000-a3f9c2d1e4b8');
```

**行为**:
- 设置 `deleted_at` 为当前时间
- 更新 `updated_at` 时间戳
- 标签关联不删除（通过 `ON DELETE CASCADE` 自动处理）

---

#### 2.1.6 getMonthlySummary()

获取指定月份的收支汇总。

**签名**:
```typescript
async getMonthlySummary(date?: Date): Promise<MonthlySummary>
```

**参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| date | Date | new Date() | 要查询的月份 |

**返回值**:
```typescript
interface MonthlySummary {
  incomeCents: number;   // 本月总收入（分）
  expenseCents: number;  // 本月总支出（分，包含转账手续费）
}
```

**示例**:
```typescript
// 查询当前月份
const summary = await repo.getMonthlySummary();
console.log(`收入: ${summary.incomeCents / 100} 元`);
console.log(`支出: ${summary.expenseCents / 100} 元`);

// 查询指定月份
const lastMonth = new Date(2026, 6, 1); // 2026年7月
const lastSummary = await repo.getMonthlySummary(lastMonth);
```

**计算规则**:
- 收入 = SUM(type=income 的 amount_cents)
- 支出 = SUM(type=expense 的 amount_cents) + SUM(type=transfer 的 fee_cents)
- 排除初始余额交易（`category_id != 'initial-balance'`）

---

#### 2.1.7 getAllTimeSummary()

获取全部时间的收支汇总。

**签名**:
```typescript
async getAllTimeSummary(): Promise<{ totalIncomeCents: number; totalExpenseCents: number }>
```

**返回值**:
```typescript
{
  totalIncomeCents: number;   // 总收入
  totalExpenseCents: number;  // 总支出
}
```

**示例**:
```typescript
const summary = await repo.getAllTimeSummary();
console.log(`累计收入: ${summary.totalIncomeCents / 100} 元`);
console.log(`累计支出: ${summary.totalExpenseCents / 100} 元`);
```

---

### 2.2 AccountRepository

**位置**: `src/features/accounts/data/account.repository.ts`

#### 2.2.1 list()

获取所有账户列表。

**签名**:
```typescript
async list(): Promise<Account[]>
```

**返回值**:
```typescript
Account[] // 按创建时间排序
```

**示例**:
```typescript
const repo = new AccountRepository(db);
const accounts = await repo.list();
```

**过滤规则**:
- 排除已删除账户（`deleted_at IS NULL`）
- 排除系统账户（外部转账端点）
- 按 `created_at` 升序排列

---

#### 2.2.2 listWithBalances()

获取所有账户及其当前余额。

**签名**:
```typescript
async listWithBalances(): Promise<AccountBalance[]>
```

**返回值**:
```typescript
interface AccountBalance extends Account {
  balanceCents: number; // 当前余额（分）
}
```

**示例**:
```typescript
const accounts = await repo.listWithBalances();
accounts.forEach(account => {
  console.log(`${account.name}: ${account.balanceCents / 100} 元`);
});
```

**余额计算公式**:

**资产账户**:
```
余额 = 初始余额 + 收入 - 支出 + 转入 - (转出 + 手续费 - 优惠)
```

**负债账户**:
```
余额 = -初始余额 + 收入 - 支出 + 转入 - (转出 + 手续费 - 优惠)
```

**性能优化**:
- ✅ 使用事务确保一致性读取
- ✅ 单次聚合查询计算余额
- ⚠️ N+1 查询问题（每个账户一次查询）

---

#### 2.2.3 create()

创建新账户。

**签名**:
```typescript
async create(draft: AccountDraft): Promise<string>
```

**参数**:
```typescript
interface AccountDraft {
  name: string;                      // 账户名称
  type: string;                      // 账户类型（cash, bank-card, credit-card 等）
  kind: 'asset' | 'liability';       // 资产或负债
  icon: string;                      // 图标（emoji）
  color: string;                     // 颜色（hex）
  initialBalanceCents: number;       // 初始余额
  creditLimitCents?: number | null;  // 信用额度（可选）
  statementDay?: number | null;      // 账单日（1-31）
  dueDay?: number | null;            // 还款日（1-31）
  status?: 'active' | 'archived' | 'hidden';
  includeInNetWorth?: boolean;       // 是否计入净资产
}
```

**返回值**:
```typescript
string // 新创建的账户 ID
```

**示例**:
```typescript
const draft: AccountDraft = {
  name: '招商银行储蓄卡',
  type: 'bank-card',
  kind: 'asset',
  icon: '🏦',
  color: '#EF4444',
  initialBalanceCents: 100000, // 1000.00 元
  includeInNetWorth: true,
};

const id = await repo.create(draft);
```

**自动处理**:
- 信用卡等循环信贷账户自动设为 `kind: 'liability'`
- `includeInNetWorth` 默认为 `true`
- `status` 默认为 `'active'`

---

#### 2.2.4 update()

更新账户信息。

**签名**:
```typescript
async update(id: string, input: {
  name: string;
  creditLimitCents: number | null;
  statementDay: number | null;
  dueDay: number | null;
  status: AccountStatus;
  includeInNetWorth: boolean;
}): Promise<void>
```

**示例**:
```typescript
await repo.update('account-id', {
  name: '招商银行储蓄卡（更新）',
  creditLimitCents: null,
  statementDay: null,
  dueDay: null,
  status: 'active',
  includeInNetWorth: true,
});
```

**限制**:
- 不能修改账户类型（`type`、`kind`）
- 不能修改初始余额（`initialBalanceCents`）
- 不能修改图标和颜色

---

#### 2.2.5 updateStatus()

更新账户状态。

**签名**:
```typescript
async updateStatus(id: string, status: 'active' | 'archived' | 'hidden'): Promise<void>
```

**示例**:
```typescript
// 归档不再使用的账户
await repo.updateStatus('account-id', 'archived');
```

**状态说明**:
- `active`: 正常使用
- `archived`: 归档（不显示在账户列表，但历史交易保留）
- `hidden`: 隐藏（系统账户专用）

---

#### 2.2.6 deleteAccountOnly()

仅删除账户，保留历史交易。

**签名**:
```typescript
async deleteAccountOnly(id: string): Promise<void>
```

**示例**:
```typescript
await repo.deleteAccountOnly('account-id');
```

**行为**:
- 软删除（设置 `deleted_at`）
- 历史交易保留，显示为"已删除资产"

---

#### 2.2.7 deleteAccountAndTransactions()

删除账户及其所有交易。

**签名**:
```typescript
async deleteAccountAndTransactions(id: string): Promise<void>
```

**示例**:
```typescript
await repo.deleteAccountAndTransactions('account-id');
```

**行为**:
- 硬删除（物理删除）
- 删除所有相关交易
- 使用事务确保原子性

⚠️ **危险操作**: 数据不可恢复！

---

### 2.3 CategoryRepository

**位置**: `src/features/categories/data/category.repository.ts`

#### 类型定义

```typescript
interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  parentId: string | null;
  icon: string;
  iconType: 'emoji' | 'image';
  iconBlob?: Uint8Array;
  iconMime?: string;
  color: string;
  sortOrder: number;
  isArchived: boolean;
}
```

**常用操作**:
- `list()`: 获取所有分类
- `create()`: 创建新分类
- `update()`: 更新分类
- `archive()`: 归档分类（不删除，只隐藏）

---

### 2.4 TagRepository

**位置**: `src/features/tags/data/tag.repository.ts`

#### 类型定义

```typescript
interface TagGroup {
  id: string;
  name: string;
  scope: 'common' | 'income' | 'expense';
  sortOrder: number;
  archivedAt: string | null;
}

interface Tag {
  id: string;
  groupId: string;
  name: string;
  sortOrder: number;
  archivedAt: string | null;
}
```

**常用操作**:
- `listGroups()`: 获取所有标签组
- `listTags(groupId)`: 获取指定组的标签
- `createGroup()`: 创建标签组
- `createTag()`: 创建标签

---

## 3. AI 服务接口

### 3.1 recognizeBill()

**位置**: `src/features/ai/data/aiLedgerApi.ts`

识别账单图片，提取交易信息。

**签名**:
```typescript
async function recognizeBill(
  input: RecognizeBillInput, 
  signal?: AbortSignal
): Promise<RecognizedBill>
```

**参数**:
```typescript
interface RecognizeBillInput {
  imageDataUrl: string;              // 图片 Data URL (data:image/png;base64,...)
  instruction?: string;              // 用户指令（可选）
  context?: AiLedgerContext;         // 本地账本上下文（可选）
  currentBill?: RecognizedBill;      // 当前草稿（用于增量修改）
}

interface AiLedgerContext {
  categories: Array<{
    type: 'expense' | 'income';
    name: string;                    // 二级分类名称
    parentName: string | null;       // 一级分类名称
  }>;
  accounts: string[];                // 账户名称列表
}
```

**返回值**:
```typescript
interface RecognizedBill {
  type: 'expense' | 'income';
  amountCents: number;               // 金额（分）
  merchant: string | null;           // 商户名称
  parentCategoryName: string | null; // 一级分类名称
  categoryName: string | null;       // 二级分类名称
  paymentMethod: string | null;      // 支付方式（账户名）
  occurredAt: string | null;         // 发生时间（ISO 8601）
  note: string | null;               // 备注
  confidence: number;                // 置信度（0-1）
  uncertainFields: string[];         // 不确定的字段列表
  summary: string;                   // 识别结果摘要
}
```

**示例**:
```typescript
import { recognizeBill } from '@/features/ai/data/aiLedgerApi';

const result = await recognizeBill({
  imageDataUrl: 'data:image/png;base64,iVBORw0KG...',
  context: {
    categories: [
      { type: 'expense', name: '早餐', parentName: '餐饮' },
      { type: 'expense', name: '咖啡茶饮', parentName: '餐饮' },
    ],
    accounts: ['现金', '招商银行储蓄卡'],
  },
});

console.log(result.summary); // "识别到餐饮类支出 35.00 元"
console.log(result.confidence); // 0.95
console.log(result.uncertainFields); // ['occurredAt']
```

**输入验证**:
- ✅ 图片格式验证（必须是 `data:image/*`）
- ✅ 图片大小限制（最大 10MB）
- ✅ Base64 格式验证
- ✅ 超时保护（60秒）

**错误处理**:
```typescript
try {
  const result = await recognizeBill(input);
} catch (error) {
  if (error.message.includes('超时')) {
    // 网络超时
  } else if (error.message.includes('限制')) {
    // 图片过大
  } else {
    // 其他错误
  }
}
```

**AI 模型要求**:
- 支持视觉输入（multimodal）
- 支持 JSON Schema 结构化输出
- 兼容 OpenAI API 格式

---

### 3.2 probeAiModels()

**位置**: `src/features/ai/data/aiLedgerApi.ts`

探测可用的 AI 模型列表。

**签名**:
```typescript
async function probeAiModels(
  input: ProbeAiModelsInput,
  signal?: AbortSignal
): Promise<string[]>
```

**参数**:
```typescript
interface ProbeAiModelsInput {
  providerBaseUrl: string; // 服务商 Base URL
  apiKey: string;          // API Key
}
```

**返回值**:
```typescript
string[] // 模型 ID 列表，按字母顺序排序
```

**示例**:
```typescript
const models = await probeAiModels({
  providerBaseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-...',
});

console.log(models);
// ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', ...]
```

**用途**:
- 设置页面自动探测可用模型
- 验证 API Key 有效性

---

## 4. 原生模块接口

### 4.1 expo-quick-ledger (Android)

**位置**: `modules/expo-quick-ledger/`

提供 Android 快捷截屏功能。

#### 4.1.1 QuickLedgerModule

**方法列表**:

##### requestCapture()

请求屏幕截图权限并开始截屏。

**TypeScript 签名**:
```typescript
function requestCapture(): Promise<string>
```

**返回值**:
```typescript
string // 截屏图片的 token
```

**工作流程**:
1. 调用 `requestCapture()`
2. 系统弹出截屏权限确认对话框
3. 用户同意后，截取当前屏幕
4. 图片保存到缓存目录
5. 返回 token 用于后续读取

**示例**:
```typescript
import { requestCapture, readCaptureImage } from 'expo-quick-ledger';

try {
  const token = await requestCapture();
  const imageDataUrl = await readCaptureImage(token);
  // 使用 imageDataUrl 进行 AI 识别
} catch (error) {
  console.error('截屏失败:', error);
}
```

##### readCaptureImage()

读取截屏图片。

**TypeScript 签名**:
```typescript
function readCaptureImage(token: string): Promise<string>
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| token | string | 截屏 token |

**返回值**:
```typescript
string // Base64 Data URL (data:image/png;base64,...)
```

**示例**:
```typescript
const imageDataUrl = await readCaptureImage(token);
console.log(imageDataUrl.length); // 大约 500KB - 3MB
```

##### Constants

```typescript
const QuickLedgerModule = {
  CAPTURE_FINISHED: 'onCaptureFinished', // 截屏完成事件名
};
```

#### 4.1.2 Quick Settings Tile (快捷设置磁贴)

**Android 快捷设置面板集成**:

用户可以从通知栏下拉菜单直接触发截屏。

**配置**:
```xml
<!-- AndroidManifest.xml -->
<service
    android:name=".QuickCaptureTileService"
    android:exported="true"
    android:icon="@drawable/ic_quick_ledger_tile"
    android:label="@string/quick_ledger_tile_label"
    android:permission="android.permission.BIND_QUICK_SETTINGS_TILE">
    <intent-filter>
        <action android:name="android.service.quicksettings.action.QS_TILE" />
    </intent-filter>
</service>
```

**用户体验**:
1. 下拉通知栏
2. 点击"快捷记账"磁贴
3. 自动截屏并打开 AI 识别页面

---

## 5. 数据库 Schema

### 5.1 表结构

#### accounts (账户表)

```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- 账户类型
  kind TEXT NOT NULL DEFAULT 'asset', -- asset | liability
  icon TEXT NOT NULL DEFAULT '💰',
  color TEXT NOT NULL DEFAULT '#64748B',
  initial_balance_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  credit_limit_cents INTEGER,      -- 信用额度
  statement_day INTEGER,           -- 账单日
  due_day INTEGER,                 -- 还款日
  status TEXT NOT NULL DEFAULT 'active', -- active | archived | hidden
  include_in_net_worth INTEGER NOT NULL DEFAULT 1, -- 是否计入净资产
  deleted_at TEXT,
  created_at TEXT NOT NULL
);
```

#### transactions (交易表)

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,              -- income | expense | transfer
  amount_cents INTEGER NOT NULL,   -- 金额（分）
  category_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  transfer_account_id TEXT,        -- 转账目标账户
  fee_cents INTEGER NOT NULL DEFAULT 0,      -- 手续费
  discount_cents INTEGER NOT NULL DEFAULT 0, -- 优惠
  occurred_at TEXT NOT NULL,       -- 发生时间（ISO 8601）
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- 索引
CREATE INDEX idx_transactions_occurred_at ON transactions(occurred_at DESC);
CREATE INDEX idx_transactions_deleted_at ON transactions(deleted_at);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
```

#### categories (分类表)

```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- income | expense | transfer
  parent_id TEXT,                  -- 父分类 ID（支持二级分类）
  icon TEXT NOT NULL,
  icon_type TEXT NOT NULL DEFAULT 'emoji', -- emoji | image
  icon_blob BLOB,                  -- 图片数据
  icon_mime TEXT,                  -- 图片 MIME 类型
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```

#### tag_groups (标签组表)

```sql
CREATE TABLE tag_groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'common', -- common | income | expense
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);
```

#### tags (标签表)

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (group_id) REFERENCES tag_groups(id)
);

CREATE INDEX idx_tags_group_id ON tags(group_id);
```

#### transaction_tags (交易标签关联表)

```sql
CREATE TABLE transaction_tags (
  transaction_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (transaction_id, tag_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);

CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags(tag_id);
```

### 5.2 数据库版本

**当前版本**: 19

**版本历史**:
- v19: 统一循环信贷账户为负债
- v17: 引入外部转账端点系统账户
- v14: 启用新版支出分类体系
- v12: 统一内部转账系统分类
- v11: 分类图标支持 BLOB 存储
- v10: 分类图标类型区分
- v9: 转账支持手续费与优惠
- ...

### 5.3 迁移机制

数据库版本升级通过 `migrateDbIfNeeded()` 函数自动执行。

**迁移逻辑**:
```typescript
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 19;
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return; // 已是最新版本
  }

  // 逐版本升级
  if (currentVersion < 17) {
    await migrateV17(db);
  }
  if (currentVersion < 19) {
    await migrateV19(db);
  }

  // 更新版本号
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
```

**特点**:
- ✅ 向前兼容（旧版本数据自动升级）
- ✅ 幂等性（多次执行不会重复迁移）
- ✅ 原子性（使用事务确保一致性）

---

## 6. 类型定义

### 6.1 核心类型

#### Transaction

```typescript
interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amountCents: number;
  categoryId: string;
  categoryName: string;
  parentCategoryName: string;
  categoryIcon: string;
  categoryIconType: 'emoji' | 'image';
  categoryColor: string;
  accountId: string;
  accountName: string;
  transferAccountId?: string;
  transferAccountName?: string;
  feeCents: number;
  discountCents: number;
  occurredAt: string;               // ISO 8601
  note: string;
  tags: Array<{
    id: string;
    name: string;
    groupName: string;
  }>;
}
```

#### Account

```typescript
interface Account {
  id: string;
  name: string;
  type: string;                     // cash, bank-card, credit-card, etc.
  kind: 'asset' | 'liability';
  icon: string;
  color: string;
  initialBalanceCents: number;
  currency: string;
  creditLimitCents: number | null;
  statementDay: number | null;
  dueDay: number | null;
  status: 'active' | 'archived' | 'hidden';
  includeInNetWorth: boolean;
}

interface AccountBalance extends Account {
  balanceCents: number;
}
```

#### Category

```typescript
interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  parentId: string | null;
  icon: string;
  iconType: 'emoji' | 'image';
  color: string;
  sortOrder: number;
  isArchived: boolean;
}
```

#### Tag & TagGroup

```typescript
interface TagGroup {
  id: string;
  name: string;
  scope: 'common' | 'income' | 'expense';
  sortOrder: number;
  archivedAt: string | null;
}

interface Tag {
  id: string;
  groupId: string;
  name: string;
  sortOrder: number;
  archivedAt: string | null;
}
```

### 6.2 表单类型

#### TransactionDraft

```typescript
interface TransactionDraft {
  type: 'income' | 'expense' | 'transfer';
  amountCents: number;
  categoryId: string;
  accountId: string;
  transferAccountId?: string;
  feeCents?: number;
  discountCents?: number;
  occurredAt: string;
  note: string;
  tagIds?: string[];
}
```

#### AccountDraft

```typescript
interface AccountDraft {
  name: string;
  type: string;
  kind: 'asset' | 'liability';
  icon: string;
  color: string;
  initialBalanceCents: number;
  creditLimitCents?: number | null;
  statementDay?: number | null;
  dueDay?: number | null;
  status?: 'active' | 'archived' | 'hidden';
  includeInNetWorth?: boolean;
}
```

### 6.3 AI 类型

#### RecognizedBill

```typescript
interface RecognizedBill {
  type: 'expense' | 'income';
  amountCents: number;
  merchant: string | null;
  parentCategoryName: string | null;
  categoryName: string | null;
  paymentMethod: string | null;
  occurredAt: string | null;
  note: string | null;
  confidence: number;               // 0-1
  uncertainFields: string[];
  summary: string;
}
```

---

## 7. 常见问题

### Q1: 如何处理并发写入？

**A**: 使用 `withExclusiveTransactionAsync` 或 `withTransactionAsync` 包裹写操作：

```typescript
await db.withExclusiveTransactionAsync(async (tx) => {
  await tx.runAsync(`INSERT INTO transactions ...`);
  await tx.runAsync(`UPDATE accounts ...`);
});
```

### Q2: 金额为什么用"分"而不是"元"？

**A**: 
- 避免浮点数精度问题
- 数据库存储整数更高效
- 计算更准确（不会出现 0.1 + 0.2 = 0.30000000000000004）

**转换**:
```typescript
// 元 → 分
const cents = Math.round(yuan * 100);

// 分 → 元
const yuan = cents / 100;
```

### Q3: 软删除和硬删除的区别？

**A**:
- **软删除** (`softDelete`): 设置 `deleted_at` 字段，数据仍在数据库中，可恢复
- **硬删除** (`deleteAccountAndTransactions`): 物理删除数据，不可恢复

**建议**: 优先使用软删除，除非确定不需要数据。

### Q4: 如何添加新的数据库字段？

**A**:
1. 增加 `DATABASE_VERSION`
2. 添加迁移逻辑：
```typescript
if (currentVersion < 20) {
  await addColumnIfMissing(db, 'transactions', 'new_field TEXT');
}
```
3. 更新 TypeScript 类型定义

### Q5: AI 识别失败怎么办？

**A**:
- 检查网络连接
- 确认 API Key 有效
- 确认服务商 Base URL 正确
- 查看错误信息：
  - "识别超时" → 网络问题
  - "图片大小超过限制" → 压缩图片
  - "模型没有返回可确认的账单" → 图片不清晰或不是账单

---

## 8. 最佳实践

### 8.1 Repository 使用

```typescript
// ✅ 正确：在组件外层创建 Repository 实例
function TransactionListScreen() {
  const db = useSQLiteContext();
  const repo = useMemo(() => new TransactionRepository(db), [db]);
  
  const loadTransactions = async () => {
    const data = await repo.list();
    setTransactions(data);
  };
}

// ❌ 错误：每次渲染创建新实例
function TransactionListScreen() {
  const db = useSQLiteContext();
  const repo = new TransactionRepository(db); // 每次渲染都创建
}
```

### 8.2 数据验证

```typescript
// ✅ 正确：保存前验证
const handleSubmit = async () => {
  const error = validateTransactionDraft(draft);
  if (error) {
    Alert.alert('验证失败', error);
    return;
  }
  await repo.create(draft);
};

// ❌ 错误：直接保存，依赖数据库约束
await repo.create(draft); // 可能在数据库层抛出异常
```

### 8.3 错误处理

```typescript
// ✅ 正确：友好的错误提示
try {
  await repo.create(draft);
  router.back();
} catch (error) {
  Alert.alert('保存失败', error instanceof Error ? error.message : '未知错误');
}

// ❌ 错误：静默失败
try {
  await repo.create(draft);
} catch (error) {
  console.error(error);
}
```

### 8.4 性能优化

```typescript
// ✅ 正确：使用 useMemo 缓存计算结果
const totalIncome = useMemo(() => {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amountCents, 0);
}, [transactions]);

// ❌ 错误：每次渲染重新计算
const totalIncome = transactions
  .filter(t => t.type === 'income')
  .reduce((sum, t) => sum + t.amountCents, 0);
```

---

**文档维护者**: 开发团队  
**最后更新**: 2026-08-20  
**版本**: v1.0.0

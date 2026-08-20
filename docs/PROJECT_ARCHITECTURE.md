# Quick Ledger - 项目架构文档

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术栈](#2-技术栈)
- [3. 架构设计](#3-架构设计)
- [4. 目录结构](#4-目录结构)
- [5. 数据流](#5-数据流)
- [6. 核心模块](#6-核心模块)
- [7. 设计模式](#7-设计模式)
- [8. 性能优化](#8-性能优化)
- [9. 安全性](#9-安全性)

---

## 1. 项目概述

**Quick Ledger** 是一款基于 Expo 56 开发的移动端个人财务管理应用，支持 AI 智能账单识别功能。

### 核心功能

- 📊 **多账户管理** - 支持现金、银行卡、信用卡等多种账户类型
- 💰 **收支记录** - 快速记录收入、支出和转账
- 🏷️ **分类标签** - 灵活的分类体系和标签系统
- 🤖 **AI 识别** - 通过拍照或截图自动识别账单信息
- 📈 **统计分析** - 月度汇总、资产总览等统计功能
- 🔒 **数据安全** - 本地 SQLite 存储，支持数据导出

### 技术特点

- ✅ **跨平台** - 支持 Android、iOS 和 Web
- ✅ **离线优先** - 本地 SQLite 数据库，无需网络即可使用
- ✅ **类型安全** - TypeScript 全栈类型检查
- ✅ **响应式设计** - 适配不同屏幕尺寸
- ✅ **原生集成** - 自定义 Android 快捷截屏模块

---

## 2. 技术栈

### 前端框架

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2.3 | UI 框架 |
| React Native | 0.85.3 | 移动端开发框架 |
| Expo | ~56.0.18 | 开发工具链 |
| Expo Router | ~56.2.17 | 文件路由系统 |
| TypeScript | ~6.0.3 | 类型系统 |

### 状态管理与数据

| 技术 | 版本 | 用途 |
|------|------|------|
| expo-sqlite | ~56.0.5 | SQLite 数据库 |
| React Context | 内置 | 轻量状态管理 |
| Zod | ^4.4.3 | 运行时类型验证 |

### UI 组件

| 技术 | 版本 | 用途 |
|------|------|------|
| @expo/ui | ~56.0.24 | Expo UI 组件库 |
| react-native-gesture-handler | ~2.31.1 | 手势处理 |
| react-native-reanimated | 4.3.1 | 动画库 |
| react-native-safe-area-context | ~5.7.0 | 安全区域适配 |

### AI 集成

| 技术 | 版本 | 用途 |
|------|------|------|
| OpenAI | ^7.4.0 | AI 模型 API 客户端 |

### 原生模块

| 模块 | 平台 | 用途 |
|------|------|------|
| expo-quick-ledger | Android | 快捷截屏功能 |

---

## 3. 架构设计

### 3.1 整体架构

Quick Ledger 采用 **Feature-Slice Design (功能切片设计)** 和 **Clean Architecture (清洁架构)** 的混合架构模式。

```
┌─────────────────────────────────────────────┐
│            Presentation Layer               │
│     (Screens, Components, Hooks)            │
├─────────────────────────────────────────────┤
│           Application Layer                 │
│     (Services, Signals, Use Cases)          │
├─────────────────────────────────────────────┤
│             Domain Layer                    │
│     (Types, Rules, Business Logic)          │
├─────────────────────────────────────────────┤
│              Data Layer                     │
│     (Repositories, API Clients)             │
├─────────────────────────────────────────────┤
│          Infrastructure Layer               │
│     (Database, Native Modules)              │
└─────────────────────────────────────────────┘
```

### 3.2 分层职责

#### Presentation Layer (展示层)
- **职责**: UI 渲染、用户交互、路由导航
- **组件**: Screens、Components、Hooks
- **特点**: 无业务逻辑，纯展示和交互

#### Application Layer (应用层)
- **职责**: 协调业务流程、跨模块通信
- **组件**: Services、Signals、Use Cases
- **特点**: 编排领域逻辑，不包含具体实现

#### Domain Layer (领域层)
- **职责**: 核心业务规则、类型定义
- **组件**: Types、Rules、Validators
- **特点**: 框架无关，纯业务逻辑

#### Data Layer (数据层)
- **职责**: 数据持久化、API 通信
- **组件**: Repositories、API Clients
- **特点**: 数据访问抽象，隔离底层实现

#### Infrastructure Layer (基础设施层)
- **职责**: 底层技术实现
- **组件**: Database Schema、Native Modules
- **特点**: 可替换的技术实现

### 3.3 数据流向

```
User Action (用户操作)
    ↓
Screen/Component (展示层)
    ↓
Hook/Service (应用层)
    ↓
Domain Rules (领域层验证)
    ↓
Repository (数据层)
    ↓
Database/API (基础设施层)
    ↓
Update State (更新状态)
    ↓
Re-render UI (重新渲染)
```

---

## 4. 目录结构

```
expo-test-56/
├── src/                          # 源代码目录
│   ├── app/                      # Expo Router 路由页面
│   │   ├── (tabs)/              # 底部导航标签页
│   │   │   ├── index.tsx        # 首页（交易列表）
│   │   │   ├── assets.tsx       # 资产页
│   │   │   └── settings.tsx     # 设置页
│   │   ├── _layout.tsx          # 根布局（数据库、主题提供者）
│   │   ├── bills.tsx            # AI 账单识别页面
│   │   ├── transaction/         # 交易相关页面
│   │   ├── accounts/            # 账户相关页面
│   │   ├── categories/          # 分类相关页面
│   │   └── tags.tsx             # 标签管理页面
│   │
│   ├── features/                # 功能模块（Feature-Slice）
│   │   ├── accounts/            # 账户模块
│   │   │   ├── application/     # 应用服务
│   │   │   ├── components/      # UI 组件
│   │   │   ├── data/           # 数据层（Repository）
│   │   │   ├── domain/         # 领域层（Types, Rules）
│   │   │   ├── hooks/          # React Hooks
│   │   │   └── screens/        # 页面组件
│   │   │
│   │   ├── transactions/       # 交易模块
│   │   ├── categories/         # 分类模块
│   │   ├── tags/              # 标签模块
│   │   ├── ai/                # AI 识别模块
│   │   ├── assets/            # 资产统计模块
│   │   ├── dashboard/         # 仪表盘模块
│   │   └── settings/          # 设置模块
│   │
│   ├── components/             # 共享 UI 组件
│   │   ├── animated-icon.tsx  # 动画图标
│   │   ├── ui/                # 通用 UI 组件
│   │   └── ...
│   │
│   ├── infrastructure/         # 基础设施
│   │   └── database/          # 数据库
│   │       ├── database.ts    # 数据库初始化与迁移
│   │       └── defaultExpenseCategories.ts
│   │
│   ├── shared/                # 共享工具
│   │   └── utils/            # 工具函数
│   │       └── idGenerator.ts # 安全 ID 生成器
│   │
│   ├── hooks/                 # 全局 Hooks
│   ├── constants/             # 常量定义
│   ├── context/               # React Context
│   ├── types/                 # 全局类型定义
│   └── global.css             # 全局样式
│
├── modules/                    # 原生模块
│   └── expo-quick-ledger/     # Android 快捷截屏模块
│       └── android/           # Android 原生代码
│
├── assets/                     # 静态资源
│   ├── images/                # 图片资源
│   └── fonts/                 # 字体文件
│
├── docs/                      # 文档目录
│   ├── PROJECT_ARCHITECTURE.md # 架构文档
│   └── API_DOCUMENTATION.md    # API 文档
│
├── server/                    # 后端服务（可选）
├── scripts/                   # 构建脚本
├── app.json                   # Expo 配置
├── package.json               # 依赖配置
└── tsconfig.json              # TypeScript 配置
```

---

## 5. 数据流

### 5.1 交易创建流程

```typescript
// 1. 用户在表单输入数据
function CreateTransactionScreen() {
  const [draft, setDraft] = useState<TransactionDraft>({...});

  // 2. 提交时进行领域验证
  const handleSubmit = async () => {
    const error = validateTransactionDraft(draft);
    if (error) {
      Alert.alert('验证失败', error);
      return;
    }

    // 3. 调用 Repository 保存数据
    try {
      const id = await transactionRepository.create(draft);
      router.back();
    } catch (error) {
      Alert.alert('保存失败', error.message);
    }
  };
}

// 4. Repository 执行数据库操作
class TransactionRepository {
  async create(draft: TransactionDraft) {
    const id = generateSecureId();
    await this.db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(`INSERT INTO transactions ...`, ...);
      await this.replaceTags(tx, id, draft.tagIds, now);
    });
    return id;
  }
}
```

### 5.2 AI 识别流程

```
用户触发截屏
    ↓
Android 原生模块 (ScreenCaptureService)
    ↓
保存图片到缓存
    ↓
发送广播通知 React Native
    ↓
读取图片并转换为 Base64
    ↓
调用 AI API (recognizeBill)
    ↓
解析并验证 AI 返回结果
    ↓
预填充表单草稿
    ↓
用户确认并保存
```

### 5.3 账户余额计算

```typescript
// 余额 = 初始余额 + 收入 - 支出 + 转入 - 转出
const balanceCents = account.kind === 'liability'
  ? -account.initialBalanceCents + incomeCents - expenseCents + transferredInCents - transferredOutCents
  : account.initialBalanceCents + incomeCents - expenseCents + transferredInCents - transferredOutCents;
```

**注意**: 负债账户的初始余额为负数，因为欠款越多余额越负。

---

## 6. 核心模块

### 6.1 Transactions (交易模块)

**职责**: 管理所有收支交易记录

**核心类型**:
```typescript
type TransactionType = 'income' | 'expense' | 'transfer';

interface Transaction {
  id: string;
  type: TransactionType;
  amountCents: number;              // 金额（分）
  categoryId: string;               // 分类 ID
  accountId: string;                // 账户 ID
  transferAccountId?: string;       // 转账目标账户
  feeCents: number;                 // 手续费
  discountCents: number;            // 优惠
  occurredAt: string;               // 发生时间（ISO 8601）
  note: string;                     // 备注
  tags: Tag[];                      // 标签列表
}
```

**业务规则**:
- 金额必须大于 0
- 转账类型必须指定转入账户
- 转出账户和转入账户不能相同
- 优惠不能大于转出金额与手续费之和

### 6.2 Accounts (账户模块)

**职责**: 管理用户的资产和负债账户

**核心类型**:
```typescript
type AccountKind = 'asset' | 'liability';
type AccountStatus = 'active' | 'archived' | 'hidden';

interface Account {
  id: string;
  name: string;                     // 账户名称
  type: string;                     // 账户类型（cash, bank-card, credit-card 等）
  kind: AccountKind;                // 资产或负债
  icon: string;                     // 图标
  color: string;                    // 颜色
  initialBalanceCents: number;      // 初始余额
  creditLimitCents: number | null;  // 信用额度（仅信用账户）
  statementDay: number | null;      // 账单日
  dueDay: number | null;            // 还款日
  status: AccountStatus;            // 状态
  includeInNetWorth: boolean;       // 是否计入净资产
}

interface AccountBalance extends Account {
  balanceCents: number;             // 当前余额
}
```

**业务规则**:
- 信用卡、花呗等循环信贷账户自动归类为负债
- 负债账户的余额计算与资产账户相反
- 隐藏账户（如外部转账端点）不显示在列表中

### 6.3 Categories (分类模块)

**职责**: 管理收支分类体系

**核心类型**:
```typescript
type CategoryType = 'income' | 'expense' | 'transfer';
type CategoryIconType = 'emoji' | 'image';

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;          // 父分类 ID（支持二级分类）
  icon: string;                     // 图标（emoji 或 base64）
  iconType: CategoryIconType;
  color: string;
  sortOrder: number;                // 排序权重
  isArchived: boolean;              // 是否归档
}
```

**分类层级**:
- **一级分类**: 例如"餐饮"、"交通"、"娱乐"
- **二级分类**: 例如"餐饮 → 早餐"、"餐饮 → 咖啡茶饮"
- **系统分类**: 内部转账、初始余额（不可删除）

### 6.4 Tags (标签模块)

**职责**: 提供灵活的标签系统用于多维度记账

**核心类型**:
```typescript
interface TagGroup {
  id: string;
  name: string;                     // 标签组名称（如"项目"、"成员"）
  scope: 'common' | 'income' | 'expense';
  sortOrder: number;
}

interface Tag {
  id: string;
  groupId: string;
  name: string;
  sortOrder: number;
}
```

**使用场景**:
- 项目标签：区分工作、个人、家庭开支
- 成员标签：多人记账场景
- 自定义维度：旅行、健身、学习等

### 6.5 AI (AI 识别模块)

**职责**: 通过 AI 模型识别账单图片，自动提取交易信息

**核心流程**:
1. 用户通过截屏或相册选择账单图片
2. 图片转换为 Base64 格式
3. 调用 OpenAI 兼容 API，传递图片和上下文
4. AI 返回结构化的账单信息（JSON Schema）
5. 解析并预填充到交易表单

**识别字段**:
- 收支类型（income/expense）
- 金额（自动换算为分）
- 商户名称
- 分类（一级、二级）
- 支付方式
- 发生时间
- 备注

**置信度机制**:
- `confidence`: 0-1 的置信度分数
- `uncertainFields`: 需要用户确认的字段列表
- `summary`: 识别结果的自然语言描述

---

## 7. 设计模式

### 7.1 Repository 模式

**定义**: 将数据访问逻辑封装在 Repository 类中，提供统一的数据操作接口。

**示例**:
```typescript
class TransactionRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(): Promise<Transaction[]> { ... }
  async getById(id: string): Promise<Transaction | null> { ... }
  async create(draft: TransactionDraft): Promise<string> { ... }
  async update(id: string, draft: TransactionDraft): Promise<void> { ... }
  async softDelete(id: string): Promise<void> { ... }
}
```

**优势**:
- 数据访问逻辑集中管理
- 易于单元测试（可 mock）
- 底层存储可替换（SQLite → IndexedDB）

### 7.2 Domain Rules (领域规则)

**定义**: 将业务验证规则独立于数据层，形成纯函数。

**示例**:
```typescript
export function validateTransactionDraft(draft: TransactionDraft): string | null {
  if (!Number.isInteger(draft.amountCents) || draft.amountCents <= 0) {
    return '请输入大于 0 的金额';
  }
  if (draft.type === 'transfer' && draft.accountId === draft.transferAccountId) {
    return '转出和转入账户不能相同';
  }
  return null;
}
```

**优势**:
- 业务规则可复用
- 易于测试
- 前后端可共享

### 7.3 Hook 封装

**定义**: 将数据获取和状态管理逻辑封装在自定义 Hook 中。

**示例**:
```typescript
export function useTransactions() {
  const db = useSQLiteContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const repo = new TransactionRepository(db);
    const data = await repo.list();
    setTransactions(data);
    setLoading(false);
  }, [db]);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  return { transactions, loading, refresh };
}
```

**优势**:
- 组件逻辑分离
- 状态管理简化
- 可复用

### 7.4 Signal 模式（跨模块通信）

**定义**: 使用简单的信号机制实现模块间解耦通信。

**示例**:
```typescript
// aiDraftSaveSignal.ts
let listener: ((draft: RecognizedBill) => void) | null = null;

export const aiDraftSaveSignal = {
  emit(draft: RecognizedBill) {
    listener?.(draft);
  },
  subscribe(callback: (draft: RecognizedBill) => void) {
    listener = callback;
  },
  unsubscribe() {
    listener = null;
  },
};

// 使用
useEffect(() => {
  aiDraftSaveSignal.subscribe((draft) => {
    // 处理 AI 识别结果
  });
  return () => aiDraftSaveSignal.unsubscribe();
}, []);
```

---

## 8. 性能优化

### 8.1 数据库优化

#### 索引策略
```sql
-- 查询优化索引
CREATE INDEX idx_transactions_occurred_at ON transactions(occurred_at DESC);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_deleted_at ON transactions(deleted_at);

-- 标签关联索引
CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags(tag_id);
CREATE INDEX idx_tags_group_id ON tags(group_id);
```

#### 事务管理
```typescript
// 使用事务确保数据一致性
await db.withExclusiveTransactionAsync(async (tx) => {
  await tx.runAsync(`INSERT INTO transactions ...`);
  await this.replaceTags(tx, id, tagIds, now);
});
```

### 8.2 图片优化

#### 分类图标存储
- 默认图标使用打包资源（Bundle Assets）
- 用户上传图标压缩后存储为 BLOB
- 限制单个图标最大 100KB

#### AI 识别图片
- 上传前验证格式和大小（最大 10MB）
- 使用 `expo-image-manipulator` 压缩
- Base64 编码前先调整尺寸

### 8.3 渲染优化

#### 列表虚拟化
```typescript
// 使用 FlashList 代替 FlatList
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={transactions}
  renderItem={({ item }) => <TransactionItem transaction={item} />}
  estimatedItemSize={72}
/>
```

#### 避免不必要的重渲染
```typescript
// 使用 React.memo 包裹纯展示组件
const TransactionItem = React.memo(({ transaction }) => {
  // ...
}, (prev, next) => prev.transaction.id === next.transaction.id);
```

---

## 9. 安全性

### 9.1 数据安全

#### API Key 存储
```typescript
// 使用 expo-secure-store 加密存储
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('ai_api_key', apiKey);
const storedKey = await SecureStore.getItemAsync('ai_api_key');
```

#### 数据库加密（推荐）
```typescript
// 使用 SQLCipher 加密数据库
import { openDatabaseAsync } from 'expo-sqlite';

const db = await openDatabaseAsync('ledger.db', {
  enableCRSQLite: true,
  encryptionKey: derivedKey, // 从用户密码或生物识别派生
});
```

### 9.2 输入验证

#### 前端验证
```typescript
// 使用 Zod 进行类型验证
const transactionDraftSchema = z.object({
  amountCents: z.number().int().positive(),
  categoryId: z.string().min(1),
  // ...
});

const result = transactionDraftSchema.safeParse(input);
if (!result.success) {
  throw new Error(result.error.message);
}
```

#### SQL 注入防护
```typescript
// ✅ 使用参数化查询
await db.runAsync(
  `SELECT * FROM transactions WHERE id = ?`,
  transactionId
);

// ❌ 避免字符串拼接
await db.runAsync(
  `SELECT * FROM transactions WHERE id = '${transactionId}'`
);
```

### 9.3 ID 生成安全

```typescript
// ✅ 使用加密安全的随机数
export function generateSecureId(): string {
  const timestamp = Date.now();
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${timestamp}-${randomHex}`;
}

// ❌ 避免使用 Math.random()
const id = `${Date.now()}-${Math.random().toString(36)}`;
```

---

## 10. 开发指南

### 10.1 添加新功能模块

1. 在 `src/features/` 下创建新目录
2. 按照 Feature-Slice 结构组织代码：
   ```
   new-feature/
   ├── application/    # 应用服务
   ├── components/     # UI 组件
   ├── data/          # Repository
   ├── domain/        # Types & Rules
   ├── hooks/         # React Hooks
   └── screens/       # 页面组件
   ```
3. 在 `src/app/` 中添加对应路由

### 10.2 数据库迁移

```typescript
// 在 database.ts 中增加版本号
const DATABASE_VERSION = 20; // 从 19 升级到 20

// 添加迁移逻辑
if (currentVersion < 20) {
  // 执行迁移操作
  await addColumnIfMissing(db, 'transactions', 'new_column TEXT');
  // 或执行数据转换
}

// 更新版本号
currentVersion = 20;
await db.execAsync(`PRAGMA user_version = ${currentVersion}`);
```

### 10.3 测试策略

#### 单元测试
```typescript
// 测试领域规则
describe('validateTransactionDraft', () => {
  it('should reject negative amount', () => {
    const draft = { amountCents: -100, ... };
    expect(validateTransactionDraft(draft)).toBe('请输入大于 0 的金额');
  });
});
```

#### 集成测试
```typescript
// 测试 Repository
describe('TransactionRepository', () => {
  it('should create transaction with tags', async () => {
    const repo = new TransactionRepository(db);
    const id = await repo.create(draft);
    const transaction = await repo.getById(id);
    expect(transaction?.tags).toHaveLength(2);
  });
});
```

---

## 11. 部署与构建

### 11.1 开发环境

```bash
# 启动开发服务器
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

### 11.2 生产构建

```bash
# Android Internal Build
npm run build:internal:android

# iOS Internal Build
npm run build:internal:ios
```

### 11.3 环境变量

```bash
# .env.server.local (后端服务)
PORT=3000
OPENAI_API_KEY=sk-...
```

---

## 12. 未来规划

### 短期目标
- [ ] 添加数据导出/导入功能
- [ ] 支持多语言（i18n）
- [ ] 优化 AI 识别准确率
- [ ] 添加预算管理功能

### 长期目标
- [ ] 云同步功能
- [ ] 多用户协作
- [ ] Web 端完整支持
- [ ] 数据可视化增强

---

**文档维护者**: 开发团队  
**最后更新**: 2026-08-20  
**版本**: v1.0.0

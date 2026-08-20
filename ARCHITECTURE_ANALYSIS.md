# Project Architecture Analysis & Bug Report

## Executive Summary

This is an Expo 56 React Native personal finance application with AI-powered bill recognition. The project follows a clean architecture pattern with feature-based organization. This document analyzes the architecture, identifies potential bugs, and provides recommendations for improvement.

**Analysis Date:** 2026-08-20  
**Project:** expo-test-56 (Quick Ledger)  
**Tech Stack:** React Native 0.85, Expo 56, SQLite, OpenAI API

---

## 1. Architecture Overview

### 1.1 Project Structure

```
src/
├── app/                    # Expo Router screens
├── components/             # Shared UI components
├── constants/              # App-wide constants
├── context/                # React context providers
├── features/               # Feature modules (domain-driven)
│   ├── accounts/
│   ├── ai/
│   ├── assets/
│   ├── categories/
│   ├── dashboard/
│   ├── settings/
│   ├── tags/
│   └── transactions/
├── hooks/                  # Shared custom hooks
├── infrastructure/         # Cross-cutting concerns
│   └── database/          # SQLite schema & migrations
├── platform/               # Platform-specific code
├── shared/                 # Shared utilities
└── types/                  # TypeScript type definitions

modules/                    # Native modules
└── expo-quick-ledger/     # Android screen capture module
```

### 1.2 Architecture Pattern

The project follows **Feature-Slice Design** with domain-driven organization:

```
feature/
├── application/     # Application services, signals
├── components/      # Feature-specific UI components
├── data/           # Repositories, API clients
├── domain/         # Business logic, types, rules
├── hooks/          # Feature-specific hooks
└── screens/        # Screen components
```

**Strengths:**
- Clear separation of concerns
- Feature independence and modularity
- Testable domain logic
- Scalable structure for growth

**Weaknesses:**
- No shared data layer abstraction
- Missing service layer for complex business operations
- Limited error handling patterns

---

## 2. Critical Issues & Bugs

### 2.1 🔴 HIGH SEVERITY

#### 2.1.1 Null Safety Issue in ScreenCaptureService (FIXED)
**File:** `modules/expo-quick-ledger/android/src/main/java/expo/modules/quickledger/ScreenCaptureService.kt`  
**Lines:** 71, 93  
**Status:** ✅ FIXED

**Issue:**
- `MediaProjection?` nullable type accessed without null checks
- Missing validation for `resultCode == Activity.RESULT_OK`

**Impact:** App crash when user denies screen capture permission

**Fix Applied:**
```kotlin
// Added validation
if (resultCode == ActivityResultCodeMissing || resultCode != android.app.Activity.RESULT_OK || resultData == null) {
  finishWithError("没有获得系统截屏授权")
  return START_NOT_STICKY
}

// Added null assertion operators
projection!!.registerCallback(projectionCallback, mainHandler)
virtualDisplay = projection!!.createVirtualDisplay(...)
```

#### 2.1.2 Race Condition in Account Balance Calculation
**File:** `src/features/accounts/data/account.repository.ts`  
**Lines:** 58-89  
**Severity:** HIGH

**Issue:**
```typescript
async listWithBalances(): Promise<AccountBalance[]> {
  const accounts = await this.list();
  return Promise.all(
    accounts.map(async (account) => {
      const row = await this.db.getFirstAsync<{...}>(/* query */);
      // Balance calculation happens in parallel without transaction
    })
  );
}
```

**Problem:**
- Multiple parallel queries without database transaction
- Balance can be inconsistent if transactions are created/updated during calculation
- No isolation between read operations

**Impact:** Incorrect balance display during concurrent writes

**Recommendation:**
```typescript
async listWithBalances(): Promise<AccountBalance[]> {
  return this.db.withTransactionAsync(async () => {
    const accounts = await this.list();
    // Calculate all balances within same transaction
    return Promise.all(accounts.map(async (account) => {
      // ... balance calculation
    }));
  });
}
```

#### 2.1.3 Weak ID Generation Pattern
**Files:**
- `src/features/transactions/data/transaction.repository.ts:187`
- `src/features/accounts/data/account.repository.ts:94`

**Issue:**
```typescript
const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
```

**Problems:**
1. **Collision risk:** `Math.random()` is not cryptographically secure
2. **Timing vulnerability:** Multiple rapid creations can produce same timestamp
3. **Predictability:** IDs can be guessed

**Impact:**
- Potential ID collisions in high-frequency operations
- Security issue if IDs are exposed in URLs or APIs

**Recommendation:**
```typescript
// Use expo-crypto or uuid library
import * as Crypto from 'expo-crypto';

const id = `${Date.now()}-${Crypto.randomUUID()}`;
// Or use a proper UUID library
```

### 2.2 🟡 MEDIUM SEVERITY

#### 2.2.1 Missing Transaction Rollback in Tag Operations
**File:** `src/features/transactions/data/transaction.repository.ts`  
**Lines:** 251-262

**Issue:**
```typescript
private async replaceTags(db: SQLiteDatabase, transactionId: string, tagIds: string[], now: string) {
  await db.runAsync(`DELETE FROM transaction_tags WHERE transaction_id = ?`, transactionId);
  for (const tagId of [...new Set(tagIds)]) {
    await db.runAsync(
      `INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id, created_at)
       SELECT ?, id, ? FROM tags WHERE id = ? AND archived_at IS NULL`,
      transactionId, now, tagId
    );
  }
}
```

**Problem:**
- Multiple sequential operations without proper error handling
- If one INSERT fails, tags are partially deleted
- `INSERT OR IGNORE` silently fails for invalid tag IDs

**Impact:** Data inconsistency, lost tag associations

**Recommendation:**
```typescript
private async replaceTags(db: SQLiteDatabase, transactionId: string, tagIds: string[], now: string) {
  // Validate all tags exist first
  const validTags = await db.getAllAsync<{id: string}>(
    `SELECT id FROM tags WHERE id IN (${tagIds.map(() => '?').join(',')}) AND archived_at IS NULL`,
    ...tagIds
  );
  
  if (validTags.length !== tagIds.length) {
    throw new Error('Some tags do not exist or are archived');
  }
  
  await db.runAsync(`DELETE FROM transaction_tags WHERE transaction_id = ?`, transactionId);
  
  // Batch insert
  if (tagIds.length > 0) {
    const values = tagIds.map(() => '(?, ?, ?)').join(',');
    const params = tagIds.flatMap(tagId => [transactionId, tagId, now]);
    await db.runAsync(
      `INSERT INTO transaction_tags (transaction_id, tag_id, created_at) VALUES ${values}`,
      ...params
    );
  }
}
```

#### 2.2.2 Unbounded Query in Transaction List
**File:** `src/features/transactions/data/transaction.repository.ts`  
**Lines:** 126-183

**Issue:**
```typescript
async list(): Promise<Transaction[]> {
  const [rows, categoryImages, tagRows] = await Promise.all([
    this.db.getAllAsync<TransactionRow>(`
      SELECT ...
      FROM transactions t
      ...
      WHERE t.deleted_at IS NULL
      ORDER BY t.occurred_at DESC, t.created_at DESC
    `),
    // No LIMIT clause
  ]);
}
```

**Problems:**
- No pagination
- Loads all transactions into memory
- Performance degrades with large datasets

**Impact:** App slowdown/crash with 1000+ transactions

**Recommendation:**
```typescript
async list(options: { limit?: number; offset?: number } = {}): Promise<Transaction[]> {
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;
  
  const rows = await this.db.getAllAsync<TransactionRow>(`
    SELECT ...
    FROM transactions t
    ...
    WHERE t.deleted_at IS NULL
    ORDER BY t.occurred_at DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `, limit, offset);
  // ...
}
```

#### 2.2.3 Missing Input Validation in AI API
**File:** `src/features/ai/data/aiLedgerApi.ts`  
**Lines:** 118-148

**Issue:**
```typescript
export async function recognizeBill(input: RecognizeBillInput, signal?: AbortSignal): Promise<RecognizedBill> {
  const config = await getAiConfig();
  // No validation of imageDataUrl format
  // No size limit check
  const response = await fetch(providerUrl(config.providerBaseUrl, 'responses'), {
    body: JSON.stringify({
      // ... large payload with base64 image
    }),
  });
}
```

**Problems:**
1. No validation that `imageDataUrl` is valid base64
2. No size limit on image data
3. No timeout on fetch request
4. Potential memory issue with large images

**Impact:** App crash, excessive memory usage, hanging requests

**Recommendation:**
```typescript
export async function recognizeBill(input: RecognizeBillInput, signal?: AbortSignal): Promise<RecognizedBill> {
  // Validate image data URL
  if (!input.imageDataUrl.startsWith('data:image/')) {
    throw new Error('Invalid image data URL format');
  }
  
  // Check size (base64 is ~33% larger than binary)
  const base64Data = input.imageDataUrl.split(',')[1];
  const sizeBytes = (base64Data.length * 3) / 4;
  const maxSizeMB = 10;
  if (sizeBytes > maxSizeMB * 1024 * 1024) {
    throw new Error(`Image size exceeds ${maxSizeMB}MB limit`);
  }
  
  const config = await getAiConfig();
  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
  
  try {
    const response = await fetch(providerUrl(config.providerBaseUrl, 'responses'), {
      // ...
      signal: signal ?? controller.signal,
    });
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

#### 2.2.4 SQL Injection Risk in Dynamic Queries
**File:** `src/infrastructure/database/database.ts`  
**Lines:** 356-370

**Issue:**
```typescript
async function archiveLegacyExpenseCategories(db: SQLiteDatabase) {
  const placeholders = LEGACY_EXPENSE_CATEGORY_IDS.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE categories SET is_archived = 1 WHERE id IN (${placeholders})`,
    ...LEGACY_EXPENSE_CATEGORY_IDS
  );
}
```

**Current Status:** Safe (constants are hardcoded)

**Risk:** If pattern is copied with user input, SQL injection possible

**Recommendation:** Add comment warning and use prepared statement helper:
```typescript
// Helper function for safe IN clause queries
function buildInClause(items: string[]): [string, string[]] {
  const placeholders = items.map(() => '?').join(', ');
  return [`IN (${placeholders})`, items];
}

// Usage with clear separation
const [inClause, params] = buildInClause(LEGACY_EXPENSE_CATEGORY_IDS);
await db.runAsync(
  `UPDATE categories SET is_archived = 1 WHERE id ${inClause}`,
  ...params
);
```

### 2.3 🟢 LOW SEVERITY

#### 2.3.1 Deprecated API Usage in Database Migration
**File:** `src/infrastructure/database/database.ts`  
**Lines:** 437-458

**Issue:** Using deprecated Platform.OS checks and Asset APIs

**Recommendation:** Update to latest Expo APIs per documentation

#### 2.3.2 Missing Error Boundaries
**Files:** No error boundaries found in app structure

**Issue:** Unhandled errors crash the entire app

**Recommendation:**
```typescript
// Add global error boundary in _layout.tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error}: {error: Error}) {
  return (
    <View>
      <Text>Something went wrong:</Text>
      <Text>{error.message}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {/* existing content */}
    </ErrorBoundary>
  );
}
```

---

## 3. Architecture Improvements

### 3.1 Add Centralized Error Handling

**Create:** `src/shared/errors/AppError.ts`
```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, 'VALIDATION_ERROR', userMessage);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR', '数据操作失败，请重试');
  }
}

export class NetworkError extends AppError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', '网络连接失败，请检查网络设置');
  }
}
```

### 3.2 Add Repository Base Class

**Create:** `src/infrastructure/database/BaseRepository.ts`
```typescript
import type { SQLiteDatabase } from 'expo-sqlite';

export abstract class BaseRepository {
  constructor(protected readonly db: SQLiteDatabase) {}
  
  protected async withTransaction<T>(
    callback: (db: SQLiteDatabase) => Promise<T>
  ): Promise<T> {
    return this.db.withTransactionAsync(callback);
  }
  
  protected generateId(): string {
    return `${Date.now()}-${crypto.randomUUID()}`;
  }
  
  protected now(): string {
    return new Date().toISOString();
  }
}
```

### 3.3 Add Input Validation Layer

**Create:** `src/shared/validation/validators.ts`
```typescript
import { z } from 'zod';

export const transactionDraftSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amountCents: z.number().int().positive(),
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
  transferAccountId: z.string().optional(),
  feeCents: z.number().int().nonnegative().optional(),
  discountCents: z.number().int().nonnegative().optional(),
  occurredAt: z.string().datetime(),
  note: z.string().default(''),
  tagIds: z.array(z.string()).optional(),
});

export type TransactionDraft = z.infer<typeof transactionDraftSchema>;
```

### 3.4 Add Query Result Caching

For frequently accessed data like categories and accounts:

```typescript
// src/shared/cache/QueryCache.ts
export class QueryCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  
  constructor(private ttlMs: number = 5000) {}
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  
  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

---

## 4. Security Recommendations

### 4.1 API Key Storage
**Current:** Stored in expo-secure-store ✅ Good  
**Recommendation:** Add key rotation mechanism

### 4.2 Database Encryption
**Current:** Unencrypted SQLite  
**Risk:** Device compromise exposes all financial data  
**Recommendation:** Use `expo-sqlite` with encryption:
```typescript
import { openDatabaseAsync } from 'expo-sqlite';

const db = await openDatabaseAsync('ledger.db', {
  enableCRSQLite: true,
  encryptionKey: await getEncryptionKey(), // Derive from user password or biometric
});
```

### 4.3 Input Sanitization
**Current:** Basic trimming only  
**Recommendation:** Add XSS prevention for note fields

---

## 5. Performance Optimizations

### 5.1 Database Indexes
**Current indexes:**
- `idx_transactions_occurred_at`
- `idx_transactions_deleted_at`
- `idx_tags_group_id`
- `idx_transaction_tags_tag_id`

**Missing indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_account_id ON transactions(transfer_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status) WHERE deleted_at IS NULL;
```

### 5.2 Query Optimization
**Issue:** N+1 query problem in `listWithBalances()`  
**Solution:** Single aggregate query with JOINs:
```sql
SELECT 
  a.*,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) AS income_cents,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) AS expense_cents,
  -- ... other aggregations
FROM accounts a
LEFT JOIN transactions t ON (t.account_id = a.id OR t.transfer_account_id = a.id) 
  AND t.deleted_at IS NULL
WHERE a.deleted_at IS NULL AND a.id != ?
GROUP BY a.id
ORDER BY a.created_at
```

### 5.3 Image Optimization
**Current:** Category icons stored as BLOB  
**Recommendation:** 
- Compress images before storage
- Add size limits (max 100KB per icon)
- Consider using asset references for default icons

---

## 6. Testing Recommendations

### 6.1 Unit Tests Needed
- Database migration scripts
- Transaction validation rules
- Balance calculation logic
- AI response parsing

### 6.2 Integration Tests Needed
- Transaction creation flow
- Account balance accuracy
- Tag association persistence
- Screen capture to transaction flow

### 6.3 E2E Tests Needed
- Complete bill recognition flow
- Multi-account transfer scenarios
- Data export/backup

---

## 7. Documentation Improvements

### 7.1 Missing Documentation
- API contracts for AI service
- Database schema diagram
- Feature interaction map
- Error code reference

### 7.2 Code Comments Needed
- Complex SQL queries explanation
- Migration version reasoning
- Business rule rationale

---

## 8. Migration Path for Fixes

### Phase 1: Critical Fixes (Immediate)
1. ✅ Fix ScreenCaptureService null safety
2. Add database transaction for balance queries
3. Replace ID generation with secure method
4. Add image size validation to AI API

### Phase 2: Stability Improvements (1-2 weeks)
1. Implement error boundaries
2. Add query pagination
3. Fix tag replacement atomicity
4. Add missing database indexes

### Phase 3: Architecture Refactoring (1 month)
1. Create BaseRepository pattern
2. Implement centralized error handling
3. Add input validation layer
4. Implement query caching

### Phase 4: Security Hardening (Ongoing)
1. Add database encryption
2. Implement key rotation
3. Add comprehensive logging
4. Security audit

---

## 9. Conclusion

### Strengths
- Clean feature-based architecture
- Good separation of concerns
- Proper use of SQLite transactions in most places
- Comprehensive database migration system

### Critical Issues
- 1 HIGH severity null safety bug (FIXED)
- 3 HIGH severity data consistency/security issues
- 4 MEDIUM severity performance/reliability issues

### Overall Assessment
**Architecture Grade: B+**  
The project has a solid foundation with good architectural patterns. The main concerns are around data consistency, security, and scalability. The identified issues are fixable and the architecture supports the necessary improvements.

### Priority Actions
1. Fix account balance race condition
2. Improve ID generation security
3. Add pagination to transaction list
4. Implement error boundaries
5. Add database encryption

---

**Report Prepared By:** Claude Code (Architectural Analysis Agent)  
**Next Review:** After Phase 1 fixes implemented

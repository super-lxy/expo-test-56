import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useAccountRepository } from '@/features/accounts/hooks/useAccountRepository';
import { CategoryRepository } from '@/features/categories/data/category.repository';
import { TransactionRepository } from '../data/transaction.repository';
import type { Transaction } from '../domain/transaction.types';

export function useTransactionRepository() {
  const db = useSQLiteContext();
  return useMemo(() => new TransactionRepository(db), [db]);
}

export function useCategoryRepository() {
  const db = useSQLiteContext();
  return useMemo(() => new CategoryRepository(db), [db]);
}

export function useTransactions() {
  const repository = useTransactionRepository();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTransactions(await repository.list());
    } finally {
      setLoading(false);
    }
  }, [repository]);

  // useFocusEffect 在挂载和每次聚焦时都会触发，已覆盖首次加载，无需额外 useEffect
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { transactions, loading, refresh };
}

export function useMonthlySummary() {
  const repository = useTransactionRepository();
  const [summary, setSummary] = useState({ incomeCents: 0, expenseCents: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await repository.getMonthlySummary());
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { summary, loading, refresh };
}

export function useTransactionFormData(type: 'income' | 'expense') {
  const categoryRepository = useCategoryRepository();
  const accountRepository = useAccountRepository();
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof categoryRepository.listByType>>>([]);
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof accountRepository.listWithBalances>>>([]);

  // useFocusEffect 而非 useEffect：从「新建分类 / 账户」页返回时要重新取数，
  // 否则刚创建的条目在本页看不到。
  useFocusEffect(
    useCallback(() => {
      // 快速切换收支类型会连续触发本 effect，用取消标记丢弃过期结果，
      // 否则先发的请求可能后到并覆盖新数据。
      let cancelled = false;
      void Promise.all([categoryRepository.listByType(type), accountRepository.listWithBalances()]).then(
        ([nextCategories, nextAccounts]) => {
          if (cancelled) return;
          setCategories(nextCategories);
          setAccounts(nextAccounts.filter((account) => account.status !== 'hidden'));
        }
      );
      return () => { cancelled = true; };
    }, [accountRepository, categoryRepository, type])
  );

  return { categories, accounts };
}

export function useTotalSummary() {
  const repository = useTransactionRepository();
  const [summary, setSummary] = useState({ totalIncomeCents: 0, totalExpenseCents: 0 });

  useFocusEffect(
    useCallback(() => {
      void repository.getAllTimeSummary().then(setSummary);
    }, [repository])
  );

  return summary;
}

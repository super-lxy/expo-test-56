import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof accountRepository.list>>>([]);

  useEffect(() => {
    void Promise.all([categoryRepository.listByType(type), accountRepository.list()]).then(
      ([nextCategories, nextAccounts]) => {
        setCategories(nextCategories);
        setAccounts(nextAccounts);
      }
    );
  }, [accountRepository, categoryRepository, type]);

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

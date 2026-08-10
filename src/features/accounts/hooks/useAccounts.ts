import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AccountRepository } from '../data/account.repository';
import type { AccountBalance, AccountStatus } from '../domain/account.types';

export function useAccounts() {
  const db = useSQLiteContext();
  const [allAccounts, setAllAccounts] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAllAccounts(await new AccountRepository(db).listWithBalances());
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const accounts = allAccounts.filter((account) => account.status !== 'hidden');
  const hiddenAccounts = allAccounts.filter((account) => account.status === 'hidden');

  const updateAccountStatus = useCallback(async (id: string, status: AccountStatus) => {
    await new AccountRepository(db).updateStatus(id, status);
    await refresh();
  }, [db, refresh]);

  const deleteAccountOnly = useCallback(async (id: string) => {
    await new AccountRepository(db).deleteAccountOnly(id);
    await refresh();
  }, [db, refresh]);

  const deleteAccountAndTransactions = useCallback(async (id: string) => {
    await new AccountRepository(db).deleteAccountAndTransactions(id);
    await refresh();
  }, [db, refresh]);

  return {
    accounts,
    hiddenAccounts,
    allAccounts,
    loading,
    refresh,
    updateAccountStatus,
    deleteAccountOnly,
    deleteAccountAndTransactions,
  };
}

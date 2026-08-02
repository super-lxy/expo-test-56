import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AccountRepository } from '../data/account.repository';
import type { AccountBalance } from '../domain/account.types';

export function useAccounts() {
  const db = useSQLiteContext();
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await new AccountRepository(db).listWithBalances());
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { accounts, loading, refresh };
}

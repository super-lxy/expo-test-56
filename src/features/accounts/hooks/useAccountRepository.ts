import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { AccountRepository } from '../data/account.repository';

export function useAccountRepository() {
  const db = useSQLiteContext();
  return useMemo(() => new AccountRepository(db), [db]);
}

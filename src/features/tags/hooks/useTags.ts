import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { TagRepository } from '../data/tag.repository';
import type { TagGroup, TagScope } from '../domain/tag.types';

export function useTagRepository() {
  const db = useSQLiteContext();
  return useMemo(() => new TagRepository(db), [db]);
}

export function useTagGroups(scope?: TagScope) {
  const repository = useTagRepository();
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await repository.listGroups(scope));
    } finally {
      setLoading(false);
    }
  }, [repository, scope]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  return { groups, loading, refresh, repository };
}

import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHideTabBarOnScroll } from '@/hooks/use-hide-tab-bar-on-scroll';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TransactionItem } from '../components/TransactionItem';
import { useTransactions } from '../hooks/useTransactions';
import { dateKey, formatDayGroup } from '@/shared/utils/date';

export function TransactionListScreen() {
  const { transactions, loading } = useTransactions();
  const onScroll = useHideTabBarOnScroll();
  const groups = transactions.reduce<{ key: string; label: string; items: typeof transactions }[]>((result, transaction) => {
    const key = dateKey(transaction.occurredAt);
    const existing = result.find((group) => group.key === key);
    if (existing) existing.items.push(transaction);
    else result.push({ key, label: formatDayGroup(transaction.occurredAt), items: [transaction] });
    return result;
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>全部账单</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {loading ? '加载中…' : `${transactions.length} 笔记录`}
          </ThemedText>
        </View>
        <ScrollView contentContainerStyle={transactions.length === 0 ? styles.emptyList : styles.list} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <ThemedText style={styles.dayTitle}>{group.label}</ThemedText>
              {group.items.map((item) => <TransactionItem key={item.id} transaction={item} />)}
            </View>
          ))}
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyIcon}>📒</ThemedText>
              <ThemedText style={styles.emptyTitle}>暂无账单</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">点击右下角按钮添加一笔</ThemedText>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, gap: 5 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  list: { paddingHorizontal: Spacing.three, paddingBottom: 120 },
  group: { marginBottom: 16 },
  dayTitle: { fontSize: 13, lineHeight: 18, color: '#818990', fontWeight: '600', marginBottom: 4 },
  emptyList: { flexGrow: 1, padding: Spacing.three },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
});

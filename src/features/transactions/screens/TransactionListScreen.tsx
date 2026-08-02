import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TransactionItem } from '../components/TransactionItem';
import { useTransactions } from '../hooks/useTransactions';

export function TransactionListScreen() {
  const { transactions, loading } = useTransactions();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>全部账单</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {loading ? '加载中…' : `${transactions.length} 笔记录`}
          </ThemedText>
        </View>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionItem transaction={item} />}
          contentContainerStyle={transactions.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyIcon}>📒</ThemedText>
              <ThemedText style={styles.emptyTitle}>暂无账单</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">点击右下角按钮添加一笔</ThemedText>
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, gap: 4 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '800' },
  list: { paddingHorizontal: Spacing.three, paddingBottom: 120 },
  emptyList: { flexGrow: 1, padding: Spacing.three },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  emptyIcon: { fontSize: 46 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
});

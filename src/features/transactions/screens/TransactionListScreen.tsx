import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHideTabBarOnScroll } from '@/hooks/use-hide-tab-bar-on-scroll';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, FontWeight, Glyph, Spacing, Type } from '@/constants/theme';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { TransactionDayHeader, TransactionItem } from '../components/TransactionItem';
import type { Transaction } from '../domain/transaction.types';
import { useTransactionRepository, useTransactions } from '../hooks/useTransactions';
import { dateKey, formatDayGroup } from '@/shared/utils/date';

export function TransactionListScreen() {
  const router = useRouter();
  const repository = useTransactionRepository();
  const { transactions, loading, refresh } = useTransactions();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const onScroll = useHideTabBarOnScroll();
  const groups = transactions.reduce<{ key: string; label: string; items: typeof transactions }[]>((result, transaction) => {
    const key = dateKey(transaction.occurredAt);
    const existing = result.find((group) => group.key === key);
    if (existing) existing.items.push(transaction);
    else result.push({ key, label: formatDayGroup(transaction.occurredAt), items: [transaction] });
    return result;
  }, []);

  function confirmDelete(transaction: Transaction) {
    Alert.alert(
      '删除账单',
      `确定删除这笔${transaction.categoryId === 'reimbursement' ? '报销' : transaction.type === 'income' ? '收入' : transaction.type === 'transfer' ? '转账' : '支出'}记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            void repository.softDelete(transaction.id)
              .then(async () => {
                setSelectedTransaction(null);
                await refresh();
              })
              .catch((error) => {
                Alert.alert('无法删除', error instanceof Error ? error.message : '请稍后重试');
              })
              .finally(() => setDeleting(false));
          },
        },
      ]
    );
  }

  function editTransaction(transaction: Transaction) {
    setSelectedTransaction(null);
    setTimeout(() => {
      router.push({
        pathname: transaction.categoryId === 'reimbursement'
          ? '/transaction/reimbursement'
          : '/transaction/create',
        params: { transactionId: transaction.id },
      });
    }, 320);
  }

  return (
    <ThemedView style={styles.container}>
      <AppBackground />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
            <ThemedText style={styles.backText}>‹</ThemedText>
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText type="title">全部账单</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? '加载中…' : `${transactions.length} 笔记录`}
            </ThemedText>
          </View>
        </View>
        <ScrollView contentContainerStyle={transactions.length === 0 ? styles.emptyList : styles.list} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
          {groups.map((group, groupIndex) => (
            <View key={group.key} style={styles.group}>
              <TransactionDayHeader label={group.label} isFirst={groupIndex === 0} />
              {group.items.map((item, index) => (
                <TransactionItem
                  key={item.id}
                  transaction={item}
                  isFirst={false}
                  isLast={groupIndex === groups.length - 1 && index === group.items.length - 1}
                  onPress={() => setSelectedTransaction(item)}
                />
              ))}
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
      <TransactionDetailModal
        transaction={selectedTransaction}
        deleting={deleting}
        onClose={() => setSelectedTransaction(null)}
        onDelete={confirmDelete}
        onEdit={editTransaction}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingTop: Spacing.two, paddingBottom: Spacing.two },
  headerCopy: { flex: 1, gap: 2 },
  backButton: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  backButtonPressed: { backgroundColor: AppPalette.surfaceMuted },
  backText: { fontSize: 32, lineHeight: 34, color: AppPalette.ink, fontWeight: FontWeight.regular },
  list: { paddingHorizontal: Spacing.three, paddingBottom: 120 },
  group: { marginBottom: 0 },
  emptyList: { flexGrow: 1, padding: Spacing.three },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  emptyIcon: { ...Glyph.xxl },
  emptyTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
});

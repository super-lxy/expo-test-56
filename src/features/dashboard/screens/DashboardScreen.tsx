import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { NetWorthChart } from '@/features/dashboard/components/NetWorthChart';
import { buildNetWorthTrend } from '@/features/dashboard/domain/netWorth';
import { TransactionItem } from '@/features/transactions/components/TransactionItem';
import { useMonthlySummary, useTransactions } from '@/features/transactions/hooks/useTransactions';
import { formatCurrency } from '@/shared/utils/currency';
import { dateKey, formatDayGroup, formatMonth } from '@/shared/utils/date';

type HomeView = 'overview' | 'calendar';

export function DashboardScreen() {
  const router = useRouter();
  const [view, setView] = useState<HomeView>('overview');
  const { summary } = useMonthlySummary();
  const { transactions } = useTransactions();
  const { accounts } = useAccounts();
  const totalAssets = accounts.reduce((sum, account) => sum + account.balanceCents, 0);
  const monthlyChange = summary.incomeCents - summary.expenseCents;
  const trend = buildNetWorthTrend(accounts, transactions);
  const groups = transactions.slice(0, 8).reduce<Array<{ key: string; label: string; items: typeof transactions }>>((result, transaction) => {
    const key = dateKey(transaction.occurredAt);
    const existing = result.find((group) => group.key === key);
    if (existing) existing.items.push(transaction);
    else result.push({ key, label: formatDayGroup(transaction.occurredAt), items: [transaction] });
    return result;
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View style={styles.brandBlock}>
              <View style={styles.brandIcon}><ThemedText style={styles.brandIconText}>✦</ThemedText></View>
              <View>
                <ThemedText style={styles.brandName}>Finch</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">今天也要好好生活</ThemedText>
              </View>
            </View>
            <Pressable hitSlop={10}><ThemedText style={styles.menu}>☰</ThemedText></Pressable>
          </View>

          <View style={styles.segmentedControl}>
            <Pressable onPress={() => setView('overview')} style={[styles.segment, view === 'overview' && styles.segmentSelected]}>
              <ThemedText style={view === 'overview' ? styles.segmentTextSelected : styles.segmentText}>概览</ThemedText>
            </Pressable>
            <Pressable onPress={() => setView('calendar')} style={[styles.segment, view === 'calendar' && styles.segmentSelected]}>
              <ThemedText style={view === 'calendar' ? styles.segmentTextSelected : styles.segmentText}>日历</ThemedText>
            </Pressable>
          </View>

          {view === 'overview' ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <ThemedText style={styles.ledgerName}>我的演示账本⌄</ThemedText>
                  <ThemedText style={styles.changeText}>{monthlyChange >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(monthlyChange))}</ThemedText>
                </View>
                <ThemedText style={styles.totalAssets}>{formatCurrency(totalAssets)}</ThemedText>
                <View style={styles.divider} />
                <View style={styles.summaryMetrics}>
                  <View style={styles.metric}>
                    <ThemedText type="small" themeColor="textSecondary">资产</ThemedText>
                    <ThemedText style={styles.metricAmount}>{formatCurrency(totalAssets)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">账户余额</ThemedText>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metric}>
                    <ThemedText type="small" themeColor="textSecondary">本月结余</ThemedText>
                    <ThemedText style={styles.metricAmount}>{formatCurrency(monthlyChange)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">收入 {formatCurrency(summary.incomeCents)}</ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.chartCard}>
                <View style={styles.cardTitleRow}>
                  <ThemedText style={styles.cardTitle}>净资产变化</ThemedText>
                  <View style={styles.cardActions}><ThemedText style={styles.actionIcon}>▤</ThemedText><ThemedText style={styles.actionIcon}>◴</ThemedText></View>
                </View>
                <NetWorthChart values={trend} />
              </View>

              <View style={styles.transactionCard}>
                <View style={styles.monthHeader}>
                  <ThemedText style={styles.monthTitle}>{formatMonth()}⌄</ThemedText>
                  <View style={styles.monthActions}><ThemedText style={styles.actionIcon}>▤</ThemedText><ThemedText style={styles.actionIcon}>⌕</ThemedText></View>
                </View>
                <View style={styles.transactionDivider} />
                {groups.length > 0 ? groups.map((group) => (
                  <View key={group.key} style={styles.dayGroup}>
                    <ThemedText style={styles.dayText}>{group.label}</ThemedText>
                    {group.items.map((transaction) => <TransactionItem key={transaction.id} transaction={transaction} />)}
                  </View>
                )) : (
                  <View style={styles.emptyState}>
                    <ThemedText style={styles.emptyIcon}>🧾</ThemedText>
                    <ThemedText style={styles.emptyTitle}>还没有账单</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">点击下方按钮记录第一笔收支</ThemedText>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={styles.calendarPlaceholder}>
              <ThemedText style={styles.calendarIcon}>▦</ThemedText>
              <ThemedText style={styles.emptyTitle}>日历视图</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">按日期查看账单的功能即将加入</ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: 110, gap: 12 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F2E4D7', alignItems: 'center', justifyContent: 'center' },
  brandIconText: { fontSize: 17, fontWeight: '800', color: '#B96B48' },
  brandName: { fontSize: 19, lineHeight: 23, fontWeight: '700', letterSpacing: -0.2 },
  menu: { fontSize: 25, color: '#71808C' },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#ECEDEF', borderRadius: 13, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 11 },
  segmentSelected: { backgroundColor: '#FFFFFF', shadowColor: '#4A6670', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  segmentText: { color: '#899099', fontWeight: '400' },
  segmentTextSelected: { fontWeight: '600' },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: '#ECEDEF', shadowColor: '#5F6870', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ledgerName: { fontSize: 14, fontWeight: '500', color: '#353A40' },
  changeText: { color: '#D96C55', fontSize: 12, fontWeight: '600' },
  totalAssets: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: 0.2, color: '#1D2329' },
  divider: { height: 1, backgroundColor: '#ECEDEF' },
  summaryMetrics: { flexDirection: 'row', alignItems: 'stretch' },
  metric: { flex: 1, gap: 3 },
  metricAmount: { fontSize: 16, fontWeight: '700', color: '#252B31' },
  metricDivider: { width: 1, backgroundColor: '#ECEDEF', marginHorizontal: Spacing.three },
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, gap: 12, borderWidth: 1, borderColor: '#ECEDEF', shadowColor: '#5F6870', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: Spacing.three },
  actionIcon: { color: '#8D949A', fontSize: 18 },
  transactionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingTop: 15, paddingBottom: 5, borderWidth: 1, borderColor: '#ECEDEF' },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { fontSize: 17, fontWeight: '700' },
  monthActions: { flexDirection: 'row', gap: Spacing.three },
  transactionDivider: { height: 1, backgroundColor: '#ECEDEF', marginTop: 12 },
  dayHeader: { paddingTop: 11, paddingBottom: 3 },
  dayText: { fontSize: 13, color: '#818990', fontWeight: '600' },
  dayGroup: { marginBottom: 8 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.five, gap: Spacing.one },
  emptyIcon: { fontSize: 42 },
  emptyTitle: { fontWeight: '700', fontSize: 16 },
  calendarPlaceholder: { minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  calendarIcon: { fontSize: 52, color: '#94A3B8' },
});

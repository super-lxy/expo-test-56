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
import { formatMonth } from '@/shared/utils/date';

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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View style={styles.brandBlock}>
              <View style={styles.brandIcon}><ThemedText style={styles.brandIconText}>¥</ThemedText></View>
              <ThemedText style={styles.brandName}>记账</ThemedText>
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

              <View style={styles.monthHeader}>
                <ThemedText style={styles.monthTitle}>{formatMonth()}⌄</ThemedText>
                <View style={styles.monthActions}><ThemedText style={styles.actionIcon}>▤</ThemedText><ThemedText style={styles.actionIcon}>⌕</ThemedText></View>
              </View>

              <View style={styles.dayHeader}><ThemedText style={styles.dayText}>最近</ThemedText></View>
              {transactions.length > 0 ? transactions.slice(0, 8).map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              )) : (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyIcon}>🧾</ThemedText>
                  <ThemedText style={styles.emptyTitle}>还没有账单</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">点击下方按钮记录第一笔收支</ThemedText>
                </View>
              )}
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
  content: { padding: Spacing.three, paddingBottom: 120, gap: Spacing.three },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandIcon: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: '#64748B', alignItems: 'center', justifyContent: 'center' },
  brandIconText: { fontSize: 16, fontWeight: '800', color: '#334155' },
  brandName: { fontSize: 23, fontWeight: '500', letterSpacing: 0.5 },
  menu: { fontSize: 25, color: '#64748B' },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#E8E8ED', borderRadius: 17, padding: 4 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14 },
  segmentSelected: { backgroundColor: '#FFFFFF' },
  segmentText: { color: '#7A7A82' },
  segmentTextSelected: { fontWeight: '700' },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: Spacing.three, gap: Spacing.two, shadowColor: '#85838F', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ledgerName: { fontSize: 16, fontWeight: '600' },
  changeText: { color: '#D85C50', fontSize: 13, fontWeight: '700' },
  totalAssets: { fontSize: 34, lineHeight: 42, fontWeight: '900', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#ECECF0' },
  summaryMetrics: { flexDirection: 'row', alignItems: 'stretch' },
  metric: { flex: 1, gap: 3 },
  metricAmount: { fontSize: 19, fontWeight: '800' },
  metricDivider: { width: 1, backgroundColor: '#ECECF0', marginHorizontal: Spacing.three },
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: Spacing.three, gap: Spacing.three, shadowColor: '#85838F', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  cardActions: { flexDirection: 'row', gap: Spacing.three },
  actionIcon: { color: '#8D8D95', fontSize: 22 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.one },
  monthTitle: { fontSize: 20, fontWeight: '800' },
  monthActions: { flexDirection: 'row', gap: Spacing.three },
  dayHeader: { paddingTop: Spacing.one },
  dayText: { fontSize: 16, color: '#777780', fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.five, gap: Spacing.one },
  emptyIcon: { fontSize: 42 },
  emptyTitle: { fontWeight: '800', fontSize: 17 },
  calendarPlaceholder: { minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  calendarIcon: { fontSize: 52, color: '#94A3B8' },
});

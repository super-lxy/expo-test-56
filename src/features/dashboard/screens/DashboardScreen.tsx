import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHideTabBarOnScroll } from '@/hooks/use-hide-tab-bar-on-scroll';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontWeight, GlyphSize, Spacing, Type } from '@/constants/theme';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { NetWorthChart } from '@/features/dashboard/components/NetWorthChart';
import { buildNetWorthByPeriod } from '@/features/dashboard/domain/netWorth';
import { TransactionItem } from '@/features/transactions/components/TransactionItem';
import { useMonthlySummary, useTransactions, useTotalSummary } from '@/features/transactions/hooks/useTransactions';
import { formatCurrency } from '@/shared/utils/currency';
import { dateKey, formatDayGroup, formatMonth } from '@/shared/utils/date';

const PERIODS = [
  { label: '1月', days: 30 },
  { label: '3月', days: 90 },
  { label: '半年', days: 180 },
  { label: '1年', days: 365 },
] as const;

type HomeView = 'overview' | 'calendar';

export function DashboardScreen() {
  const [view, setView] = useState<HomeView>('overview');
  const [chartDays, setChartDays] = useState(180);
  const { summary } = useMonthlySummary();
  const { transactions } = useTransactions();
  const { accounts } = useAccounts();
  const totalSummary = useTotalSummary();
  const totalAssets = accounts.filter((a) => a.kind !== 'liability').reduce((sum, a) => sum + a.balanceCents, 0);
  const liabilities = accounts.filter((a) => a.kind === 'liability').reduce((sum, a) => sum + Math.abs(a.balanceCents), 0);
  const monthlyChange = summary.incomeCents - summary.expenseCents;
  const { values: chartValues, xLabels: chartLabels } = buildNetWorthByPeriod(accounts, transactions, chartDays);
  const onScroll = useHideTabBarOnScroll();
  const groups = transactions.slice(0, 8).reduce<{ key: string; label: string; items: typeof transactions }[]>((result, transaction) => {
    const key = dateKey(transaction.occurredAt);
    const existing = result.find((group) => group.key === key);
    if (existing) existing.items.push(transaction);
    else result.push({ key, label: formatDayGroup(transaction.occurredAt), items: [transaction] });
    return result;
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
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
                <ThemedText style={styles.ledgerName}>我的演示账本</ThemedText>
                <View style={styles.summaryHeader}>
                  <ThemedText style={styles.totalAssets}>{formatCurrency(totalAssets)}</ThemedText>
                  <ThemedText style={[styles.changeText, { color: monthlyChange >= 0 ? '#2D9D6A' : '#D96C55' }]}>
                    {monthlyChange >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(monthlyChange))}
                  </ThemedText>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryMetrics}>
                  <View style={styles.metric}>
                    <ThemedText type="small" themeColor="textSecondary">资产</ThemedText>
                    <ThemedText style={styles.metricAmount}>{formatCurrency(totalAssets)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">月收入 {formatCurrency(summary.incomeCents)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">总收入 {formatCurrency(totalSummary.totalIncomeCents)}</ThemedText>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metric}>
                    <ThemedText type="small" themeColor="textSecondary">负债</ThemedText>
                    <ThemedText style={styles.metricAmount}>{formatCurrency(liabilities)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">月支出 {formatCurrency(summary.expenseCents)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">总支出 {formatCurrency(totalSummary.totalExpenseCents)}</ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.chartCard}>
                <View style={styles.cardTitleRow}>
                  <ThemedText style={styles.cardTitle}>净资产变化</ThemedText>
                  <View style={styles.periodSelector}>
                    {PERIODS.map((p) => (
                      <Pressable key={p.days} onPress={() => setChartDays(p.days)} style={[styles.periodBtn, chartDays === p.days && styles.periodBtnActive]}>
                        <ThemedText style={[styles.periodText, chartDays === p.days && styles.periodTextActive]}>{p.label}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <NetWorthChart values={chartValues} xLabels={chartLabels} />
              </View>

              <View style={styles.transactionCard}>
                <View style={styles.monthHeader}>
                  <ThemedText style={styles.monthTitle}>{formatMonth()}</ThemedText>
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
  content: { paddingHorizontal: 10, paddingTop: Spacing.two, paddingBottom: 110, gap: 8 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F2E4D7', alignItems: 'center', justifyContent: 'center' },
  brandIconText: { fontSize: GlyphSize.sm, fontWeight: FontWeight.bold, color: '#B96B48' },
  brandName: { ...Type.headline, fontWeight: FontWeight.bold, letterSpacing: -0.2 },
  menu: { fontSize: GlyphSize.lg, color: '#71808C' },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#ECEDEF', borderRadius: 13, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 11 },
  segmentSelected: { backgroundColor: '#FFFFFF', shadowColor: '#4A6670', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  segmentText: { ...Type.body, color: '#899099', fontWeight: FontWeight.regular },
  segmentTextSelected: { ...Type.body, fontWeight: FontWeight.semibold },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 13, gap: 8, borderWidth: 1, borderColor: '#ECEDEF', shadowColor: '#5F6870', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  ledgerName: { ...Type.subhead, fontWeight: FontWeight.medium, color: '#353A40' },
  changeText: { ...Type.footnote, color: '#D96C55', fontWeight: FontWeight.semibold },
  totalAssets: { ...Type.display, fontWeight: FontWeight.bold, letterSpacing: -0.2, color: '#1D2329' },
  divider: { height: 1, backgroundColor: '#ECEDEF' },
  summaryMetrics: { flexDirection: 'row', alignItems: 'stretch' },
  metric: { flex: 1, gap: 3 },
  metricAmount: { ...Type.headline, fontWeight: FontWeight.semibold, color: '#252B31' },
  metricDivider: { width: 1, backgroundColor: '#ECEDEF', marginHorizontal: 10 },
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 13, gap: 9, borderWidth: 1, borderColor: '#ECEDEF', shadowColor: '#5F6870', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  periodSelector: { flexDirection: 'row', gap: 4 },
  periodBtn: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: '#F0F2F4' },
  periodBtnActive: { backgroundColor: '#1C2128' },
  periodText: { ...Type.caption, fontWeight: FontWeight.semibold, color: '#71808C' },
  periodTextActive: { color: '#FFFFFF' },
  transactionCard: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 5, borderWidth: 1, borderColor: '#ECEDEF' },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  transactionDivider: { height: 1, backgroundColor: '#ECEDEF', marginTop: 12 },
  dayHeader: { paddingTop: 11, paddingBottom: 3 },
  dayText: { ...Type.footnote, color: '#818990', fontWeight: FontWeight.semibold },
  dayGroup: { marginBottom: 8 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.five, gap: Spacing.one },
  emptyIcon: { fontSize: GlyphSize.xxl },
  emptyTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  calendarPlaceholder: { minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  calendarIcon: { fontSize: GlyphSize.xxl, color: '#94A3B8' },
});

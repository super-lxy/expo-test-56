import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHideTabBarOnScroll } from '@/hooks/use-hide-tab-bar-on-scroll';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { AccountBalance } from '@/features/accounts/domain/account.types';
import { findTemplate } from '@/features/accounts/domain/account.templates';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { NetWorthChart } from '@/features/dashboard/components/NetWorthChart';
import { buildNetWorthTrend } from '@/features/dashboard/domain/netWorth';
import { useMonthlySummary, useTransactions } from '@/features/transactions/hooks/useTransactions';
import { formatCurrency } from '@/shared/utils/currency';
import { buildAssetBreakdown } from '../domain/assetBuckets';

function formatPercent(value: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((Math.max(value, 0) / total) * 100)}%`;
}

function AccountCard({ account, total }: { account: AccountBalance; total: number }) {
  const typeLabel = findTemplate(account.type)?.label ?? '其他';
  return (
    <View style={styles.accountCard}>
      <View style={styles.accountCardHeader}>
        <ThemedText style={styles.accountName}>{account.name}</ThemedText>
        <View style={[styles.accountIcon, { backgroundColor: `${account.color}1A` }]}>
          <ThemedText style={styles.accountIconText}>{account.icon}</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.accountAmount}>{formatCurrency(account.balanceCents)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {typeLabel} · {formatPercent(account.balanceCents, total)}
      </ThemedText>
    </View>
  );
}

export function AssetsScreen() {
  const router = useRouter();
  const [range, setRange] = useState<'all' | 'day' | 'week' | 'month'>('day');
  const { accounts } = useAccounts();
  const onScroll = useHideTabBarOnScroll();
  const { transactions } = useTransactions();
  const { summary } = useMonthlySummary();
  const totalAssets = accounts.filter((a) => a.kind !== 'liability').reduce((sum, a) => sum + a.balanceCents, 0);
  const monthlyChange = summary.incomeCents - summary.expenseCents;
  const slices = useMemo(() => buildAssetBreakdown(accounts), [accounts]);
  const trend = useMemo(() => buildNetWorthTrend(accounts, transactions), [accounts, transactions]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
          <View style={styles.topBar}>
            <View style={styles.topActions}>
              <ThemedText style={styles.topIcon}>⌾</ThemedText>
              <ThemedText style={styles.topIcon}>♧</ThemedText>
              <ThemedText style={styles.topIcon}>↗</ThemedText>
            </View>
            <ThemedText style={styles.pageTitle}>记账资产</ThemedText>
            <Pressable style={styles.moreButton} onPress={() => router.push('/accounts')}>
              <ThemedText style={styles.moreText}>账户 ›</ThemedText>
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <ThemedText style={styles.heroLabel}>总资产（CNY）</ThemedText>
              <ThemedText style={styles.heroChange}>{monthlyChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthlyChange))} 本月</ThemedText>
            </View>
            <ThemedText style={styles.heroAmount}>{formatCurrency(totalAssets)}</ThemedText>
            <View style={styles.heroChips}>
              {slices.length > 0 ? slices.map((slice) => (
                <View key={slice.key} style={[styles.heroChip, { backgroundColor: slice.color }]}>
                  <ThemedText style={styles.chipDot}>●</ThemedText>
                  <ThemedText style={styles.chipText}>{slice.label} {slice.percent}%</ThemedText>
                </View>
              )) : (
                <View style={[styles.heroChip, styles.emptyChip]}>
                  <ThemedText style={styles.chipText}>还没有资产账户</ThemedText>
                </View>
              )}
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>资产分类 ·</ThemedText>
            <Pressable onPress={() => router.push('/accounts')}><ThemedText type="small" style={styles.manageLink}>管理</ThemedText></Pressable>
          </View>
          <View style={styles.accountGrid}>
            {accounts.map((account) => <AccountCard key={account.id} account={account} total={totalAssets} />)}
            <Pressable style={[styles.accountCard, styles.addAccountCard]} onPress={() => router.push('/accounts/create')}>
              <ThemedText style={styles.addAccountIcon}>＋</ThemedText>
              <ThemedText style={styles.addAccountText}>添加账户</ThemedText>
            </Pressable>
          </View>

          <View style={styles.trendHeader}>
            <ThemedText style={styles.sectionTitle}>资产走势图</ThemedText>
            <View style={styles.rangeControl}>
              <Pressable onPress={() => setRange('all')} style={[styles.rangeButton, range === 'all' && styles.rangeSelected]}><ThemedText type="small">全部</ThemedText></Pressable>
              <Pressable onPress={() => setRange('day')} style={[styles.rangeButton, range === 'day' && styles.rangeSelected]}><ThemedText type="small">日</ThemedText></Pressable>
              <Pressable onPress={() => setRange('week')} style={[styles.rangeButton, range === 'week' && styles.rangeSelected]}><ThemedText type="small">周</ThemedText></Pressable>
              <Pressable onPress={() => setRange('month')} style={[styles.rangeButton, range === 'month' && styles.rangeSelected]}><ThemedText type="small">月</ThemedText></Pressable>
            </View>
          </View>
          <View style={styles.chartCard}>
            <NetWorthChart values={trend} lineColor="#77736D" areaColor="#D6D2CA" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 14 },
  topBar: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', gap: 13, width: 95 },
  topIcon: { fontSize: 22, color: '#77736D' },
  pageTitle: { fontSize: 17, fontWeight: '800' },
  moreButton: { backgroundColor: '#FFFFFF', borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8 },
  moreText: { fontSize: 16, color: '#77736D', fontWeight: '800' },
  heroCard: { backgroundColor: '#8B8780', borderRadius: 19, padding: 17, gap: 9 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#F8F7F5', fontSize: 15, fontWeight: '700' },
  heroChange: { color: '#F1B4B7', fontSize: 13, fontWeight: '700' },
  heroAmount: { color: '#FFFFFF', fontSize: 34, lineHeight: 42, fontWeight: '900' },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  heroChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  emptyChip: { backgroundColor: 'rgba(255,255,255,0.22)' },
  chipDot: { color: '#FFFFFF', fontSize: 8, marginRight: 4 },
  chipText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#4D4944' },
  manageLink: { color: '#77736D', fontWeight: '700' },
  accountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accountCard: { width: '48.5%', minHeight: 108, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 13, gap: 5 },
  accountCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountName: { flex: 1, fontSize: 15, fontWeight: '800' },
  accountIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F0EE', alignItems: 'center', justifyContent: 'center' },
  accountIconText: { color: '#817D76', fontSize: 14, fontWeight: '900' },
  accountAmount: { fontSize: 18, fontWeight: '900', color: '#5C5954' },
  addAccountCard: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E3E0DB', borderStyle: 'dashed' },
  addAccountIcon: { fontSize: 25, color: '#8C8880' },
  addAccountText: { color: '#77736D', fontWeight: '700' },
  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  rangeControl: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rangeButton: { borderRadius: 13, paddingHorizontal: 9, paddingVertical: 5 },
  rangeSelected: { backgroundColor: '#8B8780' },
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: 13 },
});

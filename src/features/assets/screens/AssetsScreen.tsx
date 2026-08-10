import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useHideTabBarOnScroll } from '@/hooks/use-hide-tab-bar-on-scroll';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontWeight, Glyph, Numeric, Type } from '@/constants/theme';
import { findBrandAssets } from '@/features/accounts/domain/account.brands';
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

const accountLayoutTransition = LinearTransition.springify().damping(22).stiffness(220);
const swipeActionsWidth = 132;

type AccountFilter = 'all' | 'asset' | 'liability' | 'hidden';

function AccountSwipeActions({
  translation,
  statusActionLabel,
  onStatusAction,
  onEdit,
  onClose,
}: {
  translation: SharedValue<number>;
  statusActionLabel: '隐藏' | '恢复';
  onStatusAction: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const revealStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: Math.max(0, swipeActionsWidth + translation.value) }],
    };
  });

  return (
    <Animated.View
      style={[styles.swipeActions, revealStyle]}
      onTouchStart={(event) => event.stopPropagation()}>
      <Pressable
        onPress={() => { onClose(); onStatusAction(); }}
        style={({ pressed }) => [styles.swipeAction, styles.statusSwipeAction, pressed && styles.swipeActionPressed]}>
        <ThemedText style={styles.swipeActionText}>{statusActionLabel}</ThemedText>
      </Pressable>
      <Pressable
        onPress={() => { onClose(); onEdit(); }}
        style={({ pressed }) => [styles.swipeAction, styles.editSwipeAction, pressed && styles.swipeActionPressed]}>
        <ThemedText style={styles.swipeActionText}>编辑</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function AccountRow({
  account,
  total,
  showDivider,
  index,
  statusActionLabel,
  onStatusAction,
  onEdit,
  onSwipeableOpen,
  onSwipeableClose,
}: {
  account: AccountBalance;
  total: number;
  showDivider: boolean;
  index: number;
  statusActionLabel: '隐藏' | '恢复';
  onStatusAction: () => void;
  onEdit: () => void;
  onSwipeableOpen: (swipeable: SwipeableMethods) => void;
  onSwipeableClose: (swipeable: SwipeableMethods) => void;
}) {
  const swipeableRef = useRef<SwipeableMethods | null>(null);
  const typeLabel = findTemplate(account.type)?.label ?? '其他';
  const brand = findBrandAssets(account.type);
  const isLiability = account.kind === 'liability';
  const statusLabel = account.status === 'hidden' ? '隐藏' : account.status === 'frozen' ? '封存' : null;
  return (
    <>
      {showDivider ? <View style={styles.accountRowDivider} /> : null}
      <ReanimatedSwipeable
        ref={swipeableRef}
        friction={1.15}
        rightThreshold={72}
        overshootRight={false}
        onSwipeableOpen={() => {
          if (swipeableRef.current) onSwipeableOpen(swipeableRef.current);
        }}
        onSwipeableClose={() => {
          if (swipeableRef.current) onSwipeableClose(swipeableRef.current);
        }}
        containerStyle={styles.swipeContainer}
        childrenContainerStyle={styles.swipeChild}
        renderRightActions={(_progress, translation, methods) => (
          <AccountSwipeActions
            translation={translation}
            statusActionLabel={statusActionLabel}
            onStatusAction={onStatusAction}
            onEdit={onEdit}
            onClose={methods.close}
          />
        )}>
        <Animated.View
          entering={FadeInDown.duration(220).delay(Math.min(index * 35, 175))}
          exiting={FadeOut.duration(140)}
          layout={accountLayoutTransition}
          style={styles.accountRow}>
          <View style={[styles.accountIcon, !brand?.icon && { backgroundColor: `${account.color}1A` }]}>
            {brand?.icon ? (
              <Image
                source={brand.icon}
                style={[
                  styles.accountIconImage,
                  brand.iconSize
                    ? { width: (brand.iconSize / 44) * 38, height: (brand.iconSize / 44) * 38 }
                    : null,
                ]}
                contentFit={brand.iconFit ?? (brand.iconPosition === 'left' ? 'cover' : 'contain')}
                contentPosition={brand.iconPosition ?? 'center'}
              />
            ) : (
              <ThemedText style={styles.accountIconText}>{account.icon}</ThemedText>
            )}
          </View>
          <View style={styles.accountInfo}>
            <ThemedText style={styles.accountName} numberOfLines={1}>{account.name}</ThemedText>
            <View style={styles.accountMeta}>
              <ThemedText type="small" themeColor="textSecondary">
                {typeLabel}{isLiability ? ' · 负债' : account.status === 'hidden' ? '' : ` · ${formatPercent(account.balanceCents, total)}`}
              </ThemedText>
              {statusLabel ? (
                <View style={styles.statusBadge}>
                  <ThemedText style={styles.statusBadgeText}>{statusLabel}</ThemedText>
                </View>
              ) : null}
            </View>
          </View>
          <ThemedText style={[styles.accountAmount, isLiability && styles.liabilityAmount]} numberOfLines={1}>
            {formatCurrency(account.balanceCents)}
          </ThemedText>
        </Animated.View>
      </ReanimatedSwipeable>
    </>
  );
}

export function AssetsScreen() {
  const router = useRouter();
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);
  const [range, setRange] = useState<'all' | 'day' | 'week' | 'month'>('day');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const { accounts, hiddenAccounts, updateAccountStatus } = useAccounts();
  const onScroll = useHideTabBarOnScroll();
  const { transactions } = useTransactions();
  const { summary } = useMonthlySummary();
  const netWorthAccounts = useMemo(
    () => accounts.filter((account) => account.includeInNetWorth),
    [accounts]
  );
  const totalAssets = netWorthAccounts.filter((a) => a.kind !== 'liability').reduce((sum, a) => sum + a.balanceCents, 0);
  const totalLiabilities = netWorthAccounts
    .filter((a) => a.kind === 'liability')
    .reduce((sum, a) => sum + Math.abs(a.balanceCents), 0);
  const netWorth = totalAssets - totalLiabilities;
  const monthlyChange = summary.incomeCents - summary.expenseCents;
  const slices = useMemo(() => buildAssetBreakdown(netWorthAccounts), [netWorthAccounts]);
  const trend = useMemo(() => buildNetWorthTrend(netWorthAccounts, transactions), [netWorthAccounts, transactions]);
  const assetCount = accounts.filter((account) => account.kind !== 'liability').length;
  const liabilityCount = accounts.length - assetCount;
  const filteredAccounts = accountFilter === 'hidden' ? hiddenAccounts : accounts.filter((account) => {
    if (accountFilter === 'asset') return account.kind !== 'liability';
    if (accountFilter === 'liability') return account.kind === 'liability';
    return true;
  });
  const accountFilterOptions: [AccountFilter, string][] = [
    ['all', `全部 ${accounts.length}`],
    ['asset', `资产 ${assetCount}`],
    ['liability', `负债 ${liabilityCount}`],
    ...(hiddenAccounts.length > 0 ? [['hidden', `隐藏 ${hiddenAccounts.length}`] as [AccountFilter, string]] : []),
  ];

  const closeOpenSwipeable = useCallback(() => {
    openSwipeableRef.current?.close();
    openSwipeableRef.current = null;
  }, []);

  const handleSwipeableOpen = useCallback((swipeable: SwipeableMethods) => {
    if (openSwipeableRef.current !== swipeable) openSwipeableRef.current?.close();
    openSwipeableRef.current = swipeable;
  }, []);

  const handleSwipeableClose = useCallback((swipeable: SwipeableMethods) => {
    if (openSwipeableRef.current === swipeable) openSwipeableRef.current = null;
  }, []);

  useEffect(() => {
    if (accountFilter === 'hidden' && hiddenAccounts.length === 0) setAccountFilter('all');
  }, [accountFilter, hiddenAccounts.length]);

  async function restoreAccount(id: string) {
    try {
      await updateAccountStatus(id, 'active');
      if (hiddenAccounts.length === 1) setAccountFilter('all');
    } catch (error) {
      Alert.alert('无法恢复账户', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  async function hideAccount(id: string) {
    try {
      await updateAccountStatus(id, 'hidden');
    } catch (error) {
      Alert.alert('无法隐藏账户', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          onTouchStart={closeOpenSwipeable}
          scrollEventThrottle={16}>
          <View style={styles.topBar}>
            <View style={styles.topActions}>
              <ThemedText style={styles.topIcon}>⌾</ThemedText>
              <ThemedText style={styles.topIcon}>♧</ThemedText>
              <ThemedText style={styles.topIcon}>↗</ThemedText>
            </View>
            <ThemedText style={styles.pageTitle}>记账资产</ThemedText>
            <View style={styles.topSpacer} />
          </View>

          <Animated.View entering={FadeInDown.duration(340).delay(40)} style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <ThemedText style={styles.heroLabel}>净资产（CNY）</ThemedText>
              <ThemedText style={styles.heroChange}>{monthlyChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthlyChange))} 本月</ThemedText>
            </View>
            <ThemedText style={styles.heroAmount}>{formatCurrency(netWorth)}</ThemedText>
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
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(340).delay(100)} style={styles.accountsPanel}>
            <View style={styles.accountsPanelHeader}>
              <View style={styles.accountsPanelTitleRow}>
                <ThemedText style={styles.accountsTitle}>资产</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{accounts.length} 个</ThemedText>
              </View>
              <Pressable
                style={({ pressed }) => [styles.panelAddButton, pressed && styles.pressFeedback]}
                onPress={() => router.push('/accounts/create')}
                hitSlop={6}>
                <ThemedText style={styles.panelAddText}>＋ 添加</ThemedText>
              </Pressable>
            </View>

            <View style={styles.accountFilters}>
              {accountFilterOptions.map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setAccountFilter(key)}
                  style={({ pressed }) => [styles.accountFilter, pressed && styles.filterPressed]}>
                  {accountFilter === key ? (
                    <Animated.View
                      entering={FadeIn.duration(170)}
                      exiting={FadeOut.duration(110)}
                      style={styles.accountFilterActive}
                    />
                  ) : null}
                  <ThemedText style={[styles.accountFilterText, accountFilter === key && styles.accountFilterTextActive]}>
                    {label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.accountList}>
              {filteredAccounts.length > 0 ? filteredAccounts.map((account, index) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  total={totalAssets}
                  showDivider={index > 0}
                  index={index}
                  statusActionLabel={accountFilter === 'hidden' ? '恢复' : '隐藏'}
                  onStatusAction={accountFilter === 'hidden'
                    ? () => { void restoreAccount(account.id); }
                    : () => { void hideAccount(account.id); }}
                  onSwipeableOpen={handleSwipeableOpen}
                  onSwipeableClose={handleSwipeableClose}
                  onEdit={() => router.push({
                    pathname: '/accounts/new',
                    params: { templateId: account.type, accountId: account.id },
                  })}
                />
              )) : (
                <View style={styles.emptyAccounts}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {accountFilter === 'hidden'
                      ? '暂无隐藏账户'
                      : accounts.length === 0
                        ? '还没有账户，点击右上角添加'
                        : '这个分类下暂无账户'}
                  </ThemedText>
                </View>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(160)} style={styles.trendHeader}>
            <ThemedText style={styles.sectionTitle}>资产走势图</ThemedText>
            <View style={styles.rangeControl}>
              <Pressable onPress={() => setRange('all')} style={[styles.rangeButton, range === 'all' && styles.rangeSelected]}><ThemedText type="small">全部</ThemedText></Pressable>
              <Pressable onPress={() => setRange('day')} style={[styles.rangeButton, range === 'day' && styles.rangeSelected]}><ThemedText type="small">日</ThemedText></Pressable>
              <Pressable onPress={() => setRange('week')} style={[styles.rangeButton, range === 'week' && styles.rangeSelected]}><ThemedText type="small">周</ThemedText></Pressable>
              <Pressable onPress={() => setRange('month')} style={[styles.rangeButton, range === 'month' && styles.rangeSelected]}><ThemedText type="small">月</ThemedText></Pressable>
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(300).delay(190)} style={styles.chartCard}>
            <NetWorthChart values={trend} lineColor="#77736D" areaColor="#D6D2CA" height={104} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 96, gap: 10 },
  topBar: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', gap: 10, width: 82 },
  topIcon: { ...Glyph.md, color: '#77736D' },
  pageTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  topSpacer: { width: 82 },
  heroCard: { backgroundColor: '#8B8780', borderRadius: 17, padding: 13, gap: 6, shadowColor: '#5B5751', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { ...Type.subhead, color: '#F8F7F5', fontWeight: FontWeight.medium },
  heroChange: { ...Type.footnote, ...Numeric, color: '#F1B4B7', fontWeight: FontWeight.semibold },
  heroAmount: { ...Type.display, ...Numeric, color: '#FFFFFF', fontWeight: FontWeight.bold },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  heroChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 },
  emptyChip: { backgroundColor: 'rgba(255,255,255,0.22)' },
  chipDot: { color: '#FFFFFF', fontSize: 8, marginRight: 4 },
  chipText: { ...Type.caption, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  sectionTitle: { ...Type.body, fontWeight: FontWeight.semibold, color: '#4D4944' },
  accountsPanel: { gap: 9, paddingTop: 3 },
  accountsPanelHeader: { minHeight: 36, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountsPanelTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  accountsTitle: { ...Type.title, fontWeight: FontWeight.semibold, color: '#302E2A' },
  panelAddButton: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#E6F2EC' },
  panelAddText: { ...Type.subhead, color: '#3E7F68', fontWeight: FontWeight.semibold },
  pressFeedback: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  accountFilters: { flexDirection: 'row', gap: 5 },
  accountFilter: { position: 'relative', flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 6, overflow: 'hidden', backgroundColor: '#ECEFED' },
  accountFilterActive: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 10, backgroundColor: '#8B8780' },
  accountFilterText: { zIndex: 1, ...Type.subhead, color: '#77736D', fontWeight: FontWeight.medium },
  accountFilterTextActive: { color: '#FFFFFF', fontWeight: FontWeight.semibold },
  filterPressed: { opacity: 0.76 },
  accountList: { backgroundColor: '#F5F7FA' },
  accountRow: { minHeight: 62, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, backgroundColor: '#F5F7FA' },
  accountRowDivider: { height: 1, marginLeft: 49, backgroundColor: '#E3E7EA' },
  accountIcon: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', backgroundColor: '#F1F0EE', alignItems: 'center', justifyContent: 'center' },
  accountIconImage: { width: 30, height: 30, borderRadius: 999 },
  accountIconText: { ...Glyph.sm, color: '#817D76', fontWeight: FontWeight.bold },
  accountInfo: { flex: 1, minWidth: 0, gap: 1 },
  accountName: { ...Type.body, fontWeight: FontWeight.semibold },
  accountMeta: { minHeight: 18, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusBadge: { borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1, backgroundColor: '#E8E9E7' },
  statusBadgeText: { ...Type.caption, color: '#77736D', fontWeight: FontWeight.semibold },
  accountAmount: { maxWidth: 120, ...Type.body, ...Numeric, fontWeight: FontWeight.semibold, color: '#5C5954' },
  liabilityAmount: { color: '#C4432F' },
  swipeContainer: { overflow: 'hidden', backgroundColor: '#F5F7FA' },
  swipeChild: { backgroundColor: '#F5F7FA' },
  swipeActions: { flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center', gap: 6, paddingLeft: 6 },
  swipeAction: { width: 60, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statusSwipeAction: { backgroundColor: '#C7C8C7' },
  editSwipeAction: { backgroundColor: '#8FD49B' },
  swipeActionText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  swipeActionPressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  emptyAccounts: { minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangeControl: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rangeButton: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  rangeSelected: { backgroundColor: '#8B8780' },
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 10, shadowColor: '#28343A', shadowOpacity: 0.04, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
});

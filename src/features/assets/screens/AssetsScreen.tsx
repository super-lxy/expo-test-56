import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useHideTabBarOnScroll } from '@/hooks/use-hide-tab-bar-on-scroll';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, FontWeight, Glyph, Numeric, Type } from '@/constants/theme';
import { findBrandAssets } from '@/features/accounts/domain/account.brands';
import type { AccountBalance } from '@/features/accounts/domain/account.types';
import { findTemplate } from '@/features/accounts/domain/account.templates';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { NetWorthChart } from '@/features/dashboard/components/NetWorthChart';
import { buildNetWorthTrend } from '@/features/dashboard/domain/netWorth';
import { getAvailableCreditCents, summarizeNetWorth } from '@/features/accounts/domain/account.balances';
import { useMonthlySummary, useTransactions } from '@/features/transactions/hooks/useTransactions';
import { formatCurrency, formatSignedCurrency } from '@/shared/utils/currency';

function formatPercent(value: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((Math.max(value, 0) / total) * 100)}%`;
}

const accountLayoutTransition = LinearTransition.springify().damping(22).stiffness(220);
const swipeActionsWidth = 132;
const emptyAssetsIllustration = require('../../../../assets/images/brands/cash-icon.png');
const swipeAnimationOptions = {
  damping: 22,
  stiffness: 220,
  overshootClamping: true,
};

type AccountFilter = 'all' | 'asset' | 'liability';
type DeleteMode = 'account' | 'accountAndTransactions';

function createDeleteCode() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10000).toString().padStart(4, '0')).join(' ');
}

function AccountSwipeActions({
  translation,
  statusActionLabel,
  onStatusAction,
  onDelete,
  onClose,
}: {
  translation: SharedValue<number>;
  statusActionLabel: '隐藏' | '恢复';
  onStatusAction: () => void;
  onDelete: () => void;
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
        onPress={() => { onClose(); onDelete(); }}
        style={({ pressed }) => [styles.swipeAction, styles.deleteSwipeAction, pressed && styles.swipeActionPressed]}>
        <ThemedText style={styles.swipeActionText}>删除</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export function AccountRow({
  account,
  total,
  showDivider,
  index,
  statusActionLabel,
  onStatusAction,
  onEdit,
  onDelete,
  onSwipeableOpen,
  onSwipeableClose,
  showStatusBadge = true,
  showInclusionBadge = false,
}: {
  account: AccountBalance;
  total: number;
  showDivider: boolean;
  index: number;
  statusActionLabel: '隐藏' | '恢复';
  onStatusAction: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSwipeableOpen: (swipeable: SwipeableMethods) => void;
  onSwipeableClose: (swipeable: SwipeableMethods) => void;
  showStatusBadge?: boolean;
  showInclusionBadge?: boolean;
}) {
  const swipeableRef = useRef<SwipeableMethods | null>(null);
  const typeLabel = findTemplate(account.type)?.label ?? '其他';
  const brand = findBrandAssets(account.type);
  const isLiability = account.kind === 'liability';
  const availableCreditCents = getAvailableCreditCents(account);
  const statusLabel = showStatusBadge
    ? account.status === 'hidden' ? '隐藏' : account.status === 'frozen' ? '封存' : null
    : null;
  const inclusionLabel = showInclusionBadge && !account.includeInNetWorth ? '未计入合计' : null;
  return (
    <>
      {showDivider ? <View style={styles.accountRowDivider} /> : null}
      <ReanimatedSwipeable
        ref={swipeableRef}
        friction={1.15}
        animationOptions={swipeAnimationOptions}
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
            onDelete={onDelete}
            onClose={methods.close}
          />
        )}>
        <Animated.View
          entering={FadeInDown.duration(220).delay(Math.min(index * 35, 175))}
          exiting={FadeOut.duration(140)}
          layout={accountLayoutTransition}>
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel={`编辑账户：${account.name}`}
            style={({ pressed }) => [styles.accountRow, pressed && styles.accountRowPressed]}>
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
                  {typeLabel}{isLiability
                    ? availableCreditCents === null ? ' · 负债' : ` · 可用 ${formatCurrency(availableCreditCents)}`
                    : account.includeInNetWorth ? ` · ${formatPercent(account.balanceCents, total)}` : ''}
                </ThemedText>
                {inclusionLabel || statusLabel ? (
                  <View style={[styles.statusBadge, inclusionLabel && styles.excludedBadge]}>
                    <ThemedText style={[styles.statusBadgeText, inclusionLabel && styles.excludedBadgeText]}>
                      {inclusionLabel ?? statusLabel}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
            <ThemedText style={[styles.accountAmount, isLiability && styles.liabilityAmount]} numberOfLines={1}>
              {formatSignedCurrency(account.balanceCents)}
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ReanimatedSwipeable>
    </>
  );
}

export function AssetDeleteFlow({
  account,
  onClose,
  onDeleteOnly,
  onDeleteAndTransactions,
  onDeleted,
}: {
  account: AccountBalance;
  onClose: () => void;
  onDeleteOnly: (id: string) => Promise<void>;
  onDeleteAndTransactions: (id: string) => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('accountAndTransactions');
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteCodeInput, setDeleteCodeInput] = useState('');

  function openDeleteConfirmation(mode: DeleteMode) {
    setDeleteMode(mode);
    setDeleteCode(createDeleteCode());
    setDeleteCodeInput('');
    setConfirmVisible(true);
  }

  async function handleDeleteConfirmed() {
    if (deleteCodeInput.replace(/\s/g, '') !== deleteCode.replace(/\s/g, '')) return;
    try {
      if (deleteMode === 'accountAndTransactions') await onDeleteAndTransactions(account.id);
      else await onDeleteOnly(account.id);
      await onDeleted();
      onClose();
    } catch (error) {
      Alert.alert('无法删除资产', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  const codeMatches = deleteCodeInput.replace(/\s/g, '') === deleteCode.replace(/\s/g, '');

  return (
    <>
      <Modal
        visible={!confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={onClose}>
        <Pressable style={styles.deleteOverlay} onPress={onClose}>
          <Pressable style={styles.deleteOptionsSheet} onPress={() => {}}>
            <View style={styles.deleteSheetHeader}>
              <ThemedText style={styles.deleteSheetTitle}>删除资产账户</ThemedText>
              <Pressable onPress={onClose} style={styles.deleteClose} hitSlop={8}>
                <ThemedText style={styles.deleteCloseText}>×</ThemedText>
              </Pressable>
            </View>
            <Pressable style={styles.deleteOption} onPress={() => openDeleteConfirmation('accountAndTransactions')}>
              <View style={[styles.deleteOptionIcon, styles.deleteOptionIconDanger]}>
                <SymbolView name={{ ios: 'trash.fill', android: 'delete_forever', web: 'delete_forever' }} size={19} tintColor="#D94B45" />
              </View>
              <View style={styles.deleteOptionText}>
                <ThemedText style={styles.deleteOptionTitleDanger}>删除资产和账单</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">永久删除该资产及其所有相关账单</ThemedText>
              </View>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor="#C8CDD1" />
            </Pressable>
            <Pressable style={[styles.deleteOption, styles.deleteOptionBorder]} onPress={() => openDeleteConfirmation('account')}>
              <View style={[styles.deleteOptionIcon, styles.deleteOptionIconWarning]}>
                <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={19} tintColor="#E89A18" />
              </View>
              <View style={styles.deleteOptionText}>
                <ThemedText style={styles.deleteOptionTitle}>仅删除资产</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">保留历史账单，但不再显示该资产</ThemedText>
              </View>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor="#C8CDD1" />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.deleteConfirmOverlay}>
          <View style={styles.deleteConfirmSheet}>
            <View style={styles.deleteConfirmHeader}>
              <Pressable onPress={() => setConfirmVisible(false)} style={styles.deleteClose} hitSlop={8}>
                <ThemedText style={styles.deleteCloseText}>×</ThemedText>
              </Pressable>
              <ThemedText style={styles.deleteConfirmTitle}>确认删除</ThemedText>
            </View>
            <View style={styles.deleteCodeHint}>
              <ThemedText style={styles.deleteInfoSymbol}>ⓘ</ThemedText>
              <ThemedText style={styles.deleteCodeHintText}>请输入下方验证码，确认你已了解此操作不可恢复</ThemedText>
            </View>
            <ThemedText style={styles.deleteCode}>{deleteCode}</ThemedText>
            <TextInput
              value={deleteCodeInput}
              onChangeText={setDeleteCodeInput}
              placeholder="输入验证码"
              placeholderTextColor="#92979C"
              keyboardType="number-pad"
              autoFocus
              style={styles.deleteCodeInput}
              maxLength={19}
            />
            <View style={styles.deleteWarningBox}>
              <ThemedText style={styles.deleteWarningSymbol}>⚠</ThemedText>
              <ThemedText style={styles.deleteWarningText}>
                {deleteMode === 'accountAndTransactions'
                  ? '将永久删除该资产及其所有相关账单，数据无法恢复。'
                  : '将移除该资产，但历史账单会保留。'}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => void handleDeleteConfirmed()}
              disabled={!codeMatches}
              style={({ pressed }) => [
                styles.deleteConfirmButton,
                !codeMatches && styles.deleteConfirmButtonDisabled,
                pressed && styles.deleteConfirmButtonPressed,
              ]}>
              <ThemedText style={styles.deleteConfirmButtonText}>确认删除</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function AssetsScreen() {
  const router = useRouter();
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);
  const [range, setRange] = useState<'all' | 'day' | 'week' | 'month'>('day');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const {
    accounts,
    hiddenAccounts,
    updateAccountStatus,
    deleteAccountOnly,
    deleteAccountAndTransactions,
  } = useAccounts();
  const [deleteTarget, setDeleteTarget] = useState<AccountBalance | null>(null);
  const onScroll = useHideTabBarOnScroll();
  const { transactions, refresh: refreshTransactions } = useTransactions();
  const { summary, refresh: refreshSummary } = useMonthlySummary();
  const netWorthAccounts = useMemo(
    () => accounts.filter((account) => account.includeInNetWorth),
    [accounts]
  );
  const { totalAssets, totalLiabilities, netWorth } = summarizeNetWorth(accounts);
  const monthlyChange = summary.incomeCents - summary.expenseCents;
  const trend = useMemo(() => buildNetWorthTrend(netWorthAccounts, transactions), [netWorthAccounts, transactions]);
  const assetCount = accounts.filter((account) => account.kind !== 'liability').length;
  const liabilityCount = accounts.length - assetCount;
  const filteredAccounts = accounts.filter((account) => {
    if (accountFilter === 'asset') return account.kind !== 'liability';
    if (accountFilter === 'liability') return account.kind === 'liability';
    return true;
  });
  const accountFilterOptions: [AccountFilter, string][] = [
    ['all', `全部 ${accounts.length}`],
    ['asset', `资产 ${assetCount}`],
    ['liability', `负债 ${liabilityCount}`],
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

  async function hideAccount(id: string) {
    try {
      await updateAccountStatus(id, 'hidden');
    } catch (error) {
      Alert.alert('无法隐藏账户', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <AppBackground />
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
            <ThemedText style={styles.pageTitle}>资产</ThemedText>
            <View style={styles.topSpacer} />
          </View>

          <Animated.View entering={FadeInDown.duration(340).delay(40)} style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <ThemedText style={styles.heroLabel}>净资产（CNY）</ThemedText>
              <ThemedText style={[styles.heroChange, { color: monthlyChange >= 0 ? AppPalette.income : AppPalette.expense }]}>
                {monthlyChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthlyChange))} 本月
              </ThemedText>
            </View>
            <ThemedText style={styles.heroAmount}>{formatCurrency(netWorth)}</ThemedText>
            <View style={styles.heroMetrics}>
              <View style={styles.heroMetric}>
                <ThemedText style={styles.heroMetricLabel}>总资产</ThemedText>
                <ThemedText style={styles.heroMetricValue}>{formatCurrency(totalAssets)}</ThemedText>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetric}>
                <ThemedText style={styles.heroMetricLabel}>总负债</ThemedText>
                <ThemedText style={[styles.heroMetricValue, styles.heroLiabilityValue]}>{formatCurrency(totalLiabilities)}</ThemedText>
              </View>
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

            {accounts.length > 0 ? (
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
            ) : null}

            {accounts.length === 0 ? (
              <View style={styles.emptyAssetState}>
                <View style={styles.emptyIllustration}>
                  <Image
                    source={emptyAssetsIllustration}
                    style={styles.emptyIllustrationImage}
                    contentFit="contain"
                  />
                </View>
                <ThemedText style={styles.emptyAssetTitle}>还没有发现资产账户</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyAssetDescription}>
                  试着添加一个吧～
                </ThemedText>
              </View>
            ) : (
              <View style={styles.accountList}>
                {filteredAccounts.length > 0 ? filteredAccounts.map((account, index) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  total={totalAssets}
                  showDivider={index > 0}
                  index={index}
                  statusActionLabel="隐藏"
                  onStatusAction={() => { void hideAccount(account.id); }}
                  onSwipeableOpen={handleSwipeableOpen}
                  onSwipeableClose={handleSwipeableClose}
                  onEdit={() => router.push({
                    pathname: '/accounts/new',
                    params: { templateId: account.type, accountId: account.id },
                  })}
                  onDelete={() => setDeleteTarget(account)}
                />
                )) : (
                  <View style={styles.emptyAccounts}>
                    <ThemedText type="small" themeColor="textSecondary">这个分类下暂无账户</ThemedText>
                  </View>
                )}
              </View>
            )}

            {hiddenAccounts.length > 0 ? (
              <Pressable
                onPress={() => router.push('/accounts/hidden')}
                accessibilityRole="button"
                accessibilityLabel={`查看隐藏资产，共 ${hiddenAccounts.length} 个账户`}
                hitSlop={8}
                style={({ pressed }) => [styles.hiddenAssetsLink, pressed && styles.hiddenAssetsLinkPressed]}>
                <ThemedText style={styles.hiddenAssetsLinkText}>查看隐藏资产</ThemedText>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  size={14}
                  tintColor="#AEB4B0"
                />
              </Pressable>
            ) : null}
          </Animated.View>

          {accounts.length > 0 ? (
            <>
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
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      {deleteTarget ? (
        <AssetDeleteFlow
          account={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleteOnly={deleteAccountOnly}
          onDeleteAndTransactions={deleteAccountAndTransactions}
          onDeleted={() => Promise.all([refreshTransactions(), refreshSummary()]).then(() => undefined)}
        />
      ) : null}
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
  heroCard: { backgroundColor: AppPalette.surface, experimental_backgroundImage: 'linear-gradient(135deg, #FFF1F5 0%, #FFFFFF 50%, #E8F8F9 100%)', borderRadius: 22, padding: 16, gap: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.94)', shadowColor: AppPalette.shadow, shadowOpacity: 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { ...Type.subhead, color: AppPalette.inkSoft, fontWeight: FontWeight.medium },
  heroChange: { ...Type.footnote, ...Numeric, fontWeight: FontWeight.semibold },
  heroAmount: { ...Type.hero, ...Numeric, color: AppPalette.ink, fontWeight: FontWeight.bold, paddingVertical: 3 },
  heroMetrics: { flexDirection: 'row', alignItems: 'stretch', marginTop: 2, borderTopWidth: 1, borderTopColor: 'rgba(102,108,118,0.10)', paddingTop: 11 },
  heroMetric: { flex: 1, gap: 3 },
  heroMetricLabel: { ...Type.caption, color: AppPalette.textMuted, fontWeight: FontWeight.medium },
  heroMetricValue: { ...Type.headline, ...Numeric, color: AppPalette.inkSoft, fontWeight: FontWeight.semibold },
  heroLiabilityValue: { color: AppPalette.danger },
  heroMetricDivider: { width: 1, marginHorizontal: 14, backgroundColor: 'rgba(102,108,118,0.10)' },
  sectionTitle: { ...Type.body, fontWeight: FontWeight.semibold, color: '#4D4944' },
  accountsPanel: { gap: 9, paddingTop: 3 },
  accountsPanelHeader: { minHeight: 36, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountsPanelTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  accountsTitle: { ...Type.title, fontWeight: FontWeight.semibold, color: '#302E2A' },
  panelAddButton: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: AppPalette.expenseSoft },
  panelAddText: { ...Type.subhead, color: AppPalette.expense, fontWeight: FontWeight.semibold },
  pressFeedback: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  accountFilters: { flexDirection: 'row', gap: 5 },
  accountFilter: { position: 'relative', flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 6, overflow: 'hidden', backgroundColor: AppPalette.surfaceMuted },
  accountFilterActive: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 10, backgroundColor: AppPalette.primary },
  accountFilterText: { zIndex: 1, ...Type.subhead, color: '#77736D', fontWeight: FontWeight.medium },
  accountFilterTextActive: { color: '#FFFFFF', fontWeight: FontWeight.semibold },
  filterPressed: { opacity: 0.76 },
  accountList: { backgroundColor: 'rgba(255,255,255,0.42)' },
  accountRow: { minHeight: 62, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.42)' },
  accountRowPressed: { opacity: 0.68 },
  accountRowDivider: { height: 1, marginLeft: 49, backgroundColor: '#E3E7EA' },
  accountIcon: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', backgroundColor: '#F1F0EE', alignItems: 'center', justifyContent: 'center' },
  accountIconImage: { width: 30, height: 30, borderRadius: 999 },
  accountIconText: { ...Glyph.sm, color: '#817D76', fontWeight: FontWeight.bold },
  accountInfo: { flex: 1, minWidth: 0, gap: 1 },
  accountName: { ...Type.body, fontWeight: FontWeight.semibold },
  accountMeta: { minHeight: 18, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusBadge: { borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1, backgroundColor: '#E8E9E7' },
  statusBadgeText: { ...Type.caption, color: '#77736D', fontWeight: FontWeight.semibold },
  excludedBadge: { backgroundColor: '#F4EBDD' },
  excludedBadgeText: { color: '#8D7047' },
  accountAmount: { maxWidth: 120, ...Type.body, ...Numeric, fontWeight: FontWeight.semibold, color: '#5C5954' },
  liabilityAmount: { color: AppPalette.danger },
  swipeContainer: { overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.42)' },
  swipeChild: { backgroundColor: 'rgba(255,255,255,0.42)' },
  swipeActions: { flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center', gap: 6, paddingLeft: 6 },
  swipeAction: { width: 60, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statusSwipeAction: { backgroundColor: '#C7C8C7' },
  deleteSwipeAction: { backgroundColor: AppPalette.danger },
  swipeActionText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  swipeActionPressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  deleteOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,26,30,0.42)' },
  deleteOptionsSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingBottom: 28 },
  deleteSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 14 },
  deleteSheetTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  deleteClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F4' },
  deleteCloseText: { fontSize: 25, lineHeight: 28, color: '#737B82', fontWeight: FontWeight.regular },
  deleteOption: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 14 },
  deleteOptionBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F2' },
  deleteOptionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deleteOptionIconDanger: { backgroundColor: '#FDE8E6' },
  deleteOptionIconWarning: { backgroundColor: '#FFF3DE' },
  deleteOptionText: { flex: 1, gap: 2 },
  deleteOptionTitle: { ...Type.body, fontWeight: FontWeight.semibold, color: '#2B3034' },
  deleteOptionTitleDanger: { ...Type.body, fontWeight: FontWeight.semibold, color: '#D94B45' },
  deleteConfirmOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,26,30,0.42)' },
  deleteConfirmSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 28 },
  deleteConfirmHeader: { position: 'relative', alignItems: 'flex-start', paddingTop: 18, paddingBottom: 16 },
  deleteConfirmTitle: { alignSelf: 'center', ...Type.title, fontWeight: FontWeight.semibold, color: '#17212B' },
  deleteCodeHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F5F6F7' },
  deleteInfoSymbol: { ...Type.headline, lineHeight: 19, color: '#7E858C' },
  deleteCodeHintText: { flex: 1, ...Type.footnote, color: '#737B82' },
  deleteCode: { marginTop: 18, textAlign: 'center', ...Type.title, letterSpacing: 2, color: '#17212B', fontWeight: FontWeight.bold },
  deleteCodeInput: { marginTop: 14, minHeight: 54, borderRadius: 16, paddingHorizontal: 16, ...Type.headline, textAlign: 'center', letterSpacing: 2, color: '#17212B', backgroundColor: '#F5F6F7' },
  deleteWarningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FFF5E4' },
  deleteWarningSymbol: { ...Type.headline, lineHeight: 19, color: '#E9A51B' },
  deleteWarningText: { flex: 1, ...Type.footnote, color: '#7A6650' },
  deleteConfirmButton: { marginTop: 18, borderRadius: 999, alignItems: 'center', paddingVertical: 15, backgroundColor: AppPalette.primary },
  deleteConfirmButtonDisabled: { backgroundColor: '#E6E8E9' },
  deleteConfirmButtonPressed: { opacity: 0.78 },
  deleteConfirmButtonText: { ...Type.headline, color: AppPalette.surface, fontWeight: FontWeight.semibold },
  emptyAccounts: { minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  emptyAssetState: { minHeight: 350, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingTop: 4, paddingBottom: 30 },
  emptyIllustration: { width: 184, height: 164, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyIllustrationImage: { width: 158, height: 158 },
  emptyAssetTitle: { ...Type.headline, color: '#6F7471', fontWeight: FontWeight.medium },
  emptyAssetDescription: { maxWidth: 280, marginTop: 3, textAlign: 'center', color: '#AFB4B1', lineHeight: 19 },
  hiddenAssetsLink: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 3, paddingHorizontal: 16 },
  hiddenAssetsLinkPressed: { opacity: 0.52 },
  hiddenAssetsLinkText: { ...Type.subhead, color: '#A9AFAB', fontWeight: FontWeight.medium },
  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangeControl: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rangeButton: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  rangeSelected: { backgroundColor: AppPalette.primary },
  chartCard: { backgroundColor: 'rgba(255,255,255,0.76)', borderRadius: 17, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.86)', shadowColor: AppPalette.shadow, shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
});

import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontWeight, Numeric, Type } from '@/constants/theme';
import type { AccountBalance } from '@/features/accounts/domain/account.types';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { formatCurrency } from '@/shared/utils/currency';
import { AccountRow, AssetDeleteFlow } from './AssetsScreen';

function EmptyHiddenAssets({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <SymbolView
          name={{ ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }}
          size={27}
          tintColor="#89918C"
        />
      </View>
      <ThemedText style={styles.emptyTitle}>暂无隐藏资产</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDescription}>
        恢复后的账户会重新回到主资产页
      </ThemedText>
      <Pressable onPress={onBack} style={styles.emptyButton}>
        <ThemedText style={styles.emptyButtonText}>返回资产页</ThemedText>
      </Pressable>
    </View>
  );
}

export function HiddenAssetsScreen() {
  const router = useRouter();
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountBalance | null>(null);
  const {
    hiddenAccounts,
    updateAccountStatus,
    deleteAccountOnly,
    deleteAccountAndTransactions,
  } = useAccounts();
  const includedAccounts = hiddenAccounts.filter((account) => account.includeInNetWorth);
  const totalAssets = includedAccounts
    .filter((account) => account.kind !== 'liability')
    .reduce((sum, account) => sum + account.balanceCents, 0);
  const totalLiabilities = includedAccounts
    .filter((account) => account.kind === 'liability')
    .reduce((sum, account) => sum + Math.abs(account.balanceCents), 0);
  const netWorth = totalAssets - totalLiabilities;

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

  async function restoreAccount(id: string) {
    try {
      await updateAccountStatus(id, 'active');
    } catch (error) {
      Alert.alert('无法恢复账户', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="返回">
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back_ios_new', web: 'arrow_back_ios_new' }}
              size={23}
              tintColor="#202522"
            />
          </Pressable>
          <ThemedText style={styles.headerTitle}>隐藏资产</ThemedText>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onTouchStart={closeOpenSwipeable}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryDecorationLarge} />
            <View style={styles.summaryDecorationSmall} />
            <View style={styles.summaryHeader}>
              <View style={styles.summaryTitleRow}>
                <View style={styles.summaryAccent} />
                <ThemedText style={styles.summaryTitle}>隐藏净资产</ThemedText>
              </View>
              <View style={styles.poolBadge}>
                <ThemedText style={styles.poolBadgeText}>独立资产池</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.summaryAmount}>{formatCurrency(netWorth)}</ThemedText>
            <View style={styles.summaryBreakdown}>
              <View style={styles.summaryMetric}>
                <ThemedText type="small" style={styles.metricLabel}>总资产</ThemedText>
                <ThemedText style={styles.metricAmount}>{formatCurrency(totalAssets)}</ThemedText>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.summaryMetric}>
                <ThemedText type="small" style={styles.metricLabel}>总负债</ThemedText>
                <ThemedText style={[styles.metricAmount, styles.liabilityAmount]}>
                  {formatCurrency(totalLiabilities)}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <SymbolView
              name={{ ios: 'info.circle.fill', android: 'info', web: 'info' }}
              size={17}
              tintColor="#7D8D83"
            />
            <ThemedText type="small" style={styles.infoText}>
              隐藏账户只参与本页合计；关闭“计入资产合计”后，账户仍会保留在列表中。
            </ThemedText>
          </View>

          <View style={styles.listHeader}>
            <View>
              <ThemedText style={styles.listTitle}>隐藏账户</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {hiddenAccounts.length} 个账户
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">左滑管理</ThemedText>
          </View>

          {hiddenAccounts.length > 0 ? (
            <View style={styles.accountList}>
              {hiddenAccounts.map((account, index) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  total={Math.max(totalAssets, 0)}
                  showDivider={index > 0}
                  index={index}
                  statusActionLabel="恢复"
                  showStatusBadge={false}
                  showInclusionBadge
                  onStatusAction={() => { void restoreAccount(account.id); }}
                  onSwipeableOpen={handleSwipeableOpen}
                  onSwipeableClose={handleSwipeableClose}
                  onEdit={() => router.push({
                    pathname: '/accounts/new',
                    params: { templateId: account.type, accountId: account.id },
                  })}
                  onDelete={() => setDeleteTarget(account)}
                />
              ))}
            </View>
          ) : (
            <EmptyHiddenAssets onBack={() => router.back()} />
          )}

          {hiddenAccounts.length > 0 ? (
            <View style={styles.footerHint}>
              <SymbolView
                name={{ ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }}
                size={15}
                tintColor="#A3AAA6"
              />
              <ThemedText type="small" style={styles.footerHintText}>
                这些账户不会出现在主资产页
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {deleteTarget ? (
        <AssetDeleteFlow
          account={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleteOnly={deleteAccountOnly}
          onDeleteAndTransactions={deleteAccountAndTransactions}
          onDeleted={() => Promise.resolve()}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  safeArea: { flex: 1 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Type.title, color: '#202522', fontWeight: FontWeight.semibold },
  content: { paddingHorizontal: 12, paddingBottom: 36, gap: 12 },
  summaryCard: { position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 18, gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EDEA', shadowColor: '#516057', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  summaryDecorationLarge: { position: 'absolute', width: 150, height: 150, borderRadius: 75, right: -48, top: -56, backgroundColor: '#E4F3E8' },
  summaryDecorationSmall: { position: 'absolute', width: 66, height: 66, borderRadius: 33, right: 54, bottom: -35, backgroundColor: '#F0EBDD' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryAccent: { width: 5, height: 20, borderRadius: 3, backgroundColor: '#A8DAB3' },
  summaryTitle: { ...Type.body, color: '#353B37', fontWeight: FontWeight.semibold },
  poolBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#E4F2E7' },
  poolBadgeText: { ...Type.caption, color: '#567461', fontWeight: FontWeight.semibold },
  summaryAmount: { ...Type.display, ...Numeric, color: '#1E2420', fontWeight: FontWeight.bold },
  summaryBreakdown: { flexDirection: 'row', alignItems: 'stretch', marginTop: 4, borderRadius: 16, padding: 11, backgroundColor: '#F5F7F5' },
  summaryMetric: { flex: 1, gap: 3 },
  metricLabel: { color: '#89918C' },
  metricAmount: { ...Type.headline, ...Numeric, color: '#425249', fontWeight: FontWeight.semibold },
  liabilityAmount: { color: '#C45A4C' },
  metricDivider: { width: 1, marginHorizontal: 12, backgroundColor: '#E1E6E2' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: '#E9EFEB' },
  infoText: { flex: 1, color: '#67716B', lineHeight: 18 },
  listHeader: { minHeight: 45, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 2 },
  listTitle: { ...Type.title, color: '#2C322E', fontWeight: FontWeight.semibold },
  accountList: { overflow: 'hidden', borderRadius: 18, paddingHorizontal: 10, backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: '#E7EBE8' },
  emptyState: { minHeight: 270, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 20, backgroundColor: '#FFFFFF' },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF1EF' },
  emptyTitle: { ...Type.headline, color: '#404641', fontWeight: FontWeight.semibold },
  emptyDescription: { maxWidth: 230, textAlign: 'center' },
  emptyButton: { marginTop: 7, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9, backgroundColor: '#DDEDE1' },
  emptyButtonText: { ...Type.subhead, color: '#4F755B', fontWeight: FontWeight.semibold },
  footerHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 4 },
  footerHintText: { color: '#A3AAA6' },
});

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, FontWeight, Glyph, Numeric, Type } from '@/constants/theme';
import { formatCurrency, formatSignedCurrency } from '@/shared/utils/currency';
import { useAccounts } from '../hooks/useAccounts';
import { summarizeNetWorth } from '../domain/account.balances';
import { findTemplate } from '../domain/account.templates';

export function AccountListScreen() {
  const router = useRouter();
  const { accounts, loading } = useAccounts();
  const { totalAssets: assets, totalLiabilities: liabilities, netWorth: total } = summarizeNetWorth(accounts);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <ThemedText style={styles.pageTitle}>账户</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {loading ? '加载中…' : `${accounts.length} 个账户`}
              </ThemedText>
            </View>
            <Pressable onPress={() => router.push('/accounts/create')} style={styles.addButton}>
              <ThemedText style={styles.addText}>＋ 添加</ThemedText>
            </Pressable>
          </View>

          <View style={styles.totalCard}>
            <ThemedText style={styles.totalLabel}>净资产</ThemedText>
            <ThemedText style={styles.totalAmount}>{formatCurrency(total)}</ThemedText>
            <View style={styles.totalBreakdown}>
              <ThemedText type="small" style={styles.totalHint}>资产 {formatCurrency(assets)}</ThemedText>
              <ThemedText type="small" style={styles.totalHint}>负债 {formatCurrency(liabilities)}</ThemedText>
            </View>
          </View>

          <View style={styles.list}>
            {!loading && accounts.length === 0 ? (
              <Pressable onPress={() => router.push('/accounts/create')} style={styles.emptyRow}>
                <ThemedText themeColor="textSecondary">还没有账户</ThemedText>
                <ThemedText style={styles.emptyAction}>添加第一个 ›</ThemedText>
              </Pressable>
            ) : null}
            {accounts.map((account) => {
              const isLiability = account.kind === 'liability';
              const typeLabel = findTemplate(account.type)?.label ?? '其他';
              return (
                <View key={account.id} style={styles.accountCard}>
                  <View style={[styles.accountIcon, { backgroundColor: `${account.color}1A` }]}>
                    <ThemedText style={styles.accountIconText}>{account.icon}</ThemedText>
                  </View>
                  <View style={styles.accountInfo}>
                    <ThemedText style={styles.accountName}>{account.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {typeLabel} · {isLiability ? '负债' : '资产'}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.accountBalance, isLiability && styles.liabilityBalance]}>
                    {formatSignedCurrency(account.balanceCents)}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 60, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerInfo: { gap: 1 },
  pageTitle: { ...Type.title, fontWeight: FontWeight.bold },
  addButton: { backgroundColor: AppPalette.expenseSoft, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 },
  addText: { ...Type.subhead, color: AppPalette.expense, fontWeight: FontWeight.semibold },
  totalCard: { backgroundColor: AppPalette.primary, borderRadius: 18, padding: 15, gap: 6, shadowColor: AppPalette.ink, shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  totalLabel: { ...Type.subhead, color: '#E4E5E8', fontWeight: FontWeight.medium },
  totalAmount: { ...Type.display, ...Numeric, color: '#FFFFFF', fontWeight: FontWeight.bold },
  totalHint: { ...Numeric, color: '#C7CAD0' },
  list: { gap: 6 },
  emptyRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  emptyAction: { ...Type.subhead, color: AppPalette.expense, fontWeight: FontWeight.semibold },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EDF0' },
  accountIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accountIconText: { ...Glyph.md },
  accountInfo: { flex: 1, gap: 2 },
  accountName: { ...Type.body, fontWeight: FontWeight.semibold },
  accountBalance: { ...Type.body, ...Numeric, fontWeight: FontWeight.semibold },
  liabilityBalance: { color: AppPalette.danger },
  totalBreakdown: { flexDirection: 'row', gap: 14 },
});

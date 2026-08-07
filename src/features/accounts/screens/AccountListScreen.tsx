import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatCurrency } from '@/shared/utils/currency';
import { useAccounts } from '../hooks/useAccounts';
import { findTemplate } from '../domain/account.templates';

export function AccountListScreen() {
  const router = useRouter();
  const { accounts, loading } = useAccounts();
  const assets = accounts.filter((a) => a.kind !== 'liability').reduce((sum, a) => sum + a.balanceCents, 0);
  const liabilities = accounts.filter((a) => a.kind === 'liability').reduce((sum, a) => sum + Math.abs(a.balanceCents), 0);
  const total = assets - liabilities;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>账户</ThemedText>
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
                    {formatCurrency(account.balanceCents)}
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
  content: { padding: Spacing.three, paddingBottom: 80, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  addButton: { backgroundColor: '#DDF3F0', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 },
  addText: { color: '#167C80', fontWeight: '800' },
  totalCard: { backgroundColor: '#167C80', borderRadius: 24, padding: Spacing.four, gap: Spacing.two, shadowColor: '#167C80', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  totalLabel: { color: '#DDF3F0', fontWeight: '700' },
  totalAmount: { color: '#FFFFFF', fontSize: 30, lineHeight: 36, fontWeight: '800' },
  totalHint: { color: '#B8E3DE' },
  list: { gap: Spacing.two },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EDF0' },
  accountIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  accountIconText: { fontSize: 20 },
  accountInfo: { flex: 1, gap: 2 },
  accountName: { fontWeight: '600', fontSize: 14 },
  accountBalance: { fontWeight: '700', fontSize: 14 },
  liabilityBalance: { color: '#C4432F' },
  totalBreakdown: { flexDirection: 'row', gap: 14 },
});

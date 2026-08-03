import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Transaction } from '../domain/transaction.types';
import { formatCurrency } from '@/shared/utils/currency';
import { formatTime } from '@/shared/utils/date';

export function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const color = isTransfer ? '#71808C' : isIncome ? '#167C80' : '#E06B52';

  return (
    <Pressable style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: `${transaction.categoryColor}22` }]}>
        <ThemedText style={styles.iconText}>{transaction.categoryIcon}</ThemedText>
      </View>
      <View style={styles.details}>
        <ThemedText style={styles.category}>
          {isTransfer ? `${transaction.accountName} → ${transaction.transferAccountName ?? '账户'}` : transaction.categoryName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {[transaction.accountName, transaction.parentCategoryName, transaction.categoryName, transaction.note].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>
      <View style={styles.amountCol}>
        <ThemedText style={[styles.amount, { color }]}>
          {isTransfer ? '' : isIncome ? '+' : '-'}{formatCurrency(transaction.amountCents)}
        </ThemedText>
        <ThemedText style={styles.time}>{formatTime(transaction.occurredAt)}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F0F1F2' },
  pressed: { opacity: 0.65 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 },
  details: { flex: 1, gap: 3 },
  category: { fontWeight: '600', fontSize: 14 },
  amountCol: { alignItems: 'flex-end', gap: 3 },
  amount: { fontWeight: '700', fontSize: 15 },
  time: { fontSize: 11, color: '#A0AAB4' },
});

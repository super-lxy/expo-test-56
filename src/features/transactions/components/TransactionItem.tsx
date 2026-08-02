import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Transaction } from '../domain/transaction.types';
import { formatCurrency } from '@/shared/utils/currency';
import { formatDate } from '@/shared/utils/date';

export function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const color = isTransfer ? '#777780' : isIncome ? '#D85C50' : '#30AD78';

  return (
    <Pressable style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: `${transaction.categoryColor}22` }]}>
        <ThemedText style={styles.iconText}>{transaction.categoryIcon}</ThemedText>
      </View>
      <View style={styles.details}>
        <ThemedText style={styles.category}>
          {isTransfer ? `${transaction.accountName} → ${transaction.transferAccountName ?? '账户'}` : transaction.categoryName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[transaction.accountName, transaction.note].filter(Boolean).join(' · ')} · {formatDate(transaction.occurredAt)}
        </ThemedText>
      </View>
      <ThemedText style={[styles.amount, { color }]}>
        {isTransfer ? '' : isIncome ? '+' : '-'}{formatCurrency(transaction.amountCents)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  pressed: {
    opacity: 0.65,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 21,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  category: {
    fontWeight: '600',
    fontSize: 16,
  },
  amount: {
    fontWeight: '700',
    fontSize: 17,
  },
});

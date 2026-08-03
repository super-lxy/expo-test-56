import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Transaction } from '../domain/transaction.types';
import { formatCurrency } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date';

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
        <ThemedText type="small" themeColor="textSecondary">
          {[transaction.accountName, transaction.parentCategoryName, transaction.categoryName, transaction.note].filter(Boolean).join(' · ')} · {formatDateTime(transaction.occurredAt)}
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
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 9,
    gap: 10,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F2',
  },
  pressed: {
    opacity: 0.65,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  category: {
    fontWeight: '600',
    fontSize: 14,
  },
  amount: {
    fontWeight: '600',
    fontSize: 14,
  },
});

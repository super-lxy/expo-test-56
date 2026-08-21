import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppPalette, FontWeight, Glyph, Numeric, Type } from '@/constants/theme';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import { EXTERNAL_TRANSFER_ACCOUNT_ID } from '@/features/accounts/domain/systemAccounts';
import type { Transaction } from '../domain/transaction.types';
import { formatCurrency } from '@/shared/utils/currency';
import { formatTime } from '@/shared/utils/date';

export function TransactionDayHeader({ label, isFirst = false }: { label: string; isFirst?: boolean }) {
  return (
    <View style={styles.dayHeader}>
      <View style={styles.timelineRail}>
        {!isFirst ? <View style={[styles.timelineLine, styles.timelineLineTop]} /> : null}
        <View style={[styles.timelineLine, styles.timelineLineBottom]} />
        <View style={styles.dayDot} />
      </View>
      <View style={styles.dayLabelRow}>
        <ThemedText style={styles.dayLabel}>{label}</ThemedText>
      </View>
    </View>
  );
}

export function TransactionItem({
  transaction,
  isFirst = false,
  isLast = false,
  onPress,
}: {
  transaction: Transaction;
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
}) {
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const isReimbursement = transaction.categoryId === 'reimbursement';
  const isInitialBalance = transaction.categoryId === 'initial-balance';
  const isInternalTransfer = isTransfer || isInitialBalance;
  const initialBalancePrefix = transaction.accountId === EXTERNAL_TRANSFER_ACCOUNT_ID
    ? '+'
    : transaction.transferAccountId === EXTERNAL_TRANSFER_ACCOUNT_ID
      ? '-'
      : isIncome
        ? '+'
        : '-';
  const color = isInitialBalance
    ? initialBalancePrefix === '-' ? AppPalette.danger : AppPalette.income
    : isReimbursement
      ? AppPalette.primary
      : isTransfer
        ? AppPalette.ink
        : isIncome
          ? AppPalette.income
          : AppPalette.danger;
  const accentColor = isInternalTransfer
    ? AppPalette.transfer
    : isReimbursement
      ? AppPalette.primary
      : transaction.categoryColor;
  const cardBackground = AppPalette.surface;
  const cardBorderColor = AppPalette.line;
  const iconBackground = AppPalette.surfaceMuted;
  const title = isInternalTransfer
    ? '内部转账'
    : isReimbursement
      ? '报销'
      : transaction.categoryName;
  const subtitle = (() => {
    if (isReimbursement) {
      return [
        `${transaction.reimbursementSourceAccountName ?? '账外'} → ${transaction.accountName}`,
        transaction.reimbursedExpenseIds.length > 0 ? `${transaction.reimbursedExpenseIds.length} 笔账单` : '',
        transaction.note,
      ].filter(Boolean).join(' · ');
    }
    if (isInitialBalance) {
      const initializedAccountName = transaction.accountId === EXTERNAL_TRANSFER_ACCOUNT_ID
        ? transaction.transferAccountName ?? '账户'
        : transaction.accountName;
      return `【资产初始化】初始余额 ${initialBalancePrefix}${formatCurrency(transaction.amountCents)} · ${initializedAccountName}`;
    }
    if (isTransfer) {
      return [
        `${transaction.accountName} → ${transaction.transferAccountName ?? '账户'}`,
        transaction.feeCents > 0 ? `手续费 ${formatCurrency(transaction.feeCents)}` : '',
        transaction.discountCents > 0 ? `优惠 ${formatCurrency(transaction.discountCents)}` : '',
        transaction.note,
      ].filter(Boolean).join(' · ');
    }
    const duplicateLabels = new Set([title, transaction.categoryName]);
    return [transaction.accountName, transaction.note]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value) && !duplicateLabels.has(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(' · ');
  })();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `查看${title}账单详情` : undefined}
      onPress={onPress}
      style={styles.container}>
      {({ pressed }) => (
        <>
          <View style={styles.timelineRail}>
            {!isFirst ? <View style={[styles.timelineLine, styles.timelineLineTop]} /> : null}
            {!isLast ? <View style={[styles.timelineLine, styles.timelineLineBottom]} /> : null}
            <View style={[styles.timelineDot, { backgroundColor: accentColor }]} />
          </View>
          <View style={styles.eventContent}>
            <View style={[
              styles.details,
              { backgroundColor: cardBackground, borderColor: cardBorderColor },
              pressed && styles.detailsPressed,
            ]}>
              <View style={[
                styles.cardTail,
                { backgroundColor: cardBackground, borderColor: cardBorderColor },
                pressed && styles.cardTailPressed,
              ]} />
              <View style={[styles.icon, { backgroundColor: iconBackground }]}>
                <CategoryIcon
                  icon={transaction.categoryIcon}
                  iconType={transaction.categoryIconType}
                  boxSize={36}
                  textStyle={styles.iconText}
                />
              </View>
              <View style={styles.copy}>
                <ThemedText style={styles.category} numberOfLines={1}>{title}</ThemedText>
                {subtitle ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {subtitle}
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.amountCol}>
                <ThemedText style={[styles.amount, { color }]} numberOfLines={1}>
                  {isInitialBalance ? initialBalancePrefix : isTransfer ? '' : isIncome ? '+' : '-'}{formatCurrency(transaction.amountCents)}
                </ThemedText>
                <ThemedText style={styles.time}>{formatTime(transaction.occurredAt)}</ThemedText>
              </View>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dayHeader: { minHeight: 27, flexDirection: 'row', alignItems: 'stretch' },
  dayLabelRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  dayLabel: { ...Type.subhead, color: '#59636C', fontWeight: FontWeight.semibold, paddingLeft: 6 },
  dayDot: { zIndex: 1, width: 6, height: 6, borderRadius: 3, backgroundColor: '#92A0AD', borderWidth: 1, borderColor: '#FFFFFF' },
  container: { minHeight: 64, flexDirection: 'row', alignItems: 'stretch' },
  time: { ...Type.caption, ...Numeric, color: '#8E979F', fontWeight: FontWeight.medium, flexShrink: 0 },
  timelineRail: { width: 18, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { position: 'absolute', left: 8.5, borderLeftWidth: 1, borderStyle: 'dashed', borderLeftColor: '#D8DDE2' },
  timelineLineTop: { top: 0, height: '50%' },
  timelineLineBottom: { top: '50%', bottom: 0 },
  timelineDot: { zIndex: 1, width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: '#FFFFFF' },
  eventContent: { flex: 1, minWidth: 0, position: 'relative', justifyContent: 'center' },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconText: { ...Glyph.sm },
  details: {
    minWidth: 0,
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 3,
    marginVertical: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
    borderWidth: 1,
    shadowColor: '#637083',
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  detailsPressed: { backgroundColor: '#EEF2F3', borderColor: '#D3DCE0', shadowOpacity: 0.02 },
  cardTail: { position: 'absolute', left: -6, top: '50%', marginTop: -6, width: 12, height: 12, borderLeftWidth: 1, borderBottomWidth: 1, transform: [{ rotate: '45deg' }] },
  cardTailPressed: { backgroundColor: '#EEF2F3', borderColor: '#D3DCE0' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  amountCol: { flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  category: { ...Type.body, fontWeight: FontWeight.semibold },
  amount: { flexShrink: 0, ...Type.body, ...Numeric, fontWeight: FontWeight.semibold, textAlign: 'right' },
});

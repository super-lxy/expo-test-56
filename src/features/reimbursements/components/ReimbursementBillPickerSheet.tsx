import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppPalette, FontWeight, Numeric, Type } from '@/constants/theme';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import type { Transaction } from '@/features/transactions/domain/transaction.types';
import { formatCurrency } from '@/shared/utils/currency';
import { formatDate } from '@/shared/utils/date';

export function ReimbursementBillPickerSheet({
  visible,
  expenses,
  selectedIds,
  onChange,
  onClose,
}: {
  visible: boolean;
  expenses: Transaction[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const selected = new Set(selectedIds);

  function toggle(id: string) {
    onChange(selected.has(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id]);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.headerButton}>
              <ThemedText style={styles.closeText}>×</ThemedText>
            </Pressable>
            <View style={styles.headerCopy}>
              <ThemedText style={styles.title}>选择报销账单</ThemedText>
              <ThemedText style={styles.selectionCount}>已选 {selectedIds.length} 笔</ThemedText>
            </View>
            <Pressable
              onPress={() => onChange([])}
              disabled={selectedIds.length === 0}
              hitSlop={8}
              style={styles.headerButton}>
              <ThemedText style={[styles.clearText, selectedIds.length === 0 && styles.clearTextDisabled]}>清空</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyIcon}>🧾</ThemedText>
                <ThemedText style={styles.emptyTitle}>暂无可报销账单</ThemedText>
                <ThemedText style={styles.emptyDescription}>没有标记为“待报销”的支出，或已全部报销</ThemedText>
              </View>
            ) : expenses.map((expense) => {
              const isSelected = selected.has(expense.id);
              return (
                <Pressable
                  key={expense.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => toggle(expense.id)}
                  style={({ pressed }) => [
                    styles.billRow,
                    isSelected && styles.billRowSelected,
                    pressed && styles.billRowPressed,
                  ]}>
                  <View style={[styles.iconBox, { backgroundColor: `${expense.categoryColor}1F` }]}>
                    <CategoryIcon
                      icon={expense.categoryIcon}
                      iconType={expense.categoryIconType}
                      boxSize={38}
                    />
                  </View>
                  <View style={styles.billCopy}>
                    <ThemedText style={styles.billTitle} numberOfLines={1}>{expense.categoryName}</ThemedText>
                    <ThemedText style={styles.billMeta} numberOfLines={1}>
                      {[expense.accountName, formatDate(expense.occurredAt), expense.note].filter(Boolean).join(' · ')}
                    </ThemedText>
                  </View>
                  <View style={styles.billTrailing}>
                    <ThemedText style={styles.billAmount}>-{formatCurrency(expense.amountCents)}</ThemedText>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected ? <ThemedText style={styles.checkmark}>✓</ThemedText> : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.confirmButton, pressed && styles.buttonPressed]}>
            <ThemedText style={styles.confirmText}>确定选择</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 10 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: AppPalette.overlay },
  sheet: { maxHeight: '76%', borderRadius: 24, overflow: 'hidden', backgroundColor: AppPalette.surface, elevation: 14 },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: AppPalette.line },
  headerButton: { width: 48, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 25, lineHeight: 28, color: AppPalette.textMuted },
  headerCopy: { flex: 1, alignItems: 'center', gap: 1 },
  title: { ...Type.headline, fontWeight: FontWeight.semibold },
  selectionCount: { ...Type.caption, color: AppPalette.textMuted },
  clearText: { ...Type.footnote, color: AppPalette.primary, fontWeight: FontWeight.semibold },
  clearTextDisabled: { color: AppPalette.textFaint },
  list: { paddingHorizontal: 14, paddingVertical: 8 },
  billRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 8, borderRadius: 14 },
  billRowSelected: { backgroundColor: AppPalette.transferSoft },
  billRowPressed: { opacity: 0.68 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  billCopy: { flex: 1, minWidth: 0, gap: 2 },
  billTitle: { ...Type.body, fontWeight: FontWeight.semibold },
  billMeta: { ...Type.footnote, color: AppPalette.textMuted },
  billTrailing: { flexShrink: 0, alignItems: 'flex-end', gap: 5 },
  billAmount: { ...Type.body, ...Numeric, color: AppPalette.expense, fontWeight: FontWeight.semibold },
  checkbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: AppPalette.lineStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: AppPalette.primary, borderColor: AppPalette.primary },
  checkmark: { fontSize: 11, lineHeight: 13, color: '#FFFFFF', fontWeight: FontWeight.bold },
  emptyState: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 5 },
  emptyIcon: { fontSize: 32, lineHeight: 40 },
  emptyTitle: { ...Type.body, fontWeight: FontWeight.semibold },
  emptyDescription: { ...Type.footnote, color: AppPalette.textMuted },
  confirmButton: { minHeight: 48, marginHorizontal: 16, marginTop: 4, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: AppPalette.primary },
  confirmText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  buttonPressed: { opacity: 0.78 },
});

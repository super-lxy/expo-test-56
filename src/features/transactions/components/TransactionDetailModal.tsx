import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppPalette, FontWeight, Glyph, Numeric, Type } from '@/constants/theme';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import { EXTERNAL_TRANSFER_ACCOUNT_ID } from '@/features/accounts/domain/systemAccounts';
import { formatCurrency } from '@/shared/utils/currency';
import type { Transaction } from '../domain/transaction.types';

const MAX_FONT_SIZE_MULTIPLIER = 1.1;

function ModalText(props: React.ComponentProps<typeof ThemedText>) {
  return <ThemedText maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER} {...props} />;
}

function formatFullDateTime(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionAccent} />
      <ModalText style={styles.sectionTitle}>{children}</ModalText>
    </View>
  );
}

function DetailRow({
  label,
  value,
  emphasized = false,
  valueColor,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <ModalText style={styles.detailLabel}>{label}</ModalText>
      <ModalText style={[
        styles.detailValue,
        emphasized && styles.detailValueEmphasized,
        valueColor ? { color: valueColor } : undefined,
      ]}>{value}</ModalText>
    </View>
  );
}

export function TransactionDetailModal({
  transaction,
  deleting = false,
  onClose,
  onDelete,
  onEdit,
}: {
  transaction: Transaction | null;
  deleting?: boolean;
  onClose: () => void;
  onDelete?: (transaction: Transaction) => void;
  onEdit?: (transaction: Transaction) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.min(560, Math.max(420, windowHeight * 0.62));
  const bottomGap = Math.max(insets.bottom, 10);
  const [mounted, setMounted] = useState(false);
  const [displayedTransaction, setDisplayedTransaction] = useState<Transaction | null>(null);
  const mountedRef = useRef(false);
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(sheetHeight + bottomGap + 24));

  useEffect(() => {
    if (transaction) {
      let entranceFrame: number | undefined;
      const mountFrame = requestAnimationFrame(() => {
        setDisplayedTransaction(transaction);
        mountedRef.current = true;
        setMounted(true);
        backdropOpacity.stopAnimation();
        translateY.stopAnimation();
        backdropOpacity.setValue(0);
        translateY.setValue(sheetHeight + bottomGap + 24);

        entranceFrame = requestAnimationFrame(() => {
          Animated.parallel([
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 260,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 440,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start();
        });
      });
      return () => {
        cancelAnimationFrame(mountFrame);
        if (entranceFrame !== undefined) cancelAnimationFrame(entranceFrame);
      };
    }

    if (!mountedRef.current) return;
    backdropOpacity.stopAnimation();
    translateY.stopAnimation();
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: sheetHeight + bottomGap + 24,
        duration: 320,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      mountedRef.current = false;
      setMounted(false);
      setDisplayedTransaction(null);
    });
  }, [transaction, sheetHeight, bottomGap, backdropOpacity, translateY]);

  if (!mounted || !displayedTransaction) return null;

  const isIncome = displayedTransaction.type === 'income';
  const isTransfer = displayedTransaction.type === 'transfer';
  const isInitialBalance = displayedTransaction.categoryId === 'initial-balance';
  const isInternalTransfer = isTransfer || isInitialBalance;
  const initialBalancePrefix = displayedTransaction.accountId === EXTERNAL_TRANSFER_ACCOUNT_ID
    ? '+'
    : displayedTransaction.transferAccountId === EXTERNAL_TRANSFER_ACCOUNT_ID
      ? '-'
      : isIncome
        ? '+'
        : '-';
  const categoryTitle = isInternalTransfer
    ? '内部转账'
    : displayedTransaction.parentCategoryName !== displayedTransaction.categoryName
      ? `${displayedTransaction.parentCategoryName} - ${displayedTransaction.categoryName}`
      : displayedTransaction.categoryName;
  const amountColor = isInitialBalance
    ? initialBalancePrefix === '-' ? AppPalette.expense : AppPalette.income
    : isTransfer
      ? AppPalette.ink
      : isIncome
        ? AppPalette.income
        : AppPalette.expense;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      hardwareAccelerated
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}>
      <View style={[styles.modalRoot, { paddingBottom: bottomGap }]}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭账单详情"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: 12,
              transform: [{ translateY }],
            },
          ]}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关闭"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}>
              <ModalText style={styles.closeText}>×</ModalText>
            </Pressable>

            <View style={styles.headerActions}>
              {onDelete ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="删除账单"
                  accessibilityState={{ disabled: deleting }}
                  disabled={deleting}
                  hitSlop={8}
                  onPress={() => onDelete(displayedTransaction)}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    deleting && styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}>
                  <ModalText style={styles.deleteText}>{deleting ? '删除中' : '删除'}</ModalText>
                </Pressable>
              ) : null}
              {onEdit ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="修改账单"
                  disabled={deleting}
                  hitSlop={8}
                  onPress={() => onEdit(displayedTransaction)}
                  style={({ pressed }) => [
                    styles.editButton,
                    deleting && styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}>
                  <ModalText style={styles.editText}>修改</ModalText>
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces>
            <View style={styles.card}>
              <SectionTitle>分类</SectionTitle>
              <View style={styles.categoryRow}>
                <View style={styles.categoryIconBox}>
                  <CategoryIcon
                    icon={displayedTransaction.categoryIcon}
                    iconType={displayedTransaction.categoryIconType}
                    boxSize={42}
                    textStyle={styles.categoryIcon}
                  />
                </View>
                <View style={styles.categoryCopy}>
                  <ModalText style={styles.categoryName}>{categoryTitle}</ModalText>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <SectionTitle>账单</SectionTitle>
              <DetailRow
                label="金额"
                value={`${isInitialBalance ? initialBalancePrefix : ''}${formatCurrency(displayedTransaction.amountCents)}`}
                emphasized
                valueColor={amountColor}
              />
              <DetailRow label="时间" value={formatFullDateTime(displayedTransaction.occurredAt)} />
              <DetailRow label="账本" value="默认账本" />
            </View>

            {displayedTransaction.tags.length > 0 ? (
              <View style={styles.card}>
                <SectionTitle>标签</SectionTitle>
                <View style={styles.tags}>
                  {displayedTransaction.tags.map((tag) => (
                    <View key={tag.id} style={styles.tagPill}>
                      <ModalText style={styles.tagHash}>#</ModalText>
                      <ModalText style={styles.tagText}>{tag.name}</ModalText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <SectionTitle>资产</SectionTitle>
              <DetailRow
                label={isTransfer ? '转出账户' : '资产账户'}
                value={displayedTransaction.accountName}
              />
              {isTransfer ? (
                <DetailRow label="转入账户" value={displayedTransaction.transferAccountName ?? '-'} />
              ) : null}
              {displayedTransaction.feeCents > 0 ? (
                <DetailRow label="手续费" value={formatCurrency(displayedTransaction.feeCents)} />
              ) : null}
              {displayedTransaction.discountCents > 0 ? (
                <DetailRow label="优惠" value={formatCurrency(displayedTransaction.discountCents)} />
              ) : null}
            </View>

            {displayedTransaction.note ? (
              <View style={styles.card}>
                <SectionTitle>备注</SectionTitle>
                <ModalText style={styles.note}>{displayedTransaction.note}</ModalText>
              </View>
            ) : null}

            <ModalText style={styles.source}>-- 来源：手动记账 --</ModalText>
          </ScrollView>

          <View style={styles.grabber} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 10 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: AppPalette.overlay },
  sheet: {
    width: '100%',
    maxWidth: 720,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: AppPalette.canvas,
    shadowColor: '#101820',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -5 },
    elevation: 18,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: AppPalette.line,
    backgroundColor: AppPalette.surface,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppPalette.surfaceMuted,
  },
  closeText: { fontSize: 25, lineHeight: 27, color: '#7B858D', fontWeight: FontWeight.regular },
  deleteButton: {
    minWidth: 54,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: AppPalette.danger,
    backgroundColor: AppPalette.surface,
  },
  deleteText: { ...Type.subhead, color: AppPalette.danger, fontWeight: FontWeight.semibold },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editButton: {
    minWidth: 54,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppPalette.primary,
  },
  editText: { ...Type.subhead, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  buttonDisabled: { opacity: 0.45 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 10, paddingTop: 9, paddingBottom: 24, gap: 8 },
  card: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: AppPalette.surface,
    borderWidth: 1,
    borderColor: AppPalette.line,
    shadowColor: '#5F6870',
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  sectionAccent: { width: 4, height: 17, borderRadius: 2, backgroundColor: AppPalette.expense },
  sectionTitle: { ...Type.body, fontWeight: FontWeight.semibold },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F4',
  },
  categoryIcon: { ...Glyph.md },
  categoryCopy: { flex: 1, minWidth: 0, gap: 2 },
  categoryName: { ...Type.body, fontWeight: FontWeight.semibold },
  detailRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { ...Type.subhead, color: '#252B31', fontWeight: FontWeight.medium },
  detailValue: { flex: 1, ...Type.subhead, ...Numeric, color: '#252B31', textAlign: 'right' },
  detailValueEmphasized: { ...Type.headline, fontWeight: FontWeight.semibold },
  note: { ...Type.body, color: '#3E4850' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tagPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: AppPalette.surfaceMuted },
  tagHash: { ...Type.body, color: AppPalette.expense, fontWeight: FontWeight.bold },
  tagText: { ...Type.subhead, color: AppPalette.ink, fontWeight: FontWeight.medium },
  source: { ...Type.footnote, color: '#B7BDC2', textAlign: 'center', marginTop: 2 },
  grabber: {
    position: 'absolute',
    bottom: 7,
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D9DDDF',
  },
});

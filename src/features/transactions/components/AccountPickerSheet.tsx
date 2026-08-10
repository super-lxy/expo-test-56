import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { FontWeight, Glyph, Numeric, Type } from '@/constants/theme';
import { findBrandAssets } from '@/features/accounts/domain/account.brands';
import { findTemplate } from '@/features/accounts/domain/account.templates';
import type { AccountBalance } from '@/features/accounts/domain/account.types';
import { ElasticBoundaryScrollView } from '@/features/transactions/components/ElasticBoundaryScrollView';
import { formatCurrency } from '@/shared/utils/currency';

export type AccountPickerKind = 'source' | 'target';

const MAX_VISIBLE_ROWS = 6;
const ACCOUNT_ROW_HEIGHT = 66;
const SCREEN_HEIGHT = Dimensions.get('window').height;

function formatAccountBalance(cents: number) {
  const amount = formatCurrency(Math.abs(cents));
  return cents < 0 ? `-${amount}` : amount;
}

export function AccountPickerSheet({
  kind,
  displayKind,
  mounted,
  accounts,
  sourceAccountId,
  targetAccountId,
  transferMode,
  onClose,
  onClosed,
  onSelect,
}: {
  kind: AccountPickerKind | null;
  displayKind: AccountPickerKind;
  mounted: boolean;
  accounts: AccountBalance[];
  sourceAccountId: string;
  targetAccountId: string;
  transferMode: boolean;
  onClose: () => void;
  onClosed: () => void;
  onSelect: (kind: AccountPickerKind, accountId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [fade] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [sheetHeight, setSheetHeight] = useState(0);
  const bottomGap = Math.max(insets.bottom, 12);

  const activeKind = kind ?? displayKind;
  const title = activeKind === 'target'
    ? '选择转入账户'
    : transferMode
      ? '选择转出账户'
      : '选择账户';
  const selectedAccountId = activeKind === 'target' ? targetAccountId : sourceAccountId;
  const availableAccounts = activeKind === 'target'
    ? accounts.filter((account) => account.id !== sourceAccountId)
    : accounts;

  useEffect(() => {
    if (kind) {
      if (!sheetHeight) return;
      translateY.setValue(sheetHeight + bottomGap);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: (sheetHeight || SCREEN_HEIGHT) + bottomGap,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClosed();
    });
  }, [bottomGap, fade, kind, mounted, onClosed, sheetHeight, translateY]);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            if (next > 0 && next !== sheetHeight) setSheetHeight(next);
          }}
          style={[styles.sheet, { marginBottom: bottomGap, transform: [{ translateY }] }]}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} hitSlop={10} style={styles.sheetCloseBtn}>
              <ThemedText style={styles.sheetCloseText}>×</ThemedText>
            </Pressable>
            <ThemedText style={styles.sheetTitle}>{title}</ThemedText>
            <View style={styles.sheetCloseBtn} />
          </View>
          <ElasticBoundaryScrollView
            style={[
              styles.accountScroll,
              availableAccounts.length > MAX_VISIBLE_ROWS && { height: MAX_VISIBLE_ROWS * ACCOUNT_ROW_HEIGHT },
            ]}
            contentContainerStyle={styles.accountList}
            showsVerticalScrollIndicator={false}
            bounces
            alwaysBounceVertical={false}>
            {availableAccounts.map((account, index) => {
              const brand = findBrandAssets(account.type);
              const typeLabel = findTemplate(account.type)?.label ?? '其他';
              const basicInfo = account.name.trim();
              const displayName = basicInfo || typeLabel;
              const selected = account.id === selectedAccountId;
              return (
                <Pressable
                  key={account.id}
                  style={[
                    styles.accountRow,
                    index === availableAccounts.length - 1 && styles.accountRowLast,
                  ]}
                  onPress={() => onSelect(activeKind, account.id)}>
                  <View style={[styles.accountIconBox, !brand?.icon && { backgroundColor: `${account.color}22` }]}>
                    {brand?.icon ? (
                      <Image
                        source={brand.icon}
                        style={styles.accountIconImage}
                        contentFit={brand.iconFit ?? 'contain'}
                        contentPosition={brand.iconPosition ?? 'center'}
                      />
                    ) : (
                      <ThemedText style={styles.accountFallbackIcon}>{account.icon}</ThemedText>
                    )}
                  </View>
                  <View style={styles.accountCopy}>
                    <ThemedText style={styles.accountLabel} numberOfLines={1}>{displayName}</ThemedText>
                    <View style={styles.accountTypeBadge}>
                      <ThemedText style={styles.accountTypeText}>{typeLabel}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.accountTrailing}>
                    <ThemedText
                      style={[
                        styles.accountBalance,
                        account.balanceCents < 0 ? styles.negativeBalance : styles.positiveBalance,
                      ]}
                      numberOfLines={1}>
                      {formatAccountBalance(account.balanceCents)}
                    </ThemedText>
                    {selected ? <ThemedText style={styles.checkmark}>✓</ThemedText> : null}
                  </View>
                </Pressable>
              );
            })}
          </ElasticBoundaryScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(25, 28, 27, 0.38)' },
  sheet: {
    maxHeight: '78%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    paddingBottom: 8,
    shadowColor: '#1A1D1C',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F1F1' },
  sheetCloseBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { fontSize: 24, lineHeight: 26, fontWeight: FontWeight.regular, color: '#8C96A0' },
  sheetTitle: { flex: 1, ...Type.headline, fontWeight: FontWeight.semibold, textAlign: 'center' },
  accountScroll: { flexShrink: 1 },
  accountList: { paddingHorizontal: 18, paddingTop: 4 },
  accountRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#F0F1F1' },
  accountRowLast: { borderBottomWidth: 0 },
  accountIconBox: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F5F4' },
  accountIconImage: { width: 36, height: 36, borderRadius: 18 },
  accountFallbackIcon: { ...Glyph.md },
  accountCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 3 },
  accountLabel: { maxWidth: '100%', ...Type.body, fontWeight: FontWeight.semibold, color: '#2D332F' },
  accountTypeBadge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, backgroundColor: '#DDEFE1' },
  accountTypeText: { ...Type.caption, color: '#527A5B', fontWeight: FontWeight.medium },
  accountTrailing: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  accountBalance: { ...Type.body, ...Numeric, fontWeight: FontWeight.semibold, textAlign: 'right' },
  positiveBalance: { color: '#2B8B58' },
  negativeBalance: { color: '#D94B5B' },
  checkmark: { ...Type.subhead, fontWeight: FontWeight.semibold, color: '#3A6A8A' },
});

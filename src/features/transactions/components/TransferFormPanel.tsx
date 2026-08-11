import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontWeight, Numeric, Type } from '@/constants/theme';
import { findBrandAssets } from '@/features/accounts/domain/account.brands';
import { findTemplate } from '@/features/accounts/domain/account.templates';
import type { Account } from '@/features/accounts/domain/account.types';
import {
  EXTERNAL_TRANSFER_ACCOUNT_DESCRIPTION,
  EXTERNAL_TRANSFER_ACCOUNT_NAME,
} from '@/features/accounts/domain/systemAccounts';

export type TransferAdjustmentMode = 'fee' | 'discount';
const externalTransferCardAsset = require('../../../../assets/images/system/external-transfer-card.png');

function AccountField({
  account,
  external = false,
  placeholder,
  label,
  onPress,
}: {
  account?: Account;
  external?: boolean;
  placeholder: string;
  label: string;
  onPress: () => void;
}) {
  const brand = account && !external ? findBrandAssets(account.type) : undefined;
  const templateLabel = account && !external ? findTemplate(account.type)?.label : undefined;

  return (
    <View style={styles.accountLine}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.accountField, pressed && styles.pressed]}>
        <View style={[
          styles.accountIcon,
          external && styles.externalAccountIcon,
          !brand?.icon && account && !external ? { backgroundColor: `${account.color}18` } : null,
        ]}>
          {external ? (
            <Image
              key="external-transfer-account"
              source={externalTransferCardAsset}
              style={styles.externalAccountIconImage}
              contentFit="contain"
            />
          ) : brand?.icon ? (
            <Image
              key={`account-brand-${account?.id ?? account?.type ?? 'unknown'}`}
              source={brand.icon}
              style={styles.accountIconImage}
              contentFit={brand.iconFit ?? 'contain'}
              contentPosition={brand.iconPosition ?? 'center'}
            />
          ) : (
            <ThemedText style={styles.accountFallbackIcon}>{account?.icon ?? '▤'}</ThemedText>
          )}
        </View>
        <View style={styles.accountInfo}>
          <ThemedText style={[styles.accountName, !account && !external && styles.placeholder]} numberOfLines={1}>
            {external ? EXTERNAL_TRANSFER_ACCOUNT_NAME : account?.name ?? placeholder}
          </ThemedText>
          {external ? (
            <ThemedText style={styles.externalAccountDescription} numberOfLines={1}>
              {EXTERNAL_TRANSFER_ACCOUNT_DESCRIPTION}
            </ThemedText>
          ) : templateLabel ? (
            <ThemedText type="small" themeColor="textSecondary">{templateLabel}</ThemedText>
          ) : null}
        </View>
        <ThemedText style={styles.chevron}>›</ThemedText>
      </Pressable>
      <View style={styles.accountRole}>
        <ThemedText style={styles.accountRoleText}>{label}</ThemedText>
      </View>
    </View>
  );
}

export function TransferFormPanel({
  sourceAccount,
  targetAccount,
  sourceExternal = false,
  targetExternal = false,
  adjustmentMode,
  adjustmentAmount,
  onSelectSource,
  onSelectTarget,
  onAdjustmentModeChange,
  onAdjustmentPress,
}: {
  sourceAccount?: Account;
  targetAccount?: Account;
  sourceExternal?: boolean;
  targetExternal?: boolean;
  adjustmentMode: TransferAdjustmentMode;
  adjustmentAmount: string;
  onSelectSource: () => void;
  onSelectTarget: () => void;
  onAdjustmentModeChange: (mode: TransferAdjustmentMode) => void;
  onAdjustmentPress: () => void;
}) {
  const adjustmentLabel = adjustmentMode === 'fee' ? '手续费' : '优惠';

  return (
    <View style={styles.container}>
      <AccountField
        account={sourceAccount}
        external={sourceExternal}
        placeholder="选择转出账户"
        label="扣款账户"
        onPress={onSelectSource}
      />

      <View style={styles.directionRow}>
        <View style={styles.directionLine} />
        <View style={styles.directionPill}>
          <ThemedText style={styles.directionIcon}>⇄</ThemedText>
          <ThemedText style={styles.directionText}>转至</ThemedText>
        </View>
        <View style={styles.directionLine} />
      </View>

      <AccountField
        account={targetAccount}
        external={targetExternal}
        placeholder="选择转入账户"
        label="入款账户"
        onPress={onSelectTarget}
      />

      <View style={styles.adjustmentRow}>
        <Pressable
          onPress={onAdjustmentPress}
          style={({ pressed }) => [
            styles.adjustmentField,
            pressed && styles.pressed,
          ]}>
          <View style={styles.adjustmentIcon}><ThemedText style={styles.adjustmentIconText}>¥±</ThemedText></View>
          <View style={styles.adjustmentInfo}>
            <ThemedText type="small" themeColor="textSecondary">{adjustmentLabel}</ThemedText>
            <ThemedText style={styles.adjustmentAmount}>¥{adjustmentAmount || '0.00'}</ThemedText>
          </View>
        </Pressable>
        <View style={styles.modeControl}>
          {(['fee', 'discount'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => onAdjustmentModeChange(mode)}
              style={[styles.modeButton, adjustmentMode === mode && styles.modeButtonActive]}>
              <ThemedText style={[styles.modeText, adjustmentMode === mode && styles.modeTextActive]}>
                {mode === 'fee' ? '手续费' : '优惠'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.hintCard}>
        <ThemedText style={styles.hintIcon}>ⓘ</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
          {adjustmentMode === 'fee'
            ? '实际扣款 = 转账金额 + 手续费；转入账户收到完整转账金额。'
            : '实际扣款 = 转账金额 - 优惠；转入账户收到完整转账金额。'}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 8 },
  accountLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountField: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#F5F6F7' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  accountIcon: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  accountIconImage: { width: 32, height: 32, borderRadius: 16 },
  accountFallbackIcon: { fontSize: 17, color: '#7C858C' },
  externalAccountIcon: { backgroundColor: 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: 'rgba(91,96,104,0.08)' },
  externalAccountIconImage: { width: 27, height: 27 },
  externalAccountDescription: { ...Type.caption, color: '#89928C' },
  accountInfo: { flex: 1, minWidth: 0, gap: 1 },
  accountName: { ...Type.body, fontWeight: FontWeight.semibold },
  placeholder: { color: '#9AA2A8', fontWeight: FontWeight.medium },
  chevron: { fontSize: 22, color: '#A8AFB5' },
  accountRole: { minWidth: 74, alignItems: 'center', justifyContent: 'center', borderRadius: 17, paddingHorizontal: 9, paddingVertical: 11, backgroundColor: '#F2F3F4' },
  accountRoleText: { ...Type.body, fontWeight: FontWeight.semibold, color: '#353B40' },
  directionRow: { minHeight: 27, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 42, gap: 8 },
  directionLine: { flex: 1, height: 1, backgroundColor: '#E5E8EA' },
  directionPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: '#F5F6F7' },
  directionIcon: { fontSize: 15, color: '#59646D' },
  directionText: { ...Type.subhead, fontWeight: FontWeight.semibold },
  adjustmentRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 2 },
  adjustmentField: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 17, borderWidth: 1, borderColor: '#ECEEEF', paddingHorizontal: 11, backgroundColor: '#F7F8F8' },
  adjustmentIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  adjustmentIconText: { ...Type.subhead, fontWeight: FontWeight.bold, color: '#78838B' },
  adjustmentInfo: { flex: 1, gap: 1 },
  adjustmentAmount: { ...Type.body, ...Numeric, fontWeight: FontWeight.semibold },
  modeControl: { width: 108, flexDirection: 'row', borderRadius: 17, padding: 3, backgroundColor: '#F0F2F3' },
  modeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 5 },
  modeButtonActive: { backgroundColor: '#F9E9EF', borderColor: 'rgba(201,117,148,0.24)' },
  modeText: { ...Type.footnote, fontWeight: FontWeight.semibold, color: '#737D84' },
  modeTextActive: { color: '#B95F81' },
  hintCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#F6F7F8' },
  hintIcon: { ...Type.subhead, color: '#98A1A8', marginTop: 1 },
  hintText: { flex: 1, lineHeight: 18 },
});

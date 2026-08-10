import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { FontWeight, Type } from '@/constants/theme';
import { findBrandAssets } from '../domain/account.brands';
import type { AccountTemplate } from '../domain/account.templates';

const TEMPLATE_SYMBOLS: Record<string, SymbolViewProps['name']> = {
  cash: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
  bank: { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' },
  alipay: { ios: 'a.circle.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' },
  wechat: { ios: 'message.fill', android: 'chat_bubble', web: 'chat_bubble' },
  'transit-card': { ios: 'tram.fill', android: 'directions_transit', web: 'directions_transit' },
  'meal-card': { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  'shopping-card': { ios: 'ticket.fill', android: 'confirmation_number', web: 'confirmation_number' },
  'housing-fund': { ios: 'house.fill', android: 'home', web: 'home' },
  wallet: { ios: 'wallet.pass.fill', android: 'wallet', web: 'wallet' },
  'credit-card': { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  huabei: { ios: 'camera.macro', android: 'local_florist', web: 'local_florist' },
  baitiao: { ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' },
  'douyin-pay': { ios: 'music.note', android: 'music_note', web: 'music_note' },
  fund: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
  stock: { ios: 'chart.bar.fill', android: 'monitoring', web: 'monitoring' },
  deposit: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  receivable: { ios: 'person.2.fill', android: 'handshake', web: 'handshake' },
  payable: { ios: 'arrow.down.left.circle.fill', android: 'call_received', web: 'call_received' },
  other: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
};

const cardLayoutTransition = LinearTransition.springify().damping(22).stiffness(220);

export function AccountTemplateCard({
  template,
  onPress,
  index = 0,
}: {
  template: AccountTemplate;
  onPress: () => void;
  index?: number;
}) {
  const isLiability = template.kind === 'liability';
  const brand = findBrandAssets(template.id);
  const symbol = TEMPLATE_SYMBOLS[template.id] ?? TEMPLATE_SYMBOLS.other;

  return (
    <Animated.View
      entering={FadeInDown.duration(240).delay(Math.min(index * 35, 210))}
      layout={cardLayoutTransition}
      style={styles.cardShadow}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.icon}>
          {brand?.icon ? (
            <Image
              source={brand.icon}
              style={[
                styles.iconImage,
                brand.iconSize ? { width: brand.iconSize, height: brand.iconSize } : null,
              ]}
              contentFit={brand.iconFit ?? (brand.iconPosition === 'left' ? 'cover' : 'contain')}
              contentPosition={brand.iconPosition ?? 'center'}
            />
          ) : (
            <SymbolView name={symbol} size={24} tintColor={template.color} weight="semibold" />
          )}
        </View>
        <View style={styles.info}>
          <ThemedText style={styles.label}>{template.label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isLiability ? '负债' : '资产'}
          </ThemedText>
        </View>
        {brand?.mark ? (
          <Image
            pointerEvents="none"
            source={brand.mark}
            style={[
              styles.watermarkImage,
              {
                width: brand.markSize ?? 74,
                height: brand.markSize ?? 74,
                opacity: brand.markOpacity ?? 0.82,
                right: brand.markRight ?? -18,
                bottom: brand.markBottom ?? -22,
              },
            ]}
            contentFit={brand.markFit ?? (brand.markPosition === 'left' ? 'cover' : 'contain')}
            contentPosition={brand.markPosition ?? 'center'}
          />
        ) : (
          <SymbolView
            pointerEvents="none"
            name={symbol}
            size={68}
            tintColor={template.color}
            weight="bold"
            style={styles.watermarkSymbol}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardShadow: { borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#28343A', shadowOpacity: 0.04, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  card: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  icon: { zIndex: 1, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#F4F5F5' },
  iconImage: { width: 34, height: 34, borderRadius: 999 },
  info: { zIndex: 1, flex: 1, gap: 1 },
  label: { ...Type.headline, fontWeight: FontWeight.semibold },
  watermarkImage: { position: 'absolute', right: -18, bottom: -22, width: 74, height: 74, transform: [{ rotate: '-25deg' }] },
  watermarkSymbol: { position: 'absolute', right: -18, bottom: -22, width: 68, height: 68, opacity: 0.72, transform: [{ rotate: '-25deg' }] },
});

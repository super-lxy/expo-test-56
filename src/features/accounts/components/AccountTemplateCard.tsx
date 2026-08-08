import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontWeight, Glyph, Type } from '@/constants/theme';
import type { AccountTemplate } from '../domain/account.templates';

export function AccountTemplateCard({
  template,
  onPress,
}: {
  template: AccountTemplate;
  onPress: () => void;
}) {
  const isLiability = template.kind === 'liability';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: `${template.color}1A` }]}>
        <ThemedText style={styles.iconText}>{template.icon}</ThemedText>
      </View>
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.label}>{template.label}</ThemedText>
          <View style={[styles.badge, isLiability ? styles.badgeLiability : styles.badgeAsset]}>
            <ThemedText style={[styles.badgeText, isLiability ? styles.badgeTextLiability : styles.badgeTextAsset]}>
              {isLiability ? '负债' : '资产'}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{template.hint}</ThemedText>
      </View>
      <ThemedText style={styles.chevron}>›</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEDEF' },
  pressed: { opacity: 0.6 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText: { ...Glyph.md },
  info: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { ...Type.body, fontWeight: FontWeight.semibold },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeAsset: { backgroundColor: '#E3F3EA' },
  badgeLiability: { backgroundColor: '#FCE8E4' },
  badgeText: { ...Type.caption, fontWeight: FontWeight.semibold },
  badgeTextAsset: { color: '#1F8A5F' },
  badgeTextLiability: { color: '#C4432F' },
  chevron: { ...Glyph.md, color: '#C3CBD2', fontWeight: FontWeight.regular },
});

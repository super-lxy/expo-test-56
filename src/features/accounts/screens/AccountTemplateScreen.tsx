import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, FontWeight, Type } from '@/constants/theme';
import { AccountTemplateCard } from '../components/AccountTemplateCard';
import { TEMPLATE_GROUPS } from '../domain/account.templates';

export function AccountTemplateScreen() {
  const router = useRouter();
  const [activeKey, setActiveKey] = useState(TEMPLATE_GROUPS[0].key);
  const activeGroup = TEMPLATE_GROUPS.find((g) => g.key === activeKey) ?? TEMPLATE_GROUPS[0];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="返回">
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back_ios_new', web: 'arrow_back_ios_new' }}
              size={24}
              tintColor="#17212B"
            />
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBarWrap}
            contentContainerStyle={styles.tabBar}>
            {TEMPLATE_GROUPS.map((group) => (
              <Pressable
                key={group.key}
                onPress={() => setActiveKey(group.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeKey === group.key }}
                style={[styles.tab, activeKey === group.key && styles.tabActive]}>
                <ThemedText style={[styles.tabText, activeKey === group.key && styles.tabTextActive]}>
                  {group.label}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {activeGroup.templates.map((template, index) => (
            <AccountTemplateCard
              key={template.id}
              template={template}
              index={index}
              onPress={() => router.push({ pathname: '/accounts/new', params: { templateId: template.id } })}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { minHeight: 58, position: 'relative', flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  backButton: { position: 'absolute', left: 8, zIndex: 2, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabBarWrap: { flex: 1 },
  tabBar: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 50 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 15 },
  tabActive: { backgroundColor: AppPalette.primary },
  tabText: { ...Type.subhead, fontWeight: FontWeight.semibold, color: AppPalette.textMuted },
  tabTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 30, gap: 10 },
});

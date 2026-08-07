import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontWeight, Type } from '@/constants/theme';
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
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ThemedText style={styles.back}>‹</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>选择账户类型</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBarWrap}
          contentContainerStyle={styles.tabBar}>
          {TEMPLATE_GROUPS.map((group) => (
            <Pressable
              key={group.key}
              onPress={() => setActiveKey(group.key)}
              style={[styles.tab, activeKey === group.key && styles.tabActive]}>
              <ThemedText style={[styles.tabText, activeKey === group.key && styles.tabTextActive]}>
                {group.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {activeGroup.templates.map((template) => (
            <AccountTemplateCard
              key={template.id}
              template={template}
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
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { fontSize: 32, lineHeight: 34, fontWeight: FontWeight.regular, color: '#17212B' },
  title: { ...Type.headline, fontWeight: FontWeight.semibold },
  headerSpacer: { width: 22 },
  // flexGrow: 0 —— 否则横向 ScrollView 会抢占剩余垂直空间，把 tab 拉成竖条
  tabBarWrap: { flexGrow: 0, flexShrink: 0 },
  // alignItems: center —— 否则 row 容器默认 stretch，pill 会撑满整个高度
  tabBar: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingBottom: 10 },
  tab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F2F4' },
  tabActive: { backgroundColor: '#1C2128' },
  tabText: { ...Type.subhead, fontWeight: FontWeight.semibold, color: '#71808C' },
  tabTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 12, paddingBottom: 40, gap: 8 },
});

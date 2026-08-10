import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontWeight, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText style={styles.eyebrow} themeColor="textSecondary">偏好与管理</ThemedText>
          <ThemedText type="title" style={styles.title}>设置</ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.cardTitle}>本地账本</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">数据保存在当前设备，后续将加入导入导出功能。</ThemedText>
          </View>
          <Pressable onPress={() => router.push('/categories')} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.cardTitle}>分类管理</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">自定义大分类和具体用途</ThemedText>
          </Pressable>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.cardTitle}>关于</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">记账 App MVP · Expo SDK 56</ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  eyebrow: { ...Type.footnote, fontWeight: FontWeight.semibold, letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { marginBottom: Spacing.two },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: Spacing.four, gap: Spacing.one, borderWidth: 1, borderColor: '#E7EDF0', shadowColor: '#31414D', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardTitle: { ...Type.body, fontWeight: FontWeight.semibold },
});

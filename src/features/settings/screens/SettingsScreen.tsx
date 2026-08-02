import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText style={styles.title}>设置</ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.cardTitle}>本地账本</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">数据保存在当前设备，后续将加入导入导出功能。</ThemedText>
          </View>
          <Pressable onPress={() => router.push('/accounts')} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.cardTitle}>账户管理</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">管理微信、支付宝、银行卡和现金账户</ThemedText>
          </Pressable>
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
  content: { padding: Spacing.three, gap: Spacing.three },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '800' },
  card: { backgroundColor: '#F1F5F9', borderRadius: 20, padding: Spacing.four, gap: Spacing.one },
  cardTitle: { fontSize: 17, fontWeight: '800' },
});

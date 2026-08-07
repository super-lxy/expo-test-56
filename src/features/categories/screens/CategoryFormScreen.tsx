import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontWeight, Spacing, Type } from '@/constants/theme';
import { useCategoryRepository } from '@/features/transactions/hooks/useTransactions';
import { createCategory } from '../application/createCategory';
import type { CategoryType } from '../domain/category.types';

export function CategoryFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; parentId?: string; parentName?: string }>();
  const repository = useCategoryRepository();
  const [name, setName] = useState('');
  const type: CategoryType = params.type === 'income' ? 'income' : 'expense';
  const parentId = typeof params.parentId === 'string' ? params.parentId : null;
  const parentName = typeof params.parentName === 'string' ? params.parentName : null;

  async function handleSubmit() {
    try {
      await createCategory(repository, { name, type, parentId });
      router.back();
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}><ThemedText themeColor="textSecondary">取消</ThemedText></Pressable>
          <ThemedText style={styles.title}>{parentName ? '添加子分类' : '添加大分类'}</ThemedText>
          <Pressable onPress={() => void handleSubmit()}><ThemedText style={styles.save}>保存</ThemedText></Pressable>
        </View>
        <View style={styles.content}>
          <ThemedText style={styles.label}>分类名称</ThemedText>
          <TextInput value={name} onChangeText={setName} placeholder={parentName ? `例如：${parentName}下的具体用途` : '例如：宠物、旅行'} style={styles.input} />
          <ThemedText style={styles.label}>分类类型</ThemedText>
          <View style={styles.typeBadge}>
            <ThemedText>{type === 'expense' ? '支出分类' : '收入分类'}</ThemedText>
          </View>
          {parentName ? <ThemedText type="small" themeColor="textSecondary">所属大分类：{parentName}</ThemedText> : null}
          <Pressable onPress={() => void handleSubmit()} style={styles.submitButton}><ThemedText style={styles.submitText}>保存分类</ThemedText></Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  title: { ...Type.headline, fontWeight: FontWeight.semibold },
  save: { ...Type.body, color: '#167C80', fontWeight: FontWeight.semibold },
  content: { padding: Spacing.three, gap: Spacing.two },
  label: { ...Type.subhead, fontWeight: FontWeight.semibold, marginTop: Spacing.two },
  input: { borderWidth: 1, borderColor: '#D9E0E4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, ...Type.body, color: '#17212B' },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: '#DBEAFE', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10 },
  submitButton: { backgroundColor: '#2563EB', borderRadius: 16, alignItems: 'center', paddingVertical: 15, marginTop: Spacing.four },
  submitText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
});

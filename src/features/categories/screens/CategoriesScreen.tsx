import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategoryRepository } from '@/features/transactions/hooks/useTransactions';
import type { Category, CategoryType } from '../domain/category.types';

function CategoryTree({ categories, type, onAddChild }: { categories: Category[]; type: CategoryType; onAddChild: (category: Category) => void }) {
  const roots = categories.filter((category) => category.parentId === null);
  return (
    <View style={styles.tree}>
      {roots.map((root) => {
        const children = categories.filter((category) => category.parentId === root.id);
        return (
          <View key={root.id} style={styles.parentRow}>
            <View style={styles.parentHeader}>
              <ThemedText style={styles.parentName}>{root.icon} {root.name}</ThemedText>
              <Pressable onPress={() => onAddChild(root)}>
                <ThemedText type="small" style={styles.addChild}>＋ 子分类</ThemedText>
              </Pressable>
            </View>
            {children.length > 0 ? (
              <View style={styles.children}>
                {children.map((child) => <ThemedText key={child.id} type="small" themeColor="textSecondary">{child.icon} {child.name}</ThemedText>)}
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">暂时没有具体分类</ThemedText>
            )}
          </View>
        );
      })}
    </View>
  );
}

export function CategoriesScreen() {
  const router = useRouter();
  const repository = useCategoryRepository();
  const [type, setType] = useState<CategoryType>('expense');
  const [categories, setCategories] = useState<Category[]>([]);

  const refresh = useCallback(async () => {
    setCategories(await repository.listByType(type));
  }, [repository, type]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>分类</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">管理一级分类和具体用途</ThemedText>
            </View>
          </View>
          <View style={styles.switch}>
            <Pressable onPress={() => setType('expense')} style={[styles.switchButton, type === 'expense' && styles.expenseSelected]}><ThemedText>支出分类</ThemedText></Pressable>
            <Pressable onPress={() => setType('income')} style={[styles.switchButton, type === 'income' && styles.incomeSelected]}><ThemedText>收入分类</ThemedText></Pressable>
          </View>
          <CategoryTree
            categories={categories}
            type={type}
            onAddChild={(parent) => router.push({ pathname: '/categories/create', params: { type, parentId: parent.id, parentName: parent.name } })}
          />
        </ScrollView>
        {/* 固定底部：添加分类按钮 */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <Pressable
            onPress={() => router.push({ pathname: '/categories/create', params: { type } })}
            style={styles.addButton}>
            <ThemedText style={styles.addText}>添加分类</ThemedText>
          </Pressable>
        </SafeAreaView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: 100, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  bottomBar: { paddingHorizontal: Spacing.three, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: '#E7EDF0', backgroundColor: '#F5F7FA' },
  addButton: { backgroundColor: '#17212B', borderRadius: 16, alignItems: 'center', paddingVertical: 16 },
  addText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  switch: { flexDirection: 'row', backgroundColor: '#E8EEF2', padding: 4, borderRadius: 15 },
  switchButton: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12 },
  expenseSelected: { backgroundColor: '#FCE5DF' },
  incomeSelected: { backgroundColor: '#DDF3F0' },
  tree: { gap: Spacing.two },
  parentRow: { borderRadius: 18, backgroundColor: '#FFFFFF', padding: Spacing.three, gap: Spacing.two, borderWidth: 1, borderColor: '#E7EDF0' },
  parentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  parentName: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  addChild: { color: '#167C80', fontWeight: '700' },
  children: { paddingLeft: Spacing.two, gap: Spacing.two },
});

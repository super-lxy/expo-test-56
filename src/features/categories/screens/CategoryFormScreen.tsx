import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontWeight, Glyph, Type } from '@/constants/theme';
import { useCategoryRepository } from '@/features/transactions/hooks/useTransactions';
import { createCategory } from '../application/createCategory';
import { IconPicker } from '../components/IconPicker';
import { suggestIcons, textIcon } from '../domain/category.icons';
import type { CategoryType } from '../domain/category.types';

export function CategoryFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string; parentId?: string; parentName?: string; parentIcon?: string;
    // 编辑模式：传入已有分类的 id / name / icon
    categoryId?: string; existingName?: string; existingIcon?: string;
  }>();
  const repository = useCategoryRepository();

  const isEdit = typeof params.categoryId === 'string';
  const [name, setName] = useState(isEdit ? (params.existingName ?? '') : '');
  const [icon, setIcon] = useState(isEdit ? (params.existingIcon ?? '') : '');
  const [useTextIcon, setUseTextIcon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const type: CategoryType = params.type === 'income' ? 'income' : 'expense';
  const parentId = typeof params.parentId === 'string' ? params.parentId : null;
  const parentName = typeof params.parentName === 'string' ? params.parentName : null;
  const parentIcon = typeof params.parentIcon === 'string' ? params.parentIcon : undefined;

  // 开关打开时取名称首字；否则用手选的图标，未选则跟着名称推荐
  const effectiveIcon = useTextIcon
    ? textIcon(name)
    : icon || (suggestIcons(name, parentIcon)[0] ?? '📌');
  const canSubmit = Boolean(name.trim()) && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      if (isEdit && params.categoryId) {
        await repository.update(params.categoryId, { name, icon: effectiveIcon });
      } else {
        await createCategory(repository, { name, type, parentId, icon: effectiveIcon });
      }
      router.back();
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ThemedText style={styles.back}>‹</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>
            {isEdit ? '编辑分类' : parentName ? '添加子分类' : '添加大分类'}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>{parentName ? '一级分类' : '分类类型'}</ThemedText>
              <ThemedText style={styles.fieldValue}>
                {parentName ?? (type === 'expense' ? '支出分类' : '收入分类')}
              </ThemedText>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>分类名称</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="请输入"
                placeholderTextColor="#B4BCC3"
                style={styles.nameInput}
                textAlign="right"
                maxLength={12}
              />
              <View style={styles.previewIconBox}>
                <ThemedText style={effectiveIcon.length > 1 ? styles.previewTextIcon : styles.previewIcon}>
                  {effectiveIcon}
                </ThemedText>
              </View>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>文字作为图标</ThemedText>
              <Switch
                value={useTextIcon}
                onValueChange={setUseTextIcon}
                trackColor={{ false: '#DDE3E8', true: '#167C80' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.noteBox}>
            <ThemedText type="small" themeColor="textSecondary">
              {useTextIcon
                ? '将使用分类名称的首字作为图标显示。'
                : '选择一个图标，或打开上方开关直接用名称首字。图标会跟随所属大类的颜色。'}
            </ThemedText>
          </View>

          {!useTextIcon ? (
            <View style={styles.pickerCard}>
              <IconPicker value={effectiveIcon} onChange={setIcon} name={name} parentIcon={parentIcon} />
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={!canSubmit}
            style={({ pressed }) => [styles.submitButton, !canSubmit && styles.submitDisabled, pressed && styles.submitPressed]}>
            <ThemedText style={styles.submitText}>保存</ThemedText>
          </Pressable>
        </View>
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
  content: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20, gap: 12 },
  card: { borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEDEF', paddingHorizontal: 14 },
  field: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fieldDivider: { height: 1, backgroundColor: '#F0F1F2' },
  fieldLabel: { ...Type.body, color: '#4A5560' },
  fieldValue: { flex: 1, ...Type.body, fontWeight: FontWeight.medium, textAlign: 'right' },
  nameInput: { flex: 1, ...Type.body, color: '#17212B', paddingVertical: 8 },
  previewIconBox: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#F4F5F4', alignItems: 'center', justifyContent: 'center' },
  previewIcon: { ...Glyph.md },
  // 文字图标用较小字号，两个拉丁字母也要能放进 34px 的方格
  previewTextIcon: { ...Type.footnote, fontWeight: FontWeight.semibold, color: '#4A5560' },
  noteBox: { borderRadius: 12, backgroundColor: '#F0F2F4', paddingHorizontal: 12, paddingVertical: 10 },
  pickerCard: { borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEDEF', paddingHorizontal: 12, paddingVertical: 14 },
  footer: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  submitButton: { backgroundColor: '#167C80', borderRadius: 16, alignItems: 'center', paddingVertical: 16 },
  submitDisabled: { opacity: 0.4 },
  submitPressed: { opacity: 0.85 },
  submitText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
});

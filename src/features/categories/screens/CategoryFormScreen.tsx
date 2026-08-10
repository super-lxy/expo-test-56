import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontWeight, Type } from '@/constants/theme';
import { useCategoryRepository } from '@/features/transactions/hooks/useTransactions';
import { createCategory } from '../application/createCategory';
import { CategoryIcon } from '../components/CategoryIcon';
import { IconPicker } from '../components/IconPicker';
import { prepareCategoryIcon } from '../data/categoryIconStorage';
import { suggestIcons } from '../domain/category.icons';
import type { CategoryIconType, CategoryType } from '../domain/category.types';

export function CategoryFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string; parentId?: string; parentName?: string; parentIcon?: string;
    categoryId?: string;
  }>();
  const repository = useCategoryRepository();
  const insets = useSafeAreaInsets();

  const categoryId = typeof params.categoryId === 'string' ? params.categoryId : null;
  const isEdit = categoryId !== null;
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [iconType, setIconType] = useState<CategoryIconType>('emoji');
  const [iconBlob, setIconBlob] = useState<Uint8Array | null>(null);
  const [iconMime, setIconMime] = useState<string | null>(null);
  const [imageNeedsProcessing, setImageNeedsProcessing] = useState(false);
  const [customSheetVisible, setCustomSheetVisible] = useState(false);
  const [customDraft, setCustomDraft] = useState<string | null>(null);
  const [customDraftChanged, setCustomDraftChanged] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const type: CategoryType = params.type === 'income' ? 'income' : 'expense';
  const parentId = typeof params.parentId === 'string' ? params.parentId : null;
  const parentName = typeof params.parentName === 'string' ? params.parentName : null;
  const parentEmoji = typeof params.parentIcon === 'string' ? params.parentIcon : undefined;

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    void repository.getById(categoryId).then((category) => {
      if (cancelled || !category) return;
      setName(category.name);
      setIcon(category.icon);
      setIconType(category.iconType);
      setIconBlob(category.iconBlob);
      setIconMime(category.iconMime);
      setImageNeedsProcessing(false);
      setCustomDraft(category.iconType === 'image' ? category.icon : null);
    });
    return () => { cancelled = true; };
  }, [categoryId, repository]);

  const effectiveIcon = iconType === 'image' && icon
    ? icon
    : icon || (suggestIcons(name, parentEmoji)[0] ?? '📌');
  const canSubmit = Boolean(name.trim()) && !isSubmitting;

  function openCustomSheet() {
    setCustomDraft(iconType === 'image' ? icon : null);
    setCustomDraftChanged(false);
    setCustomSheetVisible(true);
  }

  async function pickCustomImage() {
    if (isPickingImage) return;
    setIsPickingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        shape: 'rectangle',
        quality: 1,
      });
      if (!result.canceled) {
        setCustomDraft(result.assets[0].uri);
        setCustomDraftChanged(true);
      }
    } catch (error) {
      Alert.alert('无法选择图片', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setIsPickingImage(false);
    }
  }

  function confirmCustomImage() {
    if (!customDraft) return;
    setIcon(customDraft);
    setIconType('image');
    if (customDraftChanged) {
      setIconBlob(null);
      setIconMime(null);
      setImageNeedsProcessing(true);
    }
    setCustomSheetVisible(false);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      let savedIcon = effectiveIcon;
      let savedIconBlob = iconType === 'image' ? iconBlob : null;
      let savedIconMime = iconType === 'image' ? iconMime : null;
      if (iconType === 'image' && imageNeedsProcessing) {
        const prepared = await prepareCategoryIcon(effectiveIcon);
        savedIcon = prepared.previewUri;
        savedIconBlob = prepared.data;
        savedIconMime = prepared.mime;
      }
      if (categoryId) {
        await repository.update(categoryId, {
          name,
          icon: savedIcon,
          iconType,
          iconBlob: savedIconBlob,
          iconMime: savedIconMime,
        });
      } else {
        await createCategory(repository, {
          name,
          type,
          parentId,
          icon: savedIcon,
          iconType,
          iconBlob: savedIconBlob,
          iconMime: savedIconMime,
        });
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
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerSide}>
            <ThemedText style={styles.back}>‹</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>
            {isEdit ? '编辑分类' : parentName ? '添加子分类' : '添加大分类'}
          </ThemedText>
          <Pressable onPress={openCustomSheet} style={[styles.headerSide, styles.customButton]}>
            <ThemedText style={styles.customButtonIcon}>▣</ThemedText>
            <ThemedText style={styles.customButtonText}>自定义</ThemedText>
          </Pressable>
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
                <CategoryIcon icon={effectiveIcon} iconType={iconType} imageSize={28} textStyle={styles.previewIcon} />
              </View>
            </View>
          </View>

          <View style={styles.noteBox}>
            <ThemedText type="small" themeColor="textSecondary">
              支持 Emoji 和自定义图片两种图标。图片会统一处理后保存在数据库中，迁移数据库即可带走。
            </ThemedText>
          </View>

          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <ThemedText style={styles.pickerTitle}>Emoji 图标</ThemedText>
              <ThemedText style={styles.pickerMode}>{iconType === 'image' ? '当前：自定义图片' : '当前：Emoji'}</ThemedText>
            </View>
            <IconPicker
              value={iconType === 'emoji' ? effectiveIcon : ''}
              onChange={(nextIcon) => {
                setIcon(nextIcon);
                setIconType('emoji');
                setIconBlob(null);
                setIconMime(null);
                setImageNeedsProcessing(false);
              }}
              name={name}
              parentIcon={parentEmoji}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={!canSubmit}
            style={({ pressed }) => [styles.submitButton, !canSubmit && styles.submitDisabled, pressed && styles.submitPressed]}>
            <ThemedText style={styles.submitText}>保存</ThemedText>
          </Pressable>
        </View>

        <Modal
          visible={customSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCustomSheetVisible(false)}>
          <View style={styles.customModalRoot}>
            <Pressable style={styles.customBackdrop} onPress={() => setCustomSheetVisible(false)} />
            <View style={[styles.customSheet, { marginBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.customSheetHeader}>
                <Pressable onPress={() => setCustomSheetVisible(false)} style={styles.customCloseButton}>
                  <ThemedText style={styles.customCloseText}>×</ThemedText>
                </Pressable>
                <ThemedText style={styles.customSheetTitle}>自定义图片</ThemedText>
                <View style={styles.customHeaderSpacer} />
              </View>

              <Pressable onPress={() => void pickCustomImage()} style={styles.customPreview}>
                {customDraft ? (
                  <CategoryIcon icon={customDraft} iconType="image" imageSize={144} />
                ) : (
                  <View style={styles.customPlaceholder}>
                    <ThemedText style={styles.customPlaceholderPlus}>＋</ThemedText>
                    <ThemedText style={styles.customPlaceholderText}>选择图片</ThemedText>
                  </View>
                )}
                <View style={styles.changeImageBar}>
                  <ThemedText style={styles.changeImageText}>
                    {isPickingImage ? '正在打开…' : customDraft ? '更换图片' : '选择图片'}
                  </ThemedText>
                </View>
              </Pressable>

              <ThemedText type="small" themeColor="textSecondary" style={styles.customHint}>
                支持从相册选择 PNG、JPG 等图片，选择后会进入 1:1 裁剪。
              </ThemedText>

              <Pressable
                disabled={!customDraft || isPickingImage}
                onPress={confirmCustomImage}
                style={[styles.confirmCustomButton, (!customDraft || isPickingImage) && styles.confirmCustomDisabled]}>
                <ThemedText style={styles.confirmCustomText}>确认使用</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  headerSide: { width: 74, minHeight: 34, flexDirection: 'row', alignItems: 'center' },
  back: { fontSize: 32, lineHeight: 34, fontWeight: FontWeight.regular, color: '#17212B' },
  title: { ...Type.headline, fontWeight: FontWeight.semibold },
  customButton: { justifyContent: 'flex-end', gap: 5, borderRadius: 17, paddingHorizontal: 8, backgroundColor: '#EEF1F2' },
  customButtonIcon: { ...Type.subhead, color: '#167C80' },
  customButtonText: { ...Type.subhead, fontWeight: FontWeight.semibold, color: '#37434B' },
  content: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20, gap: 12 },
  card: { borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEDEF', paddingHorizontal: 14 },
  field: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fieldDivider: { height: 1, backgroundColor: '#F0F1F2' },
  fieldLabel: { ...Type.body, color: '#4A5560' },
  fieldValue: { flex: 1, ...Type.body, fontWeight: FontWeight.medium, textAlign: 'right' },
  nameInput: { flex: 1, ...Type.body, color: '#17212B', paddingVertical: 8 },
  previewIconBox: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#F1F3F4', alignItems: 'center', justifyContent: 'center' },
  previewIcon: { fontSize: 18, lineHeight: 23 },
  noteBox: { borderRadius: 12, backgroundColor: '#F0F2F4', paddingHorizontal: 12, paddingVertical: 10 },
  pickerCard: { borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEDEF', paddingHorizontal: 12, paddingVertical: 14 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pickerTitle: { ...Type.body, fontWeight: FontWeight.semibold },
  pickerMode: { ...Type.footnote, color: '#8A949C' },
  footer: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  submitButton: { backgroundColor: '#167C80', borderRadius: 16, alignItems: 'center', paddingVertical: 16 },
  submitDisabled: { opacity: 0.4 },
  submitPressed: { opacity: 0.85 },
  submitText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  customModalRoot: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12 },
  customBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20, 26, 30, 0.42)' },
  customSheet: { borderRadius: 24, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, backgroundColor: '#FFFFFF', alignItems: 'center', shadowColor: '#1A1D1C', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  customSheetHeader: { alignSelf: 'stretch', minHeight: 42, flexDirection: 'row', alignItems: 'center' },
  customCloseButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F3' },
  customHeaderSpacer: { width: 38, height: 38 },
  customCloseText: { fontSize: 26, lineHeight: 29, color: '#8B949B', fontWeight: FontWeight.regular },
  customSheetTitle: { flex: 1, ...Type.title, fontWeight: FontWeight.semibold, textAlign: 'center' },
  customPreview: { width: 164, height: 184, marginTop: 22, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F5' },
  customPlaceholder: { alignItems: 'center', gap: 2 },
  customPlaceholderPlus: { ...Type.display, color: '#99A2A9' },
  customPlaceholderText: { ...Type.subhead, color: '#8A949C' },
  changeImageBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(28, 33, 40, 0.58)' },
  changeImageText: { ...Type.body, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  customHint: { marginTop: 14, textAlign: 'center' },
  confirmCustomButton: { alignSelf: 'stretch', marginTop: 18, borderRadius: 18, alignItems: 'center', paddingVertical: 15, backgroundColor: '#A8DDB1' },
  confirmCustomDisabled: { opacity: 0.42 },
  confirmCustomText: { ...Type.headline, color: '#17212B', fontWeight: FontWeight.semibold },
});

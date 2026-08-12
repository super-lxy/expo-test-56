import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, FontWeight, Type } from '@/constants/theme';
import { useTagGroups } from '../hooks/useTags';
import type { Tag, TagGroup, TagScope } from '../domain/tag.types';

type EditorState =
  | { kind: 'group'; group?: TagGroup }
  | { kind: 'tag'; group: TagGroup; tag?: Tag };

type ActionTarget =
  | { kind: 'group'; group: TagGroup }
  | { kind: 'tag'; group: TagGroup; tag: Tag };

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function TagsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<TagScope>('common');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [lastActionTarget, setLastActionTarget] = useState<ActionTarget | null>(null);
  const [actionSheetMounted, setActionSheetMounted] = useState(false);
  const [actionSheetHeight, setActionSheetHeight] = useState(0);
  const [actionFade] = useState(() => new Animated.Value(0));
  const [actionTranslateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const pendingEditorRef = useRef<EditorState | null>(null);
  const { groups, loading, refresh, repository } = useTagGroups(scope);
  const bottomGap = Math.max(insets.bottom, 12);
  const displayedActionTarget = actionTarget ?? lastActionTarget;

  const visibleGroups = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return groups;
    return groups
      .map((group) => ({
        ...group,
        tags: group.name.toLocaleLowerCase().includes(keyword)
          ? group.tags
          : group.tags.filter((tag) => tag.name.toLocaleLowerCase().includes(keyword)),
      }))
      .filter((group) => group.name.toLocaleLowerCase().includes(keyword) || group.tags.length > 0);
  }, [groups, query]);

  useEffect(() => {
    if (actionTarget) {
      if (!actionSheetHeight) return;
      actionTranslateY.setValue(actionSheetHeight + bottomGap);
      Animated.parallel([
        Animated.timing(actionFade, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(actionTranslateY, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (!actionSheetMounted) return;
    Animated.parallel([
      Animated.timing(actionFade, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(actionTranslateY, {
        toValue: (actionSheetHeight || SCREEN_HEIGHT) + bottomGap,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setActionSheetMounted(false);
      const pendingEditor = pendingEditorRef.current;
      pendingEditorRef.current = null;
      if (pendingEditor) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => openEditor(pendingEditor));
        });
      }
    });
  }, [actionFade, actionSheetHeight, actionSheetMounted, actionTarget, actionTranslateY, bottomGap]);

  function openEditor(nextEditor: EditorState) {
    setEditor(nextEditor);
    setDraftName(nextEditor.kind === 'group' ? nextEditor.group?.name ?? '' : nextEditor.tag?.name ?? '');
  }

  function openActionSheet(target: ActionTarget) {
    setLastActionTarget(target);
    setActionSheetMounted(true);
    setActionTarget(target);
  }

  function editFromActionSheet(target: ActionTarget) {
    pendingEditorRef.current = target.kind === 'group'
      ? { kind: 'group', group: target.group }
      : { kind: 'tag', group: target.group, tag: target.tag };
    setActionTarget(null);
  }

  async function saveEditor(continueAdding = false) {
    if (!editor || saving) return;
    setSaving(true);
    try {
      if (editor.kind === 'group') {
        if (editor.group) await repository.updateGroup(editor.group.id, draftName);
        else await repository.createGroup(draftName, scope);
      } else if (editor.tag) {
        await repository.updateTag(editor.tag.id, draftName);
      } else {
        await repository.createTag(editor.group.id, draftName);
      }
      await refresh();
      if (continueAdding && !(editor.kind === 'group' && editor.group) && !(editor.kind === 'tag' && editor.tag)) {
        setDraftName('');
      } else {
        setEditor(null);
      }
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  function confirmArchive(target: TagGroup | Tag, kind: 'group' | 'tag') {
    Alert.alert(
      kind === 'group' ? '删除类别' : '删除标签',
      kind === 'group'
        ? `删除“${target.name}”后，其中的标签会从所有账单中移除，账单本身仍会保留。`
        : `删除“${target.name}”后，它会从所有账单中移除，账单本身仍会保留。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const action = kind === 'group'
              ? repository.archiveGroup(target.id)
              : repository.archiveTag(target.id);
            void action.then(refresh).catch((error) => {
              Alert.alert('无法删除', error instanceof Error ? error.message : '请稍后重试');
            });
          },
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F8F8" />
      <AppBackground />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
            <ThemedText style={styles.back}>‹</ThemedText>
          </Pressable>
          <View style={styles.scopeTabs}>
            <Pressable onPress={() => setScope('common')} style={[styles.scopeTab, scope === 'common' && styles.scopeTabActive]}>
              <ThemedText style={[styles.scopeText, scope === 'common' && styles.scopeTextActive]}>通用</ThemedText>
            </Pressable>
            <Pressable onPress={() => setScope('ledger')} style={[styles.scopeTab, scope === 'ledger' && styles.scopeTabActive]}>
              <ThemedText style={[styles.scopeText, scope === 'ledger' && styles.scopeTextActive]}>账本独立</ThemedText>
            </Pressable>
          </View>
          <View style={styles.backButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <View style={styles.infoTitleRow}>
              <View style={styles.hashBox}><ThemedText style={styles.hash}>#</ThemedText></View>
              <ThemedText style={styles.infoTitle}>标签</ThemedText>
              <View style={styles.helpPill}><ThemedText style={styles.helpText}>帮助</ThemedText></View>
            </View>
            <View style={styles.descriptionBox}>
              <ThemedText style={styles.infoIcon}>ⓘ</ThemedText>
              <ThemedText style={styles.description}>
                标签可用于区分哪个人花的钱，或哪个电商平台购买的物品。例如：类别“电商”，标签“淘宝、京东”；类别“人员”，标签“妹妹、姐姐、哥哥”。{scope === 'common' ? '通用标签全部账本都可用。' : '账本独立标签只在当前账本内显示。'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.searchBox}>
            <ThemedText style={styles.searchIcon}>⌕</ThemedText>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="搜索标签"
              placeholderTextColor={AppPalette.textFaint}
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>

          {visibleGroups.map((group) => (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={styles.groupNameRow}>
                  <View style={styles.groupMark} />
                  <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                </View>
                <Pressable
                  onPress={() => openActionSheet({ kind: 'group', group })}
                  style={styles.editPill}>
                  <ThemedText style={styles.editText}>编辑</ThemedText>
                </Pressable>
              </View>
              <View style={styles.tagRow}>
                {group.tags.map((tag) => (
                  <Pressable
                    key={tag.id}
                    onPress={() => openActionSheet({ kind: 'tag', group, tag })}
                    style={styles.tagPill}>
                    <ThemedText style={styles.tagHash}>#</ThemedText>
                    <ThemedText style={styles.tagName}>{tag.name}</ThemedText>
                  </Pressable>
                ))}
                <Pressable onPress={() => openEditor({ kind: 'tag', group })} style={styles.addTagPill}>
                  <ThemedText style={styles.addTagText}>＋</ThemedText>
                </Pressable>
              </View>
            </View>
          ))}

          {!loading && visibleGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyTitle}>{query ? '没有匹配的标签' : '还没有标签类别'}</ThemedText>
              <ThemedText style={styles.emptyCopy}>{query ? '换个关键词试试' : '先添加类别，再把标签归类整理'}</ThemedText>
            </View>
          ) : null}
        </ScrollView>

        {!actionSheetMounted && editor === null ? (
          <Pressable onPress={() => openEditor({ kind: 'group' })} style={styles.addCategoryButton}>
            <ThemedText style={styles.addCategoryText}>添加类别</ThemedText>
          </Pressable>
        ) : null}

        <Modal visible={editor !== null} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditor(null)} />
            <View style={styles.editorSheet}>
              <View style={styles.editorHeader}>
                <Pressable onPress={() => setEditor(null)} style={styles.closeButton}>
                  <ThemedText style={styles.closeText}>×</ThemedText>
                </Pressable>
                <ThemedText style={styles.editorTitle}>
                  {editor?.kind === 'group'
                    ? editor.group ? '编辑类别' : '添加类别'
                    : editor?.tag ? '编辑标签' : '添加标签'}
                </ThemedText>
              </View>
              {editor?.kind === 'tag' ? (
                <View style={styles.categoryField}>
                  <ThemedText style={styles.fieldCaption}>类别</ThemedText>
                  <ThemedText style={styles.categoryValue}>{editor.group.name}</ThemedText>
                  <ThemedText style={styles.categoryGlyph}>{editor.group.name.slice(0, 1)}</ThemedText>
                </View>
              ) : null}
              <TextInput
                autoFocus
                value={draftName}
                onChangeText={setDraftName}
                placeholder={editor?.kind === 'group' ? '类别名称' : '标签名称'}
                placeholderTextColor={AppPalette.textMuted}
                style={styles.nameInput}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={() => void saveEditor()}
              />
              <View style={styles.editorActions}>
                <Pressable
                  disabled={saving}
                  onPress={() => void saveEditor()}
                  style={[
                    styles.saveButton,
                    (editor?.kind === 'group' ? !editor.group : !editor?.tag)
                      ? styles.saveButtonSecondary
                      : styles.saveButtonPrimary,
                  ]}>
                  <ThemedText style={[
                    styles.saveText,
                    (editor?.kind === 'group' ? !editor.group : !editor?.tag)
                      ? styles.saveTextSecondary
                      : styles.saveTextPrimary,
                  ]}>{saving ? '保存中…' : '保存'}</ThemedText>
                </Pressable>
                {!((editor?.kind === 'group' && editor.group) || (editor?.kind === 'tag' && editor.tag)) ? (
                  <Pressable disabled={saving} onPress={() => void saveEditor(true)} style={styles.saveAgainButton}>
                    <ThemedText style={[styles.saveText, styles.saveTextPrimary]}>再次保存</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={actionSheetMounted}
          transparent
          animationType="none"
          onRequestClose={() => setActionTarget(null)}>
          <View style={styles.actionModalRoot}>
            <Animated.View style={[styles.actionBackdrop, { opacity: actionFade }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setActionTarget(null)} />
            </Animated.View>
            {displayedActionTarget ? (
              <View style={styles.actionSheetWrap}>
                <Animated.View
                  onLayout={(event) => {
                    const nextHeight = event.nativeEvent.layout.height;
                    if (nextHeight > 0 && nextHeight !== actionSheetHeight) setActionSheetHeight(nextHeight);
                  }}
                  style={[
                    styles.actionSheet,
                    { marginBottom: bottomGap },
                    { transform: [{ translateY: actionTranslateY }] },
                  ]}>
                <View style={styles.actionHeader}>
                  <View style={styles.actionIconBox}><ThemedText style={styles.actionIcon}>#</ThemedText></View>
                  <View style={styles.actionTitleCopy}>
                    <ThemedText style={styles.actionTitle} numberOfLines={1}>
                      {displayedActionTarget.kind === 'group'
                        ? displayedActionTarget.group.name
                        : displayedActionTarget.tag.name}
                    </ThemedText>
                    {displayedActionTarget.kind === 'tag' ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {displayedActionTarget.group.name}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable onPress={() => setActionTarget(null)} hitSlop={10} style={styles.actionClose}>
                    <ThemedText style={styles.actionCloseText}>×</ThemedText>
                  </Pressable>
                </View>
                <Pressable style={styles.actionRow} onPress={() => editFromActionSheet(displayedActionTarget)}>
                  <View style={styles.actionRowCopy}>
                    <ThemedText style={styles.actionRowTitle}>
                      {displayedActionTarget.kind === 'group' ? '编辑类别' : '编辑标签'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      修改「{displayedActionTarget.kind === 'group'
                        ? displayedActionTarget.group.name
                        : displayedActionTarget.tag.name}」的名称
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.actionChevron}>›</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.actionRow, styles.actionDeleteRow]}
                  onPress={() => {
                    const target = displayedActionTarget;
                    setActionTarget(null);
                    confirmArchive(target.kind === 'group' ? target.group : target.tag, target.kind);
                  }}>
                  <View style={styles.actionRowCopy}>
                    <ThemedText style={[styles.actionRowTitle, styles.actionDeleteTitle]}>
                      {displayedActionTarget.kind === 'group' ? '删除类别' : '删除标签'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.actionDeleteHint}>账单保留，标签关联会移除</ThemedText>
                  </View>
                </Pressable>
                </Animated.View>
              </View>
            ) : null}
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  safeArea: { flex: 1 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  backButton: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 32, lineHeight: 34, color: '#111827', fontWeight: FontWeight.regular },
  scopeTabs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scopeTab: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 16 },
  scopeTabActive: { backgroundColor: AppPalette.primary },
  scopeText: { ...Type.body, fontWeight: FontWeight.semibold },
  scopeTextActive: { color: '#FFFFFF' },
  content: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 76, gap: 8 },
  infoCard: { borderRadius: 16, padding: 12, gap: 8, backgroundColor: AppPalette.surface, borderWidth: 1, borderColor: AppPalette.line, shadowColor: AppPalette.shadow, shadowOpacity: 0.045, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hashBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: AppPalette.surfaceMuted },
  hash: { fontSize: 24, lineHeight: 28, fontWeight: FontWeight.medium },
  infoTitle: { ...Type.headline, fontWeight: FontWeight.semibold, flex: 1 },
  helpPill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: AppPalette.surfaceMuted },
  helpText: { ...Type.footnote, color: AppPalette.textMuted },
  descriptionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: AppPalette.surfaceMuted },
  infoIcon: { ...Type.subhead, color: AppPalette.textMuted },
  description: { ...Type.footnote, color: AppPalette.textMuted, flex: 1 },
  searchBox: { height: 42, flexDirection: 'row', alignItems: 'center', borderRadius: 13, paddingHorizontal: 12, gap: 8, backgroundColor: AppPalette.surfaceMuted, borderWidth: 1, borderColor: AppPalette.line },
  searchIcon: { fontSize: 20, lineHeight: 24, color: AppPalette.ink, transform: [{ rotate: '-20deg' }] },
  searchInput: { flex: 1, ...Type.body, color: AppPalette.ink, paddingVertical: 0 },
  groupCard: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, gap: 8, backgroundColor: AppPalette.surface, borderWidth: 1, borderColor: '#E7EDF0' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  groupMark: { width: 4, height: 17, borderRadius: 2, backgroundColor: AppPalette.expense },
  groupName: { ...Type.body, fontWeight: FontWeight.semibold },
  editPill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: AppPalette.surfaceMuted },
  editText: { ...Type.footnote, color: AppPalette.textMuted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  tagPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: AppPalette.surfaceMuted },
  tagHash: { ...Type.body, color: AppPalette.expense, fontWeight: FontWeight.bold },
  tagName: { ...Type.subhead, fontWeight: FontWeight.medium },
  addTagPill: { minWidth: 48, alignItems: 'center', borderRadius: 12, paddingVertical: 4, backgroundColor: AppPalette.surfaceMuted },
  addTagText: { ...Type.body, fontWeight: FontWeight.medium },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 5 },
  emptyTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  emptyCopy: { ...Type.body, color: AppPalette.textMuted },
  addCategoryButton: { position: 'absolute', left: 24, right: 24, bottom: 10, alignItems: 'center', paddingVertical: 14, borderRadius: 18, backgroundColor: AppPalette.primary },
  addCategoryText: { ...Type.body, color: AppPalette.surface, fontWeight: FontWeight.semibold },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: AppPalette.overlay },
  editorSheet: { width: '100%', maxWidth: 420, borderRadius: 20, padding: 14, backgroundColor: AppPalette.surface, shadowColor: '#1A1D1C', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  editorHeader: { minHeight: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  closeButton: { position: 'absolute', left: 0, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: AppPalette.surfaceMuted },
  closeText: { fontSize: 24, lineHeight: 27, color: AppPalette.textMuted, fontWeight: FontWeight.regular },
  editorTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  categoryField: { minHeight: 46, justifyContent: 'center', borderRadius: 14, paddingHorizontal: 12, backgroundColor: AppPalette.surfaceMuted, marginBottom: 10 },
  fieldCaption: { ...Type.caption, color: AppPalette.textMuted, position: 'absolute', top: -18, left: 11 },
  categoryValue: { ...Type.body, fontWeight: FontWeight.medium },
  categoryGlyph: { position: 'absolute', right: 13, ...Type.headline, fontWeight: FontWeight.semibold },
  nameInput: { height: 46, borderRadius: 14, paddingHorizontal: 12, backgroundColor: AppPalette.surfaceMuted, ...Type.body, color: AppPalette.ink },
  editorActions: { minHeight: 46, flexDirection: 'row', alignItems: 'stretch', gap: 10, marginTop: 14 },
  saveButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 11 },
  saveButtonSecondary: { backgroundColor: AppPalette.surface, borderWidth: 1, borderColor: AppPalette.lineStrong },
  saveButtonPrimary: { backgroundColor: AppPalette.primary },
  saveAgainButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 11, backgroundColor: AppPalette.primary },
  saveText: { ...Type.body, fontWeight: FontWeight.semibold },
  saveTextSecondary: { color: AppPalette.ink },
  saveTextPrimary: { color: AppPalette.surface },
  actionModalRoot: { flex: 1, justifyContent: 'flex-end' },
  actionBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: AppPalette.overlay },
  actionSheetWrap: { paddingHorizontal: 12 },
  actionSheet: {
    backgroundColor: AppPalette.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppPalette.line,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D1C',
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
      },
      default: {},
    }),
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#EEF0F2' },
  actionIconBox: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: AppPalette.surfaceMuted },
  actionIcon: { ...Type.title, color: AppPalette.expense, fontWeight: FontWeight.semibold },
  actionTitleCopy: { flex: 1, minWidth: 0 },
  actionTitle: { ...Type.headline, fontWeight: FontWeight.semibold },
  actionClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F2F4', alignItems: 'center', justifyContent: 'center' },
  actionCloseText: { ...Type.headline, color: '#8C96A0', lineHeight: 22 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  actionDeleteRow: { borderTopWidth: 1, borderTopColor: '#F1F2F3' },
  actionRowCopy: { flex: 1, gap: 2 },
  actionRowTitle: { ...Type.body, fontWeight: FontWeight.medium },
  actionDeleteTitle: { color: '#C94D45' },
  actionDeleteHint: { color: '#A9827D' },
  actionChevron: { ...Type.headline, color: '#C0C8D0' },
});

import { Animated, Dimensions, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppPalette, FontWeight, Type } from '@/constants/theme';
import { FORM_SHEET_HEIGHT } from '@/shared/constants/layout';
import { useTagGroups } from '../hooks/useTags';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = {
  visible: boolean;
  mounted: boolean;
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onClose: () => void;
  onClosed: () => void;
  onManage: () => void;
};

export function TagPickerSheet({ visible, mounted, selectedTagIds, onChange, onClose, onClosed, onManage }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [sheetHeight, setSheetHeight] = useState(0);
  const [fade] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const { groups } = useTagGroups();
  const bottomGap = Math.max(insets.bottom, 12);
  const selected = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);
  const keyword = query.trim().toLocaleLowerCase();
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      tags: group.name.toLocaleLowerCase().includes(keyword)
        ? group.tags
        : group.tags.filter((tag) => tag.name.toLocaleLowerCase().includes(keyword)),
    }))
    .filter((group) => !keyword || group.name.toLocaleLowerCase().includes(keyword) || group.tags.length > 0);

  useEffect(() => {
    if (visible) {
      if (!mounted || !sheetHeight) return;
      translateY.setValue(sheetHeight + bottomGap);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: (sheetHeight || SCREEN_HEIGHT) + bottomGap,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClosed();
    });
  }, [bottomGap, fade, mounted, onClosed, sheetHeight, translateY, visible]);

  function toggleTag(tagId: string) {
    onChange(selected.has(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]);
  }

  function toggleGroup(tagIds: string[]) {
    const allSelected = tagIds.length > 0 && tagIds.every((id) => selected.has(id));
    onChange(allSelected
      ? selectedTagIds.filter((id) => !tagIds.includes(id))
      : [...new Set([...selectedTagIds, ...tagIds])]);
  }

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            if (nextHeight > 0 && nextHeight !== sheetHeight) setSheetHeight(nextHeight);
          }}
          style={[styles.sheet, { marginBottom: bottomGap, transform: [{ translateY }] }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton}><ThemedText style={styles.closeText}>×</ThemedText></Pressable>
            <ThemedText style={styles.title}>标签</ThemedText>
            <Pressable
              onPress={onManage}
              style={styles.manageButton}>
              <ThemedText style={styles.manageText}>添加</ThemedText>
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <ThemedText style={styles.searchIcon}>⌕</ThemedText>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="搜索标签"
              placeholderTextColor={AppPalette.textFaint}
              style={styles.searchInput}
            />
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {visibleGroups.map((group, index) => {
              const groupTagIds = group.tags.map((tag) => tag.id);
              const allSelected = groupTagIds.length > 0 && groupTagIds.every((id) => selected.has(id));
              return (
                <View key={group.id}>
                  {index === 0 || visibleGroups[index - 1].scope !== group.scope ? (
                    <ThemedText style={styles.scopeLabel}>— {group.scope === 'common' ? '以下为通用标签' : '以下为账本独立标签'} —</ThemedText>
                  ) : null}
                  <View style={styles.groupCard}>
                    <View style={styles.groupHeader}>
                      <View style={styles.groupNameRow}><View style={styles.groupMark} /><ThemedText style={styles.groupName}>{group.name}</ThemedText></View>
                      <Pressable onPress={() => toggleGroup(groupTagIds)} style={[styles.selectAll, allSelected && styles.selectAllActive]}>
                        <ThemedText style={[styles.selectAllText, allSelected && styles.selectAllTextActive]}>{allSelected ? '取消' : '全选'}</ThemedText>
                      </Pressable>
                    </View>
                    <View style={styles.tags}>
                      {group.tags.map((tag) => {
                        const active = selected.has(tag.id);
                        return (
                          <Pressable key={tag.id} onPress={() => toggleTag(tag.id)} style={[styles.tag, active && styles.tagActive]}>
                            <ThemedText style={[styles.tagHash, active && styles.tagHashActive]}>#</ThemedText>
                            <ThemedText style={[styles.tagName, active && styles.tagNameActive]}>{tag.name}</ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
            {visibleGroups.length === 0 ? <ThemedText style={styles.empty}>暂无可选标签</ThemedText> : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: AppPalette.overlay },
  sheet: {
    height: FORM_SHEET_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: AppPalette.surface,
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
  header: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: AppPalette.surfaceMuted },
  closeText: { fontSize: 24, lineHeight: 27, color: AppPalette.textMuted },
  title: { ...Type.headline, fontWeight: FontWeight.semibold },
  manageButton: { borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: AppPalette.primary },
  manageText: { ...Type.footnote, color: AppPalette.surface, fontWeight: FontWeight.semibold },
  searchBox: { height: 40, flexDirection: 'row', alignItems: 'center', borderRadius: 13, marginTop: 10, paddingHorizontal: 11, gap: 7, backgroundColor: AppPalette.surfaceMuted, borderWidth: 1, borderColor: AppPalette.line },
  searchIcon: { fontSize: 19, lineHeight: 23, color: AppPalette.ink, transform: [{ rotate: '-20deg' }] },
  searchInput: { flex: 1, ...Type.body, color: AppPalette.ink, paddingVertical: 0 },
  scroll: { flex: 1 },
  list: { paddingTop: 9, paddingBottom: 14, gap: 8 },
  scopeLabel: { ...Type.footnote, textAlign: 'center', color: AppPalette.textFaint, marginVertical: 5 },
  groupCard: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, gap: 8, backgroundColor: AppPalette.surface, borderWidth: 1, borderColor: '#E7EDF0' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  groupMark: { width: 4, height: 17, borderRadius: 2, backgroundColor: AppPalette.expense },
  groupName: { ...Type.body, fontWeight: FontWeight.semibold },
  selectAll: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: AppPalette.surfaceMuted },
  selectAllActive: { backgroundColor: AppPalette.primary },
  selectAllText: { ...Type.footnote },
  selectAllTextActive: { color: '#FFFFFF' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: AppPalette.surfaceMuted },
  tagActive: { backgroundColor: AppPalette.primary },
  tagHash: { ...Type.body, color: AppPalette.expense, fontWeight: FontWeight.bold },
  tagHashActive: { color: AppPalette.surface },
  tagName: { ...Type.subhead, fontWeight: FontWeight.medium },
  tagNameActive: { color: AppPalette.surface },
  empty: { ...Type.body, textAlign: 'center', color: AppPalette.textMuted, paddingVertical: 40 },
});

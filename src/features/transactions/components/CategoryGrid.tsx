import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Category } from '@/features/categories/domain/category.types';

const ICONS: Record<string, string> = {
  food: '🍽️',
  shopping: '🛍️',
  transport: '🚕',
  housing: '🏠',
  daily: '📦',
  relationships: '💗',
  entertainment: '🕸️',
  travel: '🎟️',
  medical: '🏥',
  membership: '♛',
};

function rowsOf<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
}

export function CategoryGrid({
  categories,
  selectedCategoryId,
  onCategoryChange,
}: {
  categories: Category[];
  selectedCategoryId: string;
  onCategoryChange: (id: string) => void;
}) {
  const [expandedRootId, setExpandedRootId] = useState<string | null>(null);
  const roots = categories.filter((category) => category.parentId === null);
  const selected = categories.find((category) => category.id === selectedCategoryId);
  const selectedRootId = selected?.parentId ?? selected?.id;
  const expandedRoot = roots.find((category) => category.id === expandedRootId);
  const children = expandedRootId ? categories.filter((category) => category.parentId === expandedRootId) : [];

  function handleRootPress(category: Category) {
    const childCategories = categories.filter((item) => item.parentId === category.id);
    if (childCategories.length === 0) {
      onCategoryChange(category.id);
      return;
    }
    setExpandedRootId(category.id);
  }

  return (
    <View style={styles.container}>
      {rowsOf(roots, 5).map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((category) => {
            const isSelected = category.id === selectedCategoryId || category.id === selectedRootId;
            const icon = ICONS[category.id] ?? category.icon;
            return (
              <Pressable
                key={category.id}
                onPress={() => handleRootPress(category)}
                style={styles.cell}>
                <View style={[styles.iconBox, isSelected && styles.selectedIconBox]}>
                  <ThemedText style={styles.icon}>{icon}</ThemedText>
                  {categories.some((item) => item.parentId === category.id) ? <View style={styles.moreBadge}><ThemedText style={styles.moreText}>•••</ThemedText></View> : null}
                </View>
                <ThemedText style={styles.label} numberOfLines={1}>{category.name}</ThemedText>
              </Pressable>
            );
          })}
          {row.length < 5 ? Array.from({ length: 5 - row.length }, (_, index) => <View key={`empty-${index}`} style={styles.cell} />) : null}
        </View>
      ))}

      <Modal
        visible={Boolean(expandedRoot)}
        transparent
        animationType="slide"
        onRequestClose={() => setExpandedRootId(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setExpandedRootId(null)} />
          {expandedRoot ? (
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleGroup}>
                  <View style={[styles.sheetIconBox, { backgroundColor: `${expandedRoot.color}22` }]}>
                    <ThemedText style={styles.sheetIcon}>{ICONS[expandedRoot.id] ?? expandedRoot.icon}</ThemedText>
                  </View>
                  <View>
                    <ThemedText style={styles.sheetTitle}>{expandedRoot.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">选择具体分类</ThemedText>
                  </View>
                </View>
                <Pressable onPress={() => setExpandedRootId(null)} hitSlop={10} style={styles.closeButton}>
                  <ThemedText style={styles.closeText}>×</ThemedText>
                </Pressable>
              </View>

              <View style={styles.childList}>
                {children.map((category) => (
                  <Pressable
                    key={category.id}
                    style={styles.childRow}
                    onPress={() => {
                      onCategoryChange(category.id);
                      setExpandedRootId(null);
                    }}>
                    <View style={[styles.childIconBox, { backgroundColor: `${category.color}22` }]}>
                      <ThemedText style={styles.childIcon}>{category.icon}</ThemedText>
                    </View>
                    <ThemedText style={styles.childLabel}>{category.name}</ThemedText>
                    {category.id === selectedCategoryId ? <ThemedText style={styles.checkmark}>✓</ThemedText> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 10, paddingTop: 14, paddingBottom: 4, gap: 13 },
  row: { flexDirection: 'row', gap: 6 },
  cell: { flex: 1, alignItems: 'center', gap: 5 },
  iconBox: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#F5F5F6', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  selectedIconBox: { backgroundColor: '#A8D2B0' },
  icon: { fontSize: 28 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#353634' },
  moreBadge: { position: 'absolute', right: -3, bottom: -3, width: 21, height: 21, borderRadius: 11, backgroundColor: '#4B5560', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#FFFFFF', fontSize: 8, lineHeight: 9, letterSpacing: -1 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(25, 28, 27, 0.38)' },
  sheet: { maxHeight: '70%', paddingTop: 9, paddingBottom: 26, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FFFFFF' },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, marginBottom: 11, borderRadius: 2, backgroundColor: '#D7D8D9' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: '#EEF0EF' },
  sheetTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetIconBox: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sheetIcon: { fontSize: 25 },
  sheetTitle: { fontSize: 18, lineHeight: 23, fontWeight: '700', color: '#242824' },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F1F1' },
  closeText: { fontSize: 28, lineHeight: 30, fontWeight: '300', color: '#5F6561' },
  childList: { paddingHorizontal: 22 },
  childRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: '#F0F1F1' },
  childIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  childIcon: { fontSize: 22 },
  childLabel: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#2D332F' },
  checkmark: { fontSize: 20, fontWeight: '700', color: '#2D7185' },
});

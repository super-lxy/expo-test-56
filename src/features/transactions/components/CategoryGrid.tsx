import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppPalette, FontWeight, Type } from '@/constants/theme';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import type { Category } from '@/features/categories/domain/category.types';

const CATEGORY_ICON_BACKGROUND = 'rgba(255,255,255,0.68)';

function rowsOf<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
}

function colorWithOpacity(color: string, opacity: number) {
  const hex = color.trim().match(/^#([\da-f]{6})$/i)?.[1];
  if (!hex) return `rgba(113, 113, 122, ${opacity})`;

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

/**
 * 每个一级分类带有一个同名兜底子分类（`${rootId}-default`），
 * 它代表「就是这个大类，没有细分」。
 * 只用 ID 匹配而非名称匹配：若用户自建了与父级同名的子分类，
 * 名称匹配会误把它当作兜底项，导致角标消失、排序前移、标签不加父级前缀。
 */
function isDefaultChild(child: Category, root: Category) {
  return child.id === `${root.id}-default`;
}

export function CategoryGrid({
  categories,
  selectedCategoryId,
  onCategoryChange,
  onSettingsPress,
}: {
  categories: Category[];
  selectedCategoryId: string;
  onCategoryChange: (id: string) => void;
  onSettingsPress?: () => void;
}) {
  const [expandedRootId, setExpandedRootId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const roots = categories.filter((category) => category.parentId === null);
  // null 作为「设置」格的占位哨兵
  const displayItems: (Category | null)[] = onSettingsPress ? [...roots, null] : roots;
  const selected = categories.find((category) => category.id === selectedCategoryId);
  const selectedRootId = selected?.parentId ?? selected?.id;
  const expandedRoot = roots.find((category) => category.id === expandedRootId);
  // 一级分类本身已在遮罩后保持选中；弹层里只显示真正的细分类，
  // 不再重复展示同名兜底项。
  const children = expandedRoot
    ? categories
        .filter((category) => category.parentId === expandedRoot.id)
        .filter((category) => !isDefaultChild(category, expandedRoot))
    : [];

  // ⋯ 角标只在有真实细分时显示，旧分类的同名兜底项不计入。
  function realChildrenOf(root: Category) {
    return categories.filter((item) => item.parentId === root.id && !isDefaultChild(item, root));
  }

  function handleRootPress(category: Category) {
    // 已经选中本大类下的某个子分类时不要覆盖它 ——
    // 否则点开「交通」会把之前选的「交通-飞机」重置成兜底项。
    const alreadyInThisRoot = selected
      && (selected.id === category.id || selected.parentId === category.id);
    if (!alreadyInThisRoot) {
      const defaultChild = categories.find((item) => item.parentId === category.id && isDefaultChild(item, category));
      // 先落选中再弹窗：关闭弹窗时仍保留这个一级分类的同名默认子分类。
      onCategoryChange(defaultChild?.id ?? category.id);
    }
    // 没有真实细分的分类直接完成选择，不展示空弹层。
    setExpandedRootId(realChildrenOf(category).length > 0 ? category.id : null);
  }

  return (
    <View style={styles.container}>
      {rowsOf(displayItems, 5).map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((item) => {
            // 设置格
            if (item === null) {
              return (
                <Pressable key="__settings__" onPress={onSettingsPress} style={styles.cell}>
                  <View style={styles.cellInner}>
                    <View style={[styles.iconBox, styles.settingsIconBox]}>
                      <ThemedText style={styles.icon}>{'⚙️'}</ThemedText>
                    </View>
                    <ThemedText style={[styles.label, styles.settingsLabel]} numberOfLines={1}>分类</ThemedText>
                  </View>
                </Pressable>
              );
            }
            const isSelected = item.id === selectedCategoryId || item.id === selectedRootId;
            const displayCategory = selected?.parentId === item.id ? selected : item;
            // 选中细分时格子显示「父-子」，选中兜底项（或大类本身）时只显示大类名
            const label = isSelected && selected && !isDefaultChild(selected, item) && selected.id !== item.id
              ? `${item.name}-${selected.name}`
              : item.name;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleRootPress(item)}
                style={styles.cell}>
                <View style={styles.cellInner}>
                  <View style={[
                    styles.iconBox,
                    isSelected && styles.iconBoxSelected,
                    isSelected && (item.type === 'income' ? styles.iconBoxSelectedIncome : styles.iconBoxSelectedExpense),
                  ]}>
                    <CategoryIcon
                      icon={displayCategory.icon}
                      iconType={displayCategory.iconType}
                      boxSize={46}
                      textStyle={styles.icon}
                    />
                    {realChildrenOf(item).length > 0 ? <View style={styles.moreBadge}><ThemedText style={styles.moreText}>⋯</ThemedText></View> : null}
                  </View>
                  <ThemedText style={[
                    styles.label,
                    isSelected && styles.labelSelected,
                    isSelected && (item.type === 'income' ? styles.labelSelectedIncome : styles.labelSelectedExpense),
                  ]} numberOfLines={1}>{label}</ThemedText>
                </View>
              </Pressable>
            );
          })}
          {row.length < 5 ? Array.from({ length: 5 - row.length }, (_, index) => <View key={`empty-${index}`} style={styles.cell} />) : null}
        </View>
      ))}

      <Modal
        visible={Boolean(expandedRootId)}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setExpandedRootId(null)}>
        <View
          style={[
            styles.modalRoot,
            { paddingTop: Math.max(insets.top + 132, screenHeight * 0.235) },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭子分类"
            style={styles.backdrop}
            onPress={() => setExpandedRootId(null)}
          />
          {expandedRoot ? (
            <View style={styles.sheet}>
              <ScrollView
                style={styles.childScroll}
                contentContainerStyle={styles.childList}
                showsVerticalScrollIndicator={false}
                bounces={children.length > 15}>
                {rowsOf(children, 5).map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.childRow}>
                    {row.map((category) => {
                      const isSelected = category.id === selectedCategoryId;
                      return (
                        <Pressable
                          key={category.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${expandedRoot.name}-${category.name}`}
                          accessibilityState={{ selected: isSelected }}
                          style={({ pressed }) => [styles.childCell, pressed && styles.childCellPressed]}
                          onPress={() => {
                            onCategoryChange(category.id);
                            setExpandedRootId(null);
                          }}>
                          <View
                            style={[
                              styles.childIconBox,
                              {
                                backgroundColor: colorWithOpacity(category.color, isSelected ? 0.2 : 0.11),
                                borderColor: isSelected ? category.color : 'transparent',
                                borderWidth: isSelected ? 2 : 0,
                              },
                            ]}>
                            <CategoryIcon
                              icon={category.icon}
                              iconType={category.iconType}
                              boxSize={46}
                              textStyle={styles.childIcon}
                            />
                          </View>
                          <ThemedText
                            style={[
                              styles.childLabel,
                              isSelected && styles.childLabelSelected,
                              isSelected && { color: category.color },
                            ]}
                            numberOfLines={1}>
                            {category.name}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                    {row.length < 5
                      ? Array.from({ length: 5 - row.length }, (_, index) => (
                          <View key={`child-empty-${index}`} style={styles.childCell} />
                        ))
                      : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 3, gap: 2 },
  row: { flexDirection: 'row', gap: 2 },
  cell: { flex: 1 },
  // 整格作为选中高亮的载体：圆角贴合内容，不需要固定尺寸
  cellInner: { alignItems: 'center', gap: 4, paddingVertical: 5 },
  // 圆角方块（squircle）而非圆形：emoji 本身是方形字形，圆底会在四角留下空隙
  iconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: CATEGORY_ICON_BACKGROUND, borderWidth: 1, borderColor: 'rgba(91,96,104,0.08)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  iconBoxSelected: { transform: [{ scale: 1.045 }], shadowOpacity: 0.11, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  iconBoxSelectedExpense: { backgroundColor: '#FFF7F3', borderColor: 'rgba(232,133,91,0.52)', shadowColor: AppPalette.expense },
  iconBoxSelectedIncome: { backgroundColor: '#F0FBF6', borderColor: 'rgba(55,180,128,0.46)', shadowColor: AppPalette.income },
  settingsIconBox: { backgroundColor: CATEGORY_ICON_BACKGROUND },
  icon: { fontSize: 24, lineHeight: 30 },
  label: { ...Type.footnote, fontWeight: FontWeight.regular, color: '#4A4C4A' },
  labelSelected: { fontWeight: FontWeight.semibold },
  labelSelectedExpense: { color: '#D86F42' },
  labelSelectedIncome: { color: '#239968' },
  settingsLabel: { color: '#71808C' },
  moreBadge: { position: 'absolute', right: -3, bottom: -1, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#9AA2A9', fontSize: 8, lineHeight: 9, fontWeight: FontWeight.semibold },
  // 子分类浮在一级分类下方，位置与参考图一致；内容按行自然撑高。
  modalRoot: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 18 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: AppPalette.overlay },
  sheet: {
    maxHeight: '54%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#1A1D1C',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
  },
  childScroll: { flexGrow: 0 },
  childList: { paddingHorizontal: 10, paddingVertical: 11, gap: 4 },
  childRow: { flexDirection: 'row' },
  childCell: { flex: 1, minWidth: 0, minHeight: 69, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 12 },
  childCellPressed: { opacity: 0.66 },
  childIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  childIcon: { fontSize: 24, lineHeight: 30 },
  childLabel: { ...Type.subhead, fontWeight: FontWeight.regular, color: '#202320', textAlign: 'center' },
  childLabelSelected: { fontWeight: FontWeight.semibold },
});

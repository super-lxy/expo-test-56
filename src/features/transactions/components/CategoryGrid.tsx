import { useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppPalette, FontWeight, Glyph, Type } from '@/constants/theme';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import type { Category } from '@/features/categories/domain/category.types';
import { ElasticBoundaryScrollView } from '@/features/transactions/components/ElasticBoundaryScrollView';
import { FORM_SHEET_HEIGHT } from '@/shared/constants/layout';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CATEGORY_ICON_BACKGROUND = 'rgba(255,255,255,0.68)';

function rowsOf<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
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
  onAddChildPress,
}: {
  categories: Category[];
  selectedCategoryId: string;
  onCategoryChange: (id: string) => void;
  onSettingsPress?: () => void;
  onAddChildPress?: (parent: Category) => void;
}) {
  const [expandedRootId, setExpandedRootId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  // 自己驱动动画而非用 Modal 的 animationType="slide"：
  // 后者会把遮罩和卡片一起位移，阴影跟着从屏幕外滑进来。
  // 这里遮罩淡入、卡片单独上滑。
  //
  // translateY 直接用像素值而不是 interpolate 到实测高度：
  // onLayout 在动画启动之后才回调，若把测量结果塞进 outputRange，
  // 输出范围会中途变化，卡片被瞬间拉到半空，看起来像是直接出现。
  const [fade] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [sheetHeight, setSheetHeight] = useState(0);
  // Modal 的挂载与 expandedRootId 解耦：关闭时先播收起动画，播完再卸载。
  // 直接用 visible={Boolean(expandedRootId)} 会在状态清空的瞬间卸载，收起动画根本不播。
  const [mounted, setMounted] = useState(false);
  // 收起动画期间 expandedRootId 已清空，靠这个值维持卡片内容不闪空
  const [lastRootId, setLastRootId] = useState<string | null>(null);
  const bottomGap = Math.max(insets.bottom, 12);

  useEffect(() => {
    if (expandedRootId) {
      // 高度还没测到就先不动，等 onLayout 落地后本 effect 会再跑一次
      if (!sheetHeight) return;
      translateY.setValue(sheetHeight + bottomGap);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: (sheetHeight || SCREEN_HEIGHT) + bottomGap,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [expandedRootId, sheetHeight, bottomGap, mounted, fade, translateY]);
  const roots = categories.filter((category) => category.parentId === null);
  // null 作为「设置」格的占位哨兵
  const displayItems: (Category | null)[] = onSettingsPress ? [...roots, null] : roots;
  const selected = categories.find((category) => category.id === selectedCategoryId);
  const selectedRootId = selected?.parentId ?? selected?.id;
  // 收起动画期间 expandedRootId 已清空，用上一次的值维持卡片内容不闪空
  const expandedRoot = roots.find((category) => category.id === (expandedRootId ?? lastRootId));
  // 如果旧分类带有兜底项，将它排到首位。
  const children = expandedRoot
    ? categories
        .filter((category) => category.parentId === expandedRoot.id)
        .sort((a, b) => Number(isDefaultChild(b, expandedRoot)) - Number(isDefaultChild(a, expandedRoot)))
    : [];

  // ⋯ 角标只在有真实细分时显示，旧分类的同名兜底项不计入。
  function realChildrenOf(root: Category) {
    return categories.filter((item) => item.parentId === root.id && !isDefaultChild(item, root));
  }

  function handleRootPress(category: Category) {
    // 已经选中本大类下的某个子分类时不要覆盖它 ——
    // 否则点开「交通」会把之前选的「交通-飞机」重置成兜底项，弹窗里的 ✓ 跑到首行。
    const alreadyInThisRoot = selected
      && (selected.id === category.id || selected.parentId === category.id);
    if (!alreadyInThisRoot) {
      const defaultChild = categories.find((item) => item.parentId === category.id && isDefaultChild(item, category));
      // 先落选中再弹窗：关闭弹窗时仍保留这个一级分类的同名默认子分类。
      if (defaultChild) onCategoryChange(defaultChild.id);
    }
    // 弹窗对每个一级分类都开，用户在其中选择具体二级分类。
    setLastRootId(category.id);
    setMounted(true);
    setExpandedRootId(category.id);
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
        visible={mounted}
        transparent
        animationType="none"
        onRequestClose={() => setExpandedRootId(null)}>
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: fade }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setExpandedRootId(null)} />
          </Animated.View>
          {expandedRoot ? (
            <Animated.View
              onLayout={(e) => {
                const next = e.nativeEvent.layout.height;
                if (next > 0 && next !== sheetHeight) setSheetHeight(next);
              }}
              style={[
                styles.sheet,
                // 底部留白挂在卡片上而非外层容器：卡片下滑时留白一起移出视口
                { marginBottom: bottomGap },
                { transform: [{ translateY }] },
              ]}>
              {/* 头部：左侧关闭，右侧「添加」入口 —— 添加不再占用列表行 */}
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setExpandedRootId(null)} hitSlop={10} style={styles.sheetCloseBtn}>
                  <ThemedText style={styles.sheetCloseText}>×</ThemedText>
                </Pressable>
                <ThemedText style={styles.sheetTitle}>{expandedRoot.name}</ThemedText>
                {onAddChildPress ? (
                  <Pressable
                    onPress={() => {
                      const parent = expandedRoot;
                      setExpandedRootId(null);
                      onAddChildPress(parent);
                    }}
                    hitSlop={10}
                    style={styles.sheetAddBtn}>
                    <ThemedText style={styles.sheetAddText}>添加</ThemedText>
                  </Pressable>
                ) : (
                  <View style={styles.sheetCloseBtn} />
                )}
              </View>
              {/* 顶底的圆弧留白会在拖到尽头时露出，提示已到列表边界。 */}
              <ElasticBoundaryScrollView
                style={styles.childScroll}
                contentContainerStyle={styles.childList}
                showsVerticalScrollIndicator={false}
                bounces
                alwaysBounceVertical={false}>
                {children.map((category, index) => (
                  <Pressable
                    key={category.id}
                    style={[styles.childRow, index === children.length - 1 && styles.childRowLast]}
                    onPress={() => {
                      onCategoryChange(category.id);
                      setExpandedRootId(null);
                    }}>
                    <View style={styles.childIconBox}>
                      <CategoryIcon icon={category.icon} iconType={category.iconType} boxSize={40} textStyle={styles.childIcon} />
                    </View>
                    <ThemedText style={styles.childLabel} numberOfLines={1}>
                      {isDefaultChild(category, expandedRoot) ? category.name : `${expandedRoot.name}-${category.name}`}
                    </ThemedText>
                    {category.id === selectedCategoryId ? (
                      <ThemedText style={[styles.checkmark, category.type === 'income' && styles.checkmarkIncome]}>✓</ThemedText>
                    ) : null}
                  </Pressable>
                ))}
              </ElasticBoundaryScrollView>
            </Animated.View>
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
  // 靠下浮动的完整卡片：四角全圆、四周留缝隙，不贴任何屏幕边缘
  modalRoot: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: AppPalette.overlay },
  sheet: {
    height: FORM_SHEET_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    paddingBottom: 8,
    shadowColor: '#1A1D1C',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F1F1' },
  sheetCloseBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { fontSize: 24, lineHeight: 26, fontWeight: FontWeight.regular, color: '#8C96A0' },
  sheetTitle: { flex: 1, ...Type.headline, fontWeight: FontWeight.semibold, textAlign: 'center' },
  sheetAddBtn: { minWidth: 30, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 2 },
  sheetAddText: { ...Type.body, color: AppPalette.expense, fontWeight: FontWeight.semibold },
  childScroll: { flex: 1 },
  childList: { paddingHorizontal: 18, paddingTop: 4 },
  childRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: '#F0F1F1' },
  // 末行不画分隔线，避免与卡片底部留白之间出现一道悬空的横线
  childRowLast: { borderBottomWidth: 0 },
  childIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: CATEGORY_ICON_BACKGROUND, borderWidth: 1, borderColor: 'rgba(91,96,104,0.07)', alignItems: 'center', justifyContent: 'center' },
  childIcon: { fontSize: 21, lineHeight: 26 },
  childLabel: { flex: 1, ...Type.body, fontWeight: FontWeight.medium, color: '#2D332F' },
  checkmark: { ...Glyph.md, fontWeight: FontWeight.semibold, color: AppPalette.expense },
  checkmarkIncome: { color: AppPalette.income },
});

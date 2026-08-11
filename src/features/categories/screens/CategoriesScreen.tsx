import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, FontWeight, Glyph, Spacing, Type } from '@/constants/theme';
import { CategoryIcon } from '../components/CategoryIcon';
import { useCategoryRepository } from '@/features/transactions/hooks/useTransactions';
import type { Category, CategoryType } from '../domain/category.types';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CATEGORY_ICON_BACKGROUND = AppPalette.expenseSoft;
const CATEGORY_HEADER_BACKGROUND = AppPalette.blush;

function CategoryChevron({ expanded }: { expanded: boolean }) {
  const [rotation] = useState(() => new Animated.Value(expanded ? 90 : 0));

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 90 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [expanded, rotation]);

  return (
    <Animated.View
      style={[
        styles.chevronSlot,
        { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 90], outputRange: ['0deg', '90deg'] }) }] },
      ]}>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={15}
        weight="bold"
        tintColor={expanded ? '#6A7A88' : '#B8C1C8'}
      />
    </Animated.View>
  );
}

/** 一个一级分类行（含展开后的子分类横向滚动区）*/
function CategoryRow({
  root,
  items,
  expanded,
  onToggle,
  onAddChild,
  onEditChild,
  onMorePress,
}: {
  root: Category;
  items: Category[];
  expanded: boolean;
  onToggle: () => void;
  onAddChild: () => void;
  onEditChild: (child: Category) => void;
  onMorePress: () => void;
}) {
  return (
    <View>
      <Pressable onPress={onToggle} style={styles.row}>
        {/* 左侧展开箭头 */}
        <CategoryChevron expanded={expanded} />
        {/* 图标方块 */}
        <View style={styles.iconBox}>
          <CategoryIcon icon={root.icon} iconType={root.iconType} boxSize={40} textStyle={styles.iconText} />
        </View>
        <ThemedText style={styles.rowName}>{root.name}</ThemedText>
        <Pressable onPress={onMorePress} hitSlop={10} style={styles.moreBtn}>
          <ThemedText style={styles.moreText}>⋯</ThemedText>
        </Pressable>
      </Pressable>

      {expanded ? (
        <View style={styles.expandedBlock}>
          {/* 添加入口放在右上角，不再占用一个子分类格位 */}
          <View style={styles.hintRow}>
            <ThemedText style={styles.hintIcon}>ⓘ</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
              子分类更改或删除请点击对应子分类图标
            </ThemedText>
            <Pressable onPress={onAddChild} hitSlop={8} style={styles.addChildBtn}>
              <ThemedText style={styles.addChildBtnText}>＋ 添加</ThemedText>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childScroll}>
            {items.map((child) => (
              <Pressable key={child.id} onPress={() => onEditChild(child)} style={styles.childChip}>
                <View style={styles.childIconBox}>
                  <CategoryIcon icon={child.icon} iconType={child.iconType} boxSize={46} textStyle={styles.childIconText} />
                </View>
                <ThemedText style={styles.childName} numberOfLines={1}>{child.name}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.divider} />
    </View>
  );
}

export function CategoriesScreen() {
  const router = useRouter();
  const repository = useCategoryRepository();
  const [type, setType] = useState<CategoryType>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<Category | null>(null);
  const insets = useSafeAreaInsets();
  // 遮罩淡入、卡片单独上滑。用 Modal 的 animationType="slide" 会让两者一起位移，
  // 阴影跟着从屏幕外滑进来。
  // translateY 直接用像素值而不是 interpolate 到实测高度：
  // onLayout 在动画启动之后才回调，若把测量结果塞进 outputRange，
  // 输出范围会中途变化，卡片被瞬间拉到半空，看起来像是直接出现。
  const [fade] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [sheetHeight, setSheetHeight] = useState(0);
  // Modal 的挂载与 selectedChild 解耦：关闭时先播收起动画，播完再卸载。
  // 直接用 visible={selectedChild !== null} 会在状态清空的瞬间卸载，收起动画根本不播。
  const [mounted, setMounted] = useState(false);
  // 收起动画期间 selectedChild 已清空，用上一次的值维持卡片内容不闪空
  const [lastChild, setLastChild] = useState<Category | null>(null);
  const bottomGap = Math.max(insets.bottom, 12);
  const sheetChild = selectedChild ?? lastChild;

  useEffect(() => {
    if (selectedChild) {
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
  }, [selectedChild, sheetHeight, bottomGap, mounted, fade, translateY]);

  useFocusEffect(
    useCallback(() => {
      // 取消标记：切换收支类型会连续触发，防止先发后到的结果覆盖新数据
      let cancelled = false;
      void repository.listByType(type).then((next) => {
        if (!cancelled) setCategories(next);
      });
      return () => { cancelled = true; };
    }, [repository, type])
  );

  const roots = categories.filter((c) => c.parentId === null);

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // 三个状态一起设：lastChild 供收起动画期间维持内容，mounted 控制 Modal 挂载
  function openSheet(category: Category) {
    setLastChild(category);
    setMounted(true);
    setSelectedChild(category);
  }

  function confirmDelete(category: Category) {
    const isRoot = category.parentId === null;
    setSelectedChild(null);
    Alert.alert(
      isRoot ? '删除一级分类' : '删除子分类',
      isRoot
        ? `删除“${category.name}”后，它和下面的子分类将不再出现在记账菜单中，历史账单仍会保留。`
        : `删除“${category.name}”后，它将不再出现在记账菜单中，历史账单仍会保留。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            void repository.archive(category.id).then(() => {
              setCategories((current) => current.filter(
                (item) => item.id !== category.id && item.parentId !== category.id
              ));
              if (isRoot) setExpandedId(null);
            }).catch((error) => {
              Alert.alert('无法删除', error instanceof Error ? error.message : '请稍后重试');
            });
          },
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={CATEGORY_HEADER_BACKGROUND} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* 顶部栏：返回 + 分段切换 */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ThemedText style={styles.back}>‹</ThemedText>
          </Pressable>
          <View style={styles.segmented}>
            <Pressable
              onPress={() => { setType('expense'); setExpandedId(null); }}
              style={[styles.seg, type === 'expense' && styles.segActive]}>
              <ThemedText style={[styles.segText, type === 'expense' && styles.segTextActive]}>
                支出分类
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => { setType('income'); setExpandedId(null); }}
              style={[styles.seg, type === 'income' && styles.segActive]}>
              <ThemedText style={[styles.segText, type === 'income' && styles.segTextActive]}>
                收入分类
              </ThemedText>
            </Pressable>
          </View>
          {/* 占位，让分段控件保持居中 */}
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {roots.map((root) => (
            <CategoryRow
              key={root.id}
              root={root}
              items={categories.filter((c) => c.parentId === root.id)}
              expanded={expandedId === root.id}
              onToggle={() => toggle(root.id)}
              onAddChild={() =>
                router.push({
                  pathname: '/categories/create',
                  params: {
                    type,
                    parentId: root.id,
                    parentName: root.name,
                    ...(root.iconType === 'emoji' ? { parentIcon: root.icon } : {}),
                  },
                })
              }
              onEditChild={openSheet}
              onMorePress={() => openSheet(root)}
            />
          ))}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <Pressable
            onPress={() => router.push({ pathname: '/categories/create', params: { type } })}
            style={styles.addButton}>
            <ThemedText style={styles.addText}>添加分类</ThemedText>
          </Pressable>
        </SafeAreaView>

        {/* 分类操作菜单：一级分类与子分类共用，文案按层级切换 */}
        <Modal
          visible={mounted}
          transparent
          animationType="none"
          onRequestClose={() => setSelectedChild(null)}>
          <Animated.View style={[styles.sheetBackdrop, { opacity: fade }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedChild(null)} />
          </Animated.View>
          {sheetChild ? (
            <View style={styles.sheetWrap}>
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
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetIconBox}>
                    <CategoryIcon icon={sheetChild.icon} iconType={sheetChild.iconType} boxSize={36} textStyle={styles.sheetIcon} />
                  </View>
                  <ThemedText style={styles.sheetTitle}>{sheetChild.name}</ThemedText>
                  <Pressable onPress={() => setSelectedChild(null)} hitSlop={10} style={styles.sheetClose}>
                    <ThemedText style={styles.sheetCloseText}>×</ThemedText>
                  </Pressable>
                </View>
                <Pressable
                  style={styles.sheetAction}
                  onPress={() => {
                    const target = sheetChild;
                    setSelectedChild(null);
                    const parent = target.parentId
                      ? categories.find((c) => c.id === target.parentId)
                      : undefined;
                    router.push({
                      pathname: '/categories/create',
                      params: {
                        categoryId: target.id,
                        type: target.type,
                        ...(parent ? {
                          parentId: parent.id,
                          parentName: parent.name,
                          ...(parent.iconType === 'emoji' ? { parentIcon: parent.icon } : {}),
                        } : {}),
                      },
                    });
                  }}>
                  <View style={styles.sheetActionText}>
                    <ThemedText style={styles.sheetActionTitle}>
                      {sheetChild.parentId === null ? '编辑分类' : '编辑子分类'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">修改「{sheetChild.name}」的名称和图标</ThemedText>
                  </View>
                  <ThemedText style={styles.sheetChevron}>›</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.sheetAction, styles.sheetDeleteAction]}
                  onPress={() => confirmDelete(sheetChild)}>
                  <View style={styles.sheetActionText}>
                    <ThemedText style={[styles.sheetActionTitle, styles.sheetDeleteTitle]}>
                      {sheetChild.parentId === null ? '删除分类' : '删除子分类'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.sheetDeleteHint}>
                      历史账单不会被删除
                    </ThemedText>
                  </View>
                </Pressable>
              </Animated.View>
            </View>
          ) : null}
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1, backgroundColor: CATEGORY_HEADER_BACKGROUND },

  // ── 顶部栏 ──────────────────────────────────
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  back: { fontSize: 32, lineHeight: 34, fontWeight: FontWeight.regular, color: '#17212B', width: 28 },
  segmented: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2 },
  seg: { paddingHorizontal: 7, paddingVertical: 6, borderRadius: 20 },
  segActive: { backgroundColor: AppPalette.primary },
  segText: { ...Type.body, fontWeight: FontWeight.semibold, color: '#17212B' },
  segTextActive: { color: '#FFFFFF' },
  headerSpacer: { width: 28 },

  // ── 列表 ──────────────────────────────────
  list: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { paddingBottom: 20 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, gap: 3, backgroundColor: '#FFFFFF' },
  chevronSlot: { width: 14, height: 20, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 13, backgroundColor: CATEGORY_ICON_BACKGROUND, alignItems: 'center', justifyContent: 'center' },
  iconText: { ...Glyph.lg },
  rowName: { flex: 1, marginLeft: 6, ...Type.headline, fontWeight: FontWeight.medium },
  moreBtn: { paddingHorizontal: 6 },
  moreText: { ...Glyph.md, color: '#B0BAC2', letterSpacing: 2 },
  divider: { height: 1, marginHorizontal: 16, backgroundColor: '#F2F4F6' },

  // ── 展开区 ──────────────────────────────────
  expandedBlock: { backgroundColor: '#FAFBFC', paddingBottom: 12 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  hintIcon: { ...Type.footnote, color: '#9AA4AE' },
  hintText: { flex: 1 },
  addChildBtn: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: AppPalette.expenseSoft },
  addChildBtnText: { ...Type.footnote, color: AppPalette.expense, fontWeight: FontWeight.semibold },
  childScroll: { paddingHorizontal: 16, gap: 6, paddingBottom: 2 },
  childChip: { alignItems: 'center', gap: 4, width: 54 },
  childIconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: CATEGORY_ICON_BACKGROUND, alignItems: 'center', justifyContent: 'center' },
  childIconText: { ...Glyph.md },
  childName: { ...Type.caption, color: '#4A5560', textAlign: 'center' },

  // ── 底部栏 ──────────────────────────────────
  bottomBar: { paddingHorizontal: Spacing.four, paddingTop: 12, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  addButton: { backgroundColor: AppPalette.primary, borderRadius: 18, alignItems: 'center', paddingVertical: 16 },
  addText: { ...Type.body, color: AppPalette.surface, fontWeight: FontWeight.semibold },

  // ── 子分类操作菜单 ──────────────────────────────────
  sheetBackdrop: { flex: 1, backgroundColor: AppPalette.overlay },
  // 靠下浮动的完整卡片：四角全圆、左右和底部都留缝隙
  sheetWrap: { paddingHorizontal: 12 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1A1D1C',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#EEF0F2' },
  sheetIconBox: { width: 36, height: 36, borderRadius: 11, backgroundColor: CATEGORY_ICON_BACKGROUND, alignItems: 'center', justifyContent: 'center' },
  sheetIcon: { ...Glyph.md },
  sheetTitle: { flex: 1, ...Type.headline, fontWeight: FontWeight.semibold },
  sheetClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F2F4', alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { ...Type.headline, color: '#8C96A0', lineHeight: 22 },
  sheetAction: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  sheetDeleteAction: { borderTopWidth: 1, borderTopColor: '#F1F2F3' },
  sheetActionText: { flex: 1, gap: 2 },
  sheetActionTitle: { ...Type.body, fontWeight: FontWeight.medium },
  sheetDeleteTitle: { color: '#C94D45' },
  sheetDeleteHint: { color: '#A9827D' },
  sheetChevron: { ...Type.headline, color: '#C0C8D0' },
});

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontWeight, Glyph, Type } from '@/constants/theme';
import { ICON_GROUPS, suggestIcons } from '../domain/category.icons';

const COLUMNS = 6;
const SUGGESTED_KEY = '__suggested__';

/**
 * 分组 tab + 图标网格。网格用普通 View 而非 ScrollView：
 * 整页已经是一个 ScrollView，嵌套竖向滚动会互相抢手势。
 */
export function IconPicker({
  value,
  onChange,
  name,
  parentIcon,
}: {
  value: string;
  onChange: (icon: string) => void;
  /** 分类名，用于推荐 */
  name: string;
  /** 父级图标，无关键词命中时作为推荐首位 */
  parentIcon?: string;
}) {
  const [activeKey, setActiveKey] = useState(SUGGESTED_KEY);
  const suggested = useMemo(() => suggestIcons(name, parentIcon), [name, parentIcon]);

  const tabs = [{ key: SUGGESTED_KEY, label: '推荐' }, ...ICON_GROUPS.map((g) => ({ key: g.key, label: g.label }))];
  const icons = activeKey === SUGGESTED_KEY
    ? suggested
    : ICON_GROUPS.find((g) => g.key === activeKey)?.icons ?? [];
  // 末行补空位，避免最后一行不足一整行时被百分比宽度拉开
  const padding = (COLUMNS - (icons.length % COLUMNS)) % COLUMNS;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarWrap}
        contentContainerStyle={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveKey(tab.key)}
            style={[styles.tab, activeKey === tab.key && styles.tabActive]}>
            <ThemedText style={[styles.tabText, activeKey === tab.key && styles.tabTextActive]}>
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.grid}>
        {icons.map((icon, index) => {
          const selected = icon === value;
          return (
            <Pressable
              key={`${activeKey}-${index}-${icon}`}
              accessibilityRole="button"
              accessibilityState={selected ? { selected: true } : {}}
              onPress={() => onChange(icon)}
              style={styles.cell}>
              <View style={[styles.cellInner, selected && styles.cellInnerSelected]}>
                <ThemedText style={styles.icon}>{icon}</ThemedText>
              </View>
            </Pressable>
          );
        })}
        {Array.from({ length: padding }, (_, index) => <View key={`pad-${index}`} style={styles.cell} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // flexGrow: 0 —— 否则横向 ScrollView 会抢占剩余垂直空间
  tabBarWrap: { flexGrow: 0, flexShrink: 0 },
  tabBar: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 2 },
  tab: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 16, backgroundColor: '#EDF0F2' },
  tabActive: { backgroundColor: '#167C80' },
  tabText: { ...Type.subhead, fontWeight: FontWeight.medium, color: '#71808C' },
  tabTextActive: { color: '#FFFFFF', fontWeight: FontWeight.semibold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, marginTop: 14 },
  cell: { width: `${100 / COLUMNS}%`, alignItems: 'center' },
  cellInner: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F4F5F4', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  cellInnerSelected: { backgroundColor: '#DDF3F0', borderColor: '#167C80' },
  icon: { ...Glyph.lg },
});

import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppPalette, FontWeight, Glyph, Type } from '@/constants/theme';
import { useTabScroll } from '@/context/tab-scroll';

const ACTIVE_COLOR = AppPalette.ink;
const INACTIVE_COLOR = '#9A9EA6';

function TabItem({
  route,
  index,
  state,
  descriptors,
  navigation,
}: Pick<BottomTabBarProps, 'state' | 'descriptors' | 'navigation'> & { route: BottomTabBarProps['state']['routes'][number]; index: number }) {
  const { options } = descriptors[route.key];
  const focused = state.index === index;
  const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
  const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;

  function handlePress() {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={handlePress}
      style={[styles.tabItem, focused && styles.tabItemActive]}>
      {options.tabBarIcon?.({ focused, color, size: 23 })}
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function AppTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const router = useRouter();
  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2);

  const ctx = useTabScroll();

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 0) },
        ctx ? { transform: [{ translateY: ctx.tabTranslateY }] } : undefined,
      ]}>
      <View style={styles.bar}>
        {leftRoutes.map((route) => (
          <TabItem key={route.key} route={route} index={state.routes.indexOf(route)} state={state} descriptors={descriptors} navigation={navigation} />
        ))}

        <View style={styles.addSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="记一笔"
            onPress={() => router.push('/transaction/create')}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
            <Text style={styles.addButtonText}>＋</Text>
          </Pressable>
          <Text style={styles.addLabel}>记账</Text>
        </View>

        {rightRoutes.map((route) => (
          <TabItem key={route.key} route={route} index={state.routes.indexOf(route)} state={state} descriptors={descriptors} navigation={navigation} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    zIndex: 30,
    elevation: 30,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    paddingHorizontal: 7,
    borderTopWidth: 1,
    borderTopColor: AppPalette.line,
    shadowColor: AppPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginVertical: 5,
    borderRadius: 14,
  },
  tabItemActive: {
    backgroundColor: 'rgba(139,92,246,0.10)',
  },
  tabLabel: {
    ...Type.caption,
    fontWeight: FontWeight.medium,
  },
  addSlot: {
    flex: 1.12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  addButton: {
    width: 38,
    height: 38,
    marginTop: -7,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    experimental_backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addButtonPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.86,
  },
  addButtonText: {
    color: AppPalette.surface,
    ...Glyph.lg,
    lineHeight: 26,
    fontWeight: FontWeight.regular,
  },
  addLabel: {
    ...Type.caption,
    color: ACTIVE_COLOR,
    fontWeight: FontWeight.semibold,
  },
});

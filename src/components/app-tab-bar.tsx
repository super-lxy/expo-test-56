import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ACTIVE_COLOR = '#167C80';
const INACTIVE_COLOR = '#83909A';

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
    <Pressable accessibilityRole="tab" accessibilityState={focused ? { selected: true } : {}} onPress={handlePress} style={styles.tabItem}>
      {options.tabBarIcon?.({ focused, color, size: 23 })}
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function AppTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const router = useRouter();
  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2);

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: Math.max(insets.bottom, 10) }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 68,
    zIndex: 30,
    elevation: 30,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: '#E6ECEF',
    shadowColor: '#31414D',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  addSlot: {
    flex: 1.12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  addButton: {
    width: 42,
    height: 42,
    marginTop: -9,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACTIVE_COLOR,
    borderWidth: 4,
    borderColor: '#F5F7FA',
    shadowColor: '#2D7185',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addButtonPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.86,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '300',
  },
  addLabel: {
    color: ACTIVE_COLOR,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
});

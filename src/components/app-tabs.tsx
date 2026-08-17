import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { AppTabBar } from '@/components/app-tab-bar';

type SymbolName = React.ComponentProps<typeof SymbolView>['name'];
type SymbolColor = React.ComponentProps<typeof SymbolView>['tintColor'];

function TabIcon({ name, color, size }: { name: SymbolName; color: SymbolColor; size: number }) {
  return <SymbolView name={name} tintColor={color} size={size} />;
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color, size }) => <TabIcon name={{ ios: 'house', android: 'home', web: 'home' }} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'AI 记账',
          tabBarIcon: ({ color, size }) => <TabIcon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: '资产',
          tabBarIcon: ({ color, size }) => <TabIcon name={{ ios: 'wallet.pass', android: 'wallet', web: 'wallet' }} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color, size }) => <TabIcon name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

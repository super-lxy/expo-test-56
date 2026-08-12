import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/infrastructure/database/database';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="transaction/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="accounts" options={{ presentation: 'modal' }} />
            <Stack.Screen name="accounts/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="accounts/new" options={{ presentation: 'card' }} />
            <Stack.Screen name="accounts/hidden" options={{ presentation: 'card' }} />
            <Stack.Screen name="categories" options={{ presentation: 'modal' }} />
            <Stack.Screen name="categories/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="tags" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

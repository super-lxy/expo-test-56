import React, { createContext, useCallback, useContext } from 'react';
import { Animated } from 'react-native';

type TabScrollCtx = {
  tabTranslateY: Animated.Value;
  showTabBar: () => void;
  hideTabBar: () => void;
};

const TabScrollContext = createContext<TabScrollCtx | null>(null);

// Animated.Value 在模块级别创建，避免 render 期间访问 ref.current
const tabTranslateY = new Animated.Value(0);

export function TabScrollProvider({ children }: { children: React.ReactNode }) {
  const showTabBar = useCallback(() => {
    Animated.timing(tabTranslateY, {
      toValue: 0,
      duration: 210,
      useNativeDriver: true,
    }).start();
  }, []);

  const hideTabBar = useCallback(() => {
    Animated.timing(tabTranslateY, {
      toValue: 120,
      duration: 210,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <TabScrollContext.Provider value={{ tabTranslateY, showTabBar, hideTabBar }}>
      {children}
    </TabScrollContext.Provider>
  );
}

export function useTabScroll() {
  return useContext(TabScrollContext);
}

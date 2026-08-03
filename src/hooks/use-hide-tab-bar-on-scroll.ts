import { useCallback, useRef } from 'react';
import { useTabScroll } from '@/context/tab-scroll';

const THRESHOLD = 8;  // px 触发隐藏/显示的滚动幅度
const NEAR_TOP = 40;  // px 距顶部多近时强制显示

export function useHideTabBarOnScroll() {
  const ctx = useTabScroll();
  const lastY = useRef(0);

  const onScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (!ctx) return;
      const y = event.nativeEvent.contentOffset.y;

      if (y < NEAR_TOP) {
        ctx.showTabBar();
      } else if (y - lastY.current > THRESHOLD) {
        ctx.hideTabBar();
      } else if (lastY.current - y > THRESHOLD) {
        ctx.showTabBar();
      }
      lastY.current = y;
    },
    [ctx],
  );

  return onScroll;
}

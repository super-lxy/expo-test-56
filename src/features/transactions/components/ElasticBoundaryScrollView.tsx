import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  View,
} from 'react-native';

const MAX_PULL = 74;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ARC_DIAMETER = SCREEN_WIDTH * 1.45;
const ARC_LEFT = (SCREEN_WIDTH - 24 - ARC_DIAMETER) / 2;

function resistedPull(current: number, distance: number) {
  const resistance = Math.max(0.16, 1 - current / MAX_PULL);
  return Math.min(MAX_PULL, current + distance * 0.42 * resistance);
}

export function ElasticBoundaryScrollView({
  style,
  onScroll,
  onLayout,
  onContentSizeChange,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  ...props
}: ScrollViewProps) {
  const [topPull] = useState(() => new Animated.Value(0));
  const [bottomPull] = useState(() => new Animated.Value(0));
  const topPullValue = useRef(0);
  const bottomPullValue = useRef(0);
  const lastTouchY = useRef<number | null>(null);
  const scrollY = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);

  function setTopPull(next: number) {
    topPullValue.current = next;
    topPull.setValue(next);
  }

  function setBottomPull(next: number) {
    bottomPullValue.current = next;
    bottomPull.setValue(next);
  }

  function releasePulls() {
    lastTouchY.current = null;
    topPullValue.current = 0;
    bottomPullValue.current = 0;
    Animated.parallel([
      Animated.spring(topPull, {
        toValue: 0,
        damping: 18,
        stiffness: 150,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.spring(bottomPull, {
        toValue: 0,
        damping: 18,
        stiffness: 150,
        mass: 0.85,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = Math.max(0, event.nativeEvent.contentOffset.y);
    contentHeight.current = event.nativeEvent.contentSize.height;
    viewportHeight.current = event.nativeEvent.layoutMeasurement.height;
    onScroll?.(event);
  }

  function handleLayout(event: LayoutChangeEvent) {
    viewportHeight.current = event.nativeEvent.layout.height;
    onLayout?.(event);
  }

  function handleTouchStart(event: NativeSyntheticEvent<NativeTouchEvent>) {
    topPull.stopAnimation((value) => { topPullValue.current = value; });
    bottomPull.stopAnimation((value) => { bottomPullValue.current = value; });
    lastTouchY.current = event.nativeEvent.pageY;
    onTouchStart?.(event);
  }

  function handleTouchMove(event: NativeSyntheticEvent<NativeTouchEvent>) {
    const currentY = event.nativeEvent.pageY;
    const previousY = lastTouchY.current;
    lastTouchY.current = currentY;
    if (previousY === null) {
      onTouchMove?.(event);
      return;
    }

    const deltaY = currentY - previousY;
    const maxScrollY = Math.max(0, contentHeight.current - viewportHeight.current);
    const atTop = scrollY.current <= 1;
    const atBottom = scrollY.current >= maxScrollY - 1;

    if (deltaY > 0 && atTop) {
      setTopPull(resistedPull(topPullValue.current, deltaY));
      if (bottomPullValue.current > 0) setBottomPull(Math.max(0, bottomPullValue.current - deltaY));
    } else if (deltaY < 0 && atBottom) {
      setBottomPull(resistedPull(bottomPullValue.current, -deltaY));
      if (topPullValue.current > 0) setTopPull(Math.max(0, topPullValue.current + deltaY));
    } else {
      if (topPullValue.current > 0) setTopPull(Math.max(0, topPullValue.current - Math.abs(deltaY)));
      if (bottomPullValue.current > 0) setBottomPull(Math.max(0, bottomPullValue.current - Math.abs(deltaY)));
    }

    onTouchMove?.(event);
  }

  function handleTouchEnd(event: NativeSyntheticEvent<NativeTouchEvent>) {
    releasePulls();
    onTouchEnd?.(event);
  }

  function handleTouchCancel(event: NativeSyntheticEvent<NativeTouchEvent>) {
    releasePulls();
    onTouchCancel?.(event);
  }

  const topTranslateY = topPull.interpolate({
    inputRange: [0, MAX_PULL],
    outputRange: [0, 66],
    extrapolate: 'clamp',
  });
  const bottomTranslateY = bottomPull.interpolate({
    inputRange: [0, MAX_PULL],
    outputRange: [0, -66],
    extrapolate: 'clamp',
  });
  const topOpacity = topPull.interpolate({
    inputRange: [0, 7, MAX_PULL],
    outputRange: [0, 0.18, 0.82],
    extrapolate: 'clamp',
  });
  const bottomOpacity = bottomPull.interpolate({
    inputRange: [0, 7, MAX_PULL],
    outputRange: [0, 0.18, 0.82],
    extrapolate: 'clamp',
  });
  const topScaleX = topPull.interpolate({
    inputRange: [0, MAX_PULL],
    outputRange: [0.62, 1.06],
    extrapolate: 'clamp',
  });
  const bottomScaleX = bottomPull.interpolate({
    inputRange: [0, MAX_PULL],
    outputRange: [0.62, 1.06],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.viewport, style]}>
      <ScrollView
        {...props}
        style={styles.scroll}
        scrollEventThrottle={16}
        overScrollMode="never"
        bounces
        alwaysBounceVertical
        onScroll={handleScroll}
        onLayout={handleLayout}
        onContentSizeChange={(width, height) => {
          contentHeight.current = height;
          onContentSizeChange?.(width, height);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.topArc,
          { opacity: topOpacity, transform: [{ translateY: topTranslateY }, { scaleX: topScaleX }] },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bottomArc,
          { opacity: bottomOpacity, transform: [{ translateY: bottomTranslateY }, { scaleX: bottomScaleX }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flexShrink: 1, overflow: 'hidden' },
  scroll: { flexShrink: 1 },
  topArc: {
    position: 'absolute',
    top: -ARC_DIAMETER,
    left: ARC_LEFT,
    width: ARC_DIAMETER,
    height: ARC_DIAMETER,
    borderRadius: ARC_DIAMETER / 2,
    backgroundColor: '#B9DCC1',
  },
  bottomArc: {
    position: 'absolute',
    bottom: -ARC_DIAMETER,
    left: ARC_LEFT,
    width: ARC_DIAMETER,
    height: ARC_DIAMETER,
    borderRadius: ARC_DIAMETER / 2,
    backgroundColor: '#B9DCC1',
  },
});

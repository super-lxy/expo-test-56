import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppPalette, FontWeight, Numeric, Type } from '@/constants/theme';
import { FORM_SHEET_HEIGHT } from '@/shared/constants/layout';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const HOUR_VALUES = Array.from({ length: 24 }, (_, index) => index);
const MINUTE_VALUES = Array.from({ length: 60 }, (_, index) => index);
const TIME_ROW_HEIGHT = 44;
const TIME_PICKER_HEIGHT = TIME_ROW_HEIGHT * 7;

type Props = {
  visible: boolean;
  mounted: boolean;
  value: Date;
  onChange: (value: Date) => void;
  onClose: () => void;
  onClosed: () => void;
  onConfirm: () => void;
};

function getCalendarDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];
  return [...days, ...Array.from({ length: 42 - days.length }, () => null)];
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, new Date(year, month + 1, 0).getDate());
}

function formatTime(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function formatShortDate(value: Date) {
  return `${value.getMonth() + 1}-${value.getDate()}`;
}

function TimeWheel({
  values,
  value,
  visible,
  suffix,
  onChange,
}: {
  values: number[];
  value: number;
  visible: boolean;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: value * TIME_ROW_HEIGHT, animated: false });
    });
  }, [value, visible]);

  function commitScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round(event.nativeEvent.contentOffset.y / TIME_ROW_HEIGHT)),
    );
    if (values[index] !== value) onChange(values[index]);
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.timeWheel}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={TIME_ROW_HEIGHT}
      decelerationRate="fast"
      contentContainerStyle={styles.timeWheelContent}
      onMomentumScrollEnd={commitScroll}
      onScrollEndDrag={commitScroll}>
      {values.map((item) => {
        const selected = item === value;
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`${item}${suffix}`}
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(item);
              scrollRef.current?.scrollTo({ y: item * TIME_ROW_HEIGHT, animated: true });
            }}
            style={styles.timeWheelRow}>
            <ThemedText style={[styles.timeWheelValue, selected && styles.timeWheelValueSelected]}>
              {String(item).padStart(2, '0')}{selected ? ` ${suffix}` : ''}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function DateTimePickerSheet({
  visible,
  mounted,
  value,
  onChange,
  onClose,
  onClosed,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [fade] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [sheetHeight, setSheetHeight] = useState(0);
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const bottomGap = Math.max(insets.bottom, 12);

  useEffect(() => {
    if (visible) {
      if (!mounted || !sheetHeight) return;
      translateY.setValue(sheetHeight + bottomGap);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (!mounted) return;
    let closed = false;
    const finishClose = () => {
      if (closed) return;
      closed = true;
      setMode('date');
      onClosed();
    };
    const closeAnimation = Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: (sheetHeight || SCREEN_HEIGHT) + bottomGap,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    // Some Android builds can interrupt a native-driver callback while a
    // transparent Modal is closing. The fallback prevents an invisible Modal
    // window from continuing to intercept touches after the sheet disappears.
    const closeFallback = setTimeout(finishClose, 360);
    closeAnimation.start(({ finished }) => {
      if (!finished) return;
      clearTimeout(closeFallback);
      finishClose();
    });
    return () => {
      clearTimeout(closeFallback);
      closeAnimation.stop();
    };
  }, [bottomGap, fade, mounted, onClosed, sheetHeight, translateY, visible]);

  function selectDay(day: number) {
    const next = new Date(value);
    next.setDate(day);
    onChange(next);
  }

  function changeMonth(offset: number) {
    const next = new Date(value);
    const originalDay = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + offset);
    next.setDate(clampDay(next.getFullYear(), next.getMonth(), originalDay));
    onChange(next);
  }

  function changeTime(field: 'hour' | 'minute', nextValue: number) {
    const next = new Date(value);
    if (field === 'hour') next.setHours(nextValue);
    else next.setMinutes(nextValue);
    onChange(next);
  }

  function selectCurrentTime() {
    const now = new Date();
    now.setSeconds(0, 0);
    onChange(now);
  }

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            if (nextHeight > 0 && nextHeight !== sheetHeight) setSheetHeight(nextHeight);
          }}
          style={[styles.sheet, { marginBottom: bottomGap, transform: [{ translateY }] }]}>
          <View style={styles.pickerBody}>
            {mode === 'date' ? (
              <>
                <View style={styles.calendarHeader}>
                  <ThemedText style={styles.monthTitle}>
                    {value.getFullYear()}年{value.getMonth() + 1}月
                  </ThemedText>
                  <View style={styles.monthActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="上个月"
                      onPress={() => changeMonth(-1)}
                      hitSlop={8}
                      style={styles.monthButton}>
                      <ThemedText style={styles.monthButtonText}>‹</ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="下个月"
                      onPress={() => changeMonth(1)}
                      hitSlop={8}
                      style={styles.monthButton}>
                      <ThemedText style={styles.monthButtonText}>›</ThemedText>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.weekdayRow}>
                  {WEEKDAY_LABELS.map((label) => (
                    <ThemedText key={label} style={styles.weekdayText}>{label}</ThemedText>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {getCalendarDays(value).map((day, index) => {
                    const selected = day === value.getDate();
                    return day === null ? (
                      <View key={`empty-${index}`} style={styles.calendarDay} />
                    ) : (
                      <Pressable
                        key={day}
                        accessibilityRole="button"
                        accessibilityLabel={`${day}日`}
                        accessibilityState={{ selected }}
                        onPress={() => selectDay(day)}
                        style={({ pressed }) => [
                          styles.calendarDay,
                          selected && styles.calendarDaySelected,
                          pressed && styles.calendarDayPressed,
                        ]}>
                        <ThemedText style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>
                          {day}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.timePickerStage}>
                <View pointerEvents="none" style={styles.timeSelectionBar} />
                <TimeWheel
                  values={HOUR_VALUES}
                  value={value.getHours()}
                  visible={visible && mode === 'time'}
                  suffix="小时"
                  onChange={(nextValue) => changeTime('hour', nextValue)}
                />
                <TimeWheel
                  values={MINUTE_VALUES}
                  value={value.getMinutes()}
                  visible={visible && mode === 'time'}
                  suffix="分钟"
                  onChange={(nextValue) => changeTime('minute', nextValue)}
                />
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Pressable onPress={selectCurrentTime} style={({ pressed }) => [styles.footerButton, pressed && styles.footerButtonPressed]}>
              <ThemedText style={styles.footerButtonText}>当前时间</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setMode((current) => current === 'date' ? 'time' : 'date')}
              style={({ pressed }) => [styles.footerButton, styles.modeButton, pressed && styles.footerButtonPressed]}>
              <ThemedText style={styles.footerButtonText} numberOfLines={1}>
                {mode === 'date' ? `时间 ${formatTime(value)}` : `日期 ${formatShortDate(value)}`}
              </ThemedText>
            </Pressable>
            <Pressable onPress={onConfirm} style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmButtonPressed]}>
              <ThemedText style={styles.confirmText}>确认</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: AppPalette.overlay },
  sheet: {
    height: FORM_SHEET_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: AppPalette.surface,
    borderWidth: 1,
    borderColor: AppPalette.line,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D1C',
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
      },
      default: { elevation: 10 },
    }),
  },
  pickerBody: { flex: 1 },
  calendarHeader: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  monthButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  monthButtonText: { fontSize: 27, lineHeight: 30, color: AppPalette.ink },
  monthTitle: { ...Type.headline, ...Numeric, fontWeight: FontWeight.semibold, color: AppPalette.ink },
  weekdayRow: { height: 34, flexDirection: 'row', alignItems: 'center' },
  weekdayText: { width: '14.2857%', textAlign: 'center', ...Type.caption, color: AppPalette.textMuted },
  calendarGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'space-around' },
  calendarDay: { width: '14.2857%', height: '16.6667%', minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  calendarDaySelected: { backgroundColor: AppPalette.primary },
  calendarDayPressed: { opacity: 0.62 },
  calendarDayText: { ...Type.body, ...Numeric, color: AppPalette.ink },
  calendarDayTextSelected: { color: AppPalette.surface, fontWeight: FontWeight.semibold },
  timePickerStage: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'hidden' },
  timeSelectionBar: { position: 'absolute', zIndex: 0, left: 18, right: 18, top: '50%', height: TIME_ROW_HEIGHT, marginTop: -(TIME_ROW_HEIGHT / 2), borderRadius: 12, backgroundColor: AppPalette.surfaceMuted },
  timeWheel: { width: 118, maxWidth: 118, height: TIME_PICKER_HEIGHT, flexGrow: 0 },
  timeWheelContent: { paddingVertical: TIME_ROW_HEIGHT * 3 },
  timeWheelRow: { height: TIME_ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  timeWheelValue: { ...Type.headline, ...Numeric, color: AppPalette.textFaint },
  timeWheelValueSelected: { ...Type.title, color: AppPalette.ink, fontWeight: FontWeight.semibold },
  footer: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  footerButton: { height: 40, minWidth: 88, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: AppPalette.surfaceMuted },
  modeButton: { minWidth: 112 },
  footerButtonPressed: { backgroundColor: AppPalette.lineStrong },
  footerButtonText: { ...Type.body, ...Numeric, color: AppPalette.ink, fontWeight: FontWeight.medium },
  confirmButton: { height: 40, minWidth: 62, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: AppPalette.primary },
  confirmButtonPressed: { backgroundColor: AppPalette.primaryPressed },
  confirmText: { ...Type.body, color: AppPalette.surface, fontWeight: FontWeight.semibold },
});

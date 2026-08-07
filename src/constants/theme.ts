/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17212B',
    background: '#F5F7FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8EEF2',
    textSecondary: '#71808C',
  },
  dark: {
    text: '#F7FAFC',
    background: '#101820',
    backgroundElement: '#18232D',
    backgroundSelected: '#263744',
    textSecondary: '#A8B7C2',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * 字号阶梯。相邻两级至少相差 2px，避免 14/15/16 这类肉眼分不清、
 * 但堆在一屏里会显得杂乱的字号同时出现。
 * hero 只留给每屏唯一的焦点金额，其余层级按语义取用。
 */
export const Type = {
  caption: { fontSize: 11, lineHeight: 16 },
  footnote: { fontSize: 12, lineHeight: 17 },
  subhead: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 14, lineHeight: 20 },
  headline: { fontSize: 16, lineHeight: 22 },
  title: { fontSize: 20, lineHeight: 26 },
  display: { fontSize: 24, lineHeight: 31 },
  hero: { fontSize: 28, lineHeight: 34 },
} as const;

/** 字重上限为 bold —— 800/900 在中文字形下会糊成一团，并让字号显得比实际更大。 */
export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** 图标字形（emoji、箭头、符号）不参与文本阶梯，单独收敛为四档。 */
export const GlyphSize = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
  xxl: 40,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

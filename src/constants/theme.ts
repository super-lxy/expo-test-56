/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * App-wide semantic palette.
 *
 * Brand/account colors remain domain data. These colors are reserved for the
 * application shell, interaction states and financial meaning.
 */
export const AppPalette = {
  ink: '#24262E',
  inkSoft: '#454A52',
  textMuted: '#858C94',
  textFaint: '#B2B7BD',
  canvas: '#F7F7F8',
  canvasWarm: '#FAF7F6',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F2F3',
  line: '#ECEDEF',
  lineStrong: '#DFE2E5',
  primary: '#2B2D35',
  primaryPressed: '#202229',
  expense: '#F08A55',
  expenseSoft: '#FFF0E6',
  income: '#37C98A',
  incomeSoft: '#E4F8EF',
  danger: '#E3615B',
  dangerSoft: '#FCE9E7',
  warning: '#E9A544',
  warningSoft: '#FFF4DF',
  blush: '#F9ECEF',
  cyanSoft: '#EAF7F8',
  lavenderSoft: '#F1EDF8',
  overlay: 'rgba(27, 29, 35, 0.40)',
  shadow: '#59616B',
} as const;

export const Colors = {
  light: {
    text: AppPalette.ink,
    background: AppPalette.canvas,
    backgroundElement: AppPalette.surface,
    backgroundSelected: AppPalette.surfaceMuted,
    textSecondary: AppPalette.textMuted,
  },
  dark: {
    text: '#F7F7F8',
    background: '#17181D',
    backgroundElement: '#22242B',
    backgroundSelected: '#30333C',
    textSecondary: '#A8ADB5',
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
 *
 * 行高：正文档位取 1.45 倍。汉字是满方框字形，没有拉丁字母的升降部留白，
 * 1.4 以下会显得拥挤。标题档位随字号增大逐步收紧到 1.25，
 * 大字本身已经够醒目，行距太松反而散。
 * 标题另加负字距 —— 大字号下默认字距看起来偏松。
 */
export const Type = {
  caption: { fontSize: 11, lineHeight: 16 },
  footnote: { fontSize: 12, lineHeight: 18 },
  subhead: { fontSize: 13, lineHeight: 19 },
  body: { fontSize: 14, lineHeight: 21 },
  headline: { fontSize: 16, lineHeight: 23 },
  title: { fontSize: 20, lineHeight: 27, letterSpacing: -0.2 },
  display: { fontSize: 24, lineHeight: 31, letterSpacing: -0.3 },
  hero: { fontSize: 28, lineHeight: 35, letterSpacing: -0.4 },
} as const;

/**
 * 金额与数字统一叠加这一组样式。
 *
 * tabular-nums：等宽数字。默认的比例数字里 `1` 比 `8` 窄，
 * 列表里每行金额的小数点对不齐，金额变动时还会左右跳动。
 * iOS 再叠一层 SF Rounded —— 数字更圆润，中文部分仍回退到苹方。
 */
export const Numeric = {
  fontVariant: ['tabular-nums'] as ['tabular-nums'],
  ...Platform.select({ ios: { fontFamily: 'ui-rounded' }, default: {} }),
};

/** 字重上限为 bold —— 800/900 在中文字形下会糊成一团，并让字号显得比实际更大。 */
export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * 图标字形（emoji、箭头、符号）不参与文本阶梯，单独收敛为五档。
 *
 * 必须连 lineHeight 一起展开（`...Glyph.lg`），不能只覆盖 fontSize ——
 * ThemedText 默认带 Type.body 的 lineHeight: 20，
 * 单给一个更大的 fontSize 会让 emoji 上下被行高截断。
 * emoji 的字形盒比字号略高，行高按 1.25 倍留余量。
 */
export const Glyph = {
  sm: { fontSize: 14, lineHeight: 18 },
  md: { fontSize: 18, lineHeight: 23 },
  lg: { fontSize: 22, lineHeight: 28 },
  xl: { fontSize: 28, lineHeight: 35 },
  xxl: { fontSize: 40, lineHeight: 50 },
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

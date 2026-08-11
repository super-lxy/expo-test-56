import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { AppPalette, FontWeight, Fonts, ThemeColor, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    ...Type.footnote,
    fontWeight: FontWeight.regular,
  },
  smallBold: {
    ...Type.footnote,
    fontWeight: FontWeight.semibold,
  },
  default: {
    ...Type.body,
    fontWeight: FontWeight.regular,
  },
  /** 页面级标题，每屏只出现一次 */
  title: {
    ...Type.display,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  /** 卡片 / 分区标题 */
  subtitle: {
    ...Type.headline,
    fontWeight: FontWeight.semibold,
  },
  link: {
    ...Type.body,
    lineHeight: 26,
  },
  linkPrimary: {
    ...Type.body,
    lineHeight: 26,
    color: AppPalette.expense,
  },
  code: {
    ...Type.footnote,
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: FontWeight.bold }) ?? FontWeight.medium,
  },
});

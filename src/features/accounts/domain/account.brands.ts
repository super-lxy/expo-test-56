import type { ImageSourcePropType } from 'react-native';

/**
 * 模板 id → 品牌素材。
 *
 * - `icon`：左侧圆形图标。
 * - `mark`：右下角放大水印；可以与 icon 共用原图，再单独校准尺寸与位置。
 * - 原图留白不一致时，通过 fit/size 配置补偿，不修改原始图片。
 *
 * 没有品牌素材时，卡片会回退到统一的 Expo Symbols 图标。
 *
 * require 路径必须是字面量 —— Metro 打包期静态解析，
 * 拼接出来的路径（`require(`...${id}.png`)`）会直接打包失败。
 */
export type BrandAssets = {
  icon?: ImageSourcePropType;
  /** 横向品牌 Logo 可以靠左裁切，只保留图形标记。 */
  iconPosition?: 'center' | 'left';
  iconFit?: 'contain' | 'cover';
  iconSize?: number;
  mark?: ImageSourcePropType;
  markPosition?: 'center' | 'left';
  markFit?: 'contain' | 'cover';
  markSize?: number;
  markOpacity?: number;
  markRight?: number;
  markBottom?: number;
};

export const BRAND_ASSETS: Partial<Record<string, BrandAssets>> = {
  cash: {
    icon: require('@/assets/images/brands/cash-icon.png'),
    mark: require('@/assets/images/brands/cash-icon.png'),
  },
  bank: {
    icon: require('@/assets/images/brands/bank-icon.png'),
    mark: require('@/assets/images/brands/bank-icon.png'),
  },
  alipay: {
    icon: require('@/assets/images/brands/alipay-platform-icon.png'),
    iconFit: 'cover',
    iconSize: 44,
    mark: require('@/assets/images/brands/alipay-platform-icon.png'),
    markFit: 'cover',
    markSize: 90,
    markRight: -26,
    markBottom: -26,
  },
  wechat: {
    icon: require('@/assets/images/brands/wechat-icon.png'),
    iconFit: 'cover',
    mark: require('@/assets/images/brands/wechat-icon.png'),
    markFit: 'cover',
  },
  'transit-card': {
    icon: require('@/assets/images/brands/transit-card-icon.png'),
    mark: require('@/assets/images/brands/transit-card-icon.png'),
  },
  baitiao: {
    icon: require('@/assets/images/brands/jd-icon.png'),
    mark: require('@/assets/images/brands/jd-icon.png'),
  },
  huabei: {
    icon: require('@/assets/images/brands/huabei-icon.png'),
    mark: require('@/assets/images/brands/huabei-icon.png'),
  },
  'douyin-pay': {
    icon: require('@/assets/images/brands/douyin-pay-icon.png'),
    mark: require('@/assets/images/brands/douyin-pay-icon.png'),
  },
  'meal-card': {
    icon: require('@/assets/images/brands/meal-card-icon.png'),
    mark: require('@/assets/images/brands/meal-card-icon.png'),
  },
  'shopping-card': {
    icon: require('@/assets/images/brands/shopping-card-icon.png'),
    mark: require('@/assets/images/brands/shopping-card-icon.png'),
  },
  'housing-fund': {
    icon: require('@/assets/images/brands/housing-fund-icon.png'),
    mark: require('@/assets/images/brands/housing-fund-icon.png'),
  },
  wallet: {
    icon: require('@/assets/images/brands/wallet-icon.png'),
    mark: require('@/assets/images/brands/wallet-icon.png'),
  },
  'credit-card': {
    icon: require('@/assets/images/brands/credit-card-icon.png'),
    mark: require('@/assets/images/brands/credit-card-icon.png'),
  },
};

export function findBrandAssets(templateId: string): BrandAssets | undefined {
  return BRAND_ASSETS[templateId];
}

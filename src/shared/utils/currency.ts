export function formatCurrency(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

/** 图表 Y 轴用，大数字显示为「万」单位 */
export function formatCurrencyCompact(cents: number) {
  const yuan = cents / 100;
  if (Math.abs(yuan) >= 10000) {
    return `¥${(yuan / 10000).toFixed(1)}万`;
  }
  return `¥${Math.round(yuan)}`;
}

export function parseAmountToCents(value: string) {
  const normalized = value.replace(',', '.').trim();
  if (!normalized || !/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return 0;
  }
  return Math.round(Number(normalized) * 100);
}

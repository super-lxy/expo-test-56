export function formatCurrency(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function parseAmountToCents(value: string) {
  const normalized = value.replace(',', '.').trim();
  if (!normalized || !/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return 0;
  }
  return Math.round(Number(normalized) * 100);
}

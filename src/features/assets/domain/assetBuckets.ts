import type { AccountBalance, AccountType } from '@/features/accounts/domain/account.types';

export type AssetSlice = {
  key: string;
  label: string;
  color: string;
  cents: number;
  percent: number;
};

type BucketDef = {
  key: string;
  label: string;
  color: string;
  /** 空数组表示 catch-all，兜住所有未被前面桶匹配的资产 */
  types: AccountType[];
};

/**
 * 最大余数法：先给每项取整数部分，剩下的百分点按小数部分从大到小补齐。
 * 各项独立 Math.round 会让加总偏离 100%，这里保证精确等于 100。
 */
function distributePercent(values: number[], total: number): number[] {
  if (total <= 0) return values.map(() => 0);

  const exact = values.map((v) => (v / total) * 100);
  const floored = exact.map(Math.floor);
  let remaining = 100 - floored.reduce((sum, n) => sum + n, 0);

  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floored];
  for (const { index } of order) {
    if (remaining <= 0) break;
    result[index] += 1;
    remaining -= 1;
  }
  return result;
}

/** 顺序即匹配优先级，最后一个是 catch-all */
const BUCKETS: BucketDef[] = [
  { key: 'cash', label: '现金', color: '#9DAB9C', types: ['cash'] },
  { key: 'bank', label: '银行卡', color: '#C1AE70', types: ['bank'] },
  { key: 'ewallet', label: '电子钱包', color: '#B89BA0', types: ['alipay', 'wechat', 'wallet'] },
  { key: 'prepaid', label: '储值卡', color: '#8FA8B5', types: ['transit-card', 'meal-card', 'shopping-card'] },
  { key: 'fund', label: '公积金', color: '#7FA893', types: ['housing-fund'] },
  { key: 'invest', label: '投资', color: '#B5937F', types: ['fund', 'stock', 'deposit'] },
  { key: 'receivable', label: '应收', color: '#A69BB8', types: ['receivable'] },
  { key: 'other', label: '其他', color: '#A8A8A2', types: [] },
];

/**
 * 把资产账户分桶并算百分比。负债账户完全排除（它们在负债合计里）。
 *
 * 分母用「钳到 0 后的各桶之和」而不是 totalAssets：资产账户余额可能为负
 * （储蓄卡透支等），钳到 0 后各桶之和会大于 totalAssets，拿后者当分母会让
 * 百分比超过 100。hero 卡上显示的 totalAssets 不受影响。
 */
export function buildAssetBreakdown(accounts: AccountBalance[]): AssetSlice[] {
  const assets = accounts.filter((a) => a.kind !== 'liability');

  const claimed = new Set<AccountType>();
  for (const bucket of BUCKETS) {
    for (const type of bucket.types) claimed.add(type);
  }

  const cents = BUCKETS.map((bucket) => {
    const matched = bucket.types.length > 0
      ? assets.filter((a) => bucket.types.includes(a.type))
      : assets.filter((a) => !claimed.has(a.type));
    return matched.reduce((sum, a) => sum + Math.max(0, a.balanceCents), 0);
  });

  const base = cents.reduce((sum, n) => sum + n, 0);
  const percents = distributePercent(cents, base);

  return BUCKETS.map((bucket, index) => ({
    key: bucket.key,
    label: bucket.label,
    color: bucket.color,
    cents: cents[index],
    percent: percents[index],
  })).filter((slice) => slice.cents > 0);
}

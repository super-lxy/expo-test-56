import type { AccountKind, AccountType } from './account.types';

export type AccountTemplate = {
  id: string;
  label: string;
  type: AccountType;
  kind: AccountKind;
  icon: string;
  color: string;
  /** 卡片副标题，说明用途 */
  hint: string;
};

export type TemplateGroup = {
  key: 'funds' | 'invest' | 'receivable' | 'payable';
  label: string;
  templates: AccountTemplate[];
};

export const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    key: 'funds',
    label: '资金',
    templates: [
      { id: 'cash', label: '现金', type: 'cash', kind: 'asset', icon: '💵', color: '#22C55E', hint: '钱包里的纸币和硬币' },
      { id: 'bank', label: '储蓄卡', type: 'bank', kind: 'asset', icon: '🏦', color: '#3B82F6', hint: '银行借记卡活期存款' },
      { id: 'alipay', label: '支付宝', type: 'alipay', kind: 'asset', icon: '🅰️', color: '#1677FF', hint: '余额与余额宝' },
      { id: 'wechat', label: '微信钱包', type: 'wechat', kind: 'asset', icon: '💬', color: '#07C160', hint: '零钱与零钱通' },
      { id: 'transit-card', label: '交通卡', type: 'transit-card', kind: 'asset', icon: '🚇', color: '#0EA5E9', hint: '地铁公交充值卡' },
      { id: 'meal-card', label: '饭卡', type: 'meal-card', kind: 'asset', icon: '🍚', color: '#F97316', hint: '食堂或公司餐补' },
      { id: 'shopping-card', label: '购物卡', type: 'shopping-card', kind: 'asset', icon: '🎫', color: '#EC4899', hint: '商场储值与礼品卡' },
      { id: 'housing-fund', label: '公积金', type: 'housing-fund', kind: 'asset', icon: '🏠', color: '#14B8A6', hint: '住房公积金账户余额' },
      { id: 'wallet', label: '其他钱包', type: 'wallet', kind: 'asset', icon: '👛', color: '#8B5CF6', hint: '其他电子钱包余额' },
      { id: 'credit-card', label: '信用卡', type: 'credit-card', kind: 'liability', icon: '💳', color: '#EF4444', hint: '已用额度记为负债' },
      { id: 'huabei', label: '花呗', type: 'huabei', kind: 'liability', icon: '🌸', color: '#1677FF', hint: '待还金额记为负债' },
      { id: 'baitiao', label: '白条', type: 'baitiao', kind: 'liability', icon: '🧾', color: '#E1251B', hint: '京东白条待还' },
    ],
  },
  {
    key: 'invest',
    label: '投资',
    templates: [
      { id: 'fund', label: '基金', type: 'fund', kind: 'asset', icon: '📈', color: '#F59E0B', hint: '场外基金持仓市值' },
      { id: 'stock', label: '股票', type: 'stock', kind: 'asset', icon: '📊', color: '#EF4444', hint: '证券账户总市值' },
      { id: 'deposit', label: '定期存款', type: 'deposit', kind: 'asset', icon: '🔒', color: '#0891B2', hint: '定期与大额存单' },
    ],
  },
  {
    key: 'receivable',
    label: '应收',
    templates: [
      { id: 'receivable', label: '借出款', type: 'receivable', kind: 'asset', icon: '🤝', color: '#22C55E', hint: '别人欠你的钱' },
    ],
  },
  {
    key: 'payable',
    label: '应付',
    templates: [
      { id: 'payable', label: '借入款', type: 'payable', kind: 'liability', icon: '📮', color: '#F97316', hint: '你欠别人的钱' },
      { id: 'other', label: '其他负债', type: 'other', kind: 'liability', icon: '📌', color: '#64748B', hint: '房贷、车贷等' },
    ],
  },
];

export function findTemplate(id: string): AccountTemplate | undefined {
  for (const group of TEMPLATE_GROUPS) {
    const found = group.templates.find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}

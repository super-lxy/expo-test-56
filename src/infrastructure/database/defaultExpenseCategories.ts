export type DefaultExpenseCategorySeed = {
  id: string;
  name: string;
  parentId: string | null;
  icon: string;
  iconType: 'emoji' | 'image';
  iconMime: string | null;
  color: string;
  sortOrder: number;
};

type DefaultExpenseRoot = {
  id: string;
  name: string;
  color: string;
  iconAsset: number;
  children: readonly (readonly [id: string, name: string, emoji: string])[];
};

export const DEFAULT_EXPENSE_ROOTS: readonly DefaultExpenseRoot[] = [
  {
    id: 'expense-dining',
    name: '餐饮',
    color: '#E98A58',
    iconAsset: require('../../../assets/images/categories/dining.png'),
    children: [
      ['meal', '正餐', '🍽️'],
      ['breakfast', '早餐', '🍳'],
      ['delivery', '外卖', '🛵'],
      ['coffee-tea', '咖啡茶饮', '☕'],
      ['snacks-fruit', '零食水果', '🍎'],
      ['gathering', '聚餐', '🥂'],
    ],
  },
  {
    id: 'expense-housing',
    name: '居住',
    color: '#D6A15C',
    iconAsset: require('../../../assets/images/categories/housing.png'),
    children: [
      ['rent', '房租', '🔑'],
      ['mortgage', '房贷', '🏦'],
      ['property', '物业', '🏢'],
      ['utilities', '水电燃气', '💡'],
      ['repair', '维修', '🔧'],
      ['housekeeping', '家政', '🧹'],
    ],
  },
  {
    id: 'expense-transport',
    name: '交通',
    color: '#D9B72F',
    iconAsset: require('../../../assets/images/categories/transport.png'),
    children: [
      ['public-transit', '公交地铁', '🚌'],
      ['taxi', '打车', '🚕'],
      ['shared-mobility', '共享出行', '🚲'],
      ['train', '火车', '🚆'],
      ['high-speed-rail', '高铁', '🚄'],
      ['flight', '飞机', '✈️'],
      ['fuel', '加油', '⛽'],
      ['parking', '停车', '🅿️'],
      ['vehicle-maintenance', '车辆养护', '🚗'],
    ],
  },
  {
    id: 'expense-daily',
    name: '日用',
    color: '#7E9A87',
    iconAsset: require('../../../assets/images/categories/daily.png'),
    children: [
      ['cleaning', '清洁用品', '🧽'],
      ['paper', '纸品', '🧻'],
      ['kitchen-bath', '厨卫用品', '🧴'],
      ['consumables', '生活耗材', '📦'],
    ],
  },
  {
    id: 'expense-clothing',
    name: '服饰',
    color: '#A57AB2',
    iconAsset: require('../../../assets/images/categories/clothing.png'),
    children: [
      ['clothes', '衣服', '👕'],
      ['shoes', '鞋靴', '👟'],
      ['bags', '箱包', '👜'],
      ['accessories', '配饰', '💍'],
    ],
  },
  {
    id: 'expense-beauty',
    name: '个护',
    color: '#D9899E',
    iconAsset: require('../../../assets/images/categories/beauty.png'),
    children: [
      ['skincare', '护肤', '🧴'],
      ['makeup', '彩妆', '💄'],
      ['haircut', '理发', '✂️'],
      ['hairdressing', '美发', '💇'],
      ['manicure', '美甲', '💅'],
      ['wash-care', '洗护用品', '🧼'],
    ],
  },
  {
    id: 'expense-digital',
    name: '数码',
    color: '#6887A7',
    iconAsset: require('../../../assets/images/categories/digital.png'),
    children: [
      ['phones-computers', '手机电脑', '💻'],
      ['accessories', '数码配件', '🎧'],
      ['appliances', '家电', '📺'],
      ['repair', '维修', '🛠️'],
    ],
  },
  {
    id: 'expense-home',
    name: '家居',
    color: '#9A7B65',
    iconAsset: require('../../../assets/images/categories/home.png'),
    children: [
      ['furniture', '家具', '🛋️'],
      ['bedding', '床品', '🛏️'],
      ['kitchenware', '厨具', '🍳'],
      ['decor', '家居装饰', '🪴'],
    ],
  },
  {
    id: 'expense-entertainment',
    name: '娱乐',
    color: '#7D78A7',
    iconAsset: require('../../../assets/images/categories/entertainment.png'),
    children: [
      ['movies', '电影', '🎬'],
      ['games', '游戏', '🎮'],
      ['shows', '演出', '🎭'],
      ['tickets', '景点门票', '🎫'],
      ['leisure', '休闲娱乐', '🎯'],
    ],
  },
  {
    id: 'expense-health',
    name: '医疗',
    color: '#4E9A87',
    iconAsset: require('../../../assets/images/categories/health.png'),
    children: [
      ['consultation', '挂号诊疗', '🩺'],
      ['medicine', '药品', '💊'],
      ['checkup', '体检', '🧪'],
      ['dental', '牙科', '🦷'],
      ['fitness', '健身', '🏋️'],
    ],
  },
  {
    id: 'expense-education',
    name: '教育',
    color: '#5E84A8',
    iconAsset: require('../../../assets/images/categories/education.png'),
    children: [
      ['books', '书籍', '📚'],
      ['courses', '课程', '🧑‍🏫'],
      ['training', '培训', '📝'],
      ['exams', '考试', '✍️'],
      ['tools', '学习工具', '📐'],
    ],
  },
  {
    id: 'expense-relationships',
    name: '人情',
    color: '#D37872',
    iconAsset: require('../../../assets/images/categories/relationships.png'),
    children: [
      ['red-envelope', '红包', '🧧'],
      ['gifts', '礼物', '🎁'],
      ['treats', '请客', '🍻'],
      ['cash-gifts', '人情礼金', '💌'],
    ],
  },
  {
    id: 'expense-family',
    name: '家庭',
    color: '#B48468',
    iconAsset: require('../../../assets/images/categories/family.png'),
    children: [
      ['children', '子女', '🧒'],
      ['parents', '父母', '👵'],
      ['pets', '宠物', '🐾'],
    ],
  },
  {
    id: 'expense-subscriptions',
    name: '通讯',
    color: '#6C8BA4',
    iconAsset: require('../../../assets/images/categories/subscriptions.png'),
    children: [
      ['mobile', '手机话费', '📱'],
      ['broadband', '宽带', '🌐'],
      ['media', '影音会员', '📺'],
      ['software', '软件订阅', '💻'],
      ['cloud', '云服务', '☁️'],
    ],
  },
  {
    id: 'expense-insurance',
    name: '保险',
    color: '#778F62',
    iconAsset: require('../../../assets/images/categories/insurance.png'),
    children: [
      ['commercial-insurance', '商业保险', '🛡️'],
      ['taxes', '税费', '🧾'],
      ['admin-fees', '行政费用', '🏛️'],
      ['service-fees', '手续费', '💳'],
    ],
  },
  {
    id: 'expense-other',
    name: '其他',
    color: '#7C858C',
    iconAsset: require('../../../assets/images/categories/other.png'),
    children: [
      ['misc-low-frequency', '无法归类的低频支出', '📌'],
    ],
  },
];

export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultExpenseCategorySeed[] =
  DEFAULT_EXPENSE_ROOTS.flatMap((root, rootIndex) => {
    const rootSortOrder = rootIndex + 1;
    return [
      {
        id: root.id,
        name: root.name,
        parentId: null,
        icon: '',
        iconType: 'image' as const,
        iconMime: 'image/png',
        color: root.color,
        sortOrder: rootSortOrder,
      },
      {
        id: `${root.id}-default`,
        name: root.name,
        parentId: root.id,
        icon: '',
        iconType: 'image' as const,
        iconMime: 'image/png',
        color: root.color,
        sortOrder: rootSortOrder * 100,
      },
      ...root.children.map(([childId, name, emoji], childIndex) => ({
        id: `${root.id}-${childId}`,
        name,
        parentId: root.id,
        icon: emoji,
        iconType: 'emoji' as const,
        iconMime: null,
        color: root.color,
        sortOrder: rootSortOrder * 100 + childIndex + 1,
      })),
    ];
  });

export const DEFAULT_EXPENSE_ROOT_RENAMES = [
  ['expense-beauty', '个护美妆', '个护'],
  ['expense-digital', '数码家电', '数码'],
  ['expense-entertainment', '娱乐休闲', '娱乐'],
  ['expense-health', '医疗健康', '医疗'],
  ['expense-education', '教育成长', '教育'],
  ['expense-relationships', '人情往来', '人情'],
  ['expense-family', '家庭成员', '家庭'],
  ['expense-subscriptions', '通讯订阅', '通讯'],
  ['expense-insurance', '保险税费', '保险'],
] as const;

export const LEGACY_EXPENSE_ROOT_IDS = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'housing',
  'daily',
  'relationships',
  'travel',
  'medical',
  'membership',
] as const;

export const LEGACY_EXPENSE_CATEGORY_IDS = [
  ...LEGACY_EXPENSE_ROOT_IDS,
  ...LEGACY_EXPENSE_ROOT_IDS.map((id) => `${id}-default`),
  'flight',
  'subway',
  'bus',
  'taxi',
  'fuel',
] as const;

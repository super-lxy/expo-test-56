import { parseRecognizedBill, type RecognizedBill } from '../domain/recognizedBill';
import { getAiConfig } from './aiConfig';

type RecognizeBillInput = {
  imageDataUrl: string;
  instruction?: string;
  context?: AiLedgerContext;
  currentBill?: RecognizedBill;
};

export type ProbeAiModelsInput = {
  providerBaseUrl: string;
  apiKey: string;
};

export type AiLedgerContext = {
  categories: { type: 'expense' | 'income'; name: string; parentName: string | null }[];
  accounts: string[];
};

const recognitionInstructions = `你是一个严谨的中文记账助手。请从用户提供的账单、小票或支付截图中提取一笔最主要的账单。
只返回结构化字段，不要猜测看不清的信息：金额必须换算为人民币分，type 只能是 expense 或 income。
merchant 和 paymentMethod 返回图片中看到的自然语言名称，不要返回任何数据库 ID。
parentCategoryName 和 categoryName 不是图片文字的抄录，而是对消费内容的分类：结合商户、商品/服务明细和备注，从本地账本上下文中选择语义最准确、最具体的一级分类和二级分类。
note 只记录其他字段没有表达、且有助于用户回忆的信息，例如商品、服务或订单备注。金额只能放在 amountCents；note 不得重复金额、日期、收支类型、分类、账户或“消费了多少钱”等内容，没有独立备注时返回 null。
occurredAt 只在能确定日期或日期时间时返回 ISO 8601 字符串，否则返回 null；没有明确年份时不要擅自补年份。
confidence 是整体识别置信度（0 到 1），uncertainFields 列出需要用户确认的字段名。summary 用简短中文描述识别结果。
如果图片不是账单或无法识别金额，请将 amountCents 设为 1，并在 uncertainFields 中加入 amount，summary 中明确说明无法确认金额。
如果用户输入包含当前账单草稿和修改要求，只修改用户明确要求或图片证据明确冲突的字段，保留其余字段；用户确认过的字段要从 uncertainFields 中移除，并返回修改后的完整账单。`;

const recognizedBillJsonSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['expense', 'income'] },
    amountCents: { type: 'integer', minimum: 1 },
    merchant: { type: ['string', 'null'] },
    parentCategoryName: { type: ['string', 'null'], description: '本地账本中的一级分类名称，不包含二级分类或分隔符' },
    categoryName: { type: ['string', 'null'], description: '本地账本中的二级分类名称，不包含一级分类或分隔符' },
    paymentMethod: { type: ['string', 'null'] },
    occurredAt: { type: ['string', 'null'] },
    note: { type: ['string', 'null'], description: '商品、服务或订单备注，不得包含金额或重复其他结构化字段' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    uncertainFields: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['type', 'amountCents', 'merchant', 'parentCategoryName', 'categoryName', 'paymentMethod', 'occurredAt', 'note', 'confidence', 'uncertainFields', 'summary'],
  additionalProperties: false,
};

function providerUrl(baseUrl: string, path: string) {
  const normalized = baseUrl.trim().replace(/\/$/, '');
  if (!normalized) throw new Error('请先在设置中填写服务商 Base URL');
  return `${normalized}/${path}`;
}

function errorMessage(payload: unknown, fallback: string) {
  return payload && typeof payload === 'object' && 'error' in payload
    && payload.error && typeof payload.error === 'object' && 'message' in payload.error
    && typeof payload.error.message === 'string'
    ? payload.error.message
    : fallback;
}

async function readResponse(response: Response, fallback: string) {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${fallback}（${response.status}）`);
  }
  if (!response.ok) throw new Error(errorMessage(payload, `${fallback}（${response.status}）`));
  return payload;
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const result = payload as Record<string, unknown>;
  if (typeof result.output_text === 'string') return result.output_text;
  if (!Array.isArray(result.output)) return null;
  for (const item of result.output) {
    if (!item || typeof item !== 'object' || !('content' in item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content && typeof content === 'object' && 'text' in content && typeof content.text === 'string') return content.text;
    }
  }
  return null;
}

function contextInstructions(context?: AiLedgerContext) {
  if (!context) return '';
  const expenseCategories = context.categories
    .filter((category) => category.type === 'expense' && category.parentName)
    .map((category) => `${category.parentName}--${category.name}`);
  const incomeCategories = context.categories
    .filter((category) => category.type === 'income' && category.parentName)
    .map((category) => `${category.parentName}--${category.name}`);
  const accounts = context.accounts.join('、');
  return `\n\n本地账本上下文（这是用户当前可用的选项）：
支出末级分类：\n- ${expenseCategories.join('\n- ') || '暂无'}
收入末级分类：\n- ${incomeCategories.join('\n- ') || '暂无'}
账户：${accounts || '暂无'}
必须从与 type 对应的“末级分类”列表中选择一项，将“--”左侧原样放入 parentCategoryName、右侧原样放入 categoryName；两个字段都不能包含“--”或把父子名称拼在一起，也不能创造新分类。
应根据账单的实际消费用途做语义分类。例如咖啡店消费应优先选择“餐饮--咖啡茶饮”，不要停留在“餐饮--餐饮”这类同名兜底分类；只有图片没有足够线索判断具体用途时才能选择兜底分类，并在 uncertainFields 中加入 category。
paymentMethod 应原样返回账户列表中的名称；没有合适选项则返回 null。`;
}

function userInstruction(input: RecognizeBillInput) {
  if (!input.currentBill) return input.instruction || '请识别这张图片中的主要账单。';
  return `当前账单草稿：
${JSON.stringify(input.currentBill)}

用户本轮修改要求：
${input.instruction?.trim() || '请重新检查这张账单'}

请基于当前草稿完成增量修改，未被本轮要求涉及的字段必须保持不变，并返回完整账单。`;
}

export async function recognizeBill(input: RecognizeBillInput, signal?: AbortSignal): Promise<RecognizedBill> {
  const config = await getAiConfig();
  if (!config.providerBaseUrl) throw new Error('请先在设置中填写服务商 Base URL');
  if (!config.apiKey) throw new Error('请先在设置中填写 API Key');
  if (!config.model) throw new Error('请先在设置中探测并选择 Model');
  const response = await fetch(providerUrl(config.providerBaseUrl, 'responses'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      instructions: `${recognitionInstructions}${contextInstructions(input.context)}`,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: userInstruction(input) },
          { type: 'input_image', image_url: input.imageDataUrl, detail: 'high' },
        ],
      }],
      text: { format: { type: 'json_schema', name: 'recognized_bill', strict: true, schema: recognizedBillJsonSchema } },
    }),
    signal,
  });
  const payload = await readResponse(response, '识别失败');
  const text = extractResponseText(payload);
  if (!text) throw new Error('模型没有返回可确认的账单');
  try {
    return parseRecognizedBill(JSON.parse(text));
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '识别结果格式无效');
  }
}

export async function probeAiModels(input: ProbeAiModelsInput, signal?: AbortSignal): Promise<string[]> {
  if (!input.providerBaseUrl.trim()) throw new Error('请先填写服务商 Base URL');
  if (!input.apiKey.trim()) throw new Error('请先填写 API Key');
  const response = await fetch(providerUrl(input.providerBaseUrl, 'models'), {
    method: 'GET',
    headers: { Authorization: `Bearer ${input.apiKey.trim()}` },
    signal,
  });
  const payload = await readResponse(response, '模型探测失败');
  const rawModels = payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data)
    ? payload.data.map((item) => item && typeof item === 'object' && 'id' in item ? item.id : null)
    : null;
  if (!rawModels) throw new Error('模型探测返回了无效结果');
  const models = rawModels.filter((model): model is string => typeof model === 'string' && model.trim().length > 0);
  if (models.length === 0) throw new Error('服务商没有返回可用模型');
  return models.sort((left, right) => left.localeCompare(right));
}

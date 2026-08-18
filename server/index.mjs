import { createServer } from 'node:http';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { billSchema } from './bill-schema.mjs';

const port = Number.parseInt(process.env.PORT ?? '8787', 10);
const defaultModel = process.env.OPENAI_MODEL?.trim();
const defaultBaseURL = process.env.OPENAI_BASE_URL?.trim();
const maxBodyBytes = 10 * 1024 * 1024;
const maxImageBytes = 7 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const instructions = `你是一个严谨的中文记账助手。请从用户提供的账单、小票或支付截图中提取一笔最主要的账单。
只返回结构化字段，不要猜测看不清的信息：金额必须换算为人民币分，type 只能是 expense 或 income。
parentCategoryName 和 categoryName 分别返回最合适的一级分类与二级分类自然语言名称，不要拼成一个路径，也不要返回任何数据库 ID。paymentMethod 返回图片中看到的自然语言名称。
note 只记录其他字段没有表达的商品、服务或订单备注。金额只能放在 amountCents；note 不得重复金额、日期、分类、账户或“消费了多少钱”等内容，没有独立备注时返回 null。
occurredAt 只在能确定日期或日期时间时返回 ISO 8601 字符串，否则返回 null；没有明确年份时不要擅自补年份。
confidence 是整体识别置信度（0 到 1），uncertainFields 列出需要用户确认的字段名。summary 用简短中文描述识别结果。
如果图片不是账单或无法识别金额，请将 amountCents 设为 1，并在 uncertainFields 中加入 amount、summary 中明确说明无法确认金额。`;

function json(res, status, payload) {
  const origin = process.env.ALLOWED_ORIGIN?.trim() || '*';
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, X-AI-API-Key, X-AI-Model, X-AI-Base-URL',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

function errorPayload(code, message) {
  return { error: { code, message } };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(Object.assign(new Error('请求图片过大，请选择更小的图片'), { code: 'PAYLOAD_TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('请求格式不是有效 JSON'), { code: 'INVALID_JSON' })); }
    });
    req.on('error', reject);
  });
}

function validateInput(body) {
  if (!body || typeof body !== 'object') throw Object.assign(new Error('请求参数无效'), { code: 'INVALID_REQUEST' });
  const imageDataUrl = body.imageDataUrl;
  if (typeof imageDataUrl !== 'string' || imageDataUrl.length < 32) throw Object.assign(new Error('缺少图片'), { code: 'IMAGE_REQUIRED' });
  const match = imageDataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || !allowedMimeTypes.has(match[1])) throw Object.assign(new Error('只支持 JPEG、PNG 或 WebP 图片'), { code: 'UNSUPPORTED_IMAGE' });
  const imageBuffer = Buffer.from(match[2], 'base64');
  if (imageBuffer.length === 0 || imageBuffer.length > maxImageBytes) throw Object.assign(new Error('图片过大，请压缩后重试'), { code: 'IMAGE_TOO_LARGE' });
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 500) : '';
  return { imageDataUrl, instruction };
}

function requestHeader(req, name, maxLength) {
  const value = req.headers[name];
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function providerConfig(req) {
  const apiKey = requestHeader(req, 'x-ai-api-key', 500) || process.env.OPENAI_API_KEY?.trim() || '';
  const model = requestHeader(req, 'x-ai-model', 120) || defaultModel || '';
  const baseURL = requestHeader(req, 'x-ai-base-url', 500) || defaultBaseURL || '';
  if (baseURL) {
    try {
      const parsed = new URL(baseURL);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
    } catch {
      throw Object.assign(new Error('AI Base URL 无效'), { code: 'INVALID_PROVIDER' });
    }
  }
  if (!apiKey) throw Object.assign(new Error('AI 服务尚未配置 API Key'), { code: 'AI_NOT_CONFIGURED' });
  return { apiKey, model, baseURL: baseURL || undefined };
}

async function listModels(req) {
  const config = providerConfig(req);
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 20_000, maxRetries: 1 });
  const page = await client.models.list();
  const models = page.data
    .map((item) => item.id)
    .filter((id) => typeof id === 'string' && id.trim())
    .sort((left, right) => left.localeCompare(right))
    .slice(0, 200);
  return { models };
}

async function recognizeBill(req, body) {
  const { imageDataUrl, instruction } = validateInput(body);
  const config = providerConfig(req);
  if (!config.model) throw Object.assign(new Error('请先探测并选择 Model'), { code: 'AI_NOT_CONFIGURED' });
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 45_000, maxRetries: 1 });
  const response = await client.responses.parse({
    model: config.model,
    instructions,
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: instruction || '请识别这张图片中的主要账单。' },
        { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
      ],
    }],
    text: { format: zodTextFormat(billSchema, 'recognized_bill') },
  });
  if (!response.output_parsed) throw Object.assign(new Error('模型没有返回可确认的账单'), { code: 'EMPTY_RESULT' });
  return response.output_parsed;
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { json(res, 204, {}); return; }
  if (req.method === 'POST' && req.url === '/api/ai-models') {
    try {
      json(res, 200, await listModels(req));
    } catch (error) {
      const code = error?.code || 'AI_MODELS_FAILED';
      const status = code === 'AI_NOT_CONFIGURED' || code === 'INVALID_PROVIDER' ? (code === 'AI_NOT_CONFIGURED' ? 503 : 400) : 502;
      if (status >= 500) console.error(`[ai] ${code}: ${error instanceof Error ? error.message : 'unknown error'}`);
      json(res, status, errorPayload(code, error instanceof Error ? error.message : '无法获取模型列表'));
    }
    return;
  }
  if (req.method !== 'POST' || req.url !== '/api/recognize-bill') {
    json(res, 404, errorPayload('NOT_FOUND', '接口不存在'));
    return;
  }
  try {
    const body = await readJson(req);
    const bill = await recognizeBill(req, body);
    json(res, 200, { bill });
  } catch (error) {
    const code = error?.code || 'AI_REQUEST_FAILED';
    const status = code === 'PAYLOAD_TOO_LARGE' || code === 'IMAGE_TOO_LARGE' ? 413
      : ['INVALID_JSON', 'INVALID_REQUEST', 'IMAGE_REQUIRED', 'UNSUPPORTED_IMAGE', 'INVALID_PROVIDER'].includes(code) ? 400
        : code === 'AI_NOT_CONFIGURED' ? 503 : 502;
    if (status >= 500) console.error(`[ai] ${code}: ${error instanceof Error ? error.message : 'unknown error'}`);
    json(res, status, errorPayload(code, error instanceof Error ? error.message : '识别服务暂时不可用'));
  }
});

server.listen(port, () => console.log(`AI ledger server listening on http://localhost:${port}`));

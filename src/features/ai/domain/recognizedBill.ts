export type RecognizedBillType = 'expense' | 'income';

export type RecognizedBill = {
  type: RecognizedBillType;
  amountCents: number;
  merchant: string | null;
  parentCategoryName: string | null;
  categoryName: string | null;
  paymentMethod: string | null;
  occurredAt: string | null;
  note: string | null;
  confidence: number;
  uncertainFields: string[];
  summary: string;
};

function nullableString(value: unknown, field: string) {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(`识别结果字段 ${field} 格式不正确`);
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseRecognizedBill(value: unknown): RecognizedBill {
  if (!value || typeof value !== 'object') throw new Error('识别服务返回了无效结果');
  const result = value as Record<string, unknown>;
  if (result.type !== 'expense' && result.type !== 'income') throw new Error('识别结果缺少收支类型');
  if (typeof result.amountCents !== 'number' || !Number.isSafeInteger(result.amountCents) || result.amountCents <= 0) {
    throw new Error('识别结果缺少有效金额');
  }
  if (typeof result.confidence !== 'number' || !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) {
    throw new Error('识别结果置信度无效');
  }
  if (!Array.isArray(result.uncertainFields) || result.uncertainFields.some((field) => typeof field !== 'string')) {
    throw new Error('识别结果不确定字段无效');
  }
  if (typeof result.summary !== 'string' || !result.summary.trim()) throw new Error('识别结果缺少摘要');

  return {
    type: result.type,
    amountCents: result.amountCents,
    merchant: nullableString(result.merchant, 'merchant'),
    parentCategoryName: nullableString(result.parentCategoryName, 'parentCategoryName'),
    categoryName: nullableString(result.categoryName, 'categoryName'),
    paymentMethod: nullableString(result.paymentMethod, 'paymentMethod'),
    occurredAt: nullableString(result.occurredAt, 'occurredAt'),
    note: nullableString(result.note, 'note'),
    confidence: result.confidence,
    uncertainFields: result.uncertainFields,
    summary: result.summary.trim(),
  };
}

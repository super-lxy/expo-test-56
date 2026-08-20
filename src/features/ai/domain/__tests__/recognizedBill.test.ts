import { parseRecognizedBill } from '../recognizedBill';

describe('parseRecognizedBill', () => {
  const validBill = {
    type: 'expense',
    amountCents: 10000,
    merchant: '星巴克',
    parentCategoryName: '餐饮',
    categoryName: '咖啡茶饮',
    paymentMethod: '招商银行储蓄卡',
    occurredAt: '2026-08-20T10:30:00.000Z',
    note: '美式咖啡',
    confidence: 0.95,
    uncertainFields: [],
    summary: '识别到餐饮类支出 100.00 元',
  };

  describe('类型验证', () => {
    it('应该拒绝null值', () => {
      expect(() => parseRecognizedBill(null)).toThrow('识别服务返回了无效结果');
    });

    it('应该拒绝undefined值', () => {
      expect(() => parseRecognizedBill(undefined)).toThrow('识别服务返回了无效结果');
    });

    it('应该拒绝非对象类型', () => {
      expect(() => parseRecognizedBill('string')).toThrow('识别服务返回了无效结果');
      expect(() => parseRecognizedBill(123)).toThrow('识别服务返回了无效结果');
      expect(() => parseRecognizedBill(true)).toThrow('识别服务返回了无效结果');
    });
  });

  describe('收支类型验证', () => {
    it('应该接受expense类型', () => {
      const result = parseRecognizedBill({ ...validBill, type: 'expense' });
      expect(result.type).toBe('expense');
    });

    it('应该接受income类型', () => {
      const result = parseRecognizedBill({ ...validBill, type: 'income' });
      expect(result.type).toBe('income');
    });

    it('应该拒绝无效的类型', () => {
      expect(() => parseRecognizedBill({ ...validBill, type: 'transfer' })).toThrow('识别结果缺少收支类型');
      expect(() => parseRecognizedBill({ ...validBill, type: 'invalid' })).toThrow('识别结果缺少收支类型');
    });

    it('应该拒绝缺失的类型', () => {
      const { type, ...billWithoutType } = validBill;
      expect(() => parseRecognizedBill(billWithoutType)).toThrow('识别结果缺少收支类型');
    });
  });

  describe('金额验证', () => {
    it('应该接受正整数金额', () => {
      const result = parseRecognizedBill({ ...validBill, amountCents: 10000 });
      expect(result.amountCents).toBe(10000);
    });

    it('应该拒绝零金额', () => {
      expect(() => parseRecognizedBill({ ...validBill, amountCents: 0 })).toThrow('识别结果缺少有效金额');
    });

    it('应该拒绝负数金额', () => {
      expect(() => parseRecognizedBill({ ...validBill, amountCents: -100 })).toThrow('识别结果缺少有效金额');
    });

    it('应该拒绝非整数金额', () => {
      expect(() => parseRecognizedBill({ ...validBill, amountCents: 10.5 })).toThrow('识别结果缺少有效金额');
    });

    it('应该拒绝非数字金额', () => {
      expect(() => parseRecognizedBill({ ...validBill, amountCents: '100' })).toThrow('识别结果缺少有效金额');
    });

    it('应该拒绝超出安全整数范围的金额', () => {
      expect(() => parseRecognizedBill({ ...validBill, amountCents: Number.MAX_SAFE_INTEGER + 1 })).toThrow('识别结果缺少有效金额');
    });
  });

  describe('可空字符串字段验证', () => {
    const nullableFields = ['merchant', 'parentCategoryName', 'categoryName', 'paymentMethod', 'occurredAt', 'note'];

    nullableFields.forEach(field => {
      describe(field, () => {
        it('应该接受null值', () => {
          const result = parseRecognizedBill({ ...validBill, [field]: null });
          expect(result[field as keyof typeof result]).toBeNull();
        });

        it('应该接受有效字符串', () => {
          const result = parseRecognizedBill({ ...validBill, [field]: '测试值' });
          expect(result[field as keyof typeof result]).toBe('测试值');
        });

        it('应该trim空白字符', () => {
          const result = parseRecognizedBill({ ...validBill, [field]: '  测试值  ' });
          expect(result[field as keyof typeof result]).toBe('测试值');
        });

        it('应该将空字符串转为null', () => {
          const result = parseRecognizedBill({ ...validBill, [field]: '' });
          expect(result[field as keyof typeof result]).toBeNull();
        });

        it('应该将纯空白字符串转为null', () => {
          const result = parseRecognizedBill({ ...validBill, [field]: '   ' });
          expect(result[field as keyof typeof result]).toBeNull();
        });

        it('应该拒绝非字符串非null值', () => {
          expect(() => parseRecognizedBill({ ...validBill, [field]: 123 })).toThrow(`识别结果字段 ${field} 格式不正确`);
        });
      });
    });
  });

  describe('置信度验证', () => {
    it('应该接受0到1之间的置信度', () => {
      expect(parseRecognizedBill({ ...validBill, confidence: 0 }).confidence).toBe(0);
      expect(parseRecognizedBill({ ...validBill, confidence: 0.5 }).confidence).toBe(0.5);
      expect(parseRecognizedBill({ ...validBill, confidence: 1 }).confidence).toBe(1);
    });

    it('应该拒绝小于0的置信度', () => {
      expect(() => parseRecognizedBill({ ...validBill, confidence: -0.1 })).toThrow('识别结果置信度无效');
    });

    it('应该拒绝大于1的置信度', () => {
      expect(() => parseRecognizedBill({ ...validBill, confidence: 1.1 })).toThrow('识别结果置信度无效');
    });

    it('应该拒绝非数字置信度', () => {
      expect(() => parseRecognizedBill({ ...validBill, confidence: '0.9' })).toThrow('识别结果置信度无效');
    });

    it('应该拒绝NaN置信度', () => {
      expect(() => parseRecognizedBill({ ...validBill, confidence: NaN })).toThrow('识别结果置信度无效');
    });

    it('应该拒绝Infinity置信度', () => {
      expect(() => parseRecognizedBill({ ...validBill, confidence: Infinity })).toThrow('识别结果置信度无效');
    });
  });

  describe('不确定字段验证', () => {
    it('应该接受空数组', () => {
      const result = parseRecognizedBill({ ...validBill, uncertainFields: [] });
      expect(result.uncertainFields).toEqual([]);
    });

    it('应该接受字符串数组', () => {
      const result = parseRecognizedBill({ ...validBill, uncertainFields: ['amount', 'occurredAt'] });
      expect(result.uncertainFields).toEqual(['amount', 'occurredAt']);
    });

    it('应该拒绝非数组类型', () => {
      expect(() => parseRecognizedBill({ ...validBill, uncertainFields: 'amount' })).toThrow('识别结果不确定字段无效');
    });

    it('应该拒绝包含非字符串元素的数组', () => {
      expect(() => parseRecognizedBill({ ...validBill, uncertainFields: ['amount', 123] })).toThrow('识别结果不确定字段无效');
    });
  });

  describe('摘要验证', () => {
    it('应该接受有效摘要', () => {
      const result = parseRecognizedBill({ ...validBill, summary: '识别成功' });
      expect(result.summary).toBe('识别成功');
    });

    it('应该trim空白字符', () => {
      const result = parseRecognizedBill({ ...validBill, summary: '  识别成功  ' });
      expect(result.summary).toBe('识别成功');
    });

    it('应该拒绝空字符串摘要', () => {
      expect(() => parseRecognizedBill({ ...validBill, summary: '' })).toThrow('识别结果缺少摘要');
    });

    it('应该拒绝纯空白字符串摘要', () => {
      expect(() => parseRecognizedBill({ ...validBill, summary: '   ' })).toThrow('识别结果缺少摘要');
    });

    it('应该拒绝非字符串摘要', () => {
      expect(() => parseRecognizedBill({ ...validBill, summary: 123 })).toThrow('识别结果缺少摘要');
    });
  });

  describe('完整场景测试', () => {
    it('应该正确解析完整的支出账单', () => {
      const result = parseRecognizedBill(validBill);
      expect(result).toEqual({
        type: 'expense',
        amountCents: 10000,
        merchant: '星巴克',
        parentCategoryName: '餐饮',
        categoryName: '咖啡茶饮',
        paymentMethod: '招商银行储蓄卡',
        occurredAt: '2026-08-20T10:30:00.000Z',
        note: '美式咖啡',
        confidence: 0.95,
        uncertainFields: [],
        summary: '识别到餐饮类支出 100.00 元',
      });
    });

    it('应该正确解析包含null字段的账单', () => {
      const billWithNulls = {
        ...validBill,
        merchant: null,
        parentCategoryName: null,
        categoryName: null,
        paymentMethod: null,
        occurredAt: null,
        note: null,
      };

      const result = parseRecognizedBill(billWithNulls);
      expect(result.merchant).toBeNull();
      expect(result.parentCategoryName).toBeNull();
      expect(result.categoryName).toBeNull();
      expect(result.paymentMethod).toBeNull();
      expect(result.occurredAt).toBeNull();
      expect(result.note).toBeNull();
    });

    it('应该正确解析低置信度账单', () => {
      const lowConfidenceBill = {
        ...validBill,
        confidence: 0.3,
        uncertainFields: ['amount', 'category', 'occurredAt'],
        summary: '图片模糊，部分信息不确定',
      };

      const result = parseRecognizedBill(lowConfidenceBill);
      expect(result.confidence).toBe(0.3);
      expect(result.uncertainFields).toHaveLength(3);
      expect(result.summary).toBe('图片模糊，部分信息不确定');
    });

    it('应该正确解析收入账单', () => {
      const incomeBill = {
        ...validBill,
        type: 'income',
        amountCents: 500000,
        merchant: '公司',
        parentCategoryName: '工资',
        categoryName: '月薪',
        summary: '识别到工资收入 5000.00 元',
      };

      const result = parseRecognizedBill(incomeBill);
      expect(result.type).toBe('income');
      expect(result.amountCents).toBe(500000);
    });
  });
});

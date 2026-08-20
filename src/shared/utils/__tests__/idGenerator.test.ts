import { generateSecureId, generateUUID } from '../idGenerator';

describe('idGenerator', () => {
  describe('generateSecureId', () => {
    it('应该生成格式正确的ID', () => {
      const id = generateSecureId();
      // 格式: {timestamp}-{12位hex}
      expect(id).toMatch(/^\d+-[0-9a-f]{12}$/);
    });

    it('应该生成唯一的ID', () => {
      const ids = new Set<string>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        ids.add(generateSecureId());
      }

      // 所有ID应该都是唯一的
      expect(ids.size).toBe(count);
    });

    it('应该包含时间戳', () => {
      const beforeTimestamp = Date.now();
      const id = generateSecureId();
      const afterTimestamp = Date.now();

      const idTimestamp = parseInt(id.split('-')[0], 10);

      // ID中的时间戳应该在生成前后的时间范围内
      expect(idTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(idTimestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('应该生成不可预测的随机部分', () => {
      const id1 = generateSecureId();
      const id2 = generateSecureId();

      const random1 = id1.split('-')[1];
      const random2 = id2.split('-')[1];

      // 随机部分应该不同
      expect(random1).not.toBe(random2);
    });

    it('连续生成的ID应该递增', () => {
      const id1 = generateSecureId();
      const id2 = generateSecureId();

      const timestamp1 = parseInt(id1.split('-')[0], 10);
      const timestamp2 = parseInt(id2.split('-')[0], 10);

      // 第二个ID的时间戳应该大于或等于第一个
      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
    });

    it('应该生成固定长度的随机部分', () => {
      const ids = Array.from({ length: 100 }, () => generateSecureId());

      ids.forEach(id => {
        const randomPart = id.split('-')[1];
        // 6字节 = 12位hex字符
        expect(randomPart).toHaveLength(12);
      });
    });
  });

  describe('generateUUID', () => {
    it('应该生成符合UUID v4格式的ID', () => {
      const uuid = generateUUID();
      // UUID v4 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('应该生成唯一的UUID', () => {
      const uuids = new Set<string>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        uuids.add(generateUUID());
      }

      // 所有UUID应该都是唯一的
      expect(uuids.size).toBe(count);
    });

    it('应该包含正确的版本位', () => {
      const uuid = generateUUID();
      const versionChar = uuid.charAt(14);
      // UUID v4的版本位应该是'4'
      expect(versionChar).toBe('4');
    });

    it('应该包含正确的变体位', () => {
      const uuid = generateUUID();
      const variantChar = uuid.charAt(19);
      // RFC 4122变体位应该是8, 9, a, 或 b
      expect(['8', '9', 'a', 'b']).toContain(variantChar.toLowerCase());
    });

    it('应该生成标准长度的UUID', () => {
      const uuid = generateUUID();
      // 标准UUID长度: 36字符 (32位hex + 4个连字符)
      expect(uuid).toHaveLength(36);
    });

    it('应该包含4个连字符', () => {
      const uuid = generateUUID();
      const hyphens = uuid.match(/-/g);
      expect(hyphens).toHaveLength(4);
    });
  });

  describe('性能测试', () => {
    it('generateSecureId应该能快速生成大量ID', () => {
      const startTime = Date.now();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        generateSecureId();
      }

      const duration = Date.now() - startTime;
      // 10000个ID应该在1秒内完成
      expect(duration).toBeLessThan(1000);
    });

    it('generateUUID应该能快速生成大量UUID', () => {
      const startTime = Date.now();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        generateUUID();
      }

      const duration = Date.now() - startTime;
      // 10000个UUID应该在1秒内完成
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('碰撞测试', () => {
    it('高并发场景下不应该产生重复ID', () => {
      const ids = new Set<string>();
      const count = 100000;

      // 模拟高并发生成
      for (let i = 0; i < count; i++) {
        const id = generateSecureId();

        if (ids.has(id)) {
          fail(`发现重复ID: ${id}`);
        }

        ids.add(id);
      }

      expect(ids.size).toBe(count);
    });
  });
});

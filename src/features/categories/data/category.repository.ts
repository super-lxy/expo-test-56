import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, CategoryType } from '../domain/category.types';

export class CategoryRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listByType(type: CategoryType): Promise<Category[]> {
    const rows = await this.db.getAllAsync<Category>(
      `SELECT id, name, type, parent_id AS parentId, icon, color
       FROM categories
       WHERE type = ?
       ORDER BY sort_order, name`,
      type
    );
    return rows;
  }

  async create(input: { name: string; type: CategoryType; parentId: string | null; icon?: string }) {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const parent = input.parentId
      ? await this.db.getFirstAsync<{ icon: string; color: string }>(
          `SELECT icon, color FROM categories WHERE id = ?`,
          input.parentId
        )
      : null;
    // 颜色继承父级：内置子分类（交通下的飞机/地铁…）都跟随父级色，
    // 自建子分类若固定蓝/绿，弹窗里的图标底色会和同级项对不上。
    const fallbackIcon = input.type === 'income' ? '💰' : '📌';
    const icon = input.icon?.trim() || parent?.icon || fallbackIcon;
    const color = parent?.color ?? (input.type === 'income' ? '#22C55E' : '#3B82F6');
    await this.db.runAsync(
      `INSERT INTO categories (id, name, type, parent_id, icon, color, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.name.trim(),
      input.type,
      input.parentId,
      icon,
      color,
      Date.now(),
      now
    );
    if (!input.parentId) {
      await this.db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, type, parent_id, icon, color, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        `${id}-default`,
        input.name.trim(),
        input.type,
        id,
        icon,
        color,
        Date.now() + 1,
        now
      );
    }
    return id;
  }

  async update(id: string, input: { name: string; icon: string }) {
    await this.db.runAsync(
      `UPDATE categories SET name = ?, icon = ? WHERE id = ?`,
      input.name.trim(),
      input.icon,
      id
    );
  }
}

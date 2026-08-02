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

  async create(input: { name: string; type: CategoryType; parentId: string | null }) {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await this.db.runAsync(
      `INSERT INTO categories (id, name, type, parent_id, icon, color, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.name.trim(),
      input.type,
      input.parentId,
      input.type === 'income' ? '💰' : '📌',
      input.type === 'income' ? '#22C55E' : '#3B82F6',
      Date.now(),
      now
    );
    return id;
  }
}

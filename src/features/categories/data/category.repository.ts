import type { SQLiteDatabase } from 'expo-sqlite';

import { categoryIconDataUri } from './categoryIconStorage';
import type {
  Category,
  CategoryIconInput,
  CategoryIconType,
  CategoryType,
} from '../domain/category.types';

type CategoryRow = {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
  icon: string;
  iconType: CategoryIconType | null;
  iconBlob: Uint8Array | null;
  iconMime: string | null;
  color: string;
};

function mapCategory(row: CategoryRow): Category {
  const iconType = row.iconType ?? 'emoji';
  return {
    ...row,
    iconType,
    icon: iconType === 'image'
      ? categoryIconDataUri(row.iconBlob, row.iconMime) ?? row.icon
      : row.icon,
  };
}

type CategoryCreateInput = {
  name: string;
  type: CategoryType;
  parentId: string | null;
} & CategoryIconInput;

type CategoryUpdateInput = {
  name: string;
  icon: string;
  iconType: CategoryIconType;
  iconBlob: Uint8Array | null;
  iconMime: string | null;
};

export class CategoryRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getById(id: string): Promise<Category | null> {
    const row = await this.db.getFirstAsync<CategoryRow>(
      `SELECT id, name, type, parent_id AS parentId, icon,
              COALESCE(icon_type, 'emoji') AS iconType,
              icon_blob AS iconBlob, icon_mime AS iconMime, color
       FROM categories
       WHERE id = ?`,
      id
    );
    return row ? mapCategory(row) : null;
  }

  async listByType(type: CategoryType): Promise<Category[]> {
    const rows = await this.db.getAllAsync<CategoryRow>(
      `SELECT id, name, type, parent_id AS parentId, icon,
              COALESCE(icon_type, 'emoji') AS iconType,
              icon_blob AS iconBlob, icon_mime AS iconMime, color
       FROM categories
       WHERE type = ?
         AND id NOT IN ('transfer', 'initial-balance')
         AND COALESCE(is_archived, 0) = 0
       ORDER BY sort_order, name`,
      type
    );
    return rows.map(mapCategory);
  }

  async create(input: CategoryCreateInput) {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const parent = input.parentId
      ? await this.db.getFirstAsync<{
          icon: string;
          icon_type: CategoryIconType | null;
          icon_blob: Uint8Array | null;
          icon_mime: string | null;
          color: string;
        }>(`SELECT icon, icon_type, icon_blob, icon_mime, color FROM categories WHERE id = ?`, input.parentId)
      : null;

    const fallbackIcon = input.type === 'income' ? '💰' : '📌';
    const hasUploadedImage = input.iconType === 'image' && Boolean(input.iconBlob?.length);
    const hasEmoji = input.iconType !== 'image' && Boolean(input.icon?.trim());
    const hasExplicitIcon = hasUploadedImage || hasEmoji;
    const iconType = hasExplicitIcon ? (input.iconType ?? 'emoji') : (parent?.icon_type ?? 'emoji');
    const iconBlob = iconType === 'image'
      ? (hasUploadedImage ? input.iconBlob ?? null : parent?.icon_blob ?? null)
      : null;
    const iconMime = iconType === 'image'
      ? (hasUploadedImage ? input.iconMime ?? 'image/png' : parent?.icon_mime ?? null)
      : null;
    const icon = iconType === 'image'
      ? (iconBlob?.length ? '' : input.icon?.trim() || parent?.icon || '')
      : input.icon?.trim() || parent?.icon || fallbackIcon;
    const color = parent?.color ?? (input.type === 'income' ? '#22C55E' : '#3B82F6');

    await this.db.runAsync(
      `INSERT INTO categories
       (id, name, type, parent_id, icon, icon_type, icon_blob, icon_mime, color, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.name.trim(),
      input.type,
      input.parentId,
      icon,
      iconType,
      iconBlob,
      iconMime,
      color,
      Date.now(),
      now
    );

    if (!input.parentId) {
      await this.db.runAsync(
        `INSERT OR IGNORE INTO categories
         (id, name, type, parent_id, icon, icon_type, icon_blob, icon_mime, color, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `${id}-default`,
        input.name.trim(),
        input.type,
        id,
        icon,
        iconType,
        iconBlob,
        iconMime,
        color,
        Date.now() + 1,
        now
      );
    }
    return id;
  }

  async update(id: string, input: CategoryUpdateInput) {
    const storedIcon = input.iconType === 'image' && input.iconBlob?.length ? '' : input.icon;
    const iconBlob = input.iconType === 'image' ? input.iconBlob : null;
    const iconMime = input.iconType === 'image' ? input.iconMime : null;

    await this.db.runAsync(
      `UPDATE categories
       SET name = ?, icon = ?, icon_type = ?, icon_blob = ?, icon_mime = ?
       WHERE id = ?`,
      input.name.trim(),
      storedIcon,
      input.iconType,
      iconBlob,
      iconMime,
      id
    );
    await this.db.runAsync(
      `UPDATE categories
       SET name = ?, icon = ?, icon_type = ?, icon_blob = ?, icon_mime = ?
       WHERE id = ?`,
      input.name.trim(),
      storedIcon,
      input.iconType,
      iconBlob,
      iconMime,
      `${id}-default`
    );
  }

  async archive(id: string) {
    await this.db.runAsync(
      `UPDATE categories
       SET is_archived = 1
       WHERE id = ? OR parent_id = ?`,
      id,
      id
    );
  }
}

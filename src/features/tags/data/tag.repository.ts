import type { SQLiteDatabase } from 'expo-sqlite';

import type { TagGroup, TagScope } from '../domain/tag.types';

type TagRow = {
  id: string;
  tag_id: string | null;
  group_id: string;
  group_name: string;
  scope: TagScope;
  tag_name: string | null;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function requiredName(value: string, label: string) {
  const name = value.trim();
  if (!name) throw new Error(`请输入${label}`);
  if (name.length > 20) throw new Error(`${label}最多 20 个字`);
  return name;
}

export class TagRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listGroups(scope?: TagScope): Promise<TagGroup[]> {
    const rows = await this.db.getAllAsync<TagRow>(
      `SELECT
         g.id,
         g.name AS group_name,
         g.scope,
         t.id AS tag_id,
         t.group_id,
         t.name AS tag_name
       FROM tag_groups g
       LEFT JOIN tags t ON t.group_id = g.id AND t.archived_at IS NULL
       WHERE g.archived_at IS NULL
         AND (? IS NULL OR g.scope = ?)
       ORDER BY g.scope, g.sort_order, g.created_at, t.sort_order, t.created_at`,
      scope ?? null,
      scope ?? null
    );

    const groups = new Map<string, TagGroup>();
    for (const row of rows) {
      let group = groups.get(row.id);
      if (!group) {
        group = { id: row.id, name: row.group_name, scope: row.scope, tags: [] };
        groups.set(row.id, group);
      }
      if (row.tag_name) {
        group.tags.push({ id: row.tag_id!, groupId: row.group_id, name: row.tag_name });
      }
    }
    return [...groups.values()];
  }

  async createGroup(nameValue: string, scope: TagScope) {
    const name = requiredName(nameValue, '类别名称');
    await this.assertGroupNameAvailable(name, scope);
    const id = createId('tag-group');
    const now = new Date().toISOString();
    const sortRow = await this.db.getFirstAsync<{ next_sort: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM tag_groups WHERE scope = ?`,
      scope
    );
    await this.db.runAsync(
      `INSERT INTO tag_groups (id, name, scope, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      name,
      scope,
      sortRow?.next_sort ?? 0,
      now,
      now
    );
    return id;
  }

  async updateGroup(id: string, nameValue: string) {
    const name = requiredName(nameValue, '类别名称');
    const group = await this.db.getFirstAsync<{ scope: TagScope }>(
      `SELECT scope FROM tag_groups WHERE id = ? AND archived_at IS NULL`,
      id
    );
    if (!group) throw new Error('标签类别不存在');
    await this.assertGroupNameAvailable(name, group.scope, id);
    await this.db.runAsync(
      `UPDATE tag_groups SET name = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL`,
      name,
      new Date().toISOString(),
      id
    );
  }

  async archiveGroup(id: string) {
    const now = new Date().toISOString();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `DELETE FROM transaction_tags
         WHERE tag_id IN (SELECT id FROM tags WHERE group_id = ?)`,
        id
      );
      await transaction.runAsync(
        `UPDATE tags SET archived_at = ?, updated_at = ? WHERE group_id = ? AND archived_at IS NULL`,
        now,
        now,
        id
      );
      await transaction.runAsync(
        `UPDATE tag_groups SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL`,
        now,
        now,
        id
      );
    });
  }

  async createTag(groupId: string, nameValue: string) {
    const name = requiredName(nameValue, '标签名称');
    await this.assertTagNameAvailable(groupId, name);
    const id = createId('tag');
    const now = new Date().toISOString();
    const sortRow = await this.db.getFirstAsync<{ next_sort: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM tags WHERE group_id = ?`,
      groupId
    );
    await this.db.runAsync(
      `INSERT INTO tags (id, group_id, name, sort_order, created_at, updated_at)
       SELECT ?, id, ?, ?, ?, ? FROM tag_groups WHERE id = ? AND archived_at IS NULL`,
      id,
      name,
      sortRow?.next_sort ?? 0,
      now,
      now,
      groupId
    );
    return id;
  }

  async updateTag(id: string, nameValue: string) {
    const name = requiredName(nameValue, '标签名称');
    const tag = await this.db.getFirstAsync<{ group_id: string }>(
      `SELECT group_id FROM tags WHERE id = ? AND archived_at IS NULL`,
      id
    );
    if (!tag) throw new Error('标签不存在');
    await this.assertTagNameAvailable(tag.group_id, name, id);
    await this.db.runAsync(
      `UPDATE tags SET name = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL`,
      name,
      new Date().toISOString(),
      id
    );
  }

  async archiveTag(id: string) {
    const now = new Date().toISOString();
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(`DELETE FROM transaction_tags WHERE tag_id = ?`, id);
      await transaction.runAsync(
        `UPDATE tags SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL`,
        now,
        now,
        id
      );
    });
  }

  private async assertGroupNameAvailable(name: string, scope: TagScope, exceptId?: string) {
    const duplicate = await this.db.getFirstAsync<{ id: string }>(
      `SELECT id FROM tag_groups
       WHERE scope = ? AND archived_at IS NULL AND lower(name) = lower(?) AND (? IS NULL OR id != ?)`,
      scope,
      name,
      exceptId ?? null,
      exceptId ?? null
    );
    if (duplicate) throw new Error('该类别名称已存在');
  }

  private async assertTagNameAvailable(groupId: string, name: string, exceptId?: string) {
    const duplicate = await this.db.getFirstAsync<{ id: string }>(
      `SELECT id FROM tags
       WHERE group_id = ? AND archived_at IS NULL AND lower(name) = lower(?) AND (? IS NULL OR id != ?)`,
      groupId,
      name,
      exceptId ?? null,
      exceptId ?? null
    );
    if (duplicate) throw new Error('该标签名称已存在');
  }
}

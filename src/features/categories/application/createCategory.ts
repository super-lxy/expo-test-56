import { CategoryRepository } from '../data/category.repository';
import type { CategoryIconInput, CategoryType } from '../domain/category.types';

export async function createCategory(
  repository: CategoryRepository,
  input: { name: string; type: CategoryType; parentId: string | null } & CategoryIconInput
) {
  if (!input.name.trim()) {
    throw new Error('请输入分类名称');
  }
  return repository.create(input);
}

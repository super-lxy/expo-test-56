export type CategoryType = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
  icon: string;
  color: string;
};

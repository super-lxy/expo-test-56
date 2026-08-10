export type CategoryType = 'income' | 'expense';
export type CategoryIconType = 'emoji' | 'image';

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
  icon: string;
  iconType: CategoryIconType;
  iconBlob: Uint8Array | null;
  iconMime: string | null;
  color: string;
};

export type CategoryIconInput = {
  icon?: string;
  iconType?: CategoryIconType;
  iconBlob?: Uint8Array | null;
  iconMime?: string | null;
};

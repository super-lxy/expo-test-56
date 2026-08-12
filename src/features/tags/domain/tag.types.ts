export type TagScope = 'common' | 'ledger';

export type Tag = {
  id: string;
  groupId: string;
  name: string;
};

export type TagGroup = {
  id: string;
  name: string;
  scope: TagScope;
  tags: Tag[];
};

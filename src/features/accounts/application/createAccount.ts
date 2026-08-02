import type { AccountDraft } from '../domain/account.types';
import { AccountRepository } from '../data/account.repository';

export async function createAccount(repository: AccountRepository, draft: AccountDraft) {
  if (!draft.name.trim()) {
    throw new Error('请输入账户名称');
  }
  if (!Number.isInteger(draft.initialBalanceCents)) {
    throw new Error('请输入有效的初始余额');
  }
  return repository.create(draft);
}

import { TransactionRepository } from '../data/transaction.repository';
import { validateTransactionDraft } from '../domain/transaction.rules';
import type { TransactionDraft } from '../domain/transaction.types';

export async function updateTransaction(
  repository: TransactionRepository,
  id: string,
  draft: TransactionDraft
) {
  const validationError = validateTransactionDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }
  await repository.update(id, draft);
}

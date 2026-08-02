import { validateTransactionDraft } from '../domain/transaction.rules';
import type { TransactionDraft } from '../domain/transaction.types';
import { TransactionRepository } from '../data/transaction.repository';

export async function createTransaction(
  repository: TransactionRepository,
  draft: TransactionDraft
) {
  const validationError = validateTransactionDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }
  return repository.create(draft);
}

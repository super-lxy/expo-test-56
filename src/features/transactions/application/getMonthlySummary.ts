import { TransactionRepository } from '../data/transaction.repository';

export function getMonthlySummary(repository: TransactionRepository, date?: Date) {
  return repository.getMonthlySummary(date);
}

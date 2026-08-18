import { z } from 'zod';

export const billSchema = z.object({
  type: z.enum(['expense', 'income']),
  amountCents: z.number().int().positive().max(100000000000),
  merchant: z.string().max(120).nullable(),
  parentCategoryName: z.string().max(80).nullable(),
  categoryName: z.string().max(80).nullable(),
  paymentMethod: z.string().max(80).nullable(),
  occurredAt: z.string().max(80).nullable(),
  note: z.string().max(300).nullable(),
  confidence: z.number().min(0).max(1),
  uncertainFields: z.array(z.string().max(40)).max(12),
  summary: z.string().min(1).max(240),
});

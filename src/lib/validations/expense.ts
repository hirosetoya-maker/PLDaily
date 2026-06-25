import { z } from "zod"

export const expenseSchema = z.object({
  amount: z.number().int().positive().max(99999999),
  categoryId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().max(200).nullable().optional(),
})

export type ExpenseInput = z.infer<typeof expenseSchema>

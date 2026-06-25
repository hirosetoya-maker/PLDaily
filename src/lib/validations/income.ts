import { z } from "zod"

export const incomeSchema = z.object({
  amount: z.number().int().positive().max(99999999),
  type: z.enum(["salary", "bonus", "side", "other"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().max(200).nullable().optional(),
})

export type IncomeInput = z.infer<typeof incomeSchema>

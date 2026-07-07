import { z } from "zod"

export const fixedExpenseSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().int().positive().max(99999999),
  note: z.string().max(200).nullable().optional(),
})

export const variableExpenseSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().int().positive().max(99999999),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type FixedExpenseInput = z.infer<typeof fixedExpenseSchema>
export type VariableExpenseInput = z.infer<typeof variableExpenseSchema>

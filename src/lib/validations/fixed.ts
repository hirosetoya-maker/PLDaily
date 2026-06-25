import { z } from "zod"

export const fixedExpenseSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().int().positive().max(99999999),
})

export const monthlyFixedSchema = z.object({
  fixedExpenseId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().positive().max(99999999),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const variableExpenseSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().int().positive().max(99999999),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type FixedExpenseInput = z.infer<typeof fixedExpenseSchema>
export type MonthlyFixedInput = z.infer<typeof monthlyFixedSchema>
export type VariableExpenseInput = z.infer<typeof variableExpenseSchema>

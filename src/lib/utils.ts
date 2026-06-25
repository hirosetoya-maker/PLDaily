import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  })
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  })
}

export function formatMonth(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    timeZone: "Asia/Tokyo",
  })
}

export function toJSTDateString(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).replace(/\//g, "-")
}

export function getMonthStart(date: Date): Date {
  const jst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
  return new Date(Date.UTC(jst.getFullYear(), jst.getMonth(), 1))
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

let _db: NeonQueryFunction<false, false> | null = null

function getDb(): NeonQueryFunction<false, false> {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is not set")
    _db = neon(url)
  }
  return _db
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sql: NeonQueryFunction<false, false> = new Proxy(function () {} as any, {
  apply(_t, _this, args) {
    return (getDb() as unknown as (...a: unknown[]) => unknown)(...args)
  },
  get(_t, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import type { Category } from "@/types"
import { EmptyState } from "@/components/ui/empty-state"

export default function SettingsPage() {
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories")
    setCategories(await res.json())
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const defaultCats = categories.filter((c) => c.isDefault)
  const customCats = categories.filter((c) => !c.isDefault)

  async function handleDeleteCategory(id: string) {
    if (!confirm("削除しますか？")) return
    await fetch(`/api/categories/${id}`, { method: "DELETE" })
    fetchCategories()
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-xl font-bold">設定</h1>

      {/* Account */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">アカウント</p>
          <div className="flex items-center gap-3">
            {session?.user?.image && (
              <img src={session.user.image} alt="" className="w-10 h-10 rounded-full" />
            )}
            <div>
              <p className="text-sm font-medium">{session?.user?.name ?? "-"}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{session?.user?.email ?? "-"}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full px-5 py-4 text-left text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          ログアウト
        </button>
      </div>

      {/* Categories */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <p className="text-sm font-medium">カテゴリ管理</p>
          <button
            onClick={() => { setEditCategory(null); setShowAddCategory(true) }}
            className="text-xs text-[var(--primary)] font-medium px-3 py-1.5 rounded-lg border border-[var(--primary)]/30"
          >
            ＋ 追加
          </button>
        </div>

        {defaultCats.length > 0 && (
          <div>
            <p className="px-5 pt-3 pb-1 text-xs text-[var(--muted-foreground)]">デフォルト</p>
            <div className="grid grid-cols-4 gap-3 px-5 pb-4">
              {defaultCats.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)] text-center">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {customCats.length > 0 && (
          <div className="border-t border-[var(--border)]">
            <p className="px-5 pt-3 pb-1 text-xs text-[var(--muted-foreground)]">カスタム</p>
            <ul className="divide-y divide-[var(--border)]">
              {customCats.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-sm">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditCategory(c); setShowAddCategory(true) }}
                      className="text-xs text-[var(--primary)] px-2 py-1 rounded"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="text-xs text-[var(--expense)] px-2 py-1 rounded"
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {customCats.length === 0 && (
          <EmptyState
            title="カスタムカテゴリはありません"
            description="＋追加ボタンから作成できます"
            className="py-6"
          />
        )}
      </div>

      {/* Account deletion */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <button className="w-full px-5 py-4 text-left text-sm text-[var(--expense)] hover:bg-[var(--expense)]/5 transition-colors">
          アカウントを削除
        </button>
      </div>

      {showAddCategory && (
        <CategorySheet
          category={editCategory}
          onClose={() => setShowAddCategory(false)}
          onSaved={fetchCategories}
        />
      )}
    </div>
  )
}

const EMOJI_OPTIONS = ["🍜", "🚃", "🎮", "🛒", "🏥", "📱", "👕", "💡", "✈️", "🏠", "💰", "🎓", "💄", "⚽", "🎵", "📚", "🚗", "🐾", "🍺", "☕"]

function CategorySheet({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(category?.name ?? "")
  const [icon, setIcon] = useState(category?.icon ?? "💳")
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!name || !icon) return
    setLoading(true)
    if (category) {
      await fetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon }),
      })
    } else {
      await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon }),
      })
    }
    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[var(--surface)] rounded-t-3xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto" />
        <h2 className="text-base font-semibold text-center">
          {category ? "カテゴリを編集" : "カテゴリを追加"}
        </h2>

        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 外食、趣味"
            maxLength={50}
            className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-2 block">
            アイコン（選択中: {icon}）
          </label>
          <div className="grid grid-cols-5 gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setIcon(e)}
                className={`h-10 rounded-xl text-xl transition-colors ${
                  icon === e
                    ? "bg-[var(--primary)]/10 border border-[var(--primary)]"
                    : "bg-[var(--muted)]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm">キャンセル</button>
          <button
            onClick={handleSave}
            disabled={!name || loading}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? "保存中..." : category ? "更新する" : "追加する"}
          </button>
        </div>
      </div>
    </div>
  )
}

// fetch ラッパー: 通信失敗やAPIエラーを吸収して呼び出し側に一貫した形で返す
export async function apiRequest(url: string, options?: RequestInit): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, options)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      return { ok: false, error: typeof body?.error === "string" ? body.error : "保存できませんでした。もう一度お試しください" }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: "通信に失敗しました。電波の良い場所でお試しください" }
  }
}

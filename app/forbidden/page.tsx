import Link from "next/link"

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-error mb-4">403</h1>
        <p className="text-xl text-text-primary mb-2">
          アクセス権限がありません
        </p>
        <p className="text-text-secondary mb-8">
          このページを表示する権限がありません。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-6 py-3 font-semibold text-white shadow-md shadow-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/40"
        >
          ホームに戻る
        </Link>
      </div>
    </main>
  )
}

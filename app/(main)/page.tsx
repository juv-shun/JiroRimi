import { createClient } from "@/lib/supabase/server"
import { Calendar, ChevronRight, Star, Trophy } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

// 次回開催イベントの型定義
type UpcomingEvent = {
  id: string
  name: string
  scheduled_date: string
  entry_start: string
  entry_end: string
  max_participants: number | null
  entries: { count: number }[]
  tournaments: {
    id: string
    name: string
    status: string
  }
}

export default async function HomePage() {
  const supabase = await createClient()

  // 次回開催イベントを取得（JST基準で今日の日付を算出）
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000) // UTC + 9時間
  const today = jstNow.toISOString().split("T")[0]

  const { data: upcomingEvent, error } = await supabase
    .from("events")
    .select(
      `
      id, name, scheduled_date, entry_start, entry_end,
      max_participants,
      entries (count),
      tournaments!inner (id, name, status)
    `
    )
    .gte("scheduled_date", today)
    .in("tournaments.status", ["open", "in_progress"])
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .single()

  // エラー時はログ出力（PGRST116 = データなしは正常）
  const hasError = error && error.code !== "PGRST116"
  if (hasError) {
    console.error("Failed to fetch upcoming event:", error)
  }

  // Supabaseのクエリ結果を型付け
  // Note: 完全な型安全性にはSupabase CLIによる型生成が必要
  // 現状はクエリのselectと型定義が一致していることを手動で保証
  const eventData = upcomingEvent as UpcomingEvent | null

  return (
    <main className="min-h-screen bg-background page-bg-pattern">
      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8 inline-block animate-float">
            <Image
              src="/logo.png"
              alt="Jiro-Rimi Cup"
              width={240}
              height={240}
              className="mx-auto"
              priority
            />
          </div>

          {/* Catchcopy */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-400 bg-clip-text text-transparent">
              本気で競うソロ大会の新境地
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10">
            ポケモンユナイトのソロ大会で、
            <br className="sm:hidden" />
            チームワークと個人スキルを磨こう
          </p>

          {/* 大会紹介カード */}
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* じろカップ */}
            <div
              className="rich-card p-6 opacity-0 text-left"
              style={{
                animation: "card-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">
                    じろカップ
                  </h3>
                  <p className="text-sm text-text-secondary">ボーイズ</p>
                </div>
              </div>
              <p className="text-text-secondary">
                男子ソロ大会。熱い戦いを繰り広げよう！
              </p>
            </div>

            {/* りみカップ */}
            <div
              className="rich-card p-6 opacity-0 text-left"
              style={{
                animation: "card-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">
                    りみカップ
                  </h3>
                  <p className="text-sm text-text-secondary">ガールズ</p>
                </div>
              </div>
              <p className="text-text-secondary">
                女子ソロ大会。輝くプレイを見せよう！
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 次回大会 Section */}
      {eventData && (
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-text-primary">
              次回開催
            </h2>
            <div
              className="tournament-section opacity-0"
              style={{
                animation: "card-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-primary to-amber-400" />
                <h3 className="text-xl font-bold text-text-primary">
                  {eventData.tournaments.name}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="info-row">
                  <span className="text-text-secondary">イベント</span>
                  <span className="font-medium text-text-primary">
                    {eventData.name}
                  </span>
                </div>
                <div className="info-row">
                  <span className="text-text-secondary">開催日</span>
                  <span className="font-medium text-text-primary">
                    {new Date(eventData.scheduled_date).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </span>
                </div>
                <div className="info-row">
                  <span className="text-text-secondary">エントリー期間</span>
                  <span className="font-medium text-text-primary">
                    {new Date(eventData.entry_start).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                    {" 〜 "}
                    {new Date(eventData.entry_end).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/tournaments" className="glass-button inline-flex items-center gap-2">
                  詳細を見る
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* データがない場合のフォールバック（エラー時は非表示） */}
      {!eventData && !hasError && (
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="rich-card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-light to-orange-100 mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <p className="text-text-secondary">
                次回大会をお楽しみに！
              </p>
            </div>
          </div>
        </section>
      )}

    </main>
  )
}

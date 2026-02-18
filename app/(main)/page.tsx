import { Star, Trophy } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
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
    </main>
  )
}

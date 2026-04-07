import Image from "next/image"
import logoImage from "@/public/logo.png"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background page-bg-pattern">
      <section className="relative px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="hero-frame px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="panel-title mb-4">Official Solo Tournament</p>
                <h1 className="mb-5 text-4xl font-black leading-tight tracking-[0.06em] text-[#f4efe6] sm:text-5xl lg:text-6xl">
                  実力で勝ち切る
                  <br />
                  本格ソロ大会
                </h1>
                <p className="mb-8 max-w-2xl text-base leading-8 text-text-secondary sm:text-lg">
                  Jiro-Rimi Cup は、個人技と判断力を問うポケモンユナイトの公式感ある競技体験を目指したソロ大会です。
                  男子向けの「じろカップ」と女子向けの「りみカップ」に分かれ、それぞれで真剣勝負を楽しめます。
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rich-card p-4">
                    <div className="flex items-center gap-4">
                      <Image
                        src="/jiro-icon.png"
                        alt="じろカップ"
                        width={56}
                        height={56}
                        className="rounded-xl border border-[#d8a24c]/20 bg-black/40 p-1"
                      />
                      <div>
                        <p className="panel-title mb-2">Boys Division</p>
                        <p className="text-lg font-bold text-[#f4efe6]">じろカップ</p>
                      </div>
                    </div>
                  </div>
                  <div className="rich-card p-4">
                    <div className="flex items-center gap-4">
                      <Image
                        src="/rimi-icon.png"
                        alt="りみカップ"
                        width={56}
                        height={56}
                        className="rounded-xl border border-[#d8a24c]/20 bg-black/40 p-1"
                      />
                      <div>
                        <p className="panel-title mb-2">Girls Division</p>
                        <p className="text-lg font-bold text-[#f4efe6]">りみカップ</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-x-10 top-6 h-40 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative rounded-[2rem] border border-[#d8a24c]/25 bg-[#2a241f]/88 px-6 py-10 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                  <div className="mb-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-[#d8a24c]">
                    <span>Main Visual</span>
                    <span>Jiro-Rimi Cup</span>
                  </div>
                  <div className="rounded-[2rem] border border-[#d8a24c]/20 bg-[#f3ecde] px-6 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_18px_36px_rgba(0,0,0,0.2)]">
                    <Image
                      src={logoImage}
                      alt="Jiro-Rimi Cup"
                      width={320}
                      height={320}
                      className="mx-auto drop-shadow-[0_10px_24px_rgba(198,31,42,0.18)]"
                      priority
                    />
                  </div>
                  <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8a24c]">
                        Tournament
                      </p>
                      <p className="mt-2 text-sm text-text-secondary">本番感のある配色とシャープな情報設計。</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8a24c]">
                        Broadcast Ready
                      </p>
                      <p className="mt-2 text-sm text-text-secondary">観戦や進行を意識したステージ感のあるUI。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

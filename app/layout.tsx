import type { Metadata } from "next"
import { M_PLUS_Rounded_1c } from "next/font/google"
import "./globals.css"

const mPlusRounded1c = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Jiro-Rimi Cup",
  description: "ポケモンユナイト ソロ大会運営アプリ",
}

type RootLayoutProps = {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body className={`${mPlusRounded1c.className} bg-background min-h-screen`}>
        {children}
      </body>
    </html>
  )
}

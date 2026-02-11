import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "じろりみ",
  description: "ポケモンユナイト ソロ大会運営アプリ"
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

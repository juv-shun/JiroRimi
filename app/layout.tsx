import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unite Solo Tournament Manager",
  description: "Pokemon Unite solo tournament operations app."
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

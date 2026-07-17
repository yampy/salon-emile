import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const notoSerifJp = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Le Salon d'Émile — エミールのサロン",
  description:
    "フランス・リセ哲学カリキュラム(Terminale・全17回)を対話で自律学習するローカルアプリ",
};

const NAV_ITEMS = [
  { href: "/", label: "ロードマップ" },
  { href: "/practice", label: "演習" },
  { href: "/review", label: "復習" },
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/settings", label: "設定" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSerifJp.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-6 px-6 py-4">
            <Link href="/" className="shrink-0 text-xl tracking-wide">
              Le Salon d&rsquo;<em className="italic font-semibold">Émile</em>
            </Link>
            <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-4 text-xs text-muted-foreground">
            対話で哲学をする、ひとりのためのサロン。
          </div>
        </footer>
      </body>
    </html>
  );
}

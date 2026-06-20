import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "ДВИ МГУ — Трекер прогресса",
  description: "Трекер подготовки к вступительному экзамену по математике МГУ",
};

const navLinks = [
  { href: "/", label: "Дашборд" },
  { href: "/topics", label: "По темам" },
  { href: "/variants", label: "По вариантам" },
  { href: "/progress", label: "Прогресс" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 antialiased">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 flex items-center gap-6 h-14">
            <Link href="/" className="font-bold text-gray-900 text-sm tracking-tight">
              ДВИ МГУ · Математика
            </Link>
            <div className="flex gap-1 ml-4">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

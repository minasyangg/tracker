import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ДВИ МГУ — Трекер прогресса",
  description: "Трекер подготовки к вступительному экзамену по математике МГУ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-gray-50 antialiased font-[var(--font-sans)]">
        {children}
      </body>
    </html>
  );
}

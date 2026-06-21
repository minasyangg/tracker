import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "ДВИ МГУ — Трекер прогресса",
  description: "Трекер подготовки к вступительному экзамену по математике МГУ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Study Agent",
  description: "AI study assistant with concept progress tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100">
        <nav className="border-b border-slate-800 bg-slate-900/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-semibold text-slate-100">
              Study Agent
            </Link>

            <div className="flex gap-4 text-sm">
              <Link href="/" className="text-slate-300 hover:text-white">
                Chat
              </Link>

              <Link
                href="/dashboard"
                className="text-slate-300 hover:text-white"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}
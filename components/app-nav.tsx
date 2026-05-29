import Link from 'next/link';

export function AppNav() {
  return (
    <nav className="border-b border-slate-800 bg-slate-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold text-slate-100">
          Study Agent
        </Link>

        <div className="flex gap-4 text-sm">
          <Link href="/" className="text-slate-300 transition hover:text-white">
            Chat
          </Link>
          <Link
            href="/dashboard"
            className="text-slate-300 transition hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}

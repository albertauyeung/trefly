import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-3">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Trefly
        </Link>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

import Link from 'next/link';
import { BrandMark } from '@yasno/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2.5 font-display text-lg font-bold">
        <BrandMark size={36} /> Ясно
      </Link>
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  );
}

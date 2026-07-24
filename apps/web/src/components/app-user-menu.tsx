'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CurrentUser } from '@yasno/auth';
import { ROLE_LABELS } from '@yasno/types';
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@yasno/ui';
import { signOut } from '@/lib/auth-client';

export function AppUserMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const canSeeAdmin = user.role === 'ADMIN';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue focus-visible:ring-offset-2">
        <Avatar name={user.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="normal-case">
          <span className="block font-display text-sm font-bold text-ink normal-case">{user.name}</span>
          <span className="mt-0.5 block text-xs font-normal text-ink-mute">{ROLE_LABELS[user.role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Профіль</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Налаштування</Link>
        </DropdownMenuItem>
        {canSeeAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">Адміністрування</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            router.push('/');
            router.refresh();
          }}
        >
          Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

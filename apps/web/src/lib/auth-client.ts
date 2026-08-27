'use client';

import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from '@proai/auth';

/**
 * inferAdditionalFields<typeof auth>() — це type-only імпорт серверного
 * інстансу: жодного серверного коду не потрапляє у клієнтський бандл,
 * лише типи position/organizationId/role/streak, оголошені в instance.ts.
 */
export const authClient = createAuthClient({
  // У браузері беремо origin поточної сторінки, щоб клієнт не залежав від порту
  // (напр. коли 3000 зайнятий і Next стартує на 3001). На сервері/білді —
  // fallback на NEXT_PUBLIC_APP_URL.
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signUp, signOut, requestPasswordReset, resetPassword } = authClient;

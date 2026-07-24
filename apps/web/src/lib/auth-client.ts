'use client';

import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from '@yasno/auth';

/**
 * inferAdditionalFields<typeof auth>() — це type-only імпорт серверного
 * інстансу: жодного серверного коду не потрапляє у клієнтський бандл,
 * лише типи position/organizationId/role/streak, оголошені в instance.ts.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signUp, signOut, requestPasswordReset, resetPassword } = authClient;

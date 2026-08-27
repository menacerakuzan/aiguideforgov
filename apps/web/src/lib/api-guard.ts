import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ForbiddenError, UnauthorizedError } from '@proai/auth';
import { NotEligibleError } from '@proai/learning';

/**
 * Обгортка над route handler: типізовані помилки доменного шару (auth-гарди,
 * zod-валідація) перетворюються на коректні HTTP-статуси й людські повідомлення,
 * не втрачаючи деталей для форм (ZodError.flatten()).
 */
export function withApiErrors(handler: () => Promise<Response>): Promise<Response> {
  return handler().catch((error: unknown) => {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof NotEligibleError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Перевірте введені дані', details: error.flatten() }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Внутрішня помилка сервера' }, { status: 500 });
  });
}

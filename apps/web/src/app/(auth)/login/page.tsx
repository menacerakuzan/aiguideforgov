'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginInputSchema, type LoginInput } from '@proai/types';
import { Button, ClayCard, FieldError, Input, Label } from '@proai/ui';
import { authErrorMessage } from '@/lib/auth-errors';
import { signIn } from '@/lib/auth-client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginInputSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const { error } = await signIn.email({ email: values.email, password: values.password });
    if (error) {
      // Загальний текст навмисно: він однаковий для «немає такого акаунта» і
      // «пароль не той», щоб форма входу не працювала як довідник адрес.
      setServerError(authErrorMessage(error, 'Неправильна пошта або пароль'));
      return;
    }
    router.push(params.get('next') ?? '/dashboard');
    router.refresh();
  });

  return (
    <ClayCard padding="lg">
      <h1 className="mb-1 font-display text-2xl font-bold">Вхід</h1>
      <p className="mb-6 text-[15px] text-ink-soft">Продовжте навчання з того місця, де зупинилися.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <Label htmlFor="email">Робоча електронна пошта</Label>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Пароль</Label>
            <Link href="/forgot-password" className="mb-2 text-sm font-semibold text-blue-deep">
              Забули пароль?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <FieldError>{serverError}</FieldError>

        <Button type="submit" variant="blue" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Входимо…' : 'Увійти'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Ще немає акаунта?{' '}
        <Link href="/register" className="font-semibold text-blue-deep">
          Зареєструватися
        </Link>
      </p>
    </ClayCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

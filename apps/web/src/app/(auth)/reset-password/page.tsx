'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, ClayCard, FieldError, Input, Label } from '@proai/ui';
import { resetPassword } from '@/lib/auth-client';

const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Мінімум 8 символів').max(128, 'Задовгий пароль'),
});
type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(ResetPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    if (!token) {
      setServerError('Посилання недійсне. Запросіть нове.');
      return;
    }
    setServerError(null);
    const { error } = await resetPassword({ newPassword: values.password, token });
    if (error) {
      setServerError('Посилання недійсне або застаріле. Запросіть нове.');
      return;
    }
    setDone(true);
  });

  if (!token) {
    return (
      <ClayCard padding="lg" className="text-center">
        <h1 className="mb-2 font-display text-2xl font-bold">Посилання недійсне</h1>
        <p className="text-[15px] text-ink-soft">Запросіть нове посилання для відновлення пароля.</p>
        <Link href="/forgot-password" className="mt-6 inline-block font-semibold text-blue-deep">
          Відновити пароль
        </Link>
      </ClayCard>
    );
  }

  if (done) {
    return (
      <ClayCard padding="lg" className="text-center">
        <h1 className="mb-2 font-display text-2xl font-bold">Пароль оновлено</h1>
        <p className="mb-6 text-[15px] text-ink-soft">Тепер можна увійти з новим паролем.</p>
        <Button variant="blue" size="lg" className="w-full" onClick={() => router.push('/login')}>
          До входу
        </Button>
      </ClayCard>
    );
  }

  return (
    <ClayCard padding="lg">
      <h1 className="mb-1 font-display text-2xl font-bold">Новий пароль</h1>
      <p className="mb-6 text-[15px] text-ink-soft">Придумайте новий пароль для входу.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <Label htmlFor="password">Новий пароль</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <FieldError>{serverError}</FieldError>

        <Button type="submit" variant="blue" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Зберігаємо…' : 'Зберегти пароль'}
        </Button>
      </form>
    </ClayCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, ClayCard, FieldError, Input, Label } from '@yasno/ui';
import { requestPasswordReset } from '@/lib/auth-client';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Перевірте адресу'),
});
type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(ForgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    await requestPasswordReset({ email: values.email, redirectTo: '/reset-password' });
    // Навмисно показуємо той самий успіх незалежно від того, чи існує пошта —
    // це не дає зловмиснику перевіряти список зареєстрованих акаунтів.
    setSent(true);
  });

  if (sent) {
    return (
      <ClayCard padding="lg" className="text-center">
        <h1 className="mb-2 font-display text-2xl font-bold">Перевірте пошту</h1>
        <p className="text-[15px] text-ink-soft">
          Якщо акаунт із такою поштою існує, ми надіслали посилання для відновлення пароля. Воно дійсне 1 годину.
        </p>
        <Link href="/login" className="mt-6 inline-block font-semibold text-blue-deep">
          Повернутися до входу
        </Link>
      </ClayCard>
    );
  }

  return (
    <ClayCard padding="lg">
      <h1 className="mb-1 font-display text-2xl font-bold">Відновлення пароля</h1>
      <p className="mb-6 text-[15px] text-ink-soft">Вкажіть пошту — надішлемо посилання для скидання пароля.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <Label htmlFor="email">Робоча електронна пошта</Label>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <Button type="submit" variant="blue" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Надсилаємо…' : 'Надіслати посилання'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link href="/login" className="font-semibold text-blue-deep">
          Повернутися до входу
        </Link>
      </p>
    </ClayCard>
  );
}

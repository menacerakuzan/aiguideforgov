'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmailSchema } from '@proai/types';
import { Button, ClayCard, FieldError, Input, Label } from '@proai/ui';
import { SUPPORT_EMAIL, buildPasswordResetMailto } from '@/lib/support';

/**
 * Відновлення пароля через підтримку.
 *
 * Автоматичне скидання за посиланням з листа тут свідомо не використовується:
 * поштового провайдера в платформі ще немає (infra.mailer лише пише в консоль),
 * тому лист із посиланням нікуди б не пішов, а людина бачила б «перевірте
 * пошту» й чекала листа, якого не існує. Це гірше за відсутність функції.
 *
 * Тому зараз сценарій чесний і робочий: людина вказує пошту акаунта, а ми
 * готуємо їй лист до підтримки з уже заповненою темою й текстом. Серверний
 * механізм скидання за токеном лишається на місці (див. sendResetPassword в
 * services/auth) — щойно зʼявиться реальний mailer, сторінку можна повернути
 * до автоматичного сценарію без інших змін.
 */

const ForgotPasswordSchema = z.object({ email: EmailSchema });
type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(ForgotPasswordSchema) });

  const onSubmit = handleSubmit((values) => setAccount(values.email));

  async function copySupportEmail() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Буфер обміну недоступний (немає дозволу чи http) — адреса й так на екрані. */
    }
  }

  if (account) {
    return (
      <ClayCard padding="lg">
        <h1 className="mb-2 font-display text-2xl font-bold">Напишіть у підтримку</h1>
        <p className="mb-6 text-[15px] text-ink-soft">
          Ми відновимо доступ вручну. Надішліть лист із вашої робочої пошти — так ми переконаємося, що акаунт справді
          ваш.
        </p>

        <dl className="mb-6 flex flex-col gap-3 rounded-2xl bg-black/5 p-4 text-[15px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-ink-soft">Пошта підтримки</dt>
            <dd className="font-semibold break-all">{SUPPORT_EMAIL}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-ink-soft">Акаунт для відновлення</dt>
            <dd className="font-semibold break-all">{account}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3">
          {/* Тема й текст листа вже заповнені — лишається натиснути «Надіслати». */}
          <Button asChild variant="blue" size="lg" className="w-full">
            <a href={buildPasswordResetMailto(account)}>Написати у підтримку</a>
          </Button>
          <Button type="button" variant="ghost" size="lg" className="w-full" onClick={copySupportEmail}>
            {copied ? 'Скопійовано' : 'Скопіювати адресу підтримки'}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link href="/login" className="font-semibold text-blue-deep">
            Повернутися до входу
          </Link>
        </p>
      </ClayCard>
    );
  }

  return (
    <ClayCard padding="lg">
      <h1 className="mb-1 font-display text-2xl font-bold">Відновлення пароля</h1>
      <p className="mb-6 text-[15px] text-ink-soft">
        Вкажіть пошту акаунта — підготуємо звернення до підтримки, і ми відновимо доступ.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <Label htmlFor="email">Робоча електронна пошта</Label>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <Button type="submit" variant="blue" size="lg" className="mt-2 w-full">
          Продовжити
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

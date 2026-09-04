'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from '@proai/icons';
import { RequestPasswordResetInputSchema, type RequestPasswordResetInput } from '@proai/types';
import { Button, ClayCard, FieldError, Input, Label, Orb } from '@proai/ui';
import { api } from '@/lib/api-client';
import { SUPPORT_EMAIL } from '@/lib/support';

/**
 * Відновлення пароля через заявку до адміністратора.
 *
 * Автоматичне скидання за посиланням із листа тут свідомо не використовується:
 * поштового провайдера в платформі ще немає (infra.mailer лише пише в консоль),
 * тому лист із посиланням нікуди б не пішов, а людина бачила б «перевірте
 * пошту» й чекала листа, якого не існує.
 *
 * Тому сценарій такий: людина лишає пошту, заявка потрапляє в чергу
 * адміністратора, той скидає пароль і надсилає новий. Серверний механізм
 * Better Auth за токеном лишається на місці — щойно зʼявиться справжній mailer,
 * сторінку можна повернути до автоматичного сценарію.
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestPasswordResetInput>({ resolver: zodResolver(RequestPasswordResetInputSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFailed(null);
    try {
      await api.post('/api/password-reset', values);
      setSent(true);
    } catch (error) {
      setFailed(error instanceof Error ? error.message : 'Не вдалося надіслати заявку. Спробуйте ще раз.');
    }
  });

  if (sent) {
    return (
      <ClayCard padding="lg" className="text-center">
        <Orb color="green" size="lg" className="mx-auto mb-4">
          <Mail size={26} />
        </Orb>
        <h1 className="mb-2 font-display text-2xl font-bold">Заявку прийнято</h1>
        <p className="mb-6 text-[15px] text-ink-soft">
          Вам на пошту надійде новий пароль від підтримки. Після входу змініть його в налаштуваннях.
        </p>
        <p className="mb-6 text-sm text-ink-mute">
          Якщо листа не буде протягом робочого дня — напишіть на{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-blue-deep break-all">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <Button asChild variant="blue" size="lg" className="w-full">
          <Link href="/login">Повернутися до входу</Link>
        </Button>
      </ClayCard>
    );
  }

  return (
    <ClayCard padding="lg">
      <h1 className="mb-1 font-display text-2xl font-bold">Відновлення пароля</h1>
      <p className="mb-6 text-[15px] text-ink-soft">
        Вкажіть пошту вашого акаунта. Підтримка скине пароль і надішле новий на цю адресу.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <Label htmlFor="email">Електронна пошта</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            invalid={!!errors.email}
            {...register('email')}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        {failed && <p className="text-sm font-semibold text-red-deep">{failed}</p>}

        <Button type="submit" variant="blue" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Надсилаємо…' : 'Надіслати'}
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

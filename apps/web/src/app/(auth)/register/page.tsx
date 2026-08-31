'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterInputSchema, type RegisterInput } from '@proai/types';
import { Button, ClayCard, FieldError, Input, Label, Select } from '@proai/ui';
import { api } from '@/lib/api-client';
import { authErrorMessage } from '@/lib/auth-errors';
import { signUp } from '@/lib/auth-client';

interface OrganizationOption {
  id: string;
  name: string;
  kind: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: () => api.get<{ organizations: OrganizationOption[] }>('/api/organizations/list'),
    // Довідник органів влади змінюється раз на місяці — не смикаємо його
    // на кожен фокус вкладки, поки людина заповнює форму.
    staleTime: 10 * 60_000,
  });
  const organizations = data?.organizations ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(RegisterInputSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    // confirmPassword свідомо НЕ передаємо: воно існує лише щоб зловити
    // друкарську помилку у формі. Better Auth відхиляє невідомі поля, а
    // надсилати пароль двічі — зайве.
    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      organizationId: values.organizationId,
      position: values.position,
    });
    if (error) {
      setServerError(authErrorMessage(error));
      return;
    }
    router.push('/dashboard');
    router.refresh();
  });

  return (
    <ClayCard padding="lg">
      <h1 className="mb-1 font-display text-2xl font-bold">Реєстрація</h1>
      <p className="mb-6 text-[15px] text-ink-soft">Перший урок безкоштовний і триває вісім хвилин.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <Label htmlFor="name">Прізвище та імʼя</Label>
          <Input id="name" autoComplete="name" invalid={!!errors.name} {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="email">Робоча електронна пошта</Label>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Повторіть пароль</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="organizationId">Орган влади</Label>
          <Select id="organizationId" {...register('organizationId')}>
            <option value="">Оберіть зі списку</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>
          <FieldError>{errors.organizationId?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="position">Посада</Label>
          <Input id="position" placeholder="Наприклад: головний спеціаліст" {...register('position')} />
          <FieldError>{errors.position?.message}</FieldError>
        </div>

        <FieldError>{serverError}</FieldError>

        <Button type="submit" variant="blue" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Створюємо…' : 'Зареєструватися'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Вже маєте акаунт?{' '}
        <Link href="/login" className="font-semibold text-blue-deep">
          Увійти
        </Link>
      </p>
    </ClayCard>
  );
}

import { Skeleton } from '@yasno/ui';

/**
 * Миттєвий відгук на клік по посиланню. Без loading.tsx App Router тримає
 * стару сторінку на екрані, доки не приїде RSC-відповідь і чанк маршруту —
 * зовні це виглядає як «кнопка не працює» на 2-5 секунд.
 */
export default function AppLoading() {
  return (
    <div className="pt-8" aria-busy="true" aria-label="Завантаження сторінки">
      <Skeleton className="h-4 w-40 rounded-full" />
      <Skeleton className="mt-3 h-9 w-[min(28rem,80%)] rounded-2xl" />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-52 rounded-[34px]" />
        <Skeleton className="h-52 rounded-[34px]" />
      </div>

      <Skeleton className="mt-5 h-44 rounded-[34px]" />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-[34px]" />
        <Skeleton className="h-56 rounded-[34px]" />
      </div>
    </div>
  );
}

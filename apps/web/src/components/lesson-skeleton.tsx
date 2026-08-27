import { Skeleton } from '@proai/ui';

/**
 * Каркас уроку. Використовується двічі й навмисно однаковий в обох місцях:
 * у loading.tsx (доки їде чанк маршруту) і в самій сторінці (доки react-query
 * тягне /api/lessons/[id]) — інакше при переході блимають два різні стани.
 */
export function LessonSkeleton() {
  return (
    <div className="mx-auto max-w-[720px] pt-8" aria-busy="true" aria-label="Завантаження уроку">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="ml-auto h-7 w-20" />
      </div>

      <Skeleton className="h-9 w-[90%] rounded-2xl" />
      <Skeleton className="mt-3 h-3.5 w-56" />

      <div className="mt-9 flex flex-col gap-4">
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-[96%] rounded-lg" />
        <Skeleton className="h-4 w-[88%] rounded-lg" />
        <Skeleton className="h-4 w-[92%] rounded-lg" />
      </div>

      <Skeleton className="mt-8 h-48 rounded-[34px]" />
      <Skeleton className="mt-7 h-40 rounded-[34px]" />
    </div>
  );
}

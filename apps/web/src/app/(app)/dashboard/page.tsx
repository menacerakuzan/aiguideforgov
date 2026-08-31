import { requireCurrentUser } from '@proai/auth';
import { getDashboard } from '@proai/learning';
import { DashboardClient } from '@/components/dashboard-client';

/**
 * Серверна оболонка дашборда.
 *
 * Раніше сторінка була клієнтською й будувала себе двома послідовними
 * запитами: /api/progress, а вже з його відповіді — /api/modules/<поточний>.
 * Тепер обидва кроки робить getDashboard на сервері, і вміст приходить разом
 * із HTML.
 */
export default async function DashboardPage() {
  const me = await requireCurrentUser();
  const { progress, currentModule, noActiveCourse } = await getDashboard(me.id);

  return <DashboardClient progress={progress} currentModule={currentModule} noActiveCourse={noActiveCourse} />;
}

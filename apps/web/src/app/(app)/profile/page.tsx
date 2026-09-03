import Link from 'next/link';
import { prisma } from '@proai/db';
import { getStreak } from '@proai/learning';
import { ROLE_LABELS } from '@proai/types';
import { Award, Book, Chart, Flame, Mail } from '@proai/icons';
import { Avatar, Button, ClayCard, Orb } from '@proai/ui';
import { requirePageUser } from '@/lib/page-guard';

export default async function ProfilePage() {
  const me = await requirePageUser();

  // Серію беремо з розрахунку, а не з кешу User.streak: кеш оновлюється лише
  // в момент активності, тож у профілі показував би давно згорілу серію.
  const [user, streak] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      include: { organization: true, certificates: { where: { revoked: false } } },
    }),
    getStreak(me.id),
  ]);

  return (
    <div className="pt-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Профіль</h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <ClayCard className="flex flex-col items-center gap-3 text-center">
          <Avatar name={user.name} size="lg" className="h-20 w-20 text-2xl" />
          <h2 className="font-display text-xl font-bold">{user.name}</h2>
          <p className="text-sm text-ink-soft">{ROLE_LABELS[user.role]}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button variant="blue" size="sm" asChild>
              <Link href="/progress">
                <Chart size={15} /> Мій прогрес
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings">Редагувати профіль</Link>
            </Button>
          </div>
        </ClayCard>

        <div className="flex flex-col gap-5">
          <ClayCard>
            <h3 className="mb-4 text-[15px] font-bold text-ink-mute uppercase">Контакти й посада</h3>
            <dl className="flex flex-col gap-3 text-[15px]">
              <div className="flex items-center gap-3">
                <Orb size="sm" color="blue">
                  <Mail size={15} />
                </Orb>
                <div>
                  <dt className="text-xs text-ink-mute">Пошта</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
              </div>
              {user.position && (
                <div className="flex items-center gap-3">
                  <Orb size="sm" color="green">
                    <Book size={15} />
                  </Orb>
                  <div>
                    <dt className="text-xs text-ink-mute">Посада</dt>
                    <dd className="font-medium">{user.position}</dd>
                  </div>
                </div>
              )}
              {user.organization && (
                <div className="flex items-center gap-3">
                  <Orb size="sm" color="amber">
                    <Book size={15} />
                  </Orb>
                  <div>
                    <dt className="text-xs text-ink-mute">Орган влади</dt>
                    <dd className="font-medium">{user.organization.name}</dd>
                  </div>
                </div>
              )}
            </dl>
          </ClayCard>

          <div className="grid grid-cols-2 gap-5">
            <ClayCard variant="sun" className="flex items-center gap-3">
              <Orb color="sun">
                <Flame size={22} />
              </Orb>
              <div>
                <p className="font-display text-2xl font-bold">{streak.current}</p>
                <p className="text-xs font-semibold">днів поспіль</p>
                <p className="text-[11px] opacity-80">рекорд — {streak.longest}</p>
              </div>
            </ClayCard>
            <ClayCard variant="gold" className="flex items-center gap-3">
              <Orb color="gold">
                <Award size={22} />
              </Orb>
              <div>
                <p className="font-display text-2xl font-bold">{user.certificates.length}</p>
                <p className="text-xs font-semibold">чинних сертифікатів</p>
              </div>
            </ClayCard>
          </div>
        </div>
      </div>
    </div>
  );
}

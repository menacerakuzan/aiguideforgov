'use client';

import { useEffect, useState } from 'react';
import { Award, Book, Shield, Spark } from '@proai/icons';
import { Button, Dialog, DialogContent, Orb } from '@proai/ui';

const STORAGE_KEY = 'yasno-onboarded';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: <Shield size={26} />,
    title: 'Вітаємо в «ПРО.ШІ»!',
    description:
      'Це коротке знайомство з кабінетом за 4 кроки. Тут ви проходите курс, стежите за прогресом і отримуєте сертифікат.',
  },
  {
    icon: <Book size={24} />,
    title: '«План на сьогодні»',
    description: 'На дашборді завжди видно кілька найближчих уроків поточного модуля — клікніть, щоб почати урок.',
  },
  {
    icon: <Spark size={24} />,
    title: 'Бібліотека',
    description: 'Готові промпти, чек-листи й правила — усе можна шукати, копіювати й застосовувати одразу в роботі.',
  },
  {
    icon: <Award size={24} />,
    title: 'Атестація й сертифікат',
    description:
      'Коли пройдете всі модулі й тести, відкриється фінальна атестація. Складіть її — і отримаєте іменний сертифікат із перевіркою за кодом.',
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  }

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish()}>
      <DialogContent className="text-center">
        <Orb size="lg" color="blue" className="mx-auto mb-4">
          {current.icon}
        </Orb>
        <h2 className="mb-2 font-display text-xl font-bold">{current.title}</h2>
        <p className="mb-6 text-[15px] text-ink-soft">{current.description}</p>

        <div className="mb-5 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i === step ? 'bg-blue' : 'bg-paper-2'}`} />
          ))}
        </div>

        <div className="flex justify-center gap-3">
          {!isLast && (
            <Button variant="ghost" onClick={finish}>
              Пропустити
            </Button>
          )}
          <Button variant="blue" onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
            {isLast ? 'Розпочати навчання' : 'Далі'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

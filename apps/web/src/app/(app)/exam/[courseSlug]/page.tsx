'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FinalExam, SubmitFinalExamResponse } from '@yasno/types';
import { Award, Check, Shield, XIcon } from '@yasno/icons';
import { Button, ClayCard, EmptyState, Orb, ProgressRing, QuizDots, QuizOption, type QuizOptionState } from '@yasno/ui';
import { api } from '@/lib/api-client';
import { useFireConfetti } from '@/components/confetti-provider';

type Screen = 'intro' | 'exam' | 'result';

export default function FinalExamPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = use(params);
  const queryClient = useQueryClient();
  const fireConfetti = useFireConfetti();

  const { data, isLoading } = useQuery({
    queryKey: ['exam', courseSlug],
    queryFn: () => api.get<{ exam: FinalExam }>(`/api/exam/${courseSlug}`),
  });

  const [screen, setScreen] = useState<Screen>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitFinalExamResponse | null>(null);

  const submit = useMutation({
    mutationFn: (finalAnswers: number[]) =>
      api.post<SubmitFinalExamResponse>('/api/exam/submit', { examId: data!.exam.id, answers: finalAnswers }),
    onSuccess: (res) => {
      setResult(res);
      setScreen('result');
      queryClient.invalidateQueries({ queryKey: ['progress', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      if (res.passed) fireConfetti(res.certificate ? 200 : 120);
    },
  });

  if (isLoading || !data) return <div className="pt-8 text-ink-soft">Завантаження…</div>;
  const exam = data.exam;

  if (exam.eligible === false && screen === 'intro') {
    return (
      <div className="mx-auto max-w-[680px] pt-8">
        <ClayCard>
          <EmptyState
            icon={<Shield size={22} />}
            title="Атестація ще недоступна"
            description="Завершіть усі модулі курсу й складіть їхні тести — після цього фінальна атестація відкриється."
            action={
              <Button variant="blue" asChild>
                <Link href="/courses">До курсів</Link>
              </Button>
            }
          />
        </ClayCard>
      </div>
    );
  }

  const question = exam.questions[index];

  function selectAnswer(i: number) {
    setPicked(i);
  }

  function next() {
    const nextAnswers = [...answers, picked ?? -1];
    setAnswers(nextAnswers);
    setPicked(null);
    if (index < exam.questions.length - 1) {
      setIndex(index + 1);
    } else {
      submit.mutate(nextAnswers);
    }
  }

  return (
    <div className="mx-auto max-w-[680px] pt-8">
      {screen === 'intro' && (
        <ClayCard className="p-9 text-center">
          <Orb color="gold" size="lg" className="mx-auto mb-4">
            <Award size={28} />
          </Orb>
          <p className="text-xs font-bold tracking-wide text-ink-mute uppercase">Фінальна атестація</p>
          <h1 className="mt-2 mb-4 font-display text-3xl font-bold">{exam.courseTitle}</h1>
          <p className="mx-auto mb-2 max-w-[48ch] text-[16.5px] text-ink-soft">
            {exam.questions.length} питань. Загальний прохідний бал {exam.passScore}%, окремо з безпеки —{' '}
            {exam.securityPassScore}%.
          </p>
          <p className="mb-7 text-sm text-ink-mute">Успішне складання видає іменний сертифікат.</p>
          <Button variant="sun" size="lg" onClick={() => setScreen('exam')}>
            Почати атестацію
          </Button>
        </ClayCard>
      )}

      {screen === 'exam' && question && (
        <>
          <QuizDots
            className="mb-5"
            states={exam.questions.map((_, i) =>
              i === index ? 'current' : answers[i] !== undefined ? 'done' : 'todo',
            )}
          />
          <ClayCard className="p-8">
            <p className="text-xs font-bold tracking-wide text-ink-mute uppercase">
              Питання {index + 1} з {exam.questions.length}
              {question.isSecurity && <span className="ml-2 text-red-deep">· безпека</span>}
            </p>
            <h2 className="mt-3 mb-6 font-display text-xl font-bold sm:text-2xl">{question.text}</h2>
            <div className="flex flex-col gap-3">
              {question.options.map((opt, i) => (
                <QuizOption
                  key={opt}
                  index={i}
                  text={opt}
                  state={(picked === i ? 'picked' : 'idle') as QuizOptionState}
                  onSelect={() => selectAnswer(i)}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="blue" onClick={next} disabled={picked === null}>
                {index === exam.questions.length - 1 ? 'Результат' : 'Далі'}
              </Button>
            </div>
          </ClayCard>
        </>
      )}

      {screen === 'result' && result && (
        <>
          <ClayCard className="p-9 text-center">
            <ProgressRing value={result.score} complete={result.passed} className="mx-auto mb-5">
              <span className="font-display text-4xl font-bold">{result.score}%</span>
            </ProgressRing>
            <h2 className="font-display text-2xl font-bold">
              {result.passed ? 'Атестацію складено!' : 'Атестацію не складено'}
            </h2>
            <p className="mx-auto mt-3 max-w-[48ch] text-[15.5px] text-ink-soft">
              Загальний бал {result.score}% (поріг {result.passScore}%) · бал з безпеки {result.securityScore}% (поріг{' '}
              {result.securityPassScore}%)
            </p>

            {result.certificate && (
              <div className="mx-auto mt-6 flex max-w-[360px] items-center gap-3 rounded-[26px] bg-gold-tint p-4 text-left">
                <Orb color="gold">
                  <Award size={22} />
                </Orb>
                <div>
                  <p className="font-display font-bold">Сертифікат видано!</p>
                  <p className="text-xs text-gold-deep">Код {result.certificate.code}</p>
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {result.certificate ? (
                <Button variant="green" asChild>
                  <Link href="/certificates">До сертифіката</Link>
                </Button>
              ) : (
                <Button
                  variant="blue"
                  onClick={() => {
                    setScreen('intro');
                    setIndex(0);
                    setAnswers([]);
                    setPicked(null);
                    setResult(null);
                  }}
                >
                  Спробувати ще раз
                </Button>
              )}
            </div>
          </ClayCard>

          <ClayCard className="mt-5 p-7">
            <h3 className="mb-4 text-lg font-bold">Розбір відповідей</h3>
            <div className="flex flex-col gap-3">
              {result.review.map((r, i) => (
                <div key={i} className="flex items-start gap-3 rounded-[20px] bg-paper-2 p-4">
                  <Orb size="sm" color={r.ok ? 'green' : 'red'}>
                    {r.ok ? <Check size={15} /> : <XIcon size={15} />}
                  </Orb>
                  <div>
                    <p className="text-sm font-medium">{r.questionText}</p>
                    {!r.ok && <p className="mt-1 text-[13.5px] text-ink-soft">Правильно: {r.correctText}</p>}
                  </div>
                </div>
              ))}
            </div>
          </ClayCard>
        </>
      )}
    </div>
  );
}

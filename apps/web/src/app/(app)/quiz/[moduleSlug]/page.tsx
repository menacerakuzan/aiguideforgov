'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Quiz, SubmitQuizResponse } from '@yasno/types';
import { Check, Shield, XIcon } from '@yasno/icons';
import { Button, ClayCard, Orb, ProgressRing, QuizDots, QuizOption, type QuizOptionState } from '@yasno/ui';
import { api } from '@/lib/api-client';
import { useFireConfetti } from '@/components/confetti-provider';

type Screen = 'intro' | 'quiz' | 'result';

export default function QuizPage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = use(params);
  const queryClient = useQueryClient();
  const fireConfetti = useFireConfetti();

  const { data, isLoading } = useQuery({
    queryKey: ['quiz', moduleSlug],
    queryFn: () => api.get<{ quiz: Quiz }>(`/api/quiz/${moduleSlug}`),
  });

  const [screen, setScreen] = useState<Screen>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitQuizResponse | null>(null);

  const submit = useMutation({
    mutationFn: (finalAnswers: number[]) =>
      api.post<SubmitQuizResponse>('/api/progress/submit-quiz', { quizId: data!.quiz.id, answers: finalAnswers }),
    onSuccess: (res) => {
      setResult(res);
      setScreen('result');
      queryClient.invalidateQueries({ queryKey: ['progress', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      if (res.passed) fireConfetti(100);
    },
  });

  if (isLoading || !data) return <div className="pt-8 text-ink-soft">Завантаження…</div>;
  const quiz = data.quiz;
  const question = quiz.questions[index];

  function selectAnswer(i: number) {
    setPicked(i);
  }

  function next() {
    const nextAnswers = [...answers, picked ?? -1];
    setAnswers(nextAnswers);
    setPicked(null);
    if (index < quiz.questions.length - 1) {
      setIndex(index + 1);
    } else {
      submit.mutate(nextAnswers);
    }
  }

  return (
    <div className="mx-auto max-w-[680px] pt-8">
      {screen === 'intro' && (
        <ClayCard className="p-9 text-center">
          <Orb color="red" size="lg" className="mx-auto mb-4">
            <Shield size={28} />
          </Orb>
          <p className="text-xs font-bold tracking-wide text-ink-mute uppercase">Тест модуля</p>
          <h1 className="mt-2 mb-4 font-display text-3xl font-bold">{quiz.moduleTitle}</h1>
          <p className="mx-auto mb-2 max-w-[44ch] text-[16.5px] text-ink-soft">
            {quiz.questions.length} питань, без таймера. Прохідний бал {quiz.passScore}%.
          </p>
          <p className="mb-7 text-sm text-ink-mute">Не складеться з першого разу — спроби необмежені.</p>
          <Button variant="blue" size="lg" onClick={() => setScreen('quiz')}>
            Почати тест
          </Button>
        </ClayCard>
      )}

      {screen === 'quiz' && question && (
        <>
          <QuizDots
            className="mb-5"
            states={quiz.questions.map((_, i) =>
              i === index ? 'current' : answers[i] !== undefined ? 'done' : 'todo',
            )}
          />
          <ClayCard className="p-8">
            <p className="text-xs font-bold tracking-wide text-ink-mute uppercase">
              Питання {index + 1} з {quiz.questions.length}
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
                {index === quiz.questions.length - 1 ? 'Результат' : 'Далі'}
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
              {result.passed ? 'Модуль складено!' : `Майже! Не вистачило ${result.passScore - result.score}%`}
            </h2>
            <p className="mx-auto mt-3 max-w-[46ch] text-[15.5px] text-ink-soft">
              {result.passed
                ? 'Прохідний бал узято. Розбір відповідей — нижче.'
                : `Прохідний бал — ${result.passScore}%. Спроби необмежені, розбір допоможе побачити прогалини.`}
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {result.passed ? (
                <Button variant="blue" asChild>
                  <Link href={`/module/${quiz.moduleSlug}`}>До модуля</Link>
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

'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check } from '@yasno/icons';
import { Button, ClayCard, Input } from '@yasno/ui';
import { toast } from '@yasno/ui';
import { api } from '@/lib/api-client';
import { QuestionBankEditor, emptyQuestion, type EditableQuestion } from '@/components/admin/question-bank-editor';

interface AdminQuiz {
  id: string;
  moduleId: string;
  passScore: number;
  questions: EditableQuestion[];
}

export default function QuizEditorPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'quiz', moduleId],
    queryFn: () => api.get<{ quiz: AdminQuiz | null }>(`/api/admin/quiz?moduleId=${moduleId}`),
  });

  const [passScore, setPassScore] = useState(75);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setPassScore(data.quiz?.passScore ?? 75);
      setQuestions(data.quiz?.questions ?? [emptyQuestion()]);
      setInitialized(true);
    }
  }, [data, initialized]);

  if (isLoading || !initialized) return <div className="pt-8 text-ink-soft">Завантаження…</div>;

  async function save() {
    setSaving(true);
    try {
      await api.put('/api/admin/quiz', { moduleId, passScore, questions });
      toast.success('Тест модуля збережено');
    } catch {
      toast.error('Не вдалося зберегти — перевірте, що заповнені всі поля');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[820px] pt-8 pb-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={() => router.push('/admin/content')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft"
        >
          <ArrowLeft size={14} /> До контенту курсу
        </button>
        <Button variant="green" onClick={save} disabled={saving}>
          <Check size={16} /> {saving ? 'Зберігаємо…' : 'Зберегти тест'}
        </Button>
      </div>

      <ClayCard className="mb-6 flex items-center gap-4">
        <label className="text-sm font-semibold">Прохідний бал, %</label>
        <Input
          type="number"
          className="max-w-[120px]"
          value={passScore}
          onChange={(e) => setPassScore(Number(e.target.value))}
        />
      </ClayCard>

      <QuestionBankEditor questions={questions} onChange={setQuestions} />
    </div>
  );
}

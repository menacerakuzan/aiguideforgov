'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check } from '@yasno/icons';
import { Button, ClayCard, Input, toast } from '@yasno/ui';
import { api } from '@/lib/api-client';
import { QuestionBankEditor, emptyQuestion, type EditableQuestion } from '@/components/admin/question-bank-editor';

interface AdminExam {
  id: string;
  courseId: string;
  passScore: number;
  securityPassScore: number;
  questions: EditableQuestion[];
}

export default function ExamEditorPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'exam', courseId],
    queryFn: () => api.get<{ exam: AdminExam | null }>(`/api/admin/exam?courseId=${courseId}`),
  });

  const [passScore, setPassScore] = useState(80);
  const [securityPassScore, setSecurityPassScore] = useState(90);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setPassScore(data.exam?.passScore ?? 80);
      setSecurityPassScore(data.exam?.securityPassScore ?? 90);
      setQuestions(data.exam?.questions ?? [emptyQuestion()]);
      setInitialized(true);
    }
  }, [data, initialized]);

  if (isLoading || !initialized) return <div className="pt-8 text-ink-soft">Завантаження…</div>;

  async function save() {
    setSaving(true);
    try {
      await api.put('/api/admin/exam', { courseId, passScore, securityPassScore, questions });
      toast.success('Фінальну атестацію збережено');
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
          onClick={() => router.push(`/admin/content/${courseId}`)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft"
        >
          <ArrowLeft size={14} /> До контенту курсу
        </button>
        <Button variant="green" onClick={save} disabled={saving}>
          <Check size={16} /> {saving ? 'Зберігаємо…' : 'Зберегти атестацію'}
        </Button>
      </div>

      <ClayCard className="mb-6 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold">Загальний прохідний бал, %</label>
          <Input
            type="number"
            className="max-w-[120px]"
            value={passScore}
            onChange={(e) => setPassScore(Number(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold">Поріг з безпеки, %</label>
          <Input
            type="number"
            className="max-w-[120px]"
            value={securityPassScore}
            onChange={(e) => setSecurityPassScore(Number(e.target.value))}
          />
        </div>
      </ClayCard>

      <QuestionBankEditor questions={questions} onChange={setQuestions} showSecurityFlag />
    </div>
  );
}

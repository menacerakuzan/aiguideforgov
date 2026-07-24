'use client';

import { Input, Textarea, Button, ClayCard } from '@yasno/ui';
import { XIcon } from '@yasno/icons';

export interface EditableQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explainCorrect: string;
  explainWrong: string;
  isSecurity?: boolean;
}

export function emptyQuestion(): EditableQuestion {
  return { text: '', options: ['', ''], correctIndex: 0, explainCorrect: '', explainWrong: '' };
}

/** Спільний редактор банку питань — використовується і для тесту модуля, і для фінальної атестації. */
export function QuestionBankEditor({
  questions,
  onChange,
  showSecurityFlag,
}: {
  questions: EditableQuestion[];
  onChange: (questions: EditableQuestion[]) => void;
  showSecurityFlag?: boolean;
}) {
  function updateQuestion(i: number, patch: Partial<EditableQuestion>) {
    const next = [...questions];
    next[i] = { ...next[i]!, ...patch };
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-5">
      {questions.map((q, i) => (
        <ClayCard key={i} padding="sm" className="relative">
          <button
            onClick={() => onChange(questions.filter((_, idx) => idx !== i))}
            className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full text-ink-mute hover:bg-paper-2"
            aria-label="Видалити питання"
          >
            <XIcon size={15} />
          </button>
          <p className="mb-3 px-2 text-xs font-bold tracking-wide text-ink-mute uppercase">Питання {i + 1}</p>
          <div className="flex flex-col gap-3 px-2">
            <Textarea value={q.text} onChange={(e) => updateQuestion(i, { text: e.target.value })} placeholder="Текст питання" />
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={q.correctIndex === oi}
                  onChange={() => updateQuestion(i, { correctIndex: oi })}
                  aria-label={`Варіант ${oi + 1} правильний`}
                />
                <Input
                  value={opt}
                  onChange={(e) => {
                    const options = [...q.options];
                    options[oi] = e.target.value;
                    updateQuestion(i, { options });
                  }}
                  placeholder={`Варіант ${oi + 1}`}
                />
                <button
                  type="button"
                  onClick={() => updateQuestion(i, { options: q.options.filter((_, idx) => idx !== oi) })}
                  aria-label="Видалити варіант"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => updateQuestion(i, { options: [...q.options, ''] })}>
              + Варіант
            </Button>
            <Textarea
              value={q.explainCorrect}
              onChange={(e) => updateQuestion(i, { explainCorrect: e.target.value })}
              placeholder="Пояснення правильної відповіді"
            />
            <Textarea
              value={q.explainWrong}
              onChange={(e) => updateQuestion(i, { explainWrong: e.target.value })}
              placeholder="Пояснення неправильної відповіді"
            />
            {showSecurityFlag && (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!q.isSecurity}
                  onChange={(e) => updateQuestion(i, { isSecurity: e.target.checked })}
                />
                Питання безпеки (рахується в окремий поріг securityPassScore)
              </label>
            )}
          </div>
        </ClayCard>
      ))}

      <Button type="button" variant="ghost" onClick={() => onChange([...questions, emptyQuestion()])}>
        + Питання
      </Button>
    </div>
  );
}

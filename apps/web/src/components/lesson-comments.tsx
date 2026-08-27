'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ThumbsDown, ThumbsUp, XIcon } from '@proai/icons';
import { Button, ClayCard, Textarea, toast } from '@proai/ui';
import type { CommentsResponse, LessonComment } from '@proai/types';
import { api } from '@/lib/api-client';

export function LessonComments({ lessonId }: { lessonId: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['comments', lessonId],
    queryFn: () => api.get<CommentsResponse>(`/api/lessons/${lessonId}/comments`),
  });

  const post = useMutation({
    mutationFn: () => api.post(`/api/lessons/${lessonId}/comments`, { body }),
    onSuccess: () => {
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['comments', lessonId] });
    },
  });

  const react = useMutation({
    mutationFn: ({ commentId, value }: { commentId: string; value: 1 | -1 }) =>
      api.post(`/api/comments/${commentId}/react`, { value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', lessonId] }),
  });

  const remove = useMutation({
    mutationFn: (commentId: string) => api.delete(`/api/comments/${commentId}`),
    onSuccess: () => {
      toast.success('Коментар видалено');
      queryClient.invalidateQueries({ queryKey: ['comments', lessonId] });
    },
  });

  return (
    <ClayCard className="mt-6">
      <h2 className="mb-4 text-lg font-bold">Питання й коментарі</h2>

      <div className="mb-5 flex flex-col gap-3">
        <Textarea
          placeholder="Запитайте щось про урок або поділіться думкою…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button
          variant="blue"
          size="sm"
          className="self-start"
          disabled={!body.trim() || post.isPending}
          onClick={() => post.mutate()}
        >
          {post.isPending ? 'Надсилаємо…' : 'Надіслати'}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-ink-soft">Завантаження…</p>}
      {!isLoading && data?.comments.length === 0 && (
        <p className="text-sm text-ink-soft">Ще немає коментарів — будьте першим.</p>
      )}

      <div className="flex flex-col gap-3">
        {data?.comments.map((c) => (
          <CommentRow
            key={c.id}
            comment={c}
            onReact={(value) => react.mutate({ commentId: c.id, value })}
            onDelete={() => remove.mutate(c.id)}
          />
        ))}
      </div>
    </ClayCard>
  );
}

function CommentRow({
  comment,
  onReact,
  onDelete,
}: {
  comment: LessonComment;
  onReact: (value: 1 | -1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl bg-paper-2 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">{comment.authorName}</p>
        {comment.isOwn && (
          <button aria-label="Видалити коментар" onClick={onDelete} className="text-ink-mute hover:text-red-deep">
            <XIcon size={14} />
          </button>
        )}
      </div>
      <p className="mb-3 text-[15px]">{comment.body}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onReact(1)}
          className={`flex items-center gap-1.5 text-sm font-bold ${comment.myReaction === 1 ? 'text-green-deep' : 'text-ink-mute'}`}
        >
          <ThumbsUp size={15} /> {comment.likes}
        </button>
        <button
          onClick={() => onReact(-1)}
          className={`flex items-center gap-1.5 text-sm font-bold ${comment.myReaction === -1 ? 'text-red-deep' : 'text-ink-mute'}`}
        >
          <ThumbsDown size={15} /> {comment.dislikes}
        </button>
      </div>
    </div>
  );
}

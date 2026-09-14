import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser } from '@proai/auth';
import type { LessonBlock, SearchResponse, SearchResultItem } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

function snippetFromHtml(html: string, maxLen = 140): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

/** lesson.content — JSON-масив LessonBlock, не HTML напряму; беремо текст лише з блоків `text`. */
function snippetFromLessonContent(content: string, maxLen = 140): string {
  try {
    const blocks = JSON.parse(content) as LessonBlock[];
    const html = blocks
      .filter((b): b is Extract<LessonBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.html)
      .join(' ');
    return snippetFromHtml(html, maxLen);
  } catch {
    return '';
  }
}

/** Пошук по уроках і бібліотеці (промпти + ресурси) в одному запиті. */
export async function GET(request: NextRequest) {
  return withApiErrors(async () => {
    await requireCurrentUser();
    const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) return NextResponse.json<SearchResponse>({ results: [] });

    const [lessons, prompts, resources] = await Promise.all([
      prisma.lesson.findMany({
        // Уроки закритих курсів у видачу не потрапляють: сторінка уроку на них
        // однаково віддає 404, і результат пошуку вів би в нікуди.
        where: {
          module: { section: { course: { comingSoon: false } } },
          OR: [{ title: { contains: q } }, { content: { contains: q } }],
        },
        take: 8,
      }),
      prisma.prompt.findMany({
        where: { OR: [{ title: { contains: q } }, { useCase: { contains: q } }, { body: { contains: q } }] },
        take: 8,
      }),
      prisma.resource.findMany({
        where: { OR: [{ title: { contains: q } }, { summary: { contains: q } }, { body: { contains: q } }] },
        take: 8,
      }),
    ]);

    const results: SearchResultItem[] = [
      ...lessons.map((l) => ({
        kind: 'lesson' as const,
        id: l.id,
        title: l.title,
        snippet: snippetFromLessonContent(l.content),
        href: `/lesson/${l.id}`,
      })),
      ...prompts.map((p) => ({
        kind: 'prompt' as const,
        id: p.id,
        title: p.title,
        snippet: p.useCase,
        href: `/library`,
      })),
      ...resources.map((r) => ({
        kind: 'resource' as const,
        id: r.id,
        title: r.title,
        snippet: r.summary,
        href: `/library`,
      })),
    ];

    return NextResponse.json<SearchResponse>({ results });
  });
}

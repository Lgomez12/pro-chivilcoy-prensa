import { NextResponse } from 'next/server';
import { getAllNews } from '../../../lib/news';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const articles =
    await getAllNews();

  return NextResponse.json(
    {
      updatedAt:
        new Date().toISOString(),
      count:
        articles.length,
      articles
    },
    {
      headers: {
        'Cache-Control':
          'no-store, no-cache, must-revalidate, max-age=0'
      }
    }
  );
}

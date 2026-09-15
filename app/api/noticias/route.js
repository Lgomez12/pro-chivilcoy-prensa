import { NextResponse } from 'next/server';
import { getAllNews } from '../../../lib/news';

export const revalidate = 1800;

export async function GET() {
  const articles = await getAllNews();
  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    count: articles.length,
    articles
  });
}

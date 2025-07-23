import { NextRequest, NextResponse } from 'next/server';
import { db } from 'db';

export async function POST(request: NextRequest) {
  try {
    const { prompt, essayType, maxWords } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const initialContent = `Start writing your essay here!`;

    const essayAssist = await db.essayAssist.create({
      data: {
        prompt,
        essayType: essayType || 'personal',
        maxWords: maxWords || 500,
        currentContent: initialContent,
        history: [initialContent],
        wordCount: initialContent.trim().split(/\s+/).length,
      },
    });

    return NextResponse.json({
      success: true,
      essayAssist,
    });
  } catch (error) {
    console.error('Essay assist creation error:', error);
    return NextResponse.json({ error: 'Failed to create essay assist' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const essayAssists = await db.essayAssist.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        prompt: true,
        essayType: true,
        maxWords: true,
        wordCount: true,
        status: true,
        lastReviewAt: true,
        currentContent: true,
      },
    });

    return NextResponse.json({
      success: true,
      essayAssists,
    });
  } catch (error) {
    console.error('Essay assists list error:', error);
    return NextResponse.json({ error: 'Failed to fetch essay assists' }, { status: 500 });
  }
}

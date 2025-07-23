import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from 'db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const essayAssist = await db.essayAssist.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!essayAssist) {
      return NextResponse.json({ error: 'Essay assist not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      essayAssist,
    });
  } catch (error) {
    console.error('Essay assist fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch essay assist' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { currentContent, history, lastReviewData, reviewHistory, suggestions, essayType, maxWords, status } = data;

    // Verify ownership
    const existingEssay = await db.essayAssist.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingEssay) {
      return NextResponse.json({ error: 'Essay assist not found' }, { status: 404 });
    }

    // Calculate word count if content is provided
    let wordCount = existingEssay.wordCount;
    if (currentContent !== undefined) {
      wordCount = currentContent.trim() ? currentContent.trim().split(/\s+/).length : 0;
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (currentContent !== undefined) updateData.currentContent = currentContent;
    if (history !== undefined) updateData.history = history;
    if (lastReviewData !== undefined) {
      updateData.lastReviewData = lastReviewData;
      updateData.lastReviewAt = new Date();
    }
    if (reviewHistory !== undefined) updateData.reviewHistory = reviewHistory;
    if (suggestions !== undefined) updateData.suggestions = suggestions;
    if (essayType !== undefined) updateData.essayType = essayType;
    if (maxWords !== undefined) updateData.maxWords = maxWords;
    if (status !== undefined) updateData.status = status;
    if (wordCount !== existingEssay.wordCount) updateData.wordCount = wordCount;

    const essayAssist = await db.essayAssist.update({
      where: {
        id: params.id,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      essayAssist,
    });
  } catch (error) {
    console.error('Essay assist update error:', error);
    return NextResponse.json({ error: 'Failed to update essay assist' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership before deletion
    const existingEssay = await db.essayAssist.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingEssay) {
      return NextResponse.json({ error: 'Essay assist not found' }, { status: 404 });
    }

    await db.essayAssist.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Essay assist deleted successfully',
    });
  } catch (error) {
    console.error('Essay assist deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete essay assist' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from 'db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { suggestionUuid, appliedText, originalText, startIndex, endIndex } = await request.json();

    if (!suggestionUuid || !appliedText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify essay assist ownership
    const essayAssist = await db.essayAssist.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!essayAssist) {
      return NextResponse.json({ error: 'Essay assist not found' }, { status: 404 });
    }

    // Track the applied suggestion
    const appliedSuggestion = {
      uuid: suggestionUuid,
      appliedText,
      originalText,
      startIndex,
      endIndex,
      appliedAt: new Date(),
    };

    // Update the essay assist record
    await db.essayAssist.update({
      where: { id: params.id },
      data: {
        appliedSuggestions: {
          push: appliedSuggestion
        },
        updatedAt: new Date(),
      },
    });

    console.log('✅ Applied suggestion tracked:', {
      suggestionUuid,
      appliedText: appliedText.substring(0, 50) + '...',
      startIndex,
      endIndex
    });

    return NextResponse.json({
      success: true,
      appliedSuggestion,
    });
  } catch (error) {
    console.error('Apply suggestion error:', error);
    return NextResponse.json({ error: 'Failed to apply suggestion' }, { status: 500 });
  }
} 
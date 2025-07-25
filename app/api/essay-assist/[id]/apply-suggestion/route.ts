import { NextRequest, NextResponse } from 'next/server';
import { db } from 'db';
import { EssayDiffSystem, AppliedSuggestion } from '@/lib/essay-diff-system';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { suggestionUuid, appliedText, originalText, startIndex, endIndex, category } = await request.json();

    if (!suggestionUuid || !appliedText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify essay assist ownership
    const essayAssist = await db.essayAssist.findFirst({
      where: {
        id: params.id,
      },
    });

    if (!essayAssist) {
      return NextResponse.json({ error: 'Essay assist not found' }, { status: 404 });
    }

    // Initialize or restore diff system
    const diffSystem = essayAssist.diffSystemState 
      ? EssayDiffSystem.deserialize(essayAssist.diffSystemState)
      : new EssayDiffSystem();

    // Record the applied suggestion in the diff system
    const appliedSuggestion: AppliedSuggestion = {
      id: suggestionUuid,
      originalText: originalText || '',
      replacementText: appliedText,
      startIndex: startIndex || 0,
      endIndex: endIndex || 0,
      appliedAt: new Date(),
      category: category || 'unknown'
    };

    diffSystem.recordAppliedSuggestion(appliedSuggestion);

    // Update the essay assist record with the new diff system state
    await db.essayAssist.update({
      where: { id: params.id },
      data: {
        diffSystemState: diffSystem.serialize(),
        updatedAt: new Date(),
      },
    });

    console.log('✅ Applied suggestion tracked in diff system:', {
      suggestionUuid,
      appliedText: appliedText.substring(0, 50) + '...',
      category,
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
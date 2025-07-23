import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from 'db';
import { openai } from '@/lib/openai';
import { v4 as uuidv4 } from 'uuid';

interface DiffResult {
  type: 'applied_suggestion' | 'manual_edit' | 'no_change';
  changes: Array<{
    startIndex: number;
    endIndex: number;
    oldText: string;
    newText: string;
    category?: string;
  }>;
}

interface ReviewRequest {
  assistId: string;
  content: string;
  prompt?: string;
  previousContent?: string;
  appliedSuggestions?: string[]; // UUIDs of applied suggestions
  manualEdits?: Array<{
    startIndex: number;
    endIndex: number;
    oldText: string;
    newText: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assistId, content, prompt, previousContent, appliedSuggestions = [], manualEdits = [] }: ReviewRequest = await request.json();

    if (!assistId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get essay assist data
    const essayAssist = await db.essayAssist.findFirst({
      where: { id: assistId, userId: session.user.id },
    });

    if (!essayAssist) {
      return NextResponse.json({ error: 'Essay assist not found' }, { status: 404 });
    }

    // Detect changes from previous content
    const diffResult = detectChanges(content, previousContent || essayAssist.currentContent, appliedSuggestions, manualEdits);
    
    console.log('🔍 Change detection:', {
      type: diffResult.type,
      changesCount: diffResult.changes.length,
      appliedSuggestionsCount: appliedSuggestions.length,
      manualEditsCount: manualEdits.length
    });

    // Generate review based on change type
    let review;
    let shouldGenerateSuggestions = true;
    let suggestionCount = 20; // Default for first review

    if (diffResult.type === 'no_change') {
      return NextResponse.json({ error: 'No changes detected' }, { status: 400 });
    }

    if (diffResult.type === 'applied_suggestion') {
      // Only update scores, no new suggestions
      shouldGenerateSuggestions = false;
      review = await generateScoreUpdate(content, essayAssist.lastReviewData, diffResult);
    } else if (diffResult.type === 'manual_edit') {
      // Generate focused suggestions for edited areas
      suggestionCount = Math.min(10, diffResult.changes.length * 3); // Max 10 suggestions
      review = await generateFocusedReview(content, prompt, diffResult, suggestionCount);
    } else {
      // First review or significant changes - full review
      suggestionCount = 20 + Math.floor(Math.random() * 30); // 20-50 suggestions
      review = await generateFullReview(content, prompt, suggestionCount);
    }

    // Save to database
    await saveReviewData(assistId, content, review, diffResult);

    return NextResponse.json({
      success: true,
      review,
      changeType: diffResult.type,
      changesCount: diffResult.changes.length
    });

  } catch (error) {
    console.error('Review generation error:', error);
    return NextResponse.json({ error: 'Failed to generate review' }, { status: 500 });
  }
}

function detectChanges(
  currentContent: string, 
  previousContent: string, 
  appliedSuggestions: string[], 
  manualEdits: any[]
): DiffResult {
  if (currentContent === previousContent) {
    return { type: 'no_change', changes: [] };
  }

  // Simple diff detection - in production, use a proper diff library
  const changes: Array<{
    startIndex: number;
    endIndex: number;
    oldText: string;
    newText: string;
    category?: string;
  }> = [];
  
  // Add manual edits to changes
  manualEdits.forEach(edit => {
    changes.push({
      startIndex: edit.startIndex,
      endIndex: edit.endIndex,
      oldText: edit.oldText,
      newText: edit.newText,
      category: 'manual_edit'
    });
  });

  // Determine change type
  if (appliedSuggestions.length > 0 && manualEdits.length === 0) {
    return { type: 'applied_suggestion', changes };
  } else if (manualEdits.length > 0) {
    return { type: 'manual_edit', changes };
  } else {
    // Significant changes without clear tracking
    return { type: 'manual_edit', changes };
  }
}

async function generateFullReview(content: string, prompt?: string, suggestionCount: number = 30) {
  const systemPrompt = `You are a Harvard admissions officer reviewing a college application essay. 
  
Generate a comprehensive review with:
1. Overall score (0-100)
2. 3 metrics (Clarity, Delivery, Quality) with scores 0-100
3. 3 sub-grades (Structure, Uniqueness, Hook) with letter grades
4. ${suggestionCount} specific suggestions for improvement

Return JSON in this exact format:
{
  "overallScore": 75,
  "metrics": [
    {"label": "Clarity", "value": 80},
    {"label": "Delivery", "value": 75},
    {"label": "Quality", "value": 70}
  ],
  "subGrades": [
    {"label": "Structure", "grade": "B+"},
    {"label": "Uniqueness", "grade": "B"},
    {"label": "Hook", "grade": "B"}
  ],
  "suggestions": [
    {
      "uuid": "unique-id",
      "category": "Grammar",
      "title": "Fix subject-verb agreement",
      "description": "Change 'The students is' to 'The students are'",
      "startIndex": 45,
      "endIndex": 55,
      "replacement": "The students are"
    }
  ]
}

Order suggestions by essay position (first sections first).`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Essay: ${content}\n\nPrompt: ${prompt || 'Personal statement'}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 4000,
  });

  const reviewData = JSON.parse(response.choices[0]?.message?.content || '{}');
  
  // Add UUIDs to suggestions if missing
  reviewData.suggestions = reviewData.suggestions?.map((suggestion: any) => ({
    ...suggestion,
    uuid: suggestion.uuid || uuidv4()
  })) || [];

  return reviewData;
}

async function generateFocusedReview(content: string, prompt: string | undefined, diffResult: DiffResult, suggestionCount: number) {
  const editedSections = diffResult.changes.map(change => 
    `Section: "${change.oldText}" → "${change.newText}"`
  ).join('\n');

  const systemPrompt = `You are a Harvard admissions officer. The user made manual edits to their essay. 
  
Focus ONLY on the edited sections and generate ${suggestionCount} targeted suggestions for improvement.

Edited sections:
${editedSections}

Return JSON with only suggestions for the edited areas:
{
  "suggestions": [
    {
      "uuid": "unique-id", 
      "category": "Grammar",
      "title": "Improve clarity",
      "description": "Make this sentence more concise",
      "startIndex": 45,
      "endIndex": 55,
      "replacement": "Improved text"
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Essay: ${content}\n\nPrompt: ${prompt || 'Personal statement'}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2000,
  });

  const reviewData = JSON.parse(response.choices[0]?.message?.content || '{}');
  
  // Add UUIDs to suggestions
  reviewData.suggestions = reviewData.suggestions?.map((suggestion: any) => ({
    ...suggestion,
    uuid: suggestion.uuid || uuidv4()
  })) || [];

  return reviewData;
}

async function generateScoreUpdate(content: string, lastReview: any, diffResult: DiffResult) {
  // Simple score boost for applied suggestions
  const appliedCount = diffResult.changes.length;
  const scoreBoost = Math.min(3, appliedCount); // Max 3 point boost
  
  return {
    ...lastReview,
    overallScore: Math.min(100, (lastReview.overallScore || 0) + scoreBoost),
    // Keep existing suggestions
    suggestions: lastReview.suggestions || []
  };
}

async function saveReviewData(assistId: string, content: string, review: any, diffResult: DiffResult) {
  // Update essay assist record
  await db.essayAssist.update({
    where: { id: assistId },
    data: {
      currentContent: content,
      lastReviewData: review,
      lastReviewAt: new Date(),
      updatedAt: new Date(),
      // Track applied suggestions
      appliedSuggestions: {
        push: diffResult.changes
          .filter(change => change.category === 'applied_suggestion')
          .map(change => change.startIndex.toString()) // Use startIndex as identifier since uuid doesn't exist
      }
    },
  });
} 
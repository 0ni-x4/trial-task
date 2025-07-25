import { NextRequest, NextResponse } from 'next/server';
import { db } from 'db';
import { EssayDiffSystem } from '@/lib/essay-diff-system';
import { ProgressiveScoringSystem } from '@/lib/progressive-scoring-system';
import { SmartSuggestionGenerator } from '@/lib/smart-suggestion-generator';
import { openai } from '@/lib/openai';

interface ReviewRequest {
  assistId: string;
  content: string;
  prompt?: string;
  appliedSuggestionIds?: string[];
  isFirstReview?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { assistId, content, prompt, appliedSuggestionIds = [], isFirstReview = false }: ReviewRequest = await request.json();

    if (!assistId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get essay assist data
    const essayAssist = await db.essayAssist.findFirst({
      where: { id: assistId },
    });

    if (!essayAssist) {
      return NextResponse.json({ error: 'Essay assist not found' }, { status: 404 });
    }

    // Initialize or restore systems from database
    const diffSystem = essayAssist.diffSystemState 
      ? EssayDiffSystem.deserialize(essayAssist.diffSystemState)
      : new EssayDiffSystem();
    
    const scoringSystem = essayAssist.scoringSystemState
      ? ProgressiveScoringSystem.deserialize(essayAssist.scoringSystemState)
      : new ProgressiveScoringSystem();
    
    const suggestionGenerator = new SmartSuggestionGenerator();

    let version, diff;
    
    if (isFirstReview) {
      // Create initial version
      version = diffSystem.createInitialVersion(content);
      diff = { changes: [], changeType: 'initial' as const, appliedSuggestionIds: [], affectedRegions: [] };
    } else {
      // Add new version and compute diff
      const latestVersion = diffSystem.getLatestVersion();
      if (!latestVersion) {
        throw new Error('No previous version found');
      }
      
      const result = diffSystem.addVersion(content, latestVersion.id, appliedSuggestionIds);
      version = result.version;
      diff = result.diff;
    }

    console.log('🔍 Version tracking:', {
      versionId: version.id,
      changeType: diff.changeType,
      changesCount: diff.changes.length,
      appliedSuggestions: appliedSuggestionIds.length
    });

    // Generate suggestions using smart generator
    const suggestionResult = await suggestionGenerator.generateSuggestions({
      content,
      prompt,
      diff,
      previousSuggestions: essayAssist.lastReviewData?.suggestions || [],
      appliedSuggestionIds,
      isFirstReview
    });

    let review;
    
    if (isFirstReview) {
      // Generate initial AI review with scores
      review = await generateInitialReview(content, prompt, suggestionResult.suggestions);
      
      // Set baseline score
      scoringSystem.setBaselineScore({
        overallScore: review.overallScore,
        metrics: review.metrics,
        subGrades: review.subGrades,
        version: version.id,
        timestamp: new Date()
      });
    } else {
      // Calculate progressive score
      const newScore = scoringSystem.calculateProgressiveScore(
        content,
        diff,
        appliedSuggestionIds
      );
      
      review = {
        overallScore: newScore.overallScore,
        metrics: newScore.metrics,
        subGrades: newScore.subGrades,
        suggestions: suggestionResult.suggestions,
        version: newScore.version,
        generationType: suggestionResult.generationType,
        focusedRegions: suggestionResult.focusedRegions
      };
    }

    // Register suggestion impacts for future scoring
    suggestionResult.suggestions.forEach(suggestion => {
      if (suggestion.impact) {
        scoringSystem.registerSuggestionImpact(suggestion.impact);
      }
    });

    // Save systems state to database
    await db.essayAssist.update({
      where: { id: assistId },
      data: {
        currentContent: content,
        lastReviewData: review,
        lastReviewAt: new Date(),
        updatedAt: new Date(),
        diffSystemState: diffSystem.serialize(),
        scoringSystemState: scoringSystem.serialize(),
        wordCount: version.wordCount
      },
    });

    return NextResponse.json({
      success: true,
      review,
      changeType: diff.changeType,
      changesCount: diff.changes.length,
      suggestionCount: suggestionResult.suggestionCount,
      generationType: suggestionResult.generationType
    });

  } catch (error) {
    console.error('Review generation error:', error);
    return NextResponse.json({ error: 'Failed to generate review' }, { status: 500 });
  }
}

async function generateInitialReview(content: string, prompt: string = '', suggestions: any[]) {
  const systemPrompt = `You are a Harvard admissions officer reviewing a college application essay. 
  
Generate a comprehensive initial review with:
1. Overall score (0-100)
2. 3 metrics (Clarity, Delivery, Quality) with scores 0-100
3. 3 sub-grades (Structure, Uniqueness, Hook) with letter grades

The suggestions are already provided separately.

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
  ]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Essay: ${content}\n\nPrompt: ${prompt}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1000,
  });

  const reviewData = JSON.parse(response.choices[0]?.message?.content || '{}');
  
  return {
    ...reviewData,
    suggestions
  };
}
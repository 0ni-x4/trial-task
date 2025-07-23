import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export const runtime = 'edge'; // optional

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Request received:', req.body);
    const { essay, suggestions, question, chatHistory, requestHighlights, highlightType } =
      await req.json();

    if (!essay || !question) {
      return NextResponse.json({ error: 'Essay and question are required.' }, { status: 400 });
    }

    // Simplified system prompt - only current essay context
    const systemPrompt = requestHighlights
      ? `You are Ivy, an AI college-essay counselor. You're an AI model developed by Admisist AI, Your job is to help students improve their essays. Do NOT mention OpenAI or what underlying model you're using.

ANALYSIS SCOPE:
- Analyze ONLY the current essay content provided
- No conversation history or context from previous messages
- Each question is treated independently

RESPONSE RULES:
- Keep responses under 50 words
- Be specific and actionable
- No fluff or unnecessary details

HIGHLIGHT TYPES:
- "positive": Strong parts (green)
- "negative": Weak parts (red)  
- "warning": Needs improvement (yellow)
- "neutral": General references (teal)

RESPONSE FORMAT (JSON):
{ "answer": "<concise response under 30 words>", "highlights": [{"text": "<exact text>", "type": "positive|negative|warning|neutral"}] }`
      : `You are Ivy, an AI college-essay counselor.

ANALYSIS SCOPE:
- Analyze ONLY the current essay content provided
- No conversation history or context from previous messages
- Each question is treated independently

RESPONSE RULES:
- Keep responses under 50 words
- Be specific and actionable
- No fluff or unnecessary details

RESPONSE FORMAT (JSON):
{ "answer": "<concise response under 50 words>", "highlight": "<exact text if relevant, can be over 50 words>" }`;

    const userPrompt = requestHighlights
      ? `Essay:\n${essay}\n\nSuggestions:\n${JSON.stringify(suggestions, null, 2)}\n\nCurrent Question:\n${question}\n\nHighlight Context: ${highlightType || 'neutral'} - Respond in JSON format with highlights.`
      : `Essay:\n${essay}\n\nSuggestions:\n${JSON.stringify(suggestions, null, 2)}\n\nCurrent Question:\n${question}\n\nRespond in JSON format.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    try {
      const parsedResponse = JSON.parse(content);
      return NextResponse.json(parsedResponse);
    } catch (parseError) {
      console.error('[COUNSELOR_API_PARSE_ERROR]', parseError, 'Raw content:', content);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
  } catch (error) {
    console.error('[COUNSELOR_API_ERROR]', error);

    // More specific error handling
    if (error instanceof Error && error.message.includes('json')) {
      return NextResponse.json(
        {
          error: 'OpenAI JSON format error - please check system prompt includes "json" keyword',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}

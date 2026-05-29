import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

interface DetectConceptRequest {
  userMessage: string;
}

interface DetectConceptResponse {
  subject: string;
  concept: string;
}

function emptyResult(): DetectConceptResponse {
  return { subject: '', concept: '' };
}

function parseDetectionResult(raw: string): DetectConceptResponse {
  const cleaned = raw.trim();
  const candidates = [cleaned];

  const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<DetectConceptResponse>;
      return {
        subject: typeof parsed.subject === 'string' ? parsed.subject.trim() : '',
        concept: typeof parsed.concept === 'string' ? parsed.concept.trim() : '',
      };
    } catch {
      // Try next candidate.
    }
  }

  return emptyResult();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DetectConceptRequest;
    const userMessage = body.userMessage?.trim();

    if (!userMessage) {
      return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
    }

    const prompt = [
      'Extract the study subject and specific concept from the message.',
      'Return ONLY valid JSON with exactly this shape:',
      '{"subject":"<string>","concept":"<string>"}',
      "If the message is not about studying/learning a concept, return {\"subject\":\"\",\"concept\":\"\"}.",
      '',
      `Message: """${userMessage}"""`,
    ].join('\n');

    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      prompt,
      temperature: 0,
    });

    const extracted = parseDetectionResult(result.text);
    return NextResponse.json(extracted);
  } catch (error) {
    console.error('Detect concept route error:', error);
    return NextResponse.json(emptyResult());
  }
}

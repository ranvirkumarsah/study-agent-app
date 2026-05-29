import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface ChatRequest {
  userMessage: string;
  subject?: string;
  concept?: string;
}

interface ConceptRow {
  id: string;
  subject: string;
  concept: string;
  mastery_level: 'Introduced' | 'Developing' | 'Proficient' | 'Strong';
  weak_areas?: string[] | null;
  strong_areas?: string[] | null;
}

async function upsertConceptTouch(subject: string, concept: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase || !subject || !concept) return;

  const { error } = await supabase.from('concepts').upsert(
    {
      subject,
      concept,
      mastery_level: 'Introduced',
      overview_gist: '',
      deep_dive_gist: [],
      strong_areas: [],
      weak_areas: [],
      next_steps: [],
      notes: '',
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'subject,concept' }
  );

  if (error) {
    console.error('Supabase upsert touch error:', error);
  }
}

function buildSystemPrompt(
  conceptData: ConceptRow | null,
  subject: string,
  concept: string
): string {
  const baseContext = concept
    ? `The user is learning "${concept}"${subject ? ` in ${subject}` : ''}.`
    : 'You are a helpful educational assistant.';

  if (!conceptData) {
    return `${baseContext}

Mode A (beginner-friendly):
- Start with a relatable analogy before technical details
- Define every technical term in plain language
- Keep explanations scaffolded and step-by-step
- Use simple examples before abstraction`;
  }

  const weakAreas = conceptData.weak_areas ?? [];
  const strongAreas = conceptData.strong_areas ?? [];
  const weakAreasContext =
    weakAreas.length > 0 ? `Weak areas: ${weakAreas.join(', ')}.` : 'Weak areas: none noted.';
  const strongAreasContext =
    strongAreas.length > 0
      ? `Strong areas: ${strongAreas.join(', ')}.`
      : 'Strong areas: none noted.';

  if (
    conceptData.mastery_level === 'Introduced' ||
    conceptData.mastery_level === 'Developing'
  ) {
    return `${baseContext}

Mode B (guided progression):
- Reference prior knowledge where appropriate
- Call out and support weak areas with extra scaffolding
- Use a moderate pace with concise checks for understanding
- Keep terminology accurate but explain transitions clearly

${weakAreasContext}
${strongAreasContext}`;
  }

  return `${baseContext}

Mode C (advanced technical):
- Assume foundational understanding and skip basics
- Focus on nuance, edge cases, trade-offs, and precision
- Highlight subtle misconceptions and advanced implications
- Keep explanations concise and technical

${weakAreasContext}
${strongAreasContext}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = (await request.json()) as ChatRequest;
    const userMessage = body.userMessage?.trim();
    const subject = body.subject?.trim() ?? '';
    const concept = body.concept?.trim() ?? '';

    if (!userMessage) {
      return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
    }

    let conceptData: ConceptRow | null = null;

    if (supabase && subject && concept) {
      const { data, error } = await supabase
        .from('concepts')
        .select('id, subject, concept, mastery_level, weak_areas, strong_areas')
        .eq('subject', subject)
        .eq('concept', concept)
        .maybeSingle();

      if (error) {
        console.error('Supabase query error:', error);
      } else if (data) {
        conceptData = data as ConceptRow;
      }
    }

    await upsertConceptTouch(subject, concept);

    const systemPrompt = buildSystemPrompt(conceptData, subject, concept);

    const result = await streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const response = result.toTextStreamResponse();

    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error('Chat route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

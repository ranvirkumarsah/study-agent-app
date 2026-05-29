import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface SaveConceptRequest {
  subject: string;
  concept: string;
  masteryLevel: 'Introduced' | 'Developing' | 'Proficient' | 'Strong';
  overviewGist: string;
  deepDiveGist: string[];
  strongAreas: string[];
  weakAreas: string[];
  nextSteps: string[];
  notes: string;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            'Supabase server write key missing. Set SUPABASE_SERVICE_ROLE_KEY in .env for API route writes.',
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as Partial<SaveConceptRequest>;

    const subject = body.subject?.trim() ?? '';
    const concept = body.concept?.trim() ?? '';
    const masteryLevel = body.masteryLevel;
    const overviewGist = body.overviewGist?.trim() ?? '';
    const notes = body.notes?.trim() ?? '';
    const deepDiveGist = isStringArray(body.deepDiveGist) ? body.deepDiveGist : [];
    const strongAreas = isStringArray(body.strongAreas) ? body.strongAreas : [];
    const weakAreas = isStringArray(body.weakAreas) ? body.weakAreas : [];
    const nextSteps = isStringArray(body.nextSteps) ? body.nextSteps : [];

    if (!subject || !concept) {
      return NextResponse.json({ error: 'subject and concept are required' }, { status: 400 });
    }

    if (
      masteryLevel !== 'Introduced' &&
      masteryLevel !== 'Developing' &&
      masteryLevel !== 'Proficient' &&
      masteryLevel !== 'Strong'
    ) {
      return NextResponse.json(
        { error: 'masteryLevel must be one of Introduced, Developing, Proficient, Strong' },
        { status: 400 }
      );
    }

    const payload = {
      subject,
      concept,
      mastery_level: masteryLevel,
      overview_gist: overviewGist,
      deep_dive_gist: deepDiveGist,
      strong_areas: strongAreas,
      weak_areas: weakAreas,
      next_steps: nextSteps,
      notes,
      last_updated: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('concepts')
      .upsert(payload, { onConflict: 'subject,concept' })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json(
        {
          error:
            error.message ??
            'Failed to save concept. Check Supabase RLS policies or service role key.',
          code: error.code ?? null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, concept: data });
  } catch (error) {
    console.error('Save concept route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

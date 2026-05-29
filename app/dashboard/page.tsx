import { averageMasteryPercent, type ConceptRow } from '@/lib/concepts';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ConceptCards } from './concept-cards';

async function fetchConcepts(): Promise<ConceptRow[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('concepts')
    .select(
      'id, subject, concept, mastery_level, strong_areas, weak_areas, next_steps, last_updated'
    )
    .order('last_updated', { ascending: false });

  if (error) {
    console.error('Dashboard fetch error:', error);
    return [];
  }

  return (data ?? []) as ConceptRow[];
}

export default async function DashboardPage() {
  const concepts = await fetchConcepts();
  const totalConcepts = concepts.length;
  const uniqueSubjects = new Set(concepts.map((c) => c.subject)).size;
  const avgMastery = averageMasteryPercent(concepts.map((c) => c.mastery_level));

  return (
    <div className="min-h-[calc(100vh-57px)] bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track your saved concepts and mastery progress.
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Concepts studied
            </p>
            <p className="mt-2 text-3xl font-semibold">{totalConcepts}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Unique subjects
            </p>
            <p className="mt-2 text-3xl font-semibold">{uniqueSubjects}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Average mastery
            </p>
            <p className="mt-2 text-3xl font-semibold">{avgMastery}%</p>
          </div>
        </section>

        <ConceptCards concepts={concepts} />
      </main>
    </div>
  );
}

export interface ConceptRow {
  id: string;
  subject: string;
  concept: string;
  mastery_level: string;
  strong_areas: string[] | null;
  weak_areas: string[] | null;
  next_steps: string[] | null;
  last_updated: string;
}

export function masteryScore(level: string): number {
  switch (level) {
    case 'Strong':
      return 4;
    case 'Proficient':
      return 3;
    case 'Developing':
      return 2;
    case 'Introduced':
      return 1;
    case 'In Progress':
      return 0;
    default:
      return 0;
  }
}

export function masteryProgressPercent(level: string): number {
  return Math.round((masteryScore(level) / 4) * 100);
}

export function averageMasteryPercent(levels: string[]): number {
  if (levels.length === 0) return 0;
  const total = levels.reduce((sum, level) => sum + masteryScore(level), 0);
  return Math.round((total / levels.length / 4) * 100);
}

export function subjectPillClass(subject: string): string {
  const styles: Record<string, string> = {
    Physics: 'bg-blue-900/70 text-blue-200 border-blue-700',
    Biology: 'bg-green-900/70 text-green-200 border-green-700',
    Mathematics: 'bg-purple-900/70 text-purple-200 border-purple-700',
    'Computer Science': 'bg-orange-900/70 text-orange-200 border-orange-700',
    Chemistry: 'bg-red-900/70 text-red-200 border-red-700',
  };
  return styles[subject] ?? 'bg-slate-800 text-slate-300 border-slate-600';
}

export function masteryBadgeClass(level: string): string {
  const styles: Record<string, string> = {
    Strong: 'bg-emerald-900/60 text-emerald-200 border-emerald-700',
    Proficient: 'bg-teal-900/60 text-teal-200 border-teal-700',
    Developing: 'bg-amber-900/60 text-amber-200 border-amber-700',
    Introduced: 'bg-sky-900/60 text-sky-200 border-sky-700',
    'In Progress': 'bg-slate-800 text-slate-300 border-slate-600',
  };
  return styles[level] ?? 'bg-slate-800 text-slate-300 border-slate-600';
}

export function formatLastUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

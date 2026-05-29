'use client';

import { useState } from 'react';
import {
  type ConceptRow,
  formatLastUpdated,
  masteryBadgeClass,
  masteryProgressPercent,
  subjectPillClass,
} from '@/lib/concepts';

interface ConceptCardsProps {
  concepts: ConceptRow[];
}

function TagList({
  label,
  items,
  tagClass,
}: {
  label: string;
  items: string[];
  tagClass: string;
}) {
  if (items.length === 0) {
    return (
      <div>
        <p className="mb-1 text-xs font-medium text-slate-400">{label}</p>
        <p className="text-xs text-slate-500">None recorded</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={`rounded-md border px-2 py-0.5 text-xs ${tagClass}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ConceptCards({ concepts }: ConceptCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (concepts.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        No concepts saved yet. Start a chat and save your progress to see them here.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {concepts.map((row) => {
        const isExpanded = expandedId === row.id;
        const progress = masteryProgressPercent(row.mastery_level);
        const strongAreas = row.strong_areas ?? [];
        const weakAreas = row.weak_areas ?? [];
        const nextSteps = row.next_steps ?? [];

        return (
          <article
            key={row.id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 transition hover:border-slate-700"
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : row.id)}
              className="w-full p-4 text-left"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${subjectPillClass(row.subject)}`}
                >
                  {row.subject}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${masteryBadgeClass(row.mastery_level)}`}
                >
                  {row.mastery_level}
                </span>
              </div>

              <h2 className="mb-3 text-base font-semibold text-slate-100">{row.concept}</h2>

              <div className="mb-2">
                <div className="mb-1 flex justify-between text-xs text-slate-400">
                  <span>Mastery</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Last updated {formatLastUpdated(row.last_updated)}
              </p>
            </button>

            {isExpanded ? (
              <div className="space-y-4 border-t border-slate-800 px-4 pb-4 pt-3">
                <TagList
                  label="Strong areas"
                  items={strongAreas}
                  tagClass="border-green-800 bg-green-950/50 text-green-200"
                />
                <TagList
                  label="Weak areas"
                  items={weakAreas}
                  tagClass="border-red-800 bg-red-950/50 text-red-200"
                />
                <TagList
                  label="Next steps"
                  items={nextSteps}
                  tagClass="border-blue-800 bg-blue-950/50 text-blue-200"
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

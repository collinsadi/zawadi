import React from 'react';
import type { EscrowChallenge, EscrowApproval } from './types';

type Props = {
  challenges: EscrowChallenge[];
  approvals: Record<number, EscrowApproval>;
  onSelect: (c: EscrowChallenge) => void;
};

function actionNeeded(c: EscrowChallenge, a: EscrowApproval | undefined): string | null {
  if (!c.isFunded) return 'Funding pending';
  if (!a || (!a.organiserApproved || !a.sponsorApproved)) return 'Distribution approval pending';
  return null;
}

export default function ChallengesGrid({ challenges, approvals, onSelect }: Props) {
  const funded = challenges.filter(c => c.isFunded).length;
  const total = challenges.length;
  return (
    <section className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Challenges</h2>
        <div className="text-xs text-slate-500">{funded} funded / {total} total</div>
      </div>
      {/* Card grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {challenges.map((c) => {
          const a = approvals[c.id];
          const needed = actionNeeded(c, a);
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="group text-left overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition"
            >
              <div className="relative h-40 w-full overflow-hidden">
                <img src={c.data.image} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-semibold text-base line-clamp-1">{c.title}</h3>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {c.sponsorMeta.logo && (
                      <img src={c.sponsorMeta.logo} alt={c.sponsorMeta.name} className="h-6 w-6 rounded-full object-cover border border-white/20" />
                    )}
                    <div className="text-xs text-slate-600 dark:text-slate-300">{c.sponsorMeta.name}</div>
                  </div>
                  <span className={
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ' +
                    (c.isFunded ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')
                  }>
                    {c.isFunded ? 'Funded' : 'Pending'}
                  </span>
                </div>
                {needed && (
                  <div className="mt-2 text-[10px] text-amber-600">{needed}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

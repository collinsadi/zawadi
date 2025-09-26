import { useState } from "react";

export type ChallengeCard = {
  id: number | string;
  title: string;
  totalPrize: string;
  token: string; // token contract address or "ETH"
  isERC20: boolean;
  isFunded?: boolean;
  data: {
    image: string;
    details: string;
  };
  sponsorMeta: {
    link?: string;
    name: string;
    logo?: string;
  };
};

type Props = {
  items: ChallengeCard[];
  showStatus?: boolean; // show funded/pending badge
  onSelect?: (item: ChallengeCard) => void; // optional external selection handler
  buildViewLink?: (item: ChallengeCard) => string; // optional builder for "View more" link
};

export default function ChallengeCards({ items, showStatus = true, onSelect, buildViewLink }: Props) {
  const [selected, setSelected] = useState<ChallengeCard | null>(null);

  const open = (item: ChallengeCard) => {
    if (onSelect) onSelect(item);
    setSelected(item);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => open(c)}
            className="group text-left overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition"
          >
            <div className="relative h-40 w-full overflow-hidden">
              <img
                src={c.data.image}
                alt={c.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-white font-semibold text-base line-clamp-1">{c.title}</h3>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {c.sponsorMeta.logo && (
                    <img
                      src={c.sponsorMeta.logo}
                      alt={c.sponsorMeta.name}
                      className="h-6 w-6 rounded-full object-cover border border-white/20"
                    />
                  )}
                  <div className="text-xs text-slate-600 dark:text-slate-300">{c.sponsorMeta.name}</div>
                </div>
                {showStatus && (
                  <span className={
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                    (c.isFunded ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")
                  }>
                    {c.isFunded ? "Funded" : "Pending"}
                  </span>
                )}
              </div>
            </div>
            <div className="px-3 pb-3 flex items-center justify-between">
              {buildViewLink ? (
                <a
                  href={buildViewLink(c)}
                  className="rounded-lg bg-primary-600 text-white px-3 py-1.5 text-xs font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  View more
                </a>
              ) : (
                <span />
              )}
              
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
              <div className="relative h-44 w-full">
                <img src={selected.data.image} alt={selected.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  className="absolute top-3 right-3 rounded-full bg-black/50 text-white w-7 h-7"
                  onClick={() => setSelected(null)}
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selected.title}</h3>
                <div className="mt-1 text-xs text-slate-500">
                  Challenge #{selected.id} • Prize: {selected.totalPrize} • Token: {selected.isERC20 ? selected.token : "ETH"}
                </div>
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{selected.data.details}</p>

                <div className="mt-4 flex items-center justify-between">
                  {selected.sponsorMeta.link ? (
                    <a
                      href={selected.sponsorMeta.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-primary-700 dark:text-primary-300"
                    >
                      {selected.sponsorMeta.logo && (
                        <img
                          src={selected.sponsorMeta.logo}
                          alt={selected.sponsorMeta.name}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      )}
                      <span>{selected.sponsorMeta.name}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      {selected.sponsorMeta.logo && (
                        <img
                          src={selected.sponsorMeta.logo}
                          alt={selected.sponsorMeta.name}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      )}
                      <span>{selected.sponsorMeta.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

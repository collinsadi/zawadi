import { useState } from "react";
type Props = {
  whitelist: string[];
  newSponsor: string;
  onChangeNewSponsor: (v: string) => void;
  onAddSponsor: () => void;
  onRemoveSponsor: (addr: string) => void;
};

export default function WhitelistPanel({
  whitelist,
  newSponsor,
  onChangeNewSponsor,
  onAddSponsor,
  onRemoveSponsor,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const mask = (addr: string) => (addr?.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr);
  const copy = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(addr);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };
  return (
    <section className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Whitelisted Sponsors</h2>
        {/* <div className="text-[10px] text-slate-500">Organiser: {organiser}</div> */}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newSponsor}
          onChange={(e) => onChangeNewSponsor(e.target.value)}
          placeholder="0x..."
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="button"
          onClick={onAddSponsor}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          Add
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {whitelist.map((addr) => (
          <span
            key={addr}
            title="Click to copy"
            onClick={() => copy(addr)}
            className="inline-flex items-center gap-1 rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 border border-primary-600/20 px-2.5 py-1 text-xs cursor-pointer hover:bg-primary-600/15"
         >
            {mask(addr)}
            {copied === addr ? (
              <span className="ml-1 text-emerald-600">✓</span>
            ) : (
              <button
                aria-label={`Remove ${addr}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSponsor(addr);
                }}
                className="ml-1 hover:text-primary-900"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {whitelist.length === 0 && (
          <span className="text-xs text-slate-500">No sponsors whitelisted yet.</span>
        )}
      </div>
    </section>
  );
}

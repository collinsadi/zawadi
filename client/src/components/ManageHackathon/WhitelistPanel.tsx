type Props = {
  organiser: string;
  whitelist: string[];
  newSponsor: string;
  onChangeNewSponsor: (v: string) => void;
  onAddSponsor: () => void;
  onRemoveSponsor: (addr: string) => void;
};

export default function WhitelistPanel({
  organiser,
  whitelist,
  newSponsor,
  onChangeNewSponsor,
  onAddSponsor,
  onRemoveSponsor,
}: Props) {
  return (
    <section className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Whitelisted Sponsors</h2>
        <div className="text-[10px] text-slate-500">Organiser: {organiser}</div>
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
          <span key={addr} className="inline-flex items-center gap-1 rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 border border-primary-600/20 px-2.5 py-1 text-xs">
            {addr}
            <button aria-label={`Remove ${addr}`} onClick={() => onRemoveSponsor(addr)} className="ml-1 hover:text-primary-900">×</button>
          </span>
        ))}
        {whitelist.length === 0 && (
          <span className="text-xs text-slate-500">No sponsors whitelisted yet.</span>
        )}
      </div>
    </section>
  );
}

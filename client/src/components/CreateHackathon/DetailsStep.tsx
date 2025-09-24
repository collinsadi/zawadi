import { useEffect, useState } from "react";
import type { Hackathon } from "../../types/Hackathon";

type Props = {
  form: Omit<Hackathon, "id">;
  onChange: (next: Omit<Hackathon, "id">) => void;
};

export default function DetailsStep({ form, onChange }: Props) {
  const [tagInput, setTagInput] = useState<string>("");
  const setDetails = <K extends keyof Omit<Hackathon, "id">["details"]>(
    key: K,
    val: Omit<Hackathon, "id">["details"][K]
  ) => onChange({ ...form, details: { ...form.details, [key]: val } });

  // Keep local input cleared if we reach max tags or parent changes drastically
  useEffect(() => {
    if (form.details.tags.length >= 5 && tagInput) setTagInput("");
  }, [form.details.tags.length]);

  const commitTag = (raw: string) => {
    const token = raw.trim();
    if (!token) return;
    if (form.details.tags.length >= 5) return;
    // avoid duplicates (case-insensitive)
    const exists = form.details.tags.some((t) => t.toLowerCase() === token.toLowerCase());
    if (exists) return;
    setDetails("tags", [...form.details.tags, token]);
  };

  const onTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // If user typed commas, commit tokens before the last segment
    if (val.includes(",")) {
      const parts = val.split(",");
      const last = parts.pop() ?? "";
      for (const p of parts) commitTag(p);
    
      setTagInput(last);
    } else {
      setTagInput(val);
    }
  };

  const onTagsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ",") {
      e.preventDefault();
      if (tagInput) {
        commitTag(tagInput);
        setTagInput("");
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagInput) {
        commitTag(tagInput);
        setTagInput("");
      }
    }
  };

  const onTagsBlur = () => {
    if (tagInput) {
      commitTag(tagInput);
      setTagInput("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Prize Pool</label>
          <input
            type="number"
            min={0}
            value={form.details.prizePool}
            onChange={(e) => setDetails("prizePool", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Currency</label>
          <select
            value={form.details.currency}
            onChange={(e) => setDetails("currency", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Type</label>
          <select
            value={form.type}
            onChange={(e) => onChange({ ...form, type: e.target.value as Omit<Hackathon, "id">["type"] })}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="Online">Online</option>
            <option value="In-person">In-person</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Location</label>
          <input
            type="text"
            value={form.details.location}
            onChange={(e) => setDetails("location", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder={form.type === "Online" ? "Global / Online" : "City, Country"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
          <input
            type="date"
            value={form.details.startDate ? form.details.startDate.substring(0, 10) : ""}
            onChange={(e) => setDetails("startDate", new Date(e.target.value).toISOString())}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
          <input
            type="date"
            value={form.details.endDate ? form.details.endDate.substring(0, 10) : ""}
            onChange={(e) => setDetails("endDate", new Date(e.target.value).toISOString())}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tags (max 5)</label>
        <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
          {form.details.tags.map((t, idx) => (
            <span
              key={t + idx}
              className="inline-flex items-center gap-1 rounded-full bg-primary-600 text-white text-xs font-medium px-2.5 py-1"
            >
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                onClick={() => setDetails("tags", form.details.tags.filter((x) => x !== t))}
                className="ml-1 text-white/90 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}

          <input
            type="text"
            value={tagInput}
            onChange={onTagsChange}
            onKeyDown={onTagsKeyDown}
            onBlur={onTagsBlur}
            disabled={form.details.tags.length >= 5}
            className="flex-1 min-w-[8rem] bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            placeholder={form.details.tags.length >= 5 ? "Max 5 tags" : "Type a tag and press , or Enter"}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{form.details.tags.length}/5 tags</p>
      </div>
    </div>
  );
}

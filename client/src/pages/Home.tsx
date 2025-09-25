import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/UI/Navbar";
import HackathonCard from "../components/Hackathon/HackathonCard";
import type { Hackathon } from "../types/Hackathon";
import { FiFilter } from "react-icons/fi";
import { getAllHackathons as getAllHackathonsOnChain } from "../services/factoryService";
import { getPinataUrl } from "../config/pinata";

export default function HomePage() {
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"All" | "Online" | "In-person">("All");
  const [items, setItems] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const onChain = await getAllHackathonsOnChain();
        // Fetch IPFS JSON for each entry
        const resolved: Hackathon[] = await Promise.all(
          onChain.map(async (h) => {
            try {
              const url = getPinataUrl(h.ipfsCid);
              const res = await fetch(url);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = (await res.json()) as Omit<Hackathon, "id">;
              return { id: h.id as unknown as string, ...data } satisfies Hackathon;
            } catch (e) {
              // Fallback: minimal object with placeholder title
              return {
                id: h.id as unknown as string,
                title: `Hackathon ${String(h.id)}`,
                cover: "",
                description: "",
                details: { prizePool: "0", currency: "USD", startDate: "", endDate: "", location: "", tags: [] },
                organiser: { name: "", logo: "", url: "" },
                type: "Online",
              } as Hackathon;
            }
          })
        );
        if (!cancelled) setItems(resolved);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (typeFilter === "All") return items;
    return items.filter((h) => h.type === typeFilter);
  }, [typeFilter, items]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Discover Hackathons
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Compete, build, and earn prizes. Join top builders from around
                the world.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters((s) => !s)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-pressed={showFilters}
              >
                <FiFilter /> {showFilters ? "Hide Filters" : "Filters"}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 flex flex-wrap gap-2">
              {["All", "Online", "In-person"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setTypeFilter(chip as typeof typeFilter)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                    (typeFilter === chip
                      ? "border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-slate-800 dark:text-primary-300"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800")
                  }
                  aria-pressed={typeFilter === chip}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          {loading && (
            <div className="text-slate-600 dark:text-slate-300 mb-4">Loading hackathons...</div>
          )}
          {error && (
            <div className="text-red-600 dark:text-red-400 mb-4">Failed to load hackathons: {error}</div>
          )}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((hack: Hackathon) => (
              <HackathonCard key={hack.id} hack={hack} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

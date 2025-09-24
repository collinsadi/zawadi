import { useMemo, useState } from "react";
import Navbar from "../components/UI/Navbar";
import HackathonCard from "../components/Hackathon/HackathonCard";
import type { Hackathon } from "../types/Hackathon";
import { hackathons } from "../data/hackathons";
import { FiFilter } from "react-icons/fi";

export default function HomePage() {
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"All" | "Online" | "In-person">("All");

  const filtered = useMemo(() => {
    if (typeFilter === "All") return hackathons;
    return hackathons.filter((h) => h.type === typeFilter);
  }, [typeFilter]);

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

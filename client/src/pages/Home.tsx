import Navbar from "../components/Navbar";
import HackathonCard from "../components/HackathonCard";
import type { Hackathon } from "../types/Hackathon";
import { hackathons } from "../data/hackathons";
import { FiFilter } from "react-icons/fi";

export default function HomePage() {
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
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                <FiFilter /> Filters
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "All",
              "Online",
              "In-person",
              "DeFi",
              "ZK",
              "AI",
              "Public Goods",
            ].map((chip) => (
              <button
                key={chip}
                className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {hackathons.map((hack: Hackathon) => (
              <HackathonCard key={hack.id} hack={hack} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

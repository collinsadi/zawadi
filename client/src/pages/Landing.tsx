import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900 relative overflow-hidden">
      {/* Background grid / glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-100 via-white to-white" />
        <div className="absolute inset-0 opacity-[0.5] [background:radial-gradient(transparent_1px,rgba(0,0,0,0.06)_1px)] [background-size:24px_24px]" />
        <div className="absolute -top-40 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full blur-3xl bg-gradient-to-r from-pink-300/30 via-pink-200/20 to-pink-400/30" />
      </div>

      {/* Hero */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <section className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            Plug‑and‑play protocol for hackathon bounty payouts
          </div>

          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-pink-600 via-pink-500 to-pink-700 bg-clip-text text-transparent">
              Zawadi
            </span>
            <span className="block mt-2 text-slate-700 font-semibold">
              Trustless, transparent, seamless.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600">
            Lock funds on chain, approve winners together with multisig, and let
            winners claim directly. Payouts are verifiable, guaranteed, and work
            without changes to existing platforms.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/hackathons"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 px-5 py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-pink-600/20 ring-1 ring-inset ring-pink-200 transition hover:from-pink-500 hover:to-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            >
              Explore Hackathons
            </Link>
            <a
              href="https://github.com/collinsadi/zawadi#whitepaper"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-pink-200 bg-white px-5 py-3 text-sm sm:text-base font-semibold text-pink-700 hover:bg-pink-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            >
              Read Whitepaper
            </a>
          </div>
        </section>
      </main>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-20 -mt-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 backdrop-blur">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            How the protocol works
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            A simple three‑step flow designed to plug into existing hackathon
            platforms.
          </p>

          <div className="mt-6 grid gap-4 sm:gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-900">
                1. Sponsors lock funds
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Sponsors deposit prize pools into an on‑chain escrow before the
                event, making payouts guaranteed and visible to everyone.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-900">
                2. Organizers declare winners
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Organizers finalize results with sponsors using multi‑signature
                approvals, ensuring accountability and consensus.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-900">
                3. Winners claim on‑chain
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Winners withdraw rewards directly from the contract. No
                intermediaries, no delays—fully transparent and auditable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interoperability */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-24 -mt-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 backdrop-blur">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Built for interoperability
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Drop‑in, plug‑and‑play. Works alongside existing hackathon
            platforms, tooling, and workflows. On‑chain transparency with
            off‑chain UX preserved—no migrations, no rewrites.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Zawadi</span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500">Built for hackers</span>
            <a
              href="https://github.com/collinsadi/zawadi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
              aria-label="View Zawadi on GitHub"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.866-.014-1.7-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.607.069-.607 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.833.091-.647.35-1.088.636-1.338-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.679.92.679 1.855 0 1.338-.012 2.419-.012 2.749 0 .267.18.578.688.48A10.019 10.019 0 0 0 22 12.017C22 6.484 17.523 2 12 2Z"
                  clipRule="evenodd"
                />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

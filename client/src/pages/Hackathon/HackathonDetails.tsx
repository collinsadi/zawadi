import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../../components/UI/Navbar";
import type { Hackathon } from "../../types/Hackathon";
import MarkdownPreview from "@uiw/react-markdown-preview";
import ChallengeCards, { type ChallengeCard } from "../../components/Challenge/ChallengeCards";

// Simple helpers
const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
};

const currencyUnit = (code: string) => code || "USD";

export default function HackathonDetails() {
  const location = useLocation();
  const initial = (location.state as { hackathon?: Hackathon } | null)
    ?.hackathon;

  // Fallback demo data if none passed via navigation state
  const [hackathon] = useState<Hackathon>(
    initial || {
      id: "demo-eth-bam",
      title: "ETHiopia x BAM Hackathon",
      cover:
        "https://images.unsplash.com/photo-1758640920659-0bb864175983?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      description: `## About\n\nThis is a demo Hackathon description. Add full markdown here.`,
      organiser: {
        name: "BAM",
        logo: "https://res.cloudinary.com/demo/image/upload/w_120,h_120,c_thumb,g_face,r_max/flower.jpg",
        url: "https://example.com",
      },
      details: {
        prizePool: "500,000",
        currency: "USD",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        location: "Addis Ababa, Ethiopia",
        tags: [
          "blockchain",
          "ai",
          "agent",
          "africa",
          "depin",
          "infrastructure",
          "financial inclusion",
        ],
      },
      type: "In-person",
    }
  );

  const [activeTab, setActiveTab] = useState<
    "challenges" | "details" | "winners"
  >("details");
  const [mdTheme, setMdTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light"
  );

  useEffect(() => {
    const root = document.documentElement;
    const update = () =>
      setMdTheme(root.classList.contains("dark") ? "dark" : "light");
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "attributes" && m.attributeName === "class") update();
      }
    });
    obs.observe(root, { attributes: true });
    update();
    return () => obs.disconnect();
  }, []);

  const dateRange = useMemo(() => {
    const start = fmtDate(hackathon.details.startDate);
    const end = fmtDate(hackathon.details.endDate);
    return `${start} - ${end}`;
  }, [hackathon.details.startDate, hackathon.details.endDate]);

  // Demo challenges (replace with IPFS/contract fetched data later)
  const demoChallenges: ChallengeCard[] = [
    {
      id: 0,
      title: "Best DeFi Tooling",
      totalPrize: "200,000",
      token: "ETH",
      isERC20: false,
      isFunded: true,
      data: {
        image: "https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?w=1200&auto=format&fit=crop&q=60",
        details: "Build tooling that improves developer UX for DeFi protocols.",
      },
      sponsorMeta: {
        link: "https://example.com",
        name: "BAM",
        logo: "https://res.cloudinary.com/demo/image/upload/w_120,h_120,c_thumb,g_face,r_max/flower.jpg",
      },
    },
    {
      id: 1,
      title: "AI + ZK Privacy",
      totalPrize: "300,000",
      token: "USDC",
      isERC20: true,
      isFunded: false,
      data: {
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=60",
        details: "Demonstrate private inference using ZK proofs.",
      },
      sponsorMeta: {
        link: "https://example.org",
        name: "ACME Labs",
        logo: "https://avatars.githubusercontent.com/u/9919?s=200&v=4",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Cover */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div
              className="w-full h-full aspect-[16/7]"
              style={{
                backgroundImage: `url(${hackathon.cover})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
              aria-label={hackathon.title}
              role="img"
            />
          </div>

          {/* Side panel */}
          <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Prize Pool
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-4xl font-extrabold text-primary-600">
                {hackathon.details.prizePool}
              </div>
              <div className="text-sm font-semibold text-slate-500">
                {currencyUnit(hackathon.details.currency)}
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                <div>
                  <div className="font-medium">Type</div>
                  <div className="text-slate-500">{hackathon.type}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                <div>
                  {hackathon.type === "In-person" && (
                    <>
                      <div className="font-medium">Location</div>
                      <div className="text-slate-500">
                        {hackathon.details.location}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Hackathon Tags</div>
                <div className="flex flex-wrap gap-2">
                  {hackathon.details.tags.slice(0, 12).map((tag, i) => (
                    <span
                      key={tag + i}
                      className="rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 text-xs px-2.5 py-1 border border-primary-600/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {hackathon.organiser.logo && (
                    <img
                      src={hackathon.organiser.logo}
                      alt={hackathon.organiser.name}
                      className="h-7 w-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                  )}
                  <div className="text-sm font-medium">
                    {hackathon.organiser.name}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Contact
                </button>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
                Manage
              </button>
            </div>
          </aside>
        </div>

        {/* Title + meta */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {hackathon.title}
            </h1>
            <div className="text-xs text-slate-500 mt-1">{dateRange}</div>
          </div>
          <div className="hidden sm:block text-slate-400">
            {/* placeholder for bookmark/lock icons */}
          </div>
        </div>

        <div className="mt-6 border-b border-slate-200 dark:border-slate-800">
          <nav className="-mb-px flex flex-wrap gap-4 text-sm">
            {[
              { key: "challenges", label: "Challenges" },
              { key: "details", label: "Details" },
              { key: "winners", label: "Winners" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() =>
                  setActiveTab(t.key as "challenges" | "details" | "winners")
                }
                className={
                  "relative px-2 pb-3 font-medium " +
                  (activeTab === t.key
                    ? "text-primary-600 after:absolute after:left-0 after:right-0 after:-bottom-px after:h-0.5 after:bg-primary-600"
                    : "text-slate-500 hover:text-slate-700")
                }
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <section className="pt-6">
          {activeTab === "challenges" && (
            <ChallengeCards items={demoChallenges} />
          )}
          {activeTab === "details" && (
            <div
              data-color-mode={mdTheme}
              className="prose max-w-none dark:prose-invert prose-slate bg-transparent"
            >
              <MarkdownPreview
                source={hackathon.description || ""}
                style={{ backgroundColor: "transparent" }}
              />
            </div>
          )}
          {activeTab === "winners" && (
            <div className="text-slate-700 dark:text-slate-300">
              Winners will appear here after the hackathon concludes.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

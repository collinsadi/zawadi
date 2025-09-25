import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "../../components/UI/Navbar";
import type { Hackathon } from "../../types/Hackathon";
import MarkdownPreview from "@uiw/react-markdown-preview";
import ChallengeCards, { type ChallengeCard } from "../../components/Challenge/ChallengeCards";
import { getHackathonById as getHackathonOnChain } from "../../services/factoryService";
import { getPinataUrl } from "../../config/pinata";
import { useAccount } from "wagmi";
import { createEscrowService } from "../../services/escrowService";

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
const formatAmount = (v: string | number) => {
  const n = Number(v);
  return Number.isFinite(n) ? new Intl.NumberFormat(undefined).format(n) : String(v);
};

export default function HackathonDetails() {
  const { id } = useParams();
  const location = useLocation();
  const initial = (location.state as { hackathon?: Hackathon } | null)?.hackathon;

  const [hackathon, setHackathon] = useState<Hackathon | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizer, setOrganizer] = useState<string | null>(null);
  const { address } = useAccount();
  const [escrow, setEscrow] = useState<ReturnType<typeof createEscrowService> | null>(null);
  const [isSponsor, setIsSponsor] = useState(false);
  const [challenges, setChallenges] = useState<ChallengeCard[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  // Fetch IPFS data if not provided via navigation state
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (hackathon || !id) return; // have data or no id
      setLoading(true);
      setError(null);
      try {
        const onChain = await getHackathonOnChain(id as any);
        setOrganizer(onChain.organizer as unknown as string);
        const escrowAddr = onChain.escrowContract as unknown as string;
        setEscrow(createEscrowService(escrowAddr as any));
        const url = getPinataUrl(onChain.ipfsCid);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Omit<Hackathon, "id">;
        if (!cancelled) setHackathon({ id, ...data });
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
  }, [id]);

  // Fetch challenges from escrow + IPFS
  useEffect(() => {
    let cancelled = false;
    async function loadChallenges() {
      if (!escrow || !id) return;
      setLoadingChallenges(true);
      try {
        const all = await escrow.getAllChallenges();
        const cards: ChallengeCard[] = await Promise.all(
          all.map(async (row) => {
            const onChain = row.data;
            const cid = onChain.ipfsCid;
            let ipfs: any = {};
            try {
              const res = await fetch(getPinataUrl(cid));
              if (res.ok) ipfs = await res.json();
            } catch {}
            const title = ipfs?.title || `Challenge #${row.id}`;
            const totalPrize = ipfs?.totalPrize || String(onChain.totalPrize);
            const isERC20 = !!onChain.isERC20;
            const token = isERC20 ? (onChain.token as any as string) : "ETH";
            const data = {
              image: ipfs?.data?.image || "",
              details: ipfs?.data?.details || ipfs?.brief || "",
            };
            const sponsorMeta = {
              link: ipfs?.sponsor?.link || "",
              name: ipfs?.sponsor?.name || String(onChain.sponsor),
              logo: ipfs?.sponsor?.logo || "",
            };
            return {
              id: Number(row.id),
              title,
              totalPrize,
              token,
              isERC20,
              isFunded: !!onChain.isFunded,
              data,
              sponsorMeta,
            } as ChallengeCard;
          })
        );
        if (!cancelled) setChallenges(cards);
      } catch (e) {
        // non-fatal, leave empty
      } finally {
        if (!cancelled) setLoadingChallenges(false);
      }
    }
    loadChallenges();
    return () => { cancelled = true; };
  }, [escrow, id]);

  // Update sponsor flag when address or escrow changes
  useEffect(() => {
    let cancelled = false;
    async function checkSponsor() {
      if (!escrow || !address) return setIsSponsor(false);
      try {
        const ok = await escrow.sponsors(address as any).catch(() => false);
        if (!cancelled) setIsSponsor(!!ok);
      } catch {
        if (!cancelled) setIsSponsor(false);
      }
    }
    checkSponsor();
    return () => { cancelled = true; };
  }, [escrow, address]);

  // Always fetch organizer address from on-chain to gate Manage button
  useEffect(() => {
    let cancelled = false;
    async function loadOrganizer() {
      if (!id) return;
      try {
        const onChain = await getHackathonOnChain(id as any);
        if (!cancelled) setOrganizer(onChain.organizer as unknown as string);
      } catch {
        // ignore organizer fetch errors here; button will simply not show
      }
    }
    loadOrganizer();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isOrganizer = useMemo(() => {
    if (!address || !organizer) return false;
    return String(address).toLowerCase() === String(organizer).toLowerCase();
  }, [address, organizer]);

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
    if (!hackathon) return "";
    const start = fmtDate(hackathon.details.startDate);
    const end = fmtDate(hackathon.details.endDate);
    return `${start} - ${end}`;
  }, [hackathon?.details.startDate, hackathon?.details.endDate]);

  const buildViewLink = (c: ChallengeCard) => `/hackathons/${id}/challenges/${c.id}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            Failed to load hackathon: {error}
          </div>
        )}
        {/* Header card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Cover */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {loading || !hackathon ? (
              <div className="w-full h-full aspect-[16/7] bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ) : (
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
            )}
          </div>

          {/* Side panel */}
          <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Prize Pool
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              {loading || !hackathon ? (
                <div className="h-9 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              ) : (
                <>
                  <div className="text-4xl font-extrabold text-primary-600">
                    {formatAmount(hackathon.details.prizePool)}
                  </div>
                  <div className="text-sm font-semibold text-slate-500">
                    {currencyUnit(hackathon.details.currency)}
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                <div>
                  <div className="font-medium">Type</div>
                  <div className="text-slate-500">{loading || !hackathon ? "—" : hackathon.type}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                <div>
                  {hackathon && hackathon.type === "In-person" && (
                    <>
                      <div className="font-medium">Location</div>
                      <div className="text-slate-500">{hackathon.details.location}</div>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Hackathon Tags</div>
                {loading || !hackathon ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    ))}
                  </div>
                ) : (
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
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {hackathon?.organiser.logo && (
                    <img
                      src={hackathon.organiser.logo}
                      alt={hackathon.organiser.name}
                      loading="lazy"
                      className="h-7 w-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                  )}
                  <div className="text-sm font-medium">
                    {hackathon?.organiser.name || (loading ? "" : "")}
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
              {!loading && hackathon && isOrganizer && (
                <Link
                  to={`/hackathons/${id}/manage`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                >
                  Manage
                </Link>
              )}
              {!loading && hackathon && isSponsor && (
                <Link
                  to={`/hackathons/${id}/add-challenge`}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary-600 text-primary-700 dark:text-primary-300 px-3.5 py-2.5 text-sm font-semibold hover:bg-primary-50 dark:hover:bg-slate-800"
                >
                  Add Challenge
                </Link>
              )}
            </div>
          </aside>
        </div>

        {/* Title + meta */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            {loading || !hackathon ? (
              <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            ) : (
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{hackathon.title}</h1>
            )}
            <div className="text-xs text-slate-500 mt-1">{dateRange}</div>
          </div>
          <div className="hidden sm:block text-slate-400">{/* icons */}</div>
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
            <>
              {loadingChallenges && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              )}
              {!loadingChallenges && (
                <ChallengeCards items={challenges} buildViewLink={buildViewLink} />
              )}
            </>
          )}
          {activeTab === "details" && (
            <div data-color-mode={mdTheme} className="prose max-w-none dark:prose-invert prose-slate bg-transparent">
              {loading || !hackathon ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`h-${i % 3 === 0 ? 6 : 4} w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse`} />
                  ))}
                </div>
              ) : (
                <MarkdownPreview source={hackathon.description || ""} style={{ backgroundColor: "transparent" }} />
              )}
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

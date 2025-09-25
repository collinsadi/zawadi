import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../../components/UI/Navbar";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { getHackathonById as getHackathonOnChain } from "../../services/factoryService";
import { createEscrowService } from "../../services/escrowService";
import { getPinataUrl } from "../../config/pinata";

export default function ChallengeDetails() {
  const { id, challengeId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<ReturnType<typeof createEscrowService> | null>(null);

  const [ipfs, setIpfs] = useState<any>(null);
  const [onChain, setOnChain] = useState<any>(null);
  const [hasW, setHasW] = useState<boolean>(false);

  const mdTheme = useMemo<"light" | "dark">(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) return "dark";
    return "light";
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id || !challengeId) return;
      setLoading(true);
      setError(null);
      try {
        const h = await getHackathonOnChain(id as any);
        const esc = createEscrowService(h.escrowContract as any);
        if (cancelled) return;
        setEscrow(esc);
        const cid = Number(challengeId);
        const c = await esc.getChallenge(BigInt(cid));
        if (cancelled) return;
        setOnChain(c);
        const res = await fetch(getPinataUrl(c.ipfsCid));
        if (res.ok) setIpfs(await res.json());
        try {
          const w = await esc.hasWinners(BigInt(cid));
          if (!cancelled) setHasW(!!w);
        } catch {}
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load challenge");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, challengeId]);

  const title = ipfs?.title || (challengeId ? `Challenge #${challengeId}` : "Challenge");
  const cover = ipfs?.data?.image || "";
  const brief = ipfs?.brief || ipfs?.data?.details || "";
  const sponsorName = ipfs?.sponsor?.name || (onChain?.sponsor ?? "");
  const sponsorLogo = ipfs?.sponsor?.logo || "";
  const sponsorLink = ipfs?.sponsor?.link || "";
  const isFunded = !!onChain?.isFunded;
  const tokenLabel = onChain?.isERC20 ? String(onChain?.token) : "ETH";
  const totalPrizeHuman = ipfs?.totalPrize || String(onChain?.totalPrize ?? "");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            Failed to load challenge: {error}
          </div>
        )}

        {/* Header */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="relative w-full aspect-[16/7] bg-slate-200 dark:bg-slate-800">
            {cover && (
              <img src={cover} alt={title} className="absolute inset-0 w-full h-full object-cover" />
            )}
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
                <div className="mt-1 text-xs text-slate-500">
                  Prize: {totalPrizeHuman} • Token: {tokenLabel}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                  (isFunded ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")
                }>
                  {isFunded ? "Funded" : "Funding pending"}
                </span>
                <span className={
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                  (hasW ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700")
                }>
                  {hasW ? "Winners announced" : "No winners yet"}
                </span>
              </div>
            </div>

            {sponsorName && (
              <div className="mt-4 flex items-center gap-2">
                {sponsorLogo && (
                  <img src={sponsorLogo} alt={sponsorName} className="h-7 w-7 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                )}
                {sponsorLink ? (
                  <a href={sponsorLink} target="_blank" rel="noreferrer" className="text-sm text-primary-700 dark:text-primary-300">
                    {sponsorName}
                  </a>
                ) : (
                  <div className="text-sm text-slate-700 dark:text-slate-300">{sponsorName}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`h-${i % 3 === 0 ? 6 : 4} w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse`} />
              ))}
            </div>
          ) : (
            <div data-color-mode={mdTheme} className="prose max-w-none dark:prose-invert prose-slate bg-transparent">
              <MarkdownPreview source={brief || ""} style={{ backgroundColor: "transparent" }} />
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link to={id ? `/hackathons/${id}` : "/"} className="text-sm text-primary-700 dark:text-primary-300">
            ← Back to hackathon
          </Link>
        </div>
      </main>
    </div>
  );
}

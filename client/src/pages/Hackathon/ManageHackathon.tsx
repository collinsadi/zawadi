import { useAccount } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/UI/Navbar";
import WhitelistPanel from "../../components/ManageHackathon/WhitelistPanel";
import ChallengesGrid from "../../components/ManageHackathon/ChallengesGrid";
import ChallengeQuickViewModal from "../../components/ManageHackathon/ChallengeQuickViewModal";
import WinnersModal from "../../components/ManageHackathon/WinnersModal";
import type { EscrowChallenge, EscrowApproval } from "../../components/ManageHackathon/types";
import { getHackathonById as getHackathonOnChain } from "../../services/factoryService";
import { createEscrowService } from "../../services/escrowService";
import ResultModal from "../../components/UI/ResultModal";
import { isAddress } from "viem";

import { getPinataUrl } from "../../config/pinata";

export default function ManageHackathon() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { address } = useAccount();

  const initial = (location.state as any) || {};
  const [organiser, setOrganiser] = useState<string>(initial.organiser || "");
  const [escrowAddr, setEscrowAddr] = useState<string>(initial.escrow || "");
  const [escrow, setEscrow] = useState<ReturnType<typeof createEscrowService> | null>(null);
  const [loadingEscrow, setLoadingEscrow] = useState<boolean>(false);
  const [checkingSponsor, setCheckingSponsor] = useState<boolean>(false);
  const [isSponsor, setIsSponsor] = useState<boolean>(false);

  // Whitelist state (UI-only for now)
  const [whitelist, setWhitelist] = useState<string[]>(
    initial.whitelist || []
  );
  const [newSponsor, setNewSponsor] = useState("");
  const [verifying, setVerifying] = useState<boolean>(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState<string>("");

  // Challenges and approvals
  const [challenges, setChallenges] = useState<EscrowChallenge[]>(initial.challenges || []);
  const [approvals, setApprovals] = useState<Record<number, EscrowApproval>>(initial.approvals || {});

  const fundedChallenges = useMemo(() => challenges.filter((c) => c.isFunded), [challenges]);
  const [selected, setSelected] = useState<EscrowChallenge | null>(null);
  const [winnersTarget, setWinnersTarget] = useState<EscrowChallenge | null>(null);
  const [winnersRows, setWinnersRows] = useState<Array<{ address: string; amount: string }>>([]);
  const [winnersError, setWinnersError] = useState<string>("");

  // Load escrow address and organizer from factory by id
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      try {
        setLoadingEscrow(true);
        const onChain = await getHackathonOnChain(id as any);
        if (cancelled) return;
        setOrganiser(onChain.organizer as unknown as string);
        const ea = onChain.escrowContract as unknown as string;
        setEscrowAddr(ea);
        setEscrow(createEscrowService(ea as any));
      } catch (e) {
        console.error("Failed to load escrow for manage page", e);
        setModalMsg("Failed to load on-chain hackathon/escrow details.");
        setErrorOpen(true);
      } finally {
        if (!cancelled) setLoadingEscrow(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // Optionally verify pre-seeded addresses against on-chain mapping
  useEffect(() => {
    let cancelled = false;
    async function verifyList() {
      if (!escrow || whitelist.length === 0) return;
      setVerifying(true);
      try {
        const results = await Promise.all(
          whitelist.map(async (addr) => ({ addr, ok: await escrow.sponsors(addr as any).catch(() => false) }))
        );
        const onlyWhitelisted = results.filter(r => r.ok).map(r => r.addr);
        if (!cancelled) setWhitelist(onlyWhitelisted);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    }
    verifyList();
    return () => { cancelled = true; };
  }, [escrow]);

  // Check if connected wallet is whitelisted sponsor
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!escrow || !address) {
        setIsSponsor(false);
        return;
      }
      setCheckingSponsor(true);
      try {
        const ok = await escrow.sponsors(address as any).catch(() => false);
        if (!cancelled) setIsSponsor(!!ok);
      } finally {
        if (!cancelled) setCheckingSponsor(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [escrow, address]);

  const isOrganizer = useMemo(() => {
    if (!organiser || !address) return false;
    return organiser.toLowerCase() === address.toLowerCase();
  }, [organiser, address]);

  // Route guard: only organizer or sponsor can access
  useEffect(() => {
    if (loadingEscrow || checkingSponsor) return;
    if (!id) return;
    const authorized = isOrganizer || isSponsor;
    if (!authorized) {
      navigate(`/hackathons/${id}`, { replace: true });
    }
  }, [id, isOrganizer, isSponsor, loadingEscrow, checkingSponsor, navigate]);

  // Load full on-chain whitelist list (enumerable getter, with logs fallback)
  useEffect(() => {
    let cancelled = false;
    async function fetchWhitelist() {
      if (!escrow) return;
      try {
        let list: string[] = [];
        try {
          list = await escrow.getWhitelistedSponsors();
        } catch {
          // fallback to logs enumeration
          list = await escrow.listWhitelistedSponsors();
        }
        // Ensure uniqueness and newest first
        const unique = Array.from(new Set(list)).reverse();
        if (!cancelled) setWhitelist(unique);
      } catch (e) {
        // non-fatal: leave current UI list
      }
    }
    fetchWhitelist();
    return () => { cancelled = true; };
  }, [escrow]);

  // Handlers
  const addSponsor = async () => {
    const addr = newSponsor.trim();
    if (!addr) return;
    if (!isAddress(addr)) {
      setModalMsg("Invalid address. Please enter a valid Ethereum address.");
      setErrorOpen(true);
      return;
    }
    if (!escrow) {
      setModalMsg("Escrow not initialized yet. Try again in a moment.");
      setErrorOpen(true);
      return;
    }
    try {
      // Skip if already whitelisted on-chain
      const already = await escrow.sponsors(addr as any).catch(() => false);
      if (already) {
        setModalMsg("Address is already whitelisted.");
        setErrorOpen(true);
        return;
      }
      const { hash } = await escrow.whitelistSponsor(addr as any);
      setWhitelist((w) => (w.includes(addr) ? w : [...w, addr]));
      setNewSponsor("");
      setModalMsg(`Sponsor whitelisted successfully. Tx: ${hash}`);
      setSuccessOpen(true);
    } catch (e: any) {
      console.error(e);
      setModalMsg(e?.shortMessage || e?.message || "Failed to whitelist sponsor.");
      setErrorOpen(true);
    }
  };

  const removeSponsor = (addr: string) => {
    setWhitelist((w) => w.filter((a) => a !== addr));
  };

  const approveDistribution = (challengeId: number, actor: "organiser" | "sponsor") => {
    setApprovals((prev) => {
      const curr = prev[challengeId] || { organiserApproved: false, sponsorApproved: false };
      return {
        ...prev,
        [challengeId]: {
          organiserApproved: actor === "organiser" ? true : curr.organiserApproved,
          sponsorApproved: actor === "sponsor" ? true : curr.sponsorApproved,
        },
      };
    });
    console.log("approveDistribution:", { challengeId, actor });
  };

  const openWinners = (c: EscrowChallenge) => {
    setWinnersTarget(c);
    // Close the challenge quick view to reveal the winners modal
    setSelected(null);
    setWinnersRows([{ address: "", amount: "" }]);
    setWinnersError("");
  };

  

  // Helpers for winners modal
  const parseAmount = (s: string) => Number((s || '').toString().replace(/,/g, '')) || 0;
  const totalPrizeNumber = (c?: EscrowChallenge | null) => (c ? parseAmount(c.totalPrize) : 0);
  const winnersTotal = winnersRows.reduce((acc, r) => acc + parseAmount(r.amount), 0);
  const winnersValid = winnersRows.length > 0 && winnersRows.every(r => r.address && parseAmount(r.amount) > 0) && winnersTotal === totalPrizeNumber(winnersTarget);

  // derived stats
  const total = challenges.length;
  const funded = fundedChallenges.length;
  const approvalsPending = challenges.filter((c) => {
    const a = approvals[c.id];
    return c.isFunded && (!a || !a.organiserApproved || !a.sponsorApproved);
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Hackathon</h1>
            <div className="text-xs text-slate-500 mt-1">Hackathon ID: {id}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={id ? `/hackathons/${id}` : "#"}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              View public page
            </Link>
            {/* {escrowAddr && (
              <span className="text-[10px] text-slate-500">Escrow: {escrowAddr}</span>
            )} */}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-xs text-slate-500">Total Challenges</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-xs text-slate-500">Funded</div>
            <div className="mt-1 text-2xl font-semibold text-primary-600">{funded}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-xs text-slate-500">Approvals Pending</div>
            <div className="mt-1 text-2xl font-semibold text-amber-600">{approvalsPending}</div>
          </div>
        </div>

        {/* Main layout */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Whitelist */}
          <WhitelistPanel
            organiser={organiser}
            whitelist={whitelist}
            newSponsor={newSponsor}
            onChangeNewSponsor={setNewSponsor}
            onAddSponsor={addSponsor}
            onRemoveSponsor={removeSponsor}
          />

          {/* Challenges and Modals */}
          <ChallengesGrid
            challenges={challenges}
            approvals={approvals}
            onSelect={(c) => setSelected(c)}
          />

          {selected && (
            <ChallengeQuickViewModal
              selected={selected}
              approvals={approvals}
              onClose={() => setSelected(null)}
              onOpenWinners={(c) => openWinners(c)}
              onApprove={(challengeId, actor) => approveDistribution(challengeId, actor)}
            />
          )}

          {winnersTarget && (
            <WinnersModal
              target={winnersTarget}
              rows={winnersRows}
              onChangeRow={(index, row) => setWinnersRows(prev => prev.map((r, i) => i === index ? row : r))}
              onAddRow={() => setWinnersRows(prev => [...prev, { address: "", amount: "" }])}
              onRemoveRow={(index) => setWinnersRows(prev => prev.filter((_, i) => i !== index))}
              winnersTotal={winnersTotal}
              totalPrizeNumber={totalPrizeNumber}
              winnersValid={winnersValid}
              error={winnersError}
              onClose={() => setWinnersTarget(null)}
              onSubmit={() => {
                if (!winnersValid || !winnersTarget) {
                  setWinnersError('Please fix validation errors.');
                  return;
                }
                console.log('submitWinners', { challengeId: winnersTarget.id, rows: winnersRows });
                alert('Winners submitted (demo)');
                setWinnersTarget(null);
              }}
            />
          )}
        </div>
        {/* Feedback Modals */}
        <ResultModal
          open={successOpen}
          title="Success"
          message={modalMsg}
          onClose={() => setSuccessOpen(false)}
          variant="success"
        />
        <ResultModal
          open={errorOpen}
          title="Action Failed"
          message={modalMsg}
          onClose={() => setErrorOpen(false)}
          variant="error"
        />
        {/* Misc state indicators (optional) */}
        {(loadingEscrow || verifying) && (
          <div className="mt-4 text-xs text-slate-500">
            {loadingEscrow ? "Loading on-chain data..." : "Verifying whitelist..."}
          </div>
        )}
      </main>
    </div>
  );
}

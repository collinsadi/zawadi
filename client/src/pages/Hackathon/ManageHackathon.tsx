import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "../../components/UI/Navbar";
import WhitelistPanel from "../../components/ManageHackathon/WhitelistPanel";
import ChallengesGrid from "../../components/ManageHackathon/ChallengesGrid";
import ChallengeQuickViewModal from "../../components/ManageHackathon/ChallengeQuickViewModal";
import WinnersModal from "../../components/ManageHackathon/WinnersModal";
import type { EscrowChallenge, EscrowApproval } from "../../components/ManageHackathon/types";

// Demo data if none passed via navigation
const DEMO_CHALLENGES: EscrowChallenge[] = [
  {
    id: 0,
    title: "Best DeFi Tooling",
    totalPrize: "200,000",
    token: "ETH",
    isERC20: false,
    ipfsCid: "bafy...abc",
    isFunded: true,
    sponsor: "0xSponsor...1234",
    data: {
      image: "https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?w=1200&auto=format&fit=crop&q=60",
      details: "Build tooling that improves developer UX for DeFi protocols. Markdown supported.",
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
    token: "0xToken...ABCD",
    isERC20: true,
    ipfsCid: "bafy...xyz",
    isFunded: false,
    sponsor: "0xSponsor...5678",
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

const DEMO_APPROVALS: Record<number, EscrowApproval> = {
  0: { sponsorApproved: false, organiserApproved: false },
  1: { sponsorApproved: false, organiserApproved: false },
};

export default function ManageHackathon() {
  const { id } = useParams();
  const location = useLocation();

  const initial = (location.state as any) || {};
  const [organiser] = useState<string>(initial.organiser || "0xOrganiser...9F2A");

  // Whitelist state (UI-only for now)
  const [whitelist, setWhitelist] = useState<string[]>(
    initial.whitelist || ["0xSponsor...1234", "0xSponsor...5678"]
  );
  const [newSponsor, setNewSponsor] = useState("");

  // Challenges and approvals (UI-only for now)
  const [challenges] = useState<EscrowChallenge[]>(initial.challenges || DEMO_CHALLENGES);
  const [approvals, setApprovals] = useState<Record<number, EscrowApproval>>(initial.approvals || DEMO_APPROVALS);

  const fundedChallenges = useMemo(() => challenges.filter((c) => c.isFunded), [challenges]);
  const [selected, setSelected] = useState<EscrowChallenge | null>(null);
  const [winnersTarget, setWinnersTarget] = useState<EscrowChallenge | null>(null);
  const [winnersRows, setWinnersRows] = useState<Array<{ address: string; amount: string }>>([]);
  const [winnersError, setWinnersError] = useState<string>("");

  // Handlers (mock side-effects for now)
  const addSponsor = () => {
    const addr = newSponsor.trim();
    if (!addr) return;
    if (whitelist.includes(addr)) return;
    setWhitelist((w) => [...w, addr]);
    setNewSponsor("");
    console.log("whitelistSponsor:", addr);
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
      </main>
    </div>
  );
}

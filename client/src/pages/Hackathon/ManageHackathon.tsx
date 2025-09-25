import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "../../components/UI/Navbar";

// Lightweight types mirroring Escrow.sol for UI purposes
export type EscrowChallenge = {
  id: number;
  title: string;
  totalPrize: string; // display-formatted for now
  token: string; // address or 'ETH'
  isERC20: boolean;
  ipfsCid: string;
  isFunded: boolean;
  sponsor: string; // sponsor address (for permissions)
  data: {
    image: string;
    details: string;
  };
  sponsorMeta: {
    link: string;
    name: string;
    logo: string;
  };
};

export type EscrowApproval = {
  sponsorApproved: boolean;
  organiserApproved: boolean;
};

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

  const actionNeeded = (c: EscrowChallenge, a: EscrowApproval | undefined): string | null => {
    if (!c.isFunded) return "Funding pending";
    if (!a || (!a.organiserApproved || !a.sponsorApproved)) return "Distribution approval pending";
    return null;
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
          <section className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Whitelisted Sponsors</h2>
              <div className="text-[10px] text-slate-500">Organiser: {organiser}</div>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newSponsor}
                onChange={(e) => setNewSponsor(e.target.value)}
                placeholder="0x..."
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addSponsor}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
              >
                Add
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {whitelist.map((addr) => (
                <span key={addr} className="inline-flex items-center gap-1 rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 border border-primary-600/20 px-2.5 py-1 text-xs">
                  {addr}
                  <button aria-label={`Remove ${addr}`} onClick={() => removeSponsor(addr)} className="ml-1 hover:text-primary-900">×</button>
                </span>
              ))}
              {whitelist.length === 0 && (
                <span className="text-xs text-slate-500">No sponsors whitelisted yet.</span>
              )}
            </div>
          </section>

          {/* Challenges */}
          <section className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Challenges</h2>
              <div className="text-xs text-slate-500">{funded} funded / {total} total</div>
            </div>
            {/* Card grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {challenges.map((c) => {
                const a = approvals[c.id];
                const needed = actionNeeded(c, a);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="group text-left overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition"
                  >
                    <div className="relative h-40 w-full overflow-hidden">
                      <img src={c.data.image} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-semibold text-base line-clamp-1">{c.title}</h3>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {c.sponsorMeta.logo && (
                            <img src={c.sponsorMeta.logo} alt={c.sponsorMeta.name} className="h-6 w-6 rounded-full object-cover border border-white/20" />
                          )}
                          <div className="text-xs text-slate-600 dark:text-slate-300">{c.sponsorMeta.name}</div>
                        </div>
                        <span className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                          (c.isFunded ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")
                        }>
                          {c.isFunded ? "Funded" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal: Challenge quick view */}
            {selected && (
              <div className="fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
                <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center">
                  <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                    <div className="relative h-44 w-full">
                      <img src={selected.data.image} alt={selected.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <button className="absolute top-3 right-3 rounded-full bg-black/50 text-white w-7 h-7" onClick={() => setSelected(null)}>×</button>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selected.title}</h3>
                      <div className="mt-1 text-xs text-slate-500">Challenge #{selected.id} • Prize: {selected.totalPrize} • Token: {selected.isERC20 ? selected.token : 'ETH'}</div>
                      <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{selected.data.details}</p>

                      <div className="mt-4 flex items-center justify-between">
                        <a href={selected.sponsorMeta.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary-700 dark:text-primary-300">
                          {selected.sponsorMeta.logo && <img src={selected.sponsorMeta.logo} alt={selected.sponsorMeta.name} className="h-6 w-6 rounded-full object-cover" />}
                          <span>{selected.sponsorMeta.name}</span>
                        </a>
                        <div className="flex items-center gap-2">
                          {!selected.isFunded && (
                            <button className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs" onClick={() => alert('Sponsor fund flow (UI)')}>Fund</button>
                          )}
                          {selected.isFunded && (
                            <>
                              <button className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs" onClick={() => openWinners(selected)}>Add Winners</button>
                              {!approvals[selected.id]?.organiserApproved && (
                                <button className="rounded-lg bg-primary-600 text-white px-3 py-1.5 text-xs" onClick={() => approveDistribution(selected.id, 'organiser')}>Approve (Org)</button>
                              )}
                              {!approvals[selected.id]?.sponsorApproved && (
                                <button className="rounded-lg bg-primary-600 text-white px-3 py-1.5 text-xs" onClick={() => approveDistribution(selected.id, 'sponsor')}>Approve (Sponsor)</button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Add Winners */}
            {winnersTarget && (
              <div className="fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/50" onClick={() => setWinnersTarget(null)} />
                <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center">
                  <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Winners</h3>
                          <div className="mt-1 text-xs text-slate-500">
                            Challenge #{winnersTarget.id} • Total Prize: {winnersTarget.totalPrize} {winnersTarget.isERC20 ? '' : 'ETH'}
                          </div>
                        </div>
                        <button className="rounded-full bg-slate-100 dark:bg-slate-800 w-7 h-7" onClick={() => setWinnersTarget(null)}>×</button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {winnersRows.map((row, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={row.address}
                              onChange={(e) => {
                                const v = e.target.value;
                                setWinnersRows((prev) => prev.map((r, i) => i === idx ? { ...r, address: v } : r));
                              }}
                              placeholder="0xWinnerAddress"
                              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              value={row.amount}
                              onChange={(e) => {
                                const v = e.target.value;
                                setWinnersRows((prev) => prev.map((r, i) => i === idx ? { ...r, amount: v } : r));
                              }}
                              placeholder="Amount"
                              className="w-32 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-right"
                            />
                            <button
                              aria-label="Remove row"
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs"
                              onClick={() => setWinnersRows((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        <div>
                          <button
                            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs"
                            onClick={() => setWinnersRows((prev) => [...prev, { address: "", amount: "" }])}
                          >
                            + Add another winner
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="text-slate-600 dark:text-slate-300">
                          Total entered: {winnersTotal} / {totalPrizeNumber(winnersTarget)}
                        </div>
                        <div className={winnersValid ? "text-green-600" : "text-amber-600"}>
                          {winnersValid ? "Ready to submit" : "Ensure totals equal prize and fields are valid"}
                        </div>
                      </div>

                      {winnersError && (
                        <div className="mt-2 text-xs text-red-600">{winnersError}</div>
                      )}

                      <div className="mt-5 flex items-center justify-end gap-2">
                        <button
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs"
                          onClick={() => setWinnersTarget(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="rounded-lg bg-primary-600 text-white px-3 py-1.5 text-xs disabled:opacity-50"
                          disabled={!winnersValid}
                          onClick={() => {
                            if (!winnersValid) {
                              setWinnersError('Please fix validation errors.');
                              return;
                            }
                            // In a future iteration this would call the distribution proposal flow.
                            console.log('submitWinners', { challengeId: winnersTarget.id, rows: winnersRows });
                            alert('Winners submitted (demo)');
                            setWinnersTarget(null);
                          }}
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

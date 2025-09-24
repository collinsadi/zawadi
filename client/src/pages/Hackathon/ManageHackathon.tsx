import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "../../components/UI/Navbar";

// Lightweight types mirroring Escrow.sol for UI purposes
export type EscrowChallenge = {
  id: number;
  totalPrize: string; // display-formatted for now
  token: string; // address or 'ETH'
  isERC20: boolean;
  ipfsCid: string;
  isFunded: boolean;
  sponsor: string;
};

export type EscrowApproval = {
  sponsorApproved: boolean;
  organiserApproved: boolean;
};

// Demo data if none passed via navigation
const DEMO_CHALLENGES: EscrowChallenge[] = [
  {
    id: 0,
    totalPrize: "200,000",
    token: "ETH",
    isERC20: false,
    ipfsCid: "bafy...abc",
    isFunded: true,
    sponsor: "0xSponsor...1234",
  },
  {
    id: 1,
    totalPrize: "300,000",
    token: "0xToken...ABCD",
    isERC20: true,
    ipfsCid: "bafy...xyz",
    isFunded: false,
    sponsor: "0xSponsor...5678",
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

  const addWinners = (challengeId: number) => {
    // Navigate to a winners management flow in the future
    alert(`Add winners flow for challenge #${challengeId} (UI placeholder)`);
  };

  const actionNeeded = (c: EscrowChallenge, a: EscrowApproval | undefined): string | null => {
    if (!c.isFunded) return "Funding pending";
    if (!a || (!a.organiserApproved || !a.sponsorApproved)) return "Distribution approval pending";
    return null;
  };

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

            {/* Table on md+, cards on small */}
            <div className="mt-4 hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-2 pr-4">Sponsor</th>
                    <th className="py-2 pr-4">Prize</th>
                    <th className="py-2 pr-4">Token</th>
                    <th className="py-2 pr-4">Funded</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {challenges.map((c) => {
                    const a = approvals[c.id];
                    const needed = actionNeeded(c, a);
                    return (
                      <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">#{c.id}</td>
                        <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{c.sponsor}</td>
                        <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{c.totalPrize}</td>
                        <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{c.isERC20 ? c.token : "ETH"}</td>
                        <td className="py-2 pr-4">
                          <span className={
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                            (c.isFunded ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")
                          }>
                            {c.isFunded ? "Funded" : "Pending"}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {needed ? (
                            <span className="inline-flex items-center rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 px-2 py-0.5 text-xs font-medium">
                              {needed}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">OK</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {!c.isFunded && (
                              <button className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs" onClick={() => alert("Sponsor fund flow (UI)")}>Fund</button>
                            )}
                            {c.isFunded && (
                              <>
                                <button className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs" onClick={() => addWinners(c.id)}>Add Winners</button>
                                {!a?.organiserApproved && (
                                  <button className="rounded-lg bg-primary-600 text-white px-2 py-1 text-xs" onClick={() => approveDistribution(c.id, "organiser")}>Approve (Org)</button>
                                )}
                                {!a?.sponsorApproved && (
                                  <button className="rounded-lg bg-primary-600 text-white px-2 py-1 text-xs" onClick={() => approveDistribution(c.id, "sponsor")}>Approve (Sponsor)</button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden mt-4 grid grid-cols-1 gap-3">
              {challenges.map((c) => {
                const a = approvals[c.id];
                const needed = actionNeeded(c, a);
                return (
                  <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Challenge #{c.id}</div>
                      <span className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                        (c.isFunded ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")
                      }>
                        {c.isFunded ? "Funded" : "Pending"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">Sponsor: {c.sponsor}</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 flex gap-4">
                      <span>Prize: {c.totalPrize}</span>
                      <span>Token: {c.isERC20 ? c.token : "ETH"}</span>
                    </div>
                    <div className="mt-2">
                      {needed ? (
                        <span className="inline-flex items-center rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 px-2 py-0.5 text-[10px] font-medium">
                          {needed}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">OK</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {!c.isFunded && (
                        <button className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs" onClick={() => alert("Sponsor fund flow (UI)")}>Fund</button>
                      )}
                      {c.isFunded && (
                        <>
                          <button className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs" onClick={() => addWinners(c.id)}>Add Winners</button>
                          {!a?.organiserApproved && (
                            <button className="rounded-lg bg-primary-600 text-white px-2 py-1 text-xs" onClick={() => approveDistribution(c.id, "organiser")}>Approve (Org)</button>
                          )}
                          {!a?.sponsorApproved && (
                            <button className="rounded-lg bg-primary-600 text-white px-2 py-1 text-xs" onClick={() => approveDistribution(c.id, "sponsor")}>Approve (Sponsor)</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

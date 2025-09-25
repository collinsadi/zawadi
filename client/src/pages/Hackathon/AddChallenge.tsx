import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/UI/Navbar";
import ImageUpload from "../../components/CreateHackathon/ImageUpload";
import MarkdownField from "../../components/CreateHackathon/MarkdownField";
import ResultModal from "../../components/UI/ResultModal";
import { uploadChallengeJson } from "../../services/ipfsService";
import { getHackathonById as getHackathonOnChain } from "../../services/factoryService";
import { createEscrowService } from "../../services/escrowService";
import { useAccount } from "wagmi";
import type { Address } from "viem";

// Spec reference: specs/Challenge.json
// {
//   id: string,
//   title: string,
//   totalPrize: string,
//   brief: string,
//   token: string,
//   isErc20: boolean,
//   data: { image: string, details: string },
//   sponsor: { link: string, name: string, logo: string }
// }

type Step = 1 | 2 | 3;

type ChallengeForm = {
  title: string;
  totalPrize: string; // human-readable numeric string; submit converts to bigint base units assumption
  brief: string;
  token: string; // 0x... or "ETH"
  isErc20: boolean;
  data: { image: string; details: string };
  sponsor: { link: string; name: string; logo: string };
};

export default function AddChallengePage() {
  const { id } = useParams(); // hackathon id
  const navigate = useNavigate();
  const location = useLocation();
  const { address } = useAccount();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [escrowAddr, setEscrowAddr] = useState<Address | null>(null);
  const [isSponsor, setIsSponsor] = useState(false);
  const [org, setOrg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState<string>("");

  const [form, setForm] = useState<ChallengeForm>({
    title: "",
    totalPrize: "",
    brief: "",
    token: "ETH",
    isErc20: false,
    data: { image: "", details: "" },
    sponsor: { link: "", name: "", logo: "" },
  });

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return form.title.trim() && form.data.image.trim() && form.brief.trim();
    }
    if (step === 2) {
      return form.sponsor.name.trim() && form.sponsor.logo.trim() && form.sponsor.link.trim() && form.data.details.trim();
    }
    if (step === 3) {
      return form.totalPrize.trim() && form.token.trim();
    }
    return false;
  }, [form, step]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      try {
        const onChain = await getHackathonOnChain(id as any);
        const ea = onChain.escrowContract as unknown as Address;
        const organiser = onChain.organizer as unknown as string;
        if (!cancelled) {
          setEscrowAddr(ea);
          setOrg(organiser);
          // check sponsor
          const esc = createEscrowService(ea);
          const ok = address ? await esc.sponsors(address as any).catch(() => false) : false;
          setIsSponsor(!!ok);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, address]);

  // Optional soft guard: if not sponsor and not organiser, redirect to public page
  const isOrganizer = useMemo(() => org && address && org.toLowerCase() === address.toLowerCase(), [org, address]);
  useEffect(() => {
    if (!id) return;
    if (!isSponsor && !isOrganizer && escrowAddr) {
      // Not authorized to add challenge
      // We keep on page but disable submit; uncomment to redirect automatically:
      // navigate(`/hackathons/${id}`);
    }
  }, [id, isSponsor, isOrganizer, escrowAddr]);

  const onSubmit = async () => {
    if (!canGoNext || !escrowAddr) return;
    if (!isSponsor && !isOrganizer) {
      setModalMsg("You are not authorized to add a challenge to this hackathon.");
      setErrorOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        // No id here; will be implicit by on-chain challengeCount
        title: form.title,
        totalPrize: form.totalPrize,
        brief: form.brief,
        token: form.token,
        isErc20: form.isErc20,
        data: { image: form.data.image, details: form.data.details },
        sponsor: { link: form.sponsor.link, name: form.sponsor.name, logo: form.sponsor.logo },
      };
      const { cid } = await uploadChallengeJson(payload);

      // Call escrow.addChallenge(totalPrize, token, isERC20, ipfsCid)
      const esc = createEscrowService(escrowAddr);
      // NOTE: totalPrize must be in base units (wei). Expect user to input raw integer; else we could add parsing.
      const total = BigInt(form.totalPrize);
      const tokenAddr = (form.isErc20 ? (form.token as Address) : ("0x0000000000000000000000000000000000000000" as Address));
      const { hash } = await esc.addChallenge(total, tokenAddr, form.isErc20, cid);

      setModalMsg(`Challenge added. CID: ${cid}\nTx: ${hash}`);
      setSuccessOpen(true);
      // Optionally navigate back to manage page
      // navigate(`/hackathons/${id}/manage`, { replace: true });
    } catch (e: any) {
      setModalMsg(e?.shortMessage || e?.message || "Failed to add challenge.");
      setErrorOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Add Challenge</h1>
          <div className="text-sm text-slate-600 dark:text-slate-400">Step {step} of 3</div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {/* Stepper Header */}
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className={"flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium " + (step === 1 ? 'bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-primary-300' : 'text-slate-600 dark:text-slate-300')}>
              <span className="h-2 w-2 rounded-full bg-primary-600" /> Basics
            </div>
            <div className={"flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium " + (step === 2 ? 'bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-primary-300' : 'text-slate-600 dark:text-slate-300')}>
              <span className="h-2 w-2 rounded-full bg-primary-600" /> Content
            </div>
            <div className={"flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium " + (step === 3 ? 'bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-primary-300' : 'text-slate-600 dark:text-slate-300')}>
              <span className="h-2 w-2 rounded-full bg-primary-600" /> Prize & Token
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-6">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Best Agentic dApp"
                  />
                </div>
                <ImageUpload
                  label="Cover Image"
                  value={form.data.image}
                  onChange={(url) => setForm((f) => ({ ...f, data: { ...f.data, image: url } }))}
                  buttonText="Upload Image"
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Brief (short)</label>
                  <input
                    type="text"
                    value={form.brief}
                    onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="One-liner summary"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Sponsor Name</label>
                  <input
                    type="text"
                    value={form.sponsor.name}
                    onChange={(e) => setForm((f) => ({ ...f, sponsor: { ...f.sponsor, name: e.target.value } }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Company / Protocol name"
                  />
                </div>
                <ImageUpload
                  label="Sponsor Logo"
                  value={form.sponsor.logo}
                  onChange={(url) => setForm((f) => ({ ...f, sponsor: { ...f.sponsor, logo: url } }))}
                  buttonText="Upload Logo"
                  previewClassName="h-12 w-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Sponsor Link</label>
                  <input
                    type="url"
                    value={form.sponsor.link}
                    onChange={(e) => setForm((f) => ({ ...f, sponsor: { ...f.sponsor, link: e.target.value } }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://..."
                  />
                </div>
                <MarkdownField
                  label="Details (Markdown)"
                  value={form.data.details}
                  onChange={(v) => setForm((f) => ({ ...f, data: { ...f.data, details: v } }))}
                  height={300}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Total Prize (base units)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.totalPrize}
                    onChange={(e) => setForm((f) => ({ ...f, totalPrize: e.target.value.replace(/[^0-9]/g, "") }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., 1000000000000000000 (1e18 wei)"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Is ERC20?</label>
                    <select
                      value={form.isErc20 ? "yes" : "no"}
                      onChange={(e) => setForm((f) => ({ ...f, isErc20: e.target.value === "yes" }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="no">No (Native)</option>
                      <option value="yes">Yes (ERC20)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Token Address or Symbol</label>
                    <input
                      type="text"
                      value={form.token}
                      onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={form.isErc20 ? "0xTokenAddress" : "ETH"}
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Note: For ERC20, enter token contract address and prize in token base units. Funding is a separate step after creation.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">All fields are required unless stated otherwise.</div>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Back
                </button>
              )}
              {step < 3 && (
                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  Next
                </button>
              )}
              {step === 3 && (
                <button
                  type="button"
                  disabled={!canGoNext || submitting || (!isSponsor && !isOrganizer)}
                  onClick={onSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Add Challenge"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        <ResultModal open={successOpen} title="Success" message={modalMsg} onClose={() => { setSuccessOpen(false); if (id) navigate(`/hackathons/${id}/manage`); }} variant="success" />
        <ResultModal open={errorOpen} title="Action Failed" message={modalMsg} onClose={() => setErrorOpen(false)} variant="error" />
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

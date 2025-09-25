import { useMemo, useState } from 'react';
import Navbar from '../../components/UI/Navbar';
import type { Hackathon } from '../../types/Hackathon';
import OrganizerStep from '../../components/CreateHackathon/OrganizerStep';
import HackathonStep from '../../components/CreateHackathon/HackathonStep';
import DetailsStep from '../../components/CreateHackathon/DetailsStep';
import { uploadHackathonJson } from '../../services/ipfsService';
import { createHackathon as createHackathonOnChain } from '../../services/factoryService';

type Step = 1 | 2 | 3;

const TITLE_MAX = 80;

export default function CreateHackathonPage() {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<Omit<Hackathon, 'id'>>({
    title: '',
    cover: '',
    description: '',
    organiser: { name: '', logo: '', url: '' },
    details: {
      prizePool: '',
      currency: 'USD',
      startDate: '',
      endDate: '',
      location: '',
      tags: [],
    },
    type: 'Online',
  });

  // Title character limit enforced inside HackathonStep
  const canGoNext = useMemo(() => {
    if (step === 1) {
      return (
        form.organiser.name.trim().length > 0 &&
        form.organiser.logo.trim().length > 0 &&
        form.organiser.url.trim().length > 0
      );
    }
    if (step === 2) {
      // Only validate hackathon basics: title, cover, description
      return (
        form.title.trim().length > 0 &&
        form.description.trim().length > 0 &&
        !!form.cover
      );
    }
    if (step === 3) {
      // Validate details: prize, currency, dates, location, type
      return (
        form.details.prizePool.trim().length > 0 &&
        form.details.currency.trim().length > 0 &&
        form.details.startDate.trim().length > 0 &&
        form.details.endDate.trim().length > 0 &&
        form.details.location.trim().length > 0 &&
        form.type.trim().length > 0
      );
    }
    return false;
  }, [form, step]);

  // Handlers moved into modular components

  const onSubmit = async () => {
    if (!canGoNext) return;
    setSubmitting(true);
    try {
      const payload: Omit<Hackathon, 'id'> = {
        ...form,
        description: form.description, // already markdown string
      };
      // Upload to IPFS via server route (Pinata)
      const { cid } = await uploadHackathonJson(payload);
      console.log('IPFS CID:', cid);
      // Interact with Factory contract to create hackathon
      const { hash, receipt } = await createHackathonOnChain(cid);
      console.log('Factory createHackathon tx hash:', hash);
      console.log('Tx receipt:', receipt);
      alert(`Hackathon created on-chain.\nCID: ${cid}\nTx: ${hash}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Create a Hackathon</h1>
          <div className="text-sm text-slate-600 dark:text-slate-400">Step {step} of 3</div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {/* Stepper Header */}
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className={"flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium " + (step === 1 ? 'bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-primary-300' : 'text-slate-600 dark:text-slate-300')}>
              <span className="h-2 w-2 rounded-full bg-primary-600" /> Organiser
            </div>
            <div className={"flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium " + (step === 2 ? 'bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-primary-300' : 'text-slate-600 dark:text-slate-300')}>
              <span className="h-2 w-2 rounded-full bg-primary-600" /> Hackathon
            </div>
            <div className={"flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium " + (step === 3 ? 'bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-primary-300' : 'text-slate-600 dark:text-slate-300')}>
              <span className="h-2 w-2 rounded-full bg-primary-600" /> Details
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {step === 1 && (
              <OrganizerStep organiser={form.organiser} onChange={(org) => setForm((f) => ({ ...f, organiser: org }))} />
            )}

            {step === 2 && (
              <HackathonStep form={form} onChange={setForm} titleMax={TITLE_MAX} />
            )}
            {step === 3 && (
              <DetailsStep form={form} onChange={setForm} />
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
                  disabled={!canGoNext || submitting}
                  onClick={onSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Create Hackathon'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

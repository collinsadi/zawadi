import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../../components/UI/Navbar';
import { uploadToCloudinary } from '../../utils/cloudinary';
import type { Hackathon } from '../../types/Hackathon';
import MDEditor, { commands } from '@uiw/react-md-editor';

type Step = 1 | 2;

const TITLE_MAX = 80;

export default function CreateHackathonPage() {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [mdTheme, setMdTheme] = useState<'light' | 'dark'>(() =>
    (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'dark' : 'light'
  );
  const [mdMode, setMdMode] = useState<'edit' | 'preview'>('edit');

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

  const titleCharsLeft = TITLE_MAX - form.title.length;
  const canGoNext = useMemo(() => {
    if (step === 1) {
      return (
        form.organiser.name.trim().length > 0 &&
        form.organiser.logo.trim().length > 0 &&
        form.organiser.url.trim().length > 0
      );
    }
    if (step === 2) {
      return (
        form.title.trim().length > 0 &&
        form.description.trim().length > 0 &&
        form.details.prizePool.trim().length > 0 &&
        form.details.currency.trim().length > 0 &&
        form.details.startDate.trim().length > 0 &&
        form.details.endDate.trim().length > 0 &&
        form.details.location.trim().length > 0 &&
        form.type.trim().length > 0 &&
        !!form.cover
      );
    }
    return false;
  }, [form, step]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadToCloudinary(file);
      setForm((f) => ({ ...f, cover: url }));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogoUploadClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadToCloudinary(file);
      setForm((f) => ({ ...f, organiser: { ...f.organiser, logo: url } }));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Keep markdown editor theme in sync with platform theme (html.dark)
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setMdTheme(root.classList.contains('dark') ? 'dark' : 'light');
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          update();
        }
      }
    });
    observer.observe(root, { attributes: true });
    update();
    return () => observer.disconnect();
  }, []);

  const handleTagInput = (val: string) => {
    const tags = val
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setForm((f) => ({ ...f, details: { ...f.details, tags } }));
  };

  const onSubmit = async () => {
    if (!canGoNext) return;
    setSubmitting(true);
    try {
      const payload: Omit<Hackathon, 'id'> = {
        ...form,
        description: form.description, // already markdown string
      };
      // For now, just log the payload. Integrate with API/contract later.
      console.log('Hackathon payload', payload);
      alert('Hackathon draft created in console as JSON. Ready to integrate with backend.');
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
          <div className="text-sm text-slate-600 dark:text-slate-400">Step {step} of 2</div>
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
          </div>

          {/* Content */}
          <div className="p-5">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Organiser Name</label>
                  <input
                    type="text"
                    value={form.organiser.name}
                    onChange={(e) => setForm((f) => ({ ...f, organiser: { ...f.organiser, name: e.target.value } }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Zawadi Foundation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Organiser Logo</label>
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleLogoUploadClick}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Upload Logo
                    </button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                    {form.organiser.logo && (
                      <img src={form.organiser.logo} alt="Logo preview" className="h-12 w-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Organiser URL</label>
                  <input
                    type="url"
                    value={form.organiser.url}
                    onChange={(e) => setForm((f) => ({ ...f, organiser: { ...f.organiser, url: e.target.value } }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    maxLength={TITLE_MAX}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., ZK Innovators Hackathon 2025"
                  />
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{titleCharsLeft} characters left</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Cover Image</label>
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Upload Image
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    {form.cover && (
                      <img src={form.cover} alt="Cover preview" className="h-16 w-28 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Description (Markdown)</label>
                    <button
                      type="button"
                      onClick={() => setMdMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      {mdMode === 'edit' ? 'Preview' : 'Back to editor'}
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-orange-400">
                    <div data-color-mode={mdTheme}>
                      <MDEditor
                        value={form.description}
                        onChange={(v) => setForm((f) => ({ ...f, description: v || '' }))}
                        height={380}
                        visibleDragbar={false}
                        preview={mdMode}
                        commands={[
                          commands.title,
                          commands.bold,
                          commands.italic,
                          commands.strikethrough,
                          commands.hr,
                          commands.code,
                          commands.link,
                          commands.image,
                          commands.unorderedListCommand,
                          commands.orderedListCommand,
                          commands.checkedListCommand,
                        ]}
                        extraCommands={[]}
                        textareaProps={{ placeholder: 'Write the hackathon details in Markdown...' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Prize Pool</label>
                    <input
                      type="number"
                      min={0}
                      value={form.details.prizePool}
                      onChange={(e) => setForm((f) => ({ ...f, details: { ...f.details, prizePool: e.target.value } }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Currency</label>
                    <select
                      value={form.details.currency}
                      onChange={(e) => setForm((f) => ({ ...f, details: { ...f.details, currency: e.target.value } }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Hackathon['type'] }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Online">Online</option>
                      <option value="In-person">In-person</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Location</label>
                    <input
                      type="text"
                      value={form.details.location}
                      onChange={(e) => setForm((f) => ({ ...f, details: { ...f.details, location: e.target.value } }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={form.type === 'Online' ? 'Global / Online' : 'City, Country'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                    <input
                      type="date"
                      value={form.details.startDate ? form.details.startDate.substring(0, 10) : ''}
                      onChange={(e) => setForm((f) => ({ ...f, details: { ...f.details, startDate: new Date(e.target.value).toISOString() } }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <input
                      type="date"
                      value={form.details.endDate ? form.details.endDate.substring(0, 10) : ''}
                      onChange={(e) => setForm((f) => ({ ...f, details: { ...f.details, endDate: new Date(e.target.value).toISOString() } }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={form.details.tags.join(', ')}
                    onChange={(e) => handleTagInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., ZK, Privacy, Cryptography"
                  />
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
              {step < 2 && (
                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  Next
                </button>
              )}
              {step === 2 && (
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

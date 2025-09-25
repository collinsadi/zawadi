import type { EscrowChallenge, EscrowApproval } from './types';

type Props = {
  selected: EscrowChallenge;
  approvals: Record<number, EscrowApproval>;
  onClose: () => void;
  onOpenWinners: (c: EscrowChallenge) => void;
  onApprove: (challengeId: number, actor: 'organiser' | 'sponsor') => void;
};

export default function ChallengeQuickViewModal({ selected, approvals, onClose, onOpenWinners, onApprove }: Props) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <div className="relative h-44 w-full">
            <img src={selected.data.image} alt={selected.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button className="absolute top-3 right-3 rounded-full bg-black/50 text-white w-7 h-7" onClick={onClose}>×</button>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selected.title}</h3>
            <div className="mt-1 text-xs text-slate-500">Challenge #{selected.id} • Prize: {selected.totalPrize} • Token: {selected.isERC20 ? selected.token : 'ETH'}</div>
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{selected.data.brief}</p>

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
                    <button className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs" onClick={() => onOpenWinners(selected)}>Add Winners</button>
                    {!approvals[selected.id]?.organiserApproved && (
                      <button className="rounded-lg bg-primary-600 text-white px-3 py-1.5 text-xs" onClick={() => onApprove(selected.id, 'organiser')}>Approve (Org)</button>
                    )}
                    {!approvals[selected.id]?.sponsorApproved && (
                      <button className="rounded-lg bg-primary-600 text-white px-3 py-1.5 text-xs" onClick={() => onApprove(selected.id, 'sponsor')}>Approve (Sponsor)</button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

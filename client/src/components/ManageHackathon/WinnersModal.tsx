import type { EscrowChallenge } from './types';

type Row = { address: string; amount: string };

type Props = {
  target: EscrowChallenge;
  rows: Row[];
  onChangeRow: (index: number, row: Row) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  winnersTotal: number;
  totalPrizeNumber: (c?: EscrowChallenge | null) => number;
  winnersValid: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
  submitting?: boolean;
};

export default function WinnersModal({ target, rows, onChangeRow, onAddRow, onRemoveRow, winnersTotal, totalPrizeNumber, winnersValid, error, onClose, onSubmit, submitting = false }: Props) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Winners</h3>
                <div className="mt-1 text-xs text-slate-500">
                  Challenge #{target.id} • Total Prize: {target.totalPrize} {target.isERC20 ? '' : 'ETH'}
                </div>
              </div>
              <button className="rounded-full bg-slate-100 dark:bg-slate-800 w-7 h-7" onClick={onClose}>×</button>
            </div>

            <div className="mt-4 space-y-3">
              {rows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.address}
                    onChange={(e) => onChangeRow(idx, { ...row, address: e.target.value })}
                    placeholder="0xWinnerAddress"
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={row.amount}
                    onChange={(e) => onChangeRow(idx, { ...row, amount: e.target.value })}
                    placeholder="Amount"
                    className="w-32 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-right"
                  />
                  <button
                    aria-label="Remove row"
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs"
                    onClick={() => onRemoveRow(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div>
                <button
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs"
                  onClick={onAddRow}
                >
                  + Add another winner
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="text-slate-600 dark:text-slate-300">
                Total entered: {winnersTotal} / {totalPrizeNumber(target)}
              </div>
              <div className={winnersValid ? 'text-green-600' : 'text-amber-600'}>
                {winnersValid ? 'Ready to submit' : 'Ensure totals equal prize and fields are valid'}
              </div>
            </div>

            {error && (
              <div className="mt-2 text-xs text-red-600">{error}</div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-primary-600 text-white px-3 py-1.5 text-xs disabled:opacity-50"
                disabled={!winnersValid || submitting}
                aria-busy={submitting}
                onClick={onSubmit}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

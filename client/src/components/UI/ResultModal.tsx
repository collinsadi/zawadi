import type { ReactNode } from "react";

type ResultModalProps = {
  open: boolean;
  title: string;
  message?: string | ReactNode;
  onClose: () => void;
  variant?: "success" | "error";
  actions?: ReactNode;
};

export default function ResultModal({ open, title, message, onClose, variant = "success", actions }: ResultModalProps) {
  if (!open) return null;
  const isSuccess = variant === "success";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-5">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 flex items-center justify-center rounded-full ${isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {isSuccess ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        </div>
        {message && (
          <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 break-words">
            {message}
          </div>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          {actions}
          <button onClick={onClose} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

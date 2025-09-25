export default function SkeletonHackathonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-card border border-slate-100 dark:border-slate-800 animate-pulse">
      <div className="relative h-44 w-full bg-slate-200/70 dark:bg-slate-800" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded col-span-2" />
        </div>
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded mt-2" />
      </div>
    </div>
  );
}

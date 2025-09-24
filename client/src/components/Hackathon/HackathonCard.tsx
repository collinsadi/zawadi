import { FiCalendar, FiMapPin, FiExternalLink, FiAward } from "react-icons/fi";
import { Link } from "react-router-dom";
import type { Hackathon } from "../../types/Hackathon";

export default function HackathonCard({ hack }: { hack: Hackathon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-card border border-slate-100 dark:border-slate-800 hover:-translate-y-1 hover:shadow-xl transition-all">
      <div className="relative h-44 w-full overflow-hidden">
        {hack.cover ? (
          <img
            src={hack.cover}
            alt={hack.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary-600 to-primary-400" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3 flex gap-2">
          {hack.details.tags?.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 font-medium"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-slate-900 dark:text-slate-100 text-lg font-semibold truncate">
          {hack.title}
        </h3>

        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <FiCalendar className="text-primary-600" />
            <span>
              {new Date(hack.details.startDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
              {hack.details.endDate
                ? ` - ${new Date(hack.details.endDate).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" }
                  )}`
                : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <FiAward className="text-primary-600" />
            <span>
              {hack.details.currency + " "}
              {new Intl.NumberFormat(undefined, {
                currency: hack.details.currency,
              }).format(Number(hack.details.prizePool))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FiMapPin className="text-primary-600" />
            <span>
              {hack.type === "In-person" ? hack.details.location : "Online"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link
            to={hack.id ? `/hackathons/${hack.id}` : "#"}
            className="inline-flex items-center gap-2 text-primary-700 dark:text-primary-400 font-medium hover:text-primary-900 dark:hover:text-primary-300"
          >
            View <FiExternalLink />
          </Link>
        </div>
      </div>
    </div>
  );
}

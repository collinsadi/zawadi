import { FiCalendar, FiMapPin, FiUsers, FiExternalLink, FiAward } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export type Hackathon = {
  id: string;
  title: string;
  startDate: string; // ISO date
  endDate?: string; // optional
  location: string;
  prizePool: string;
  cover?: string; // image URL
  tags?: string[];
  participants?: number;
  slug?: string;
};

export default function HackathonCard({ hack }: { hack: Hackathon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur shadow-card border border-slate-100 hover:-translate-y-1 hover:shadow-xl transition-all">
      <div className="relative h-44 w-full overflow-hidden">
        {hack.cover ? (
          <img src={hack.cover} alt={hack.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary-600 to-primary-400" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3 flex gap-2">
          {hack.tags?.slice(0, 3).map((t) => (
            <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/90 text-slate-800 font-medium">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-slate-900 text-lg font-semibold line-clamp-1">{hack.title}</h3>

        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-2"><FiCalendar className="text-primary-600" />
            <span>{new Date(hack.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {hack.endDate ? ` - ${new Date(hack.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end"><FiAward className="text-primary-600" /><span>{hack.prizePool}</span></div>
          <div className="flex items-center gap-2"><FiMapPin className="text-primary-600" /><span>{hack.location}</span></div>
          <div className="flex items-center gap-2 justify-end"><FiUsers className="text-primary-600" /><span>{(hack.participants ?? 0).toLocaleString()} joined</span></div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-2 rtl:space-x-reverse">
            {[...Array(3)].map((_, i) => (
              <img key={i} className="w-7 h-7 rounded-full border-2 border-white" src={`https://api.dicebear.com/9.x/miniavs/svg?seed=${hack.id}-${i}`} alt="participant" />
            ))}
          </div>
          <Link to={hack.slug ? `/hackathons/${hack.slug}` : '#'} className="inline-flex items-center gap-2 text-primary-700 font-medium hover:text-primary-900">
            View <FiExternalLink />
          </Link>
        </div>
      </div>
    </div>
  );
}

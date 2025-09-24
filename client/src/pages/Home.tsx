import Navbar from '../components/Navbar';
import HackathonCard from '../components/HackathonCard';
import type { Hackathon } from '../components/HackathonCard';
import { FiFilter } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const demoHacks: Hackathon[] = [
  {
    id: '1',
    title: 'ZK Innovators Hackathon 2025',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    location: 'Global / Online',
    prizePool: '$150,000',
    participants: 1243,
    tags: ['ZK', 'Cryptography', 'Privacy'],
    cover: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2200&auto=format&fit=crop',
    slug: 'zk-innovators-2025',
  },
  {
    id: '2',
    title: 'AI x Web3 Builders Sprint',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    location: 'San Francisco, CA',
    prizePool: '$80,000',
    participants: 786,
    tags: ['AI', 'DeFi', 'Agents'],
    cover: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=2200&auto=format&fit=crop',
    slug: 'ai-web3-builders',
  },
  {
    id: '3',
    title: 'Layer 2 Scaling Hack',
    startDate: new Date().toISOString(),
    location: 'Berlin, Germany',
    prizePool: '$50,000',
    participants: 342,
    tags: ['L2', 'Rollups', 'Infra'],
    cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2200&auto=format&fit=crop',
    slug: 'l2-scaling-hack',
  },
  {
    id: '4',
    title: 'Open Source Impact Week',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
    location: 'Remote',
    prizePool: '$20,000',
    participants: 129,
    tags: ['OSS', 'Public Goods'],
    cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2200&auto=format&fit=crop',
    slug: 'open-source-impact-week',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Discover Hackathons</h1>
              <p className="mt-2 text-slate-600">Compete, build, and earn prizes. Join top builders from around the world.</p>
            </div>

            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <FiFilter /> Filters
              </button>
              <Link to="/hackathons/new" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
                Create Hackathon
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {['All', 'Online', 'In-person', 'DeFi', 'ZK', 'AI', 'Public Goods'].map((chip) => (
              <button key={chip} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                {chip}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {demoHacks.map((hack) => (
              <HackathonCard key={hack.id} hack={hack} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

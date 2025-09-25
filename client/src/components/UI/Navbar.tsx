import { Link, NavLink } from "react-router-dom";
import { FiPlusCircle, FiSearch } from "react-icons/fi";
import ThemeToggle from "./ThemeToggle";
import { GiAchievement } from "react-icons/gi";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  const { isConnected } = useAccount();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/80 dark:bg-slate-900/70 dark:border-slate-800 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <GiAchievement className="h-9 w-9 text-slate-900 dark:text-slate-100" />
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Zawadi
            </span>
          </Link>

          <div className="hidden md:flex max-w-md flex-1 mx-6">
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search hackathons, tracks, prizes..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <ThemeToggle />
            {isConnected ? (
              <NavLink
                to="/hackathons/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
              >
                <FiPlusCircle className="text-white" />
                Create Hackathon
              </NavLink>
            ) : (
              <ConnectButton chainStatus="icon" showBalance={false} />
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}


import type { PropsWithChildren } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const SUPPORTED_CHAIN_IDS = [10] as const;
// const SUPPORTED_CHAIN_IDS = [10, 11155111] as const;

export default function WalletGuard({ children }: PropsWithChildren) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isSupported = SUPPORTED_CHAIN_IDS.includes(chainId as any);

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-4">Wallet required</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          Please connect your wallet to access this page.
        </p>
        <div className="flex justify-center">
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-4">Wrong network</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          You’re connected to an unsupported network. Please switch to{" "}
          <span className="font-semibold">Optimism Mainnet</span>.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => switchChain({ chainId: 10 })}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Switch to Optimism
          </button>
          {/*
          <button
            type="button"
            disabled={isPending}
            onClick={() => switchChain({ chainId: 11155111 })}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Switch to Sepolia
          </button>
          */}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

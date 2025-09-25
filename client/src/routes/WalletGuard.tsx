import type { PropsWithChildren } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function WalletGuard({ children }: PropsWithChildren) {
  const { isConnected } = useAccount();

  if (isConnected) return <>{children}</>;

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

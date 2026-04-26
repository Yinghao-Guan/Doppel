"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { shortenAddress } from "@/lib/solana";

export function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (connecting) {
    return (
      <button className="cta glass cta-ghost text-xs font-mono tracking-[0.2em] py-2 px-4 opacity-60">
        CONNECTING…
      </button>
    );
  }

  if (publicKey) {
    return (
      <button
        onClick={() => disconnect()}
        className="cta glass cta-ghost text-xs font-mono tracking-[0.2em] py-2 px-4"
        title="Click to disconnect"
      >
        {shortenAddress(publicKey.toBase58())}
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="cta glass cta-ghost text-xs font-mono tracking-[0.2em] py-2 px-4"
    >
      CONNECT WALLET
    </button>
  );
}

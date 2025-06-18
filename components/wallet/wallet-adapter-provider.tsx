'use client';
import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter, BackpackWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app's global CSS.
require('@solana/wallet-adapter-react-ui/styles.css');

interface WalletAdapterProviderProps {
  children: React.ReactNode;
}

export const SolanaWalletAdapterProvider: FC<WalletAdapterProviderProps> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet; // Or Mainnet-beta, Testnet
  const endpoint = useMemo(() => {
    const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT;
    return customRpc || clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new BackpackWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
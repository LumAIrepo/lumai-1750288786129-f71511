'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Zap, Shield, Globe } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            PumpClone
          </h1>
          <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
            Meme token launchpad with bonding curves, fair launches, and automated market making for Solana ecosystem
          </p>
          <div className="mb-8">
            <WalletMultiButton className="!bg-green-500 !hover:bg-green-600 !text-white !px-8 !py-3 !rounded-lg !font-semibold !text-lg" />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/20 transition-all duration-300">
            <CardHeader className="text-center">
              <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <CardTitle className="text-white">Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-purple-200 text-center">
                Built on Solana for lightning-fast transactions
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/20 transition-all duration-300">
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <CardTitle className="text-white">Secure</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-purple-200 text-center">
                Anchor framework ensures program security
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/20 transition-all duration-300">
            <CardHeader className="text-center">
              <Globe className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <CardTitle className="text-white">Decentralized</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-purple-200 text-center">
                Fully decentralized on the blockchain
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Core Functionality */}
        <div className="text-center mt-16">
          <p className="text-lg text-purple-200">
            Core Functionality: undefined
          </p>
        </div>
      </div>
    </div>
  );
}
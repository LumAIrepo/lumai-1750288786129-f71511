import React from "react"
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronRight, User, Settings, Plus, TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  liquidity: number;
  priceChange24h: number;
  creator: string;
  createdAt: string;
}

interface TradeData {
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
  user: string;
  txHash: string;
}

interface PredictionMarket {
  id: string;
  question: string;
  description: string;
  endDate: string;
  totalVolume: number;
  yesPrice: number;
  noPrice: number;
  yesShares: number;
  noShares: number;
  resolved: boolean;
  outcome?: boolean;
}

export default function TokenPage() {
  const router = useRouter();
  const { mint } = router.query;
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [predictionMarkets, setPredictionMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [showTradeDialog, setShowTradeDialog] = useState(false);
  const [predictionAmount, setPredictionAmount] = useState('');
  const [selectedPrediction, setSelectedPrediction] = useState<string>('');
  const [predictionSide, setPredictionSide] = useState<'yes' | 'no'>('yes');

  useEffect(() => {
    if (mint && typeof mint === 'string') {
      fetchTokenData(mint);
      fetchTrades(mint);
      fetchPredictionMarkets(mint);
    }
  }, [mint]);

  const fetchTokenData = async (mintAddress: string) => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockData: TokenData = {
        mint: mintAddress,
        name: 'PumpToken',
        symbol: 'PUMP',
        description: 'A revolutionary meme token with prediction market capabilities',
        image: '/api/placeholder/200/200',
        price: 0.00123,
        marketCap: 1234567,
        volume24h: 456789,
        holders: 2345,
        liquidity: 123456,
        priceChange24h: 15.67,
        creator: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        createdAt: '2024-01-15T10:30:00Z'
      };
      setTokenData(mockData);
    } catch (error) {
      console.error('Error fetching token data:', error);
      toast.error('Failed to load token data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async (mintAddress: string) => {
    try {
      // Mock data - replace with actual API call
      const mockTrades: TradeData[] = [
        {
          type: 'buy',
          amount: 1000,
          price: 0.00123,
          timestamp: '2024-01-15T14:30:00Z',
          user: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          txHash: 'abc123'
        },
        {
          type: 'sell',
          amount: 500,
          price: 0.00121,
          timestamp: '2024-01-15T14:25:00Z',
          user: '8yLYug3DH98e98UYKTEqcC6lClfheTrB94UaSrhAtgBV',
          txHash: 'def456'
        }
      ];
      setTrades(mockTrades);
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  };

  const fetchPredictionMarkets = async (mintAddress: string) => {
    try {
      // Mock data - replace with actual API call
      const mockMarkets: PredictionMarket[] = [
        {
          id: '1',
          question: 'Will PUMP reach $0.01 by end of month?',
          description: 'Prediction market for PUMP token price target',
          endDate: '2024-01-31T23:59:59Z',
          totalVolume: 50000,
          yesPrice: 0.65,
          noPrice: 0.35,
          yesShares: 32500,
          noShares: 17500,
          resolved: false
        },
        {
          id: '2',
          question: 'Will PUMP get listed on a major exchange?',
          description: 'Prediction for major exchange listing within 3 months',
          endDate: '2024-04-15T23:59:59Z',
          totalVolume: 25000,
          yesPrice: 0.42,
          noPrice: 0.58,
          yesShares: 10500,
          noShares: 14500,
          resolved: false
        }
      ];
      setPredictionMarkets(mockMarkets);
    } catch (error) {
      console.error('Error fetching prediction markets:', error);
    }
  };

  const handleTrade = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      // Mock transaction - replace with actual Solana program interaction
      toast.success(`${tradeType === 'buy' ? 'Bought' : 'Sold'} ${tradeAmount} tokens`);
      setShowTradeDialog(false);
      setTradeAmount('');
    } catch (error) {
      console.error('Trade error:', error);
      toast.error('Trade failed');
    }
  };

  const handlePredictionBet = async (marketId: string, side: 'yes' | 'no', amount: string) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      // Mock transaction - replace with actual prediction market interaction
      toast.success(`Placed ${side.toUpperCase()} bet of ${amount} SOL`);
      setPredictionAmount('');
    } catch (error) {
      console.error('Prediction bet error:', error);
      toast.error('Bet failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Token not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-inter">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <img
            src={tokenData.image}
            alt={tokenData.name}
            className="w-16 h-16 rounded-full"
          />
          <div>
            <h1 className="text-3xl font-bold">{tokenData.name}</h1>
            <p className="text-slate-400">{tokenData.symbol}</p>
          </div>
          <Badge
            className={cn(
              'ml-auto',
              tokenData.priceChange24h >= 0
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            )}
          >
            {tokenData.priceChange24h >= 0 ? '+' : ''}
            {tokenData.priceChange24h.toFixed(2)}%
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                ${tokenData.price.toFixed(6)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Market Cap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${tokenData.marketCap.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">24h Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${tokenData.volume24h.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Holders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tokenData.holders.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Trading */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="trade" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                <TabsTrigger value="trade">Trade</TabsTrigger>
                <TabsTrigger value="predictions">Predictions</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
              </TabsList>

              <TabsContent value="trade" className="space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Quick Trade
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={() => {
                          setTradeType('buy');
                          setShowTradeDialog(true);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        Buy {tokenData.symbol}
                      </Button>
                      <Button
                        onClick={() => {
                          setTradeType('sell');
                          setShowTradeDialog(true);
                        }}
                        variant="outline"
                        className="border-slate-600 hover:bg-slate-700"
                      >
                        Sell {tokenData.symbol}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Trades */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Recent Trades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {trades.map((trade, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              className={
                                trade.type === 'buy'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }
                            >
                              {trade.type.toUpperCase()}
                            </Badge>
                            <div>
                              <div className="font-medium">
                                {trade.amount.toLocaleString()} {tokenData.symbol}
                              </div>
                              <div className="text-sm text-slate-400">
                                ${trade.price.toFixed(6)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-400">
                              {new Date(trade.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="predictions" className="space-y-6">
                {predictionMarkets.map((market) => (
                  <Card key={market.id} className="bg-slate-800 border-slate
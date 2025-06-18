```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronRight, User, Settings, Plus, TrendingUp, TrendingDown, Wallet, Activity, DollarSign, BarChart3 } from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey, Transaction } from "@solana/web3.js"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Position {
  id: string
  marketName: string
  outcome: string
  shares: number
  avgPrice: number
  currentPrice: number
  value: number
  pnl: number
  pnlPercentage: number
  status: 'active' | 'resolved' | 'expired'
}

interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'claim'
  marketName: string
  outcome: string
  shares: number
  price: number
  total: number
  timestamp: Date
  txHash: string
}

interface PortfolioStats {
  totalValue: number
  totalPnl: number
  totalPnlPercentage: number
  activePositions: number
  resolvedPositions: number
  totalVolume: number
}

export default function Portfolio() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [loading, setLoading] = useState(true)
  const [positions, setPositions] = useState<Position[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<PortfolioStats>({
    totalValue: 0,
    totalPnl: 0,
    totalPnlPercentage: 0,
    activePositions: 0,
    resolvedPositions: 0,
    totalVolume: 0
  })
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [showPositionDialog, setShowPositionDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('positions')

  useEffect(() => {
    if (connected && publicKey) {
      loadPortfolioData()
    } else {
      setLoading(false)
    }
  }, [connected, publicKey])

  const loadPortfolioData = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API calls
      const mockPositions: Position[] = [
        {
          id: '1',
          marketName: 'Will Bitcoin reach $100k by end of 2024?',
          outcome: 'Yes',
          shares: 150,
          avgPrice: 0.65,
          currentPrice: 0.72,
          value: 108,
          pnl: 10.5,
          pnlPercentage: 10.77,
          status: 'active'
        },
        {
          id: '2',
          marketName: 'US Presidential Election 2024',
          outcome: 'Democrat',
          shares: 200,
          avgPrice: 0.48,
          currentPrice: 0.52,
          value: 104,
          pnl: 8,
          pnlPercentage: 8.33,
          status: 'active'
        },
        {
          id: '3',
          marketName: 'Tesla Stock Price Above $300',
          outcome: 'No',
          shares: 100,
          avgPrice: 0.35,
          currentPrice: 0.28,
          value: 28,
          pnl: -7,
          pnlPercentage: -20,
          status: 'active'
        }
      ]

      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'buy',
          marketName: 'Will Bitcoin reach $100k by end of 2024?',
          outcome: 'Yes',
          shares: 150,
          price: 0.65,
          total: 97.5,
          timestamp: new Date('2024-01-15'),
          txHash: '5KJp7z2X...'
        },
        {
          id: '2',
          type: 'buy',
          marketName: 'US Presidential Election 2024',
          outcome: 'Democrat',
          shares: 200,
          price: 0.48,
          total: 96,
          timestamp: new Date('2024-01-10'),
          txHash: '3Hm9k1Y...'
        }
      ]

      setPositions(mockPositions)
      setTransactions(mockTransactions)

      // Calculate stats
      const totalValue = mockPositions.reduce((sum, pos) => sum + pos.value, 0)
      const totalPnl = mockPositions.reduce((sum, pos) => sum + pos.pnl, 0)
      const totalCost = mockPositions.reduce((sum, pos) => sum + (pos.shares * pos.avgPrice), 0)
      const totalPnlPercentage = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
      const activePositions = mockPositions.filter(pos => pos.status === 'active').length
      const resolvedPositions = mockPositions.filter(pos => pos.status === 'resolved').length
      const totalVolume = mockTransactions.reduce((sum, tx) => sum + tx.total, 0)

      setStats({
        totalValue,
        totalPnl,
        totalPnlPercentage,
        activePositions,
        resolvedPositions,
        totalVolume
      })

    } catch (error) {
      console.error('Error loading portfolio data:', error)
      toast.error('Failed to load portfolio data')
    } finally {
      setLoading(false)
    }
  }

  const handlePositionClick = (position: Position) => {
    setSelectedPosition(position)
    setShowPositionDialog(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <Wallet className="h-16 w-16 text-emerald-500" />
            <h1 className="text-3xl font-bold">Connect Your Wallet</h1>
            <p className="text-slate-400 text-center max-w-md">
              Connect your Solana wallet to view your prediction market portfolio and trading history.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
            <p className="text-slate-400">
              {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
            </p>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold flex items-center",
                stats.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"
              )}>
                {stats.totalPnl >= 0 ? <TrendingUp className="h-5 w-5 mr-1" /> : <TrendingDown className="h-5 w-5 mr-1" />}
                {formatCurrency(stats.totalPnl)}
              </div>
              <p className={cn(
                "text-sm",
                stats.totalPnlPercentage >= 0 ? "text-emerald-500" : "text-red-500"
              )}>
                {formatPercentage(stats.totalPnlPercentage)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activePositions}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="positions" className="data-[state=active]:bg-emerald-500">
              Positions
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-emerald-500">
              Transaction History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="positions" className="space-y-4">
            {positions.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Positions Yet</h3>
                  <p className="text-slate-400 mb-4">Start trading on prediction markets to see your positions here.</p>
                  <Button className="bg-emerald-500 hover:bg-emerald-600">
                    Explore Markets
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {positions.map((position) => (
                  <Card 
                    key={position.id} 
                    className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-750 transition-colors"
                    onClick={() => handlePositionClick(position)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{position.marketName}</h3>
                          <div className="flex items-center space-x-4 text-sm text-slate-400">
                            <span>Outcome: <Badge variant="outline" className="ml-1">{position.outcome}</Badge></span>
                            <span>{position.shares} shares</span>
                            <span>Avg: ${position.avgPrice.toFixed(3)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">{formatCurrency(position.value)}</div>
                          <div className={cn(
                            "text-sm flex items-center justify-end",
                            position.pnl >= 0 ? "text-emerald-500" : "text-red-500"
                          )}>
                            {position.pnl >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {formatCurrency(position.pnl)} ({formatPercentage(position.pnlPercentage)})
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 ml-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {transactions.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                  <p className="text-slate-400">Your trading history will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <Card key={transaction.id} className="bg-
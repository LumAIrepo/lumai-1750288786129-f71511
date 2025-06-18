```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronRight, User, Settings, Plus, Rocket, TrendingUp, Clock, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface PredictionMarket {
  id: string
  title: string
  description: string
  category: string
  endDate: Date
  totalVolume: number
  yesPrice: number
  noPrice: number
  participants: number
  status: 'active' | 'resolved' | 'pending'
  creator: string
}

interface LaunchFormData {
  title: string
  description: string
  category: string
  endDate: string
  initialLiquidity: number
  resolutionSource: string
}

const LaunchPage: React.FC = () => {
  const { publicKey, connected, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showLaunchDialog, setShowLaunchDialog] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>('create')
  const [recentMarkets, setRecentMarkets] = useState<PredictionMarket[]>([])
  const [formData, setFormData] = useState<LaunchFormData>({
    title: '',
    description: '',
    category: 'politics',
    endDate: '',
    initialLiquidity: 1,
    resolutionSource: ''
  })

  const categories = [
    'politics',
    'sports',
    'crypto',
    'entertainment',
    'technology',
    'economics'
  ]

  useEffect(() => {
    fetchRecentMarkets()
  }, [])

  const fetchRecentMarkets = async (): Promise<void> => {
    try {
      const mockMarkets: PredictionMarket[] = [
        {
          id: '1',
          title: 'Will Bitcoin reach $100k by end of 2024?',
          description: 'Prediction on Bitcoin price reaching $100,000 USD',
          category: 'crypto',
          endDate: new Date('2024-12-31'),
          totalVolume: 15420,
          yesPrice: 0.65,
          noPrice: 0.35,
          participants: 234,
          status: 'active',
          creator: 'user123'
        },
        {
          id: '2',
          title: 'Will Solana outperform Ethereum in 2024?',
          description: 'Performance comparison between SOL and ETH',
          category: 'crypto',
          endDate: new Date('2024-12-31'),
          totalVolume: 8930,
          yesPrice: 0.42,
          noPrice: 0.58,
          participants: 156,
          status: 'active',
          creator: 'trader456'
        }
      ]
      setRecentMarkets(mockMarkets)
    } catch (error) {
      console.error('Error fetching markets:', error)
      toast.error('Failed to load recent markets')
    }
  }

  const handleInputChange = (field: keyof LaunchFormData, value: string | number): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('Market title is required')
      return false
    }
    if (!formData.description.trim()) {
      toast.error('Market description is required')
      return false
    }
    if (!formData.endDate) {
      toast.error('End date is required')
      return false
    }
    if (new Date(formData.endDate) <= new Date()) {
      toast.error('End date must be in the future')
      return false
    }
    if (formData.initialLiquidity < 0.1) {
      toast.error('Minimum initial liquidity is 0.1 SOL')
      return false
    }
    return true
  }

  const handleLaunchMarket = async (): Promise<void> => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const transaction = new Transaction()
      
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey('11111111111111111111111111111112'),
        lamports: formData.initialLiquidity * LAMPORTS_PER_SOL
      })
      
      transaction.add(transferInstruction)
      
      if (signTransaction) {
        const signedTransaction = await signTransaction(transaction)
        const signature = await connection.sendRawTransaction(signedTransaction.serialize())
        await connection.confirmTransaction(signature)
        
        toast.success('Prediction market launched successfully!')
        setShowLaunchDialog(false)
        setFormData({
          title: '',
          description: '',
          category: 'politics',
          endDate: '',
          initialLiquidity: 1,
          resolutionSource: ''
        })
        fetchRecentMarkets()
      }
    } catch (error) {
      console.error('Error launching market:', error)
      toast.error('Failed to launch prediction market')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`
    }
    return `$${volume}`
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Launch Prediction Market</h1>
          <p className="text-slate-400 text-lg">Create and deploy your own prediction markets on Solana</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border-slate-700">
            <TabsTrigger value="create" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Create Market
            </TabsTrigger>
            <TabsTrigger value="recent" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Recent Markets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-emerald-500" />
                    Quick Launch
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() => setShowLaunchDialog(true)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                    disabled={!connected}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Launch New Market
                  </Button>
                  {!connected && (
                    <p className="text-sm text-slate-400 text-center">
                      Connect your wallet to launch markets
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-emerald-500" />
                    Market Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-slate-300">
                    <p className="mb-2">• Markets must have clear resolution criteria</p>
                    <p className="mb-2">• Minimum initial liquidity: 0.1 SOL</p>
                    <p className="mb-2">• End date must be at least 24 hours in future</p>
                    <p>• Creator fee: 2% of total volume</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentMarkets.map((market) => (
                <Card key={market.id} className="bg-slate-800 border-slate-700 hover:border-emerald-500 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        {market.category}
                      </Badge>
                      <Badge variant={market.status === 'active' ? 'default' : 'secondary'}>
                        {market.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-white text-lg leading-tight">
                      {market.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {market.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                        <div className="text-green-400 font-semibold">YES</div>
                        <div className="text-white font-bold">${market.yesPrice.toFixed(2)}</div>
                      </div>
                      <div className="text-center p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                        <div className="text-red-400 font-semibold">NO</div>
                        <div className="text-white font-bold">${market.noPrice.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatVolume(market.totalVolume)}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {market.participants}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-4 w-4" />
                        Ends {formatDate(market.endDate)}
                      </div>
                      <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300">
                        View <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Launch New Prediction Market</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">Market Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Will Bitcoin reach $100k by end of 2024?"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Provide clear resolution criteria and context..."
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-white">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-white">End Date</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate
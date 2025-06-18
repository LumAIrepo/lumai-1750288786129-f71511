```typescript
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Activity, Wallet } from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface TokenData {
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h: number
  marketCap: number
  supply: number
}

interface TradeOrder {
  type: 'buy' | 'sell'
  amount: number
  price: number
  total: number
}

interface ChartDataPoint {
  time: string
  price: number
  volume: number
}

const TradingInterface: React.FC = () => {
  const { connected, publicKey, connect, disconnect } = useWallet()
  const { connection } = useConnection()
  
  const [tokenData, setTokenData] = useState<TokenData>({
    symbol: 'PUMP',
    name: 'PumpToken',
    price: 0.00234,
    change24h: 15.67,
    volume24h: 1234567,
    marketCap: 2345678,
    supply: 1000000000
  })
  
  const [balance, setBalance] = useState<number>(0)
  const [tokenBalance, setTokenBalance] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const [tradeAmount, setTradeAmount] = useState<string>('')
  const [tradePrice, setTradePrice] = useState<string>(tokenData.price.toString())
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  
  const fetchBalance = useCallback(async () => {
    if (!connected || !publicKey || !connection) return
    
    try {
      const balance = await connection.getBalance(publicKey)
      setBalance(balance / LAMPORTS_PER_SOL)
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }, [connected, publicKey, connection])
  
  const generateMockChartData = useCallback(() => {
    const data: ChartDataPoint[] = []
    const basePrice = tokenData.price
    
    for (let i = 0; i < 24; i++) {
      const time = new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString()
      const priceVariation = (Math.random() - 0.5) * 0.0001
      const price = basePrice + priceVariation
      const volume = Math.random() * 100000
      
      data.push({ time, price, volume })
    }
    
    setChartData(data)
  }, [tokenData.price])
  
  useEffect(() => {
    if (connected) {
      fetchBalance()
    }
  }, [connected, fetchBalance])
  
  useEffect(() => {
    generateMockChartData()
    
    const interval = setInterval(() => {
      setTokenData(prev => ({
        ...prev,
        price: prev.price + (Math.random() - 0.5) * 0.0001,
        change24h: prev.change24h + (Math.random() - 0.5) * 2
      }))
    }, 5000)
    
    return () => clearInterval(interval)
  }, [generateMockChartData])
  
  const handleTrade = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first')
      return
    }
    
    if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    setIsLoading(true)
    
    try {
      const amount = parseFloat(tradeAmount)
      const price = parseFloat(tradePrice)
      const total = amount * price
      
      if (activeTab === 'buy' && total > balance) {
        toast.error('Insufficient SOL balance')
        return
      }
      
      if (activeTab === 'sell' && amount > tokenBalance) {
        toast.error('Insufficient token balance')
        return
      }
      
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (activeTab === 'buy') {
        setBalance(prev => prev - total)
        setTokenBalance(prev => prev + amount)
        toast.success(`Successfully bought ${amount} ${tokenData.symbol}`)
      } else {
        setBalance(prev => prev + total)
        setTokenBalance(prev => prev - amount)
        toast.success(`Successfully sold ${amount} ${tokenData.symbol}`)
      }
      
      setTradeAmount('')
    } catch (error) {
      toast.error('Transaction failed')
      console.error('Trade error:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const calculateTotal = () => {
    const amount = parseFloat(tradeAmount) || 0
    const price = parseFloat(tradePrice) || 0
    return (amount * price).toFixed(6)
  }
  
  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K'
    return num.toFixed(decimals)
  }
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tokenData.name}</h1>
              <p className="text-slate-400">{tokenData.symbol}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {connected ? (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                  <Wallet className="w-4 h-4 mr-1" />
                  {balance.toFixed(4)} SOL
                </Badge>
                <Button
                  onClick={disconnect}
                  variant="outline"
                  className="border-slate-600 hover:border-emerald-500"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={connect}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
        
        {/* Price Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Price</p>
                  <p className="text-2xl font-bold">${tokenData.price.toFixed(6)}</p>
                </div>
                <div className={cn(
                  "flex items-center space-x-1",
                  tokenData.change24h >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {tokenData.change24h >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {tokenData.change24h >= 0 ? '+' : ''}{tokenData.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className="text-slate-400 text-sm">24h Volume</p>
              <p className="text-xl font-bold">${formatNumber(tokenData.volume24h)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className="text-slate-400 text-sm">Market Cap</p>
              <p className="text-xl font-bold">${formatNumber(tokenData.marketCap)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className="text-slate-400 text-sm">Supply</p>
              <p className="text-xl font-bold">{formatNumber(tokenData.supply, 0)}</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Price Chart</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 flex items-center justify-center bg-slate-900 rounded-lg">
                  <div className="text-center">
                    <Activity className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400">Chart visualization would go here</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Current: ${tokenData.price.toFixed(6)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Trading Panel */}
          <div>
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>Trade {tokenData.symbol}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'buy' | 'sell')}>
                  <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                    <TabsTrigger 
                      value="buy" 
                      className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                    >
                      Buy
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sell" 
                      className="data-[state=active]:bg-red-500 data-[state=active]:text-white"
                    >
                      Sell
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="buy" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="buy-amount">Amount ({tokenData.symbol})</Label>
                      <Input
                        id="buy-amount"
                        type="number"
                        placeholder="0.00"
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="buy-price">Price (SOL)</Label>
                      <Input
                        id="buy-price"
                        type="number"
                        value={tradePrice}
                        onChange={(e) => setTradePrice(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    
                    <div className="bg-slate-700 p-3 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total:</span>
                        <span>{calculateTotal()} SOL</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-slate-400">Balance:</span>
                        <span>{balance.toFixed(4)} SOL</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleTrade}
                      disabled={!connected || isLoading}
                      className="w-full bg-emerald-500 hover:bg-emerald-600"
                    >
                      {isLoading ? 'Processing...' : `Buy ${tokenData.symbol}`}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="sell" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="sell-amount">Amount ({tokenData.symbol})</Label>
                      <Input
                        id="sell-amount"
                        type="number"
                        placeholder="0.00"
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="sell-price">Price (SOL)</Label>
                      <Input
                        id="sell-price"
                        type="number"
                        value={tradePrice}
                        onChange={(e) => setTradePrice(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    
                    <div className="bg-slate-700 p
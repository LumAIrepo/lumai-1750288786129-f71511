```typescript
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface BondingCurveData {
  supply: number
  price: number
  marketCap: number
  liquidity: number
}

interface ChartPoint {
  x: number
  y: number
  supply: number
  price: number
}

interface BondingCurveChartProps {
  tokenAddress?: string
  initialSupply?: number
  maxSupply?: number
  className?: string
}

const BondingCurveChart: React.FC<BondingCurveChartProps> = ({
  tokenAddress,
  initialSupply = 0,
  maxSupply = 1000000000,
  className
}) => {
  const [currentData, setCurrentData] = useState<BondingCurveData>({
    supply: initialSupply,
    price: 0.0001,
    marketCap: 0,
    liquidity: 0
  })
  const [simulationAmount, setSimulationAmount] = useState<string>('')
  const [simulationType, setSimulationType] = useState<'buy' | 'sell'>('buy')
  const [isLoading, setIsLoading] = useState(false)

  // Bonding curve formula: price = k * supply^2 where k is a constant
  const calculatePrice = (supply: number): number => {
    const k = 0.0000000001
    return k * Math.pow(supply, 2)
  }

  const calculateSupplyFromPrice = (price: number): number => {
    const k = 0.0000000001
    return Math.sqrt(price / k)
  }

  // Generate chart points for visualization
  const chartPoints = useMemo((): ChartPoint[] => {
    const points: ChartPoint[] = []
    const steps = 100
    const stepSize = maxSupply / steps

    for (let i = 0; i <= steps; i++) {
      const supply = i * stepSize
      const price = calculatePrice(supply)
      points.push({
        x: (supply / maxSupply) * 100,
        y: 100 - (price / calculatePrice(maxSupply)) * 100,
        supply,
        price
      })
    }

    return points
  }, [maxSupply])

  // Current position on curve
  const currentPosition = useMemo((): ChartPoint => {
    const x = (currentData.supply / maxSupply) * 100
    const maxPrice = calculatePrice(maxSupply)
    const y = 100 - (currentData.price / maxPrice) * 100
    
    return {
      x,
      y,
      supply: currentData.supply,
      price: currentData.price
    }
  }, [currentData, maxSupply])

  // Simulate trade impact
  const simulateTradeImpact = (amount: number, type: 'buy' | 'sell') => {
    if (type === 'buy') {
      const newSupply = currentData.supply + amount
      const newPrice = calculatePrice(newSupply)
      return {
        supply: newSupply,
        price: newPrice,
        marketCap: newSupply * newPrice,
        liquidity: currentData.liquidity + (amount * currentData.price)
      }
    } else {
      const newSupply = Math.max(0, currentData.supply - amount)
      const newPrice = calculatePrice(newSupply)
      return {
        supply: newSupply,
        price: newPrice,
        marketCap: newSupply * newPrice,
        liquidity: Math.max(0, currentData.liquidity - (amount * newPrice))
      }
    }
  }

  const simulatedData = useMemo(() => {
    const amount = parseFloat(simulationAmount)
    if (isNaN(amount) || amount <= 0) return null
    return simulateTradeImpact(amount, simulationType)
  }, [simulationAmount, simulationType, currentData])

  // Update market cap when supply or price changes
  useEffect(() => {
    setCurrentData(prev => ({
      ...prev,
      marketCap: prev.supply * prev.price
    }))
  }, [currentData.supply, currentData.price])

  // Mock data updates (in real app, this would come from blockchain)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        const randomChange = (Math.random() - 0.5) * 1000000
        const newSupply = Math.max(initialSupply, currentData.supply + randomChange)
        const newPrice = calculatePrice(newSupply)
        
        setCurrentData(prev => ({
          supply: newSupply,
          price: newPrice,
          marketCap: newSupply * newPrice,
          liquidity: prev.liquidity + Math.abs(randomChange) * 0.1
        }))
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [currentData.supply, initialSupply, isLoading])

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
    return num.toFixed(6)
  }

  const formatPrice = (price: number): string => {
    if (price < 0.000001) return price.toExponential(2)
    return price.toFixed(6)
  }

  const priceChange = simulatedData ? 
    ((simulatedData.price - currentData.price) / currentData.price) * 100 : 0

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Bonding Curve</h2>
          <p className="text-slate-400">Real-time price discovery mechanism</p>
        </div>
        <Badge variant="outline" className="border-emerald-500 text-emerald-400">
          <Activity className="w-4 h-4 mr-1" />
          Live
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Current Price</p>
                <p className="text-white font-bold text-lg">${formatPrice(currentData.price)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Supply</p>
                <p className="text-white font-bold text-lg">{formatNumber(currentData.supply)}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Market Cap</p>
                <p className="text-white font-bold text-lg">${formatNumber(currentData.marketCap)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Liquidity</p>
                <p className="text-white font-bold text-lg">${formatNumber(currentData.liquidity)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Price vs Supply Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-96 bg-slate-900 rounded-lg p-4">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              className="overflow-visible"
            >
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#374151" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />

              {/* Bonding curve */}
              <path
                d={`M ${chartPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                className="drop-shadow-lg"
              />

              {/* Current position */}
              <circle
                cx={currentPosition.x}
                cy={currentPosition.y}
                r="3"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
                className="animate-pulse"
              />

              {/* Simulated position */}
              {simulatedData && (
                <circle
                  cx={(simulatedData.supply / maxSupply) * 100}
                  cy={100 - (simulatedData.price / calculatePrice(maxSupply)) * 100}
                  r="2"
                  fill={simulationType === 'buy' ? "#22c55e" : "#ef4444"}
                  stroke="#ffffff"
                  strokeWidth="1"
                  opacity="0.8"
                />
              )}

              {/* Axes labels */}
              <text x="50" y="98" textAnchor="middle" fill="#9ca3af" fontSize="3">
                Supply
              </text>
              <text x="2" y="50" textAnchor="middle" fill="#9ca3af" fontSize="3" transform="rotate(-90 2 50)">
                Price
              </text>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Trade Simulator */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Trade Impact Simulator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-slate-300">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter token amount"
                value={simulationAmount}
                onChange={(e) => setSimulationAmount(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Action</Label>
              <div className="flex space-x-2">
                <Button
                  variant={simulationType === 'buy' ? 'default' : 'outline'}
                  onClick={() => setSimulationType('buy')}
                  className={cn(
                    "flex-1",
                    simulationType === 'buy' 
                      ? "bg-emerald-500 hover:bg-emerald-600" 
                      : "border-slate-600 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  Buy
                </Button>
                <Button
                  variant={simulationType === 'sell' ? 'default' : 'outline'}
                  onClick={() => setSimulationType('sell')}
                  className={cn(
                    "flex-1",
                    simulationType === 'sell' 
                      ? "bg-red-500 hover:bg-red-600" 
                      : "border-slate-600 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  Sell
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Price Impact</Label>
              <div className={cn(
                "p-3 rounded-lg border",
                priceChange > 0 
                  ? "bg-green-500/10 border-green-500/20 text-green-400" 
                  : priceChange < 0 
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-slate-700 border-slate-600 text-slate-300"
              )}>
                {simulatedData ? (
                  <div className="flex items-center">
                    {priceChange > 0 ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : priceChange < 0 ? (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    ) : null}
                    {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </div>
                ) : (
                  <span className="text-slate-500">Enter amount</span>
                )}
              </div>
            </div>
          </div>

          {simulatedData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
              <div>
                <p className="text-slate-400 text-sm">New Price</p>
                <p className="text-white font-semibold">${formatPrice(simulatedData.price)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">New Supply</p>
                <p className="text-white font-semibold">{formatNumber(simulatedData.supply)}</p>
              </div>
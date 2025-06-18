import React from "react"
```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface TokenCardProps {
  id: string
  name: string
  symbol: string
  description: string
  imageUrl?: string
  marketCap: number
  price: number
  priceChange24h: number
  volume24h: number
  holders: number
  createdAt: Date
  creator: string
  isVerified?: boolean
  tags?: string[]
  onClick?: (tokenId: string) => void
}

export default function TokenCard({
  id,
  name,
  symbol,
  description,
  imageUrl,
  marketCap,
  price,
  priceChange24h,
  volume24h,
  holders,
  createdAt,
  creator,
  isVerified = false,
  tags = [],
  onClick
}: TokenCardProps) {
  const [imageError, setImageError] = useState(false)

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const formatPrice = (price: number): string => {
    if (price < 0.01) return `$${price.toFixed(6)}`
    return `$${price.toFixed(4)}`
  }

  const handleCardClick = () => {
    if (onClick) {
      onClick(id)
    }
  }

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <Card 
      className="bg-slate-800 border-slate-700 hover:border-emerald-500/50 transition-all duration-200 cursor-pointer group"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {!imageError && imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`${name} logo`}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-lg">
                    {symbol.charAt(0)}
                  </span>
                </div>
              )}
              {isVerified && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-white text-lg font-semibold">
                {name}
              </CardTitle>
              <p className="text-slate-400 text-sm font-medium">${symbol}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-slate-300 text-sm line-clamp-2">
          {description}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide">Price</p>
            <p className="text-white font-semibold">{formatPrice(price)}</p>
            <p className={cn(
              "text-xs font-medium",
              priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide">Market Cap</p>
            <p className="text-white font-semibold">{formatNumber(marketCap)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide">Volume 24h</p>
            <p className="text-white font-semibold">{formatNumber(volume24h)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide">Holders</p>
            <p className="text-white font-semibold">{holders.toLocaleString()}</p>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index}
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge 
                variant="secondary"
                className="bg-slate-700 text-slate-400 border-slate-600 text-xs"
              >
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm">
              {creator.slice(0, 6)}...{creator.slice(-4)}
            </span>
          </div>
          <span className="text-slate-400 text-sm">
            {createdAt.toLocaleDateString()}
          </span>
        </div>

        <Button 
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          onClick={(e) => {
            e.stopPropagation()
            handleCardClick()
          }}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  )
}
```
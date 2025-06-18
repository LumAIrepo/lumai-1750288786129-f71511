import React from "react"
```typescript
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { toast } from 'sonner'

interface TradeParams {
  tokenAddress: string
  amount: number
  side: 'buy' | 'sell'
  slippage?: number
}

interface PriceData {
  price: number
  change24h: number
  volume24h: number
  marketCap: number
  lastUpdated: number
}

interface TradeResult {
  success: boolean
  signature?: string
  error?: string
  amountOut?: number
}

interface TradingState {
  isTrading: boolean
  prices: Record<string, PriceData>
  positions: Record<string, number>
  isLoadingPrices: boolean
  lastPriceUpdate: number
}

export const useTrading = () => {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  
  const [state, setState] = useState<TradingState>({
    isTrading: false,
    prices: {},
    positions: {},
    isLoadingPrices: false,
    lastPriceUpdate: 0
  })

  const updatePrice = useCallback((tokenAddress: string, priceData: PriceData) => {
    setState(prev => ({
      ...prev,
      prices: {
        ...prev.prices,
        [tokenAddress]: priceData
      },
      lastPriceUpdate: Date.now()
    }))
  }, [])

  const fetchPrice = useCallback(async (tokenAddress: string): Promise<PriceData | null> => {
    try {
      setState(prev => ({ ...prev, isLoadingPrices: true }))
      
      // Simulate price fetch - replace with actual API call
      const mockPrice: PriceData = {
        price: Math.random() * 100,
        change24h: (Math.random() - 0.5) * 20,
        volume24h: Math.random() * 1000000,
        marketCap: Math.random() * 10000000,
        lastUpdated: Date.now()
      }
      
      updatePrice(tokenAddress, mockPrice)
      return mockPrice
    } catch (error) {
      console.error('Failed to fetch price:', error)
      return null
    } finally {
      setState(prev => ({ ...prev, isLoadingPrices: false }))
    }
  }, [updatePrice])

  const executeTrade = useCallback(async (params: TradeParams): Promise<TradeResult> => {
    if (!publicKey || !signTransaction) {
      return {
        success: false,
        error: 'Wallet not connected'
      }
    }

    try {
      setState(prev => ({ ...prev, isTrading: true }))

      const tokenPubkey = new PublicKey(params.tokenAddress)
      
      // Create mock transaction - replace with actual trading logic
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: tokenPubkey,
          lamports: params.amount * LAMPORTS_PER_SOL
        })
      )

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signedTransaction = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
      
      await connection.confirmTransaction(signature, 'confirmed')

      // Update position
      setState(prev => ({
        ...prev,
        positions: {
          ...prev.positions,
          [params.tokenAddress]: (prev.positions[params.tokenAddress] || 0) + 
            (params.side === 'buy' ? params.amount : -params.amount)
        }
      }))

      toast.success(`${params.side === 'buy' ? 'Bought' : 'Sold'} ${params.amount} tokens`)

      return {
        success: true,
        signature,
        amountOut: params.amount
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Trade failed'
      toast.error(errorMessage)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setState(prev => ({ ...prev, isTrading: false }))
    }
  }, [publicKey, signTransaction, connection])

  const buyToken = useCallback(async (tokenAddress: string, amount: number, slippage = 1): Promise<TradeResult> => {
    return executeTrade({
      tokenAddress,
      amount,
      side: 'buy',
      slippage
    })
  }, [executeTrade])

  const sellToken = useCallback(async (tokenAddress: string, amount: number, slippage = 1): Promise<TradeResult> => {
    return executeTrade({
      tokenAddress,
      amount,
      side: 'sell',
      slippage
    })
  }, [executeTrade])

  const getPosition = useCallback((tokenAddress: string): number => {
    return state.positions[tokenAddress] || 0
  }, [state.positions])

  const getPrice = useCallback((tokenAddress: string): PriceData | null => {
    return state.prices[tokenAddress] || null
  }, [state.prices])

  const calculateSlippage = useCallback((amount: number, price: number, slippagePercent: number): number => {
    return (amount * price * slippagePercent) / 100
  }, [])

  const estimateGas = useCallback(async (params: TradeParams): Promise<number> => {
    try {
      // Mock gas estimation - replace with actual calculation
      return 0.001 * LAMPORTS_PER_SOL
    } catch (error) {
      console.error('Failed to estimate gas:', error)
      return 0.001 * LAMPORTS_PER_SOL
    }
  }, [])

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      Object.keys(state.prices).forEach(tokenAddress => {
        fetchPrice(tokenAddress)
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [state.prices, fetchPrice])

  return {
    // State
    isTrading: state.isTrading,
    prices: state.prices,
    positions: state.positions,
    isLoadingPrices: state.isLoadingPrices,
    lastPriceUpdate: state.lastPriceUpdate,
    
    // Actions
    buyToken,
    sellToken,
    executeTrade,
    fetchPrice,
    updatePrice,
    getPosition,
    getPrice,
    calculateSlippage,
    estimateGas
  }
}

export default useTrading
```
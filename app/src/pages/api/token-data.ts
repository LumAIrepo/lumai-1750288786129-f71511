import React from "react"
```typescript
import { NextApiRequest, NextApiResponse } from 'next'
import { Connection, PublicKey } from '@solana/web3.js'

interface TokenMetrics {
  price: number
  marketCap: number
  volume24h: number
  holders: number
  transactions24h: number
  priceChange24h: number
  liquidity: number
  fdv: number
}

interface TokenInfo {
  address: string
  name: string
  symbol: string
  decimals: number
  supply: number
  description?: string
  image?: string
  website?: string
  twitter?: string
  telegram?: string
}

interface PriceHistoryPoint {
  timestamp: number
  price: number
  volume: number
}

interface TokenDataResponse {
  success: boolean
  data?: {
    info: TokenInfo
    metrics: TokenMetrics
    priceHistory: PriceHistoryPoint[]
    topHolders: Array<{
      address: string
      balance: number
      percentage: number
    }>
  }
  error?: string
}

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
const connection = new Connection(SOLANA_RPC_URL, 'confirmed')

async function getTokenInfo(mintAddress: string): Promise<TokenInfo | null> {
  try {
    const mintPubkey = new PublicKey(mintAddress)
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey)
    
    if (!mintInfo.value || !mintInfo.value.data) {
      return null
    }

    const parsedData = mintInfo.value.data as any
    if (parsedData.program !== 'spl-token' || !parsedData.parsed) {
      return null
    }

    const tokenData = parsedData.parsed.info
    
    return {
      address: mintAddress,
      name: `Token ${mintAddress.slice(0, 8)}`,
      symbol: `TKN${mintAddress.slice(0, 4)}`,
      decimals: tokenData.decimals || 9,
      supply: parseInt(tokenData.supply) / Math.pow(10, tokenData.decimals || 9),
      description: 'Meme token on Solana',
      image: `https://via.placeholder.com/200x200/10b981/ffffff?text=${mintAddress.slice(0, 4)}`
    }
  } catch (error) {
    console.error('Error fetching token info:', error)
    return null
  }
}

async function getTokenMetrics(mintAddress: string): Promise<TokenMetrics> {
  const basePrice = Math.random() * 0.001 + 0.0001
  const volume = Math.random() * 100000 + 10000
  const holders = Math.floor(Math.random() * 5000) + 100
  const transactions = Math.floor(Math.random() * 1000) + 50
  const priceChange = (Math.random() - 0.5) * 200
  const supply = Math.random() * 1000000000 + 100000000
  
  return {
    price: basePrice,
    marketCap: basePrice * supply,
    volume24h: volume,
    holders: holders,
    transactions24h: transactions,
    priceChange24h: priceChange,
    liquidity: volume * 0.1,
    fdv: basePrice * supply
  }
}

async function getPriceHistory(mintAddress: string): Promise<PriceHistoryPoint[]> {
  const history: PriceHistoryPoint[] = []
  const now = Date.now()
  const basePrice = Math.random() * 0.001 + 0.0001
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = now - (i * 60 * 60 * 1000)
    const priceVariation = (Math.random() - 0.5) * 0.2
    const price = basePrice * (1 + priceVariation)
    const volume = Math.random() * 10000 + 1000
    
    history.push({
      timestamp,
      price: Math.max(price, 0.00001),
      volume
    })
  }
  
  return history
}

async function getTopHolders(mintAddress: string) {
  const holders = []
  const totalSupply = Math.random() * 1000000000 + 100000000
  
  for (let i = 0; i < 10; i++) {
    const balance = Math.random() * totalSupply * 0.1
    const percentage = (balance / totalSupply) * 100
    
    holders.push({
      address: PublicKey.unique().toString(),
      balance,
      percentage
    })
  }
  
  return holders.sort((a, b) => b.balance - a.balance)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenDataResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { address } = req.query

  if (!address || typeof address !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Token address is required'
    })
  }

  try {
    new PublicKey(address)
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid token address'
    })
  }

  try {
    const [tokenInfo, tokenMetrics, priceHistory, topHolders] = await Promise.all([
      getTokenInfo(address),
      getTokenMetrics(address),
      getPriceHistory(address),
      getTopHolders(address)
    ])

    if (!tokenInfo) {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        info: tokenInfo,
        metrics: tokenMetrics,
        priceHistory,
        topHolders
      }
    })
  } catch (error) {
    console.error('Error fetching token data:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}
```
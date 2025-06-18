```typescript
export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

export interface TokenStats {
  marketCap: number;
  volume24h: number;
  holders: number;
  totalSupply: number;
  circulatingSupply: number;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
}

export interface TokenSecurity {
  isVerified: boolean;
  hasLiquidity: boolean;
  liquidityLocked: boolean;
  mintDisabled: boolean;
  freezeDisabled: boolean;
  lpBurned: boolean;
  rugPullRisk: 'low' | 'medium' | 'high';
}

export interface TokenTrade {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  txHash: string;
  wallet: string;
  usdValue: number;
}

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  isContract: boolean;
}

export interface Token {
  id: string;
  address: string;
  metadata: TokenMetadata;
  stats: TokenStats;
  security: TokenSecurity;
  createdAt: number;
  updatedAt: number;
  creator: string;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
}

export interface TokenChart {
  timestamp: number;
  price: number;
  volume: number;
  marketCap: number;
}

export interface TokenComment {
  id: string;
  tokenId: string;
  author: string;
  content: string;
  timestamp: number;
  likes: number;
  replies: TokenComment[];
}

export interface CreateTokenRequest {
  name: string;
  symbol: string;
  description: string;
  image: File | string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  initialSupply: number;
  decimals: number;
}

export interface TokenFilter {
  sortBy: 'marketCap' | 'volume' | 'created' | 'price' | 'holders';
  sortOrder: 'asc' | 'desc';
  minMarketCap?: number;
  maxMarketCap?: number;
  minVolume?: number;
  maxVolume?: number;
  verified?: boolean;
  tags?: string[];
  search?: string;
}

export interface TokenPagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TokenResponse {
  tokens: Token[];
  pagination: TokenPagination;
}

export interface TokenDetailResponse {
  token: Token;
  trades: TokenTrade[];
  holders: TokenHolder[];
  chart: TokenChart[];
  comments: TokenComment[];
}

export type TokenStatus = 'active' | 'inactive' | 'pending' | 'failed';

export type TokenCategory = 'meme' | 'utility' | 'defi' | 'nft' | 'gaming' | 'ai' | 'other';

export interface TokenLaunch {
  id: string;
  tokenId: string;
  launchDate: number;
  softCap: number;
  hardCap: number;
  raised: number;
  participants: number;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  presalePrice: number;
  listingPrice: number;
}
```
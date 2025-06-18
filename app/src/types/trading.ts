```typescript
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  totalSupply: number;
  marketCap: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  holders: number;
  createdAt: Date;
  creator: string;
  verified: boolean;
  tags: string[];
}

export interface TradeOrder {
  id: string;
  tokenAddress: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  timestamp: Date;
  txHash?: string;
  user: string;
  slippage: number;
  gasPrice: number;
  gasUsed?: number;
}

export interface TradingPair {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  price: number;
  priceChange24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  liquidity: number;
  spread: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastUpdated: Date;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  count: number;
}

export interface TradeHistory {
  id: string;
  tokenAddress: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  timestamp: Date;
  txHash: string;
  buyer: string;
  seller: string;
  gasUsed: number;
  gasPrice: number;
}

export interface Portfolio {
  totalValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  positions: Position[];
  orders: TradeOrder[];
  history: TradeHistory[];
}

export interface Position {
  tokenAddress: string;
  token: TokenInfo;
  amount: number;
  averagePrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercentage: number;
  allocation: number;
}

export interface TradingSettings {
  slippage: number;
  gasPrice: 'slow' | 'standard' | 'fast' | 'custom';
  customGasPrice?: number;
  autoApprove: boolean;
  soundEnabled: boolean;
  notifications: boolean;
  defaultTradeAmount: number;
  maxSlippage: number;
  minLiquidity: number;
}

export interface PriceAlert {
  id: string;
  tokenAddress: string;
  token: TokenInfo;
  type: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  enabled: boolean;
  triggered: boolean;
  createdAt: Date;
  triggeredAt?: Date;
  user: string;
}

export interface TradingStats {
  totalTrades: number;
  totalVolume: number;
  totalPnl: number;
  totalPnlPercentage: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  totalFees: number;
  activeDays: number;
}

export interface MarketData {
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  transactions24h: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
}

export interface ChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface SwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  price: number;
  priceImpact: number;
  slippage: number;
  fee: number;
  route: string[];
  estimatedGas: number;
  validUntil: Date;
}

export interface LiquidityPool {
  address: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  reserveA: number;
  reserveB: number;
  totalLiquidity: number;
  apr: number;
  volume24h: number;
  fees24h: number;
  createdAt: Date;
}

export type TradeType = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'failed';
export type GasSpeed = 'slow' | 'standard' | 'fast' | 'custom';
export type AlertType = 'above' | 'below';
export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
```
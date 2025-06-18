```typescript
import { PublicKey } from '@solana/web3.js'

// Program IDs
export const PROGRAM_ID = new PublicKey('11111111111111111111111111111112')
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111112')
export const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111')

// Pump.fun specific constants
export const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
export const PUMP_FUN_AUTHORITY = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1')
export const PUMP_FUN_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV2AbicfhtW4xC9iM')

// Token constants
export const TOKEN_DECIMALS = 6
export const INITIAL_SUPPLY = 1_000_000_000
export const INITIAL_VIRTUAL_TOKEN_RESERVES = 1_073_000_000
export const INITIAL_VIRTUAL_SOL_RESERVES = 30_000_000_000
export const INITIAL_REAL_TOKEN_RESERVES = 793_100_000

// Fee constants
export const FEE_BASIS_POINTS = 100 // 1%
export const PLATFORM_FEE_BASIS_POINTS = 100 // 1%

// Network configuration
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
export const COMMITMENT = 'confirmed'

// UI constants
export const MAX_NAME_LENGTH = 32
export const MAX_SYMBOL_LENGTH = 10
export const MAX_DESCRIPTION_LENGTH = 500
export const MAX_FILE_SIZE = 1024 * 1024 // 1MB

// Bonding curve constants
export const BONDING_CURVE_SEED = 'bonding-curve'
export const METADATA_SEED = 'metadata'
export const MINT_AUTHORITY_SEED = 'mint-authority'

// Transaction constants
export const MAX_RETRIES = 3
export const RETRY_DELAY = 1000
export const TRANSACTION_TIMEOUT = 30000

// Price constants
export const MIN_SOL_AMOUNT = 0.0001
export const MAX_SOL_AMOUNT = 1000
export const SLIPPAGE_TOLERANCE = 0.01 // 1%

// API endpoints
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'
export const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'

// Social links
export const TWITTER_BASE_URL = 'https://twitter.com/'
export const TELEGRAM_BASE_URL = 'https://t.me/'
export const WEBSITE_BASE_URL = 'https://'

// Chart configuration
export const CHART_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
export const DEFAULT_CHART_INTERVAL = '15m'

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Cache durations (in milliseconds)
export const CACHE_DURATION_SHORT = 30 * 1000 // 30 seconds
export const CACHE_DURATION_MEDIUM = 5 * 60 * 1000 // 5 minutes
export const CACHE_DURATION_LONG = 30 * 60 * 1000 // 30 minutes

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  TRANSACTION_FAILED: 'Transaction failed',
  INVALID_AMOUNT: 'Invalid amount',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ERROR: 'An unknown error occurred'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  TOKEN_CREATED: 'Token created successfully',
  TRANSACTION_CONFIRMED: 'Transaction confirmed',
  WALLET_CONNECTED: 'Wallet connected successfully'
} as const

// Local storage keys
export const STORAGE_KEYS = {
  WALLET_PREFERENCE: 'wallet-preference',
  THEME_PREFERENCE: 'theme-preference',
  RECENT_TOKENS: 'recent-tokens'
} as const
```
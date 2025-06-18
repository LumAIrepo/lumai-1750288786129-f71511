import React from "react"
```typescript
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { WalletAdapter } from '@solana/wallet-adapter-base'

export interface WalletInfo {
  publicKey: PublicKey | null
  connected: boolean
  balance: number
}

export interface TransactionResult {
  signature: string
  success: boolean
  error?: string
}

export class WalletUtils {
  private connection: Connection
  
  constructor(connection: Connection) {
    this.connection = connection
  }

  async getWalletInfo(wallet: WalletAdapter): Promise<WalletInfo> {
    try {
      if (!wallet.publicKey) {
        return {
          publicKey: null,
          connected: false,
          balance: 0
        }
      }

      const balance = await this.connection.getBalance(wallet.publicKey)
      
      return {
        publicKey: wallet.publicKey,
        connected: wallet.connected,
        balance: balance / LAMPORTS_PER_SOL
      }
    } catch (error) {
      console.error('Error getting wallet info:', error)
      return {
        publicKey: wallet.publicKey,
        connected: wallet.connected,
        balance: 0
      }
    }
  }

  async sendTransaction(
    wallet: WalletAdapter,
    transaction: Transaction
  ): Promise<TransactionResult> {
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected or does not support signing')
      }

      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = wallet.publicKey

      const signedTransaction = await wallet.signTransaction(transaction)
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize()
      )

      await this.connection.confirmTransaction(signature, 'confirmed')

      return {
        signature,
        success: true
      }
    } catch (error) {
      console.error('Transaction failed:', error)
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async sendSOL(
    wallet: WalletAdapter,
    toPublicKey: PublicKey,
    amount: number
  ): Promise<TransactionResult> {
    try {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected')
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: toPublicKey,
          lamports: amount * LAMPORTS_PER_SOL
        })
      )

      return await this.sendTransaction(wallet, transaction)
    } catch (error) {
      console.error('SOL transfer failed:', error)
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getTokenBalance(
    publicKey: PublicKey,
    mintAddress: PublicKey
  ): Promise<number> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: mintAddress }
      )

      if (tokenAccounts.value.length === 0) {
        return 0
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount
      return balance || 0
    } catch (error) {
      console.error('Error getting token balance:', error)
      return 0
    }
  }

  formatPublicKey(publicKey: PublicKey | null, length: number = 8): string {
    if (!publicKey) return ''
    const key = publicKey.toString()
    return `${key.slice(0, length)}...${key.slice(-length)}`
  }

  validatePublicKey(address: string): boolean {
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  async airdropSOL(publicKey: PublicKey, amount: number = 1): Promise<TransactionResult> {
    try {
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      )

      await this.connection.confirmTransaction(signature, 'confirmed')

      return {
        signature,
        success: true
      }
    } catch (error) {
      console.error('Airdrop failed:', error)
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Airdrop failed'
      }
    }
  }
}

export const createWalletUtils = (connection: Connection): WalletUtils => {
  return new WalletUtils(connection)
}

export const WALLET_ERRORS = {
  NOT_CONNECTED: 'Wallet not connected',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  TRANSACTION_FAILED: 'Transaction failed',
  INVALID_ADDRESS: 'Invalid wallet address',
  NETWORK_ERROR: 'Network error'
} as const

export type WalletError = typeof WALLET_ERRORS[keyof typeof WALLET_ERRORS]
```
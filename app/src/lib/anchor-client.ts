import React from "react"
```typescript
import { AnchorProvider, Program, Wallet, web3 } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

export interface PredictionMarketIDL {
  version: string;
  name: string;
  instructions: any[];
  accounts: any[];
  types: any[];
}

export interface MarketAccount {
  authority: PublicKey;
  question: string;
  description: string;
  endTime: number;
  resolved: boolean;
  outcome: number | null;
  totalYesShares: number;
  totalNoShares: number;
  yesPrice: number;
  noPrice: number;
  bump: number;
}

export interface UserPositionAccount {
  user: PublicKey;
  market: PublicKey;
  yesShares: number;
  noShares: number;
  bump: number;
}

export interface AnchorClientConfig {
  connection: Connection;
  wallet: Wallet;
  programId: PublicKey;
  idl: PredictionMarketIDL;
}

export class AnchorClient {
  private provider: AnchorProvider;
  private program: Program;
  private connection: Connection;
  private wallet: Wallet;

  constructor(config: AnchorClientConfig) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.provider = new AnchorProvider(
      config.connection,
      config.wallet,
      AnchorProvider.defaultOptions()
    );
    this.program = new Program(config.idl, config.programId, this.provider);
  }

  async createMarket(
    question: string,
    description: string,
    endTime: number
  ): Promise<{ signature: string; marketPda: PublicKey }> {
    try {
      const marketKeypair = Keypair.generate();
      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), marketKeypair.publicKey.toBuffer()],
        this.program.programId
      );

      const tx = await this.program.methods
        .createMarket(question, description, new web3.BN(endTime))
        .accounts({
          market: marketPda,
          authority: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx, marketPda };
    } catch (error) {
      throw new Error(`Failed to create market: ${error}`);
    }
  }

  async buyShares(
    marketPda: PublicKey,
    isYes: boolean,
    amount: number
  ): Promise<string> {
    try {
      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('user_position'),
          this.wallet.publicKey.toBuffer(),
          marketPda.toBuffer(),
        ],
        this.program.programId
      );

      const tx = await this.program.methods
        .buyShares(isYes, new web3.BN(amount))
        .accounts({
          market: marketPda,
          userPosition: userPositionPda,
          user: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      throw new Error(`Failed to buy shares: ${error}`);
    }
  }

  async sellShares(
    marketPda: PublicKey,
    isYes: boolean,
    amount: number
  ): Promise<string> {
    try {
      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('user_position'),
          this.wallet.publicKey.toBuffer(),
          marketPda.toBuffer(),
        ],
        this.program.programId
      );

      const tx = await this.program.methods
        .sellShares(isYes, new web3.BN(amount))
        .accounts({
          market: marketPda,
          userPosition: userPositionPda,
          user: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      throw new Error(`Failed to sell shares: ${error}`);
    }
  }

  async resolveMarket(marketPda: PublicKey, outcome: boolean): Promise<string> {
    try {
      const tx = await this.program.methods
        .resolveMarket(outcome)
        .accounts({
          market: marketPda,
          authority: this.wallet.publicKey,
        })
        .rpc();

      return tx;
    } catch (error) {
      throw new Error(`Failed to resolve market: ${error}`);
    }
  }

  async claimWinnings(marketPda: PublicKey): Promise<string> {
    try {
      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('user_position'),
          this.wallet.publicKey.toBuffer(),
          marketPda.toBuffer(),
        ],
        this.program.programId
      );

      const tx = await this.program.methods
        .claimWinnings()
        .accounts({
          market: marketPda,
          userPosition: userPositionPda,
          user: this.wallet.publicKey,
        })
        .rpc();

      return tx;
    } catch (error) {
      throw new Error(`Failed to claim winnings: ${error}`);
    }
  }

  async getMarket(marketPda: PublicKey): Promise<MarketAccount | null> {
    try {
      const marketAccount = await this.program.account.market.fetch(marketPda);
      return marketAccount as MarketAccount;
    } catch (error) {
      console.error('Failed to fetch market:', error);
      return null;
    }
  }

  async getUserPosition(
    userPubkey: PublicKey,
    marketPda: PublicKey
  ): Promise<UserPositionAccount | null> {
    try {
      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('user_position'),
          userPubkey.toBuffer(),
          marketPda.toBuffer(),
        ],
        this.program.programId
      );

      const userPositionAccount = await this.program.account.userPosition.fetch(
        userPositionPda
      );
      return userPositionAccount as UserPositionAccount;
    } catch (error) {
      console.error('Failed to fetch user position:', error);
      return null;
    }
  }

  async getAllMarkets(): Promise<MarketAccount[]> {
    try {
      const markets = await this.program.account.market.all();
      return markets.map((market) => market.account as MarketAccount);
    } catch (error) {
      console.error('Failed to fetch all markets:', error);
      return [];
    }
  }

  async getUserPositions(userPubkey: PublicKey): Promise<UserPositionAccount[]> {
    try {
      const positions = await this.program.account.userPosition.all([
        {
          memcmp: {
            offset: 8,
            bytes: userPubkey.toBase58(),
          },
        },
      ]);
      return positions.map((position) => position.account as UserPositionAccount);
    } catch (error) {
      console.error('Failed to fetch user positions:', error);
      return [];
    }
  }

  calculateSharePrice(totalYesShares: number, totalNoShares: number, isYes: boolean): number {
    const total = totalYesShares + totalNoShares;
    if (total === 0) return 0.5;
    
    if (isYes) {
      return totalYesShares / total;
    } else {
      return totalNoShares / total;
    }
  }

  calculatePotentialPayout(
    shares: number,
    currentPrice: number,
    isWinning: boolean
  ): number {
    if (!isWinning) return 0;
    return shares / currentPrice;
  }

  getMarketPda(marketKeypair: PublicKey): PublicKey {
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), marketKeypair.toBuffer()],
      this.program.programId
    );
    return marketPda;
  }

  getUserPositionPda(userPubkey: PublicKey, marketPda: PublicKey): PublicKey {
    const [userPositionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('user_position'),
        userPubkey.toBuffer(),
        marketPda.toBuffer(),
      ],
      this.program.programId
    );
    return userPositionPda;
  }
}

export const createAnchorClient = (config: AnchorClientConfig): AnchorClient => {
  return new AnchorClient(config);
};

export default AnchorClient;
```
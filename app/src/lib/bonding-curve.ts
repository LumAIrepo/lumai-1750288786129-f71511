import React from "react"
```typescript
import { PublicKey } from "@solana/web3.js";

export interface BondingCurveConfig {
  initialPrice: number;
  k: number;
  maxSupply: number;
  reserveRatio: number;
}

export interface TokenMetrics {
  currentSupply: number;
  currentPrice: number;
  marketCap: number;
  totalReserve: number;
  priceImpact: number;
}

export interface TradeCalculation {
  inputAmount: number;
  outputAmount: number;
  priceAfter: number;
  priceImpact: number;
  slippage: number;
  fee: number;
  netAmount: number;
}

export class BondingCurve {
  private config: BondingCurveConfig;
  private feeRate: number;

  constructor(config: BondingCurveConfig, feeRate: number = 0.01) {
    this.config = config;
    this.feeRate = feeRate;
  }

  calculatePrice(supply: number): number {
    if (supply <= 0) return this.config.initialPrice;
    if (supply >= this.config.maxSupply) return this.getMaxPrice();
    
    return this.config.initialPrice * Math.pow(supply / this.config.maxSupply, this.config.k);
  }

  calculateSupplyFromPrice(price: number): number {
    if (price <= this.config.initialPrice) return 0;
    
    const ratio = price / this.config.initialPrice;
    return this.config.maxSupply * Math.pow(ratio, 1 / this.config.k);
  }

  calculateBuyAmount(solAmount: number, currentSupply: number): TradeCalculation {
    const fee = solAmount * this.feeRate;
    const netSolAmount = solAmount - fee;
    
    const currentPrice = this.calculatePrice(currentSupply);
    const integral = this.calculateIntegral(currentSupply, netSolAmount);
    const newSupply = this.solveForSupply(currentSupply, integral);
    const tokensOut = newSupply - currentSupply;
    const newPrice = this.calculatePrice(newSupply);
    
    const priceImpact = ((newPrice - currentPrice) / currentPrice) * 100;
    const avgPrice = netSolAmount / tokensOut;
    const slippage = ((avgPrice - currentPrice) / currentPrice) * 100;

    return {
      inputAmount: solAmount,
      outputAmount: tokensOut,
      priceAfter: newPrice,
      priceImpact,
      slippage,
      fee,
      netAmount: tokensOut
    };
  }

  calculateSellAmount(tokenAmount: number, currentSupply: number): TradeCalculation {
    if (tokenAmount >= currentSupply) {
      throw new Error("Cannot sell more tokens than current supply");
    }

    const currentPrice = this.calculatePrice(currentSupply);
    const newSupply = currentSupply - tokenAmount;
    const newPrice = this.calculatePrice(newSupply);
    
    const integral = this.calculateIntegral(newSupply, 0) - this.calculateIntegral(currentSupply, 0);
    const solOut = Math.abs(integral);
    const fee = solOut * this.feeRate;
    const netSolOut = solOut - fee;
    
    const priceImpact = ((currentPrice - newPrice) / currentPrice) * 100;
    const avgPrice = solOut / tokenAmount;
    const slippage = ((currentPrice - avgPrice) / currentPrice) * 100;

    return {
      inputAmount: tokenAmount,
      outputAmount: netSolOut,
      priceAfter: newPrice,
      priceImpact,
      slippage,
      fee,
      netAmount: netSolOut
    };
  }

  private calculateIntegral(supply: number, solAmount: number): number {
    const { initialPrice, k, maxSupply } = this.config;
    
    if (k === 1) {
      return initialPrice * supply * Math.log(supply / maxSupply + 1);
    }
    
    const exponent = k + 1;
    return (initialPrice * maxSupply / exponent) * Math.pow(supply / maxSupply, exponent);
  }

  private solveForSupply(currentSupply: number, targetIntegral: number): number {
    let low = currentSupply;
    let high = this.config.maxSupply;
    const tolerance = 1e-10;
    
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const integral = this.calculateIntegral(mid, 0) - this.calculateIntegral(currentSupply, 0);
      
      if (Math.abs(integral - targetIntegral) < tolerance) {
        return mid;
      }
      
      if (integral < targetIntegral) {
        low = mid;
      } else {
        high = mid;
      }
    }
    
    return (low + high) / 2;
  }

  getMaxPrice(): number {
    return this.config.initialPrice * Math.pow(1, this.config.k);
  }

  getTokenMetrics(currentSupply: number): TokenMetrics {
    const currentPrice = this.calculatePrice(currentSupply);
    const marketCap = currentSupply * currentPrice;
    const totalReserve = this.calculateIntegral(currentSupply, 0);
    
    return {
      currentSupply,
      currentPrice,
      marketCap,
      totalReserve,
      priceImpact: 0
    };
  }

  validateTrade(amount: number, isBuy: boolean, currentSupply: number): boolean {
    if (amount <= 0) return false;
    
    if (isBuy) {
      const calculation = this.calculateBuyAmount(amount, currentSupply);
      return calculation.outputAmount > 0 && currentSupply + calculation.outputAmount <= this.config.maxSupply;
    } else {
      return amount <= currentSupply;
    }
  }

  calculateMinimumOutput(solAmount: number, currentSupply: number, slippageTolerance: number): number {
    const calculation = this.calculateBuyAmount(solAmount, currentSupply);
    return calculation.outputAmount * (1 - slippageTolerance / 100);
  }

  calculateMaximumInput(tokenAmount: number, currentSupply: number, slippageTolerance: number): number {
    const calculation = this.calculateSellAmount(tokenAmount, currentSupply);
    return calculation.outputAmount * (1 + slippageTolerance / 100);
  }
}

export const DEFAULT_BONDING_CURVE_CONFIG: BondingCurveConfig = {
  initialPrice: 0.0001,
  k: 2,
  maxSupply: 1000000000,
  reserveRatio: 0.1
};

export function createBondingCurve(config?: Partial<BondingCurveConfig>): BondingCurve {
  const fullConfig = { ...DEFAULT_BONDING_CURVE_CONFIG, ...config };
  return new BondingCurve(fullConfig);
}

export function formatPrice(price: number): string {
  if (price < 0.000001) {
    return price.toExponential(2);
  }
  if (price < 0.01) {
    return price.toFixed(6);
  }
  if (price < 1) {
    return price.toFixed(4);
  }
  return price.toFixed(2);
}

export function formatTokenAmount(amount: number): string {
  if (amount >= 1000000000) {
    return (amount / 1000000000).toFixed(2) + 'B';
  }
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(2) + 'M';
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(2) + 'K';
  }
  return amount.toFixed(2);
}

export function calculatePriceImpactColor(impact: number): string {
  if (impact < 1) return 'text-emerald-500';
  if (impact < 5) return 'text-yellow-500';
  if (impact < 10) return 'text-orange-500';
  return 'text-red-500';
}

export function validateBondingCurveConfig(config: BondingCurveConfig): boolean {
  return (
    config.initialPrice > 0 &&
    config.k > 0 &&
    config.maxSupply > 0 &&
    config.reserveRatio > 0 &&
    config.reserveRatio <= 1
  );
}
```
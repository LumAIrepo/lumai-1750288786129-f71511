import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add other utility functions here as needed
export const formatLamports = (lamports: number | bigint, decimals: number = 9): string => {
  const num = typeof lamports === 'bigint' ? BigInt(lamports) : lamports;
  const divisor = BigInt(10 ** decimals);
  const sol = Number(num / divisor);
  return sol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: decimals });
};

export const shortAddress = (address: string | undefined, chars: number = 4): string => {
  if (!address) return "";
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
};
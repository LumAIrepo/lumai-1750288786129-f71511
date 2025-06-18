import React from "react"
```typescript
import { PublicKey } from "@solana/web3.js";

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  decimals: number;
  supply: number;
  creator: string;
  createdAt: number;
  tags?: string[];
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface UploadImageResponse {
  url: string;
  hash: string;
  size: number;
}

export interface CreateTokenMetadataParams {
  name: string;
  symbol: string;
  description: string;
  imageFile: File;
  decimals?: number;
  supply?: number;
  website?: string;
  twitter?: string;
  telegram?: string;
  tags?: string[];
}

export interface TokenMetadataValidation {
  isValid: boolean;
  errors: string[];
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_NAME_LENGTH = 32;
const MAX_SYMBOL_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;

export function validateTokenMetadata(params: CreateTokenMetadataParams): TokenMetadataValidation {
  const errors: string[] = [];

  if (!params.name || params.name.trim().length === 0) {
    errors.push('Token name is required');
  } else if (params.name.length > MAX_NAME_LENGTH) {
    errors.push(`Token name must be ${MAX_NAME_LENGTH} characters or less`);
  }

  if (!params.symbol || params.symbol.trim().length === 0) {
    errors.push('Token symbol is required');
  } else if (params.symbol.length > MAX_SYMBOL_LENGTH) {
    errors.push(`Token symbol must be ${MAX_SYMBOL_LENGTH} characters or less`);
  } else if (!/^[A-Z0-9]+$/.test(params.symbol)) {
    errors.push('Token symbol must contain only uppercase letters and numbers');
  }

  if (!params.description || params.description.trim().length === 0) {
    errors.push('Token description is required');
  } else if (params.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Token description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
  }

  if (!params.imageFile) {
    errors.push('Token image is required');
  } else {
    if (!ALLOWED_IMAGE_TYPES.includes(params.imageFile.type)) {
      errors.push('Image must be JPEG, PNG, GIF, or WebP format');
    }
    if (params.imageFile.size > MAX_IMAGE_SIZE) {
      errors.push('Image size must be 5MB or less');
    }
  }

  if (params.decimals !== undefined && (params.decimals < 0 || params.decimals > 9)) {
    errors.push('Decimals must be between 0 and 9');
  }

  if (params.supply !== undefined && params.supply <= 0) {
    errors.push('Supply must be greater than 0');
  }

  if (params.website && !isValidUrl(params.website)) {
    errors.push('Website URL is not valid');
  }

  if (params.twitter && !isValidTwitterHandle(params.twitter)) {
    errors.push('Twitter handle is not valid');
  }

  if (params.telegram && !isValidTelegramHandle(params.telegram)) {
    errors.push('Telegram handle is not valid');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function uploadTokenImage(file: File): Promise<UploadImageResponse> {
  try {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Invalid file type');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error('File size too large');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload image');
    }

    const data = await response.json();
    
    if (!data.url) {
      throw new Error('Invalid response from upload service');
    }

    return {
      url: data.url,
      hash: data.hash || '',
      size: file.size
    };
  } catch (error) {
    console.error('Image upload error:', error);
    throw error instanceof Error ? error : new Error('Failed to upload image');
  }
}

export async function createTokenMetadata(params: CreateTokenMetadataParams, creator: PublicKey): Promise<TokenMetadata> {
  try {
    const validation = validateTokenMetadata(params);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const imageUpload = await uploadTokenImage(params.imageFile);

    const metadata: TokenMetadata = {
      name: params.name.trim(),
      symbol: params.symbol.trim().toUpperCase(),
      description: params.description.trim(),
      image: imageUpload.url,
      decimals: params.decimals || 9,
      supply: params.supply || 1000000000,
      creator: creator.toString(),
      createdAt: Date.now(),
      tags: params.tags?.filter(tag => tag.trim().length > 0) || [],
      website: params.website?.trim() || undefined,
      twitter: params.twitter?.trim() || undefined,
      telegram: params.telegram?.trim() || undefined,
    };

    return metadata;
  } catch (error) {
    console.error('Create token metadata error:', error);
    throw error instanceof Error ? error : new Error('Failed to create token metadata');
  }
}

export async function uploadMetadataToIPFS(metadata: TokenMetadata): Promise<string> {
  try {
    const response = await fetch('/api/upload-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload metadata');
    }

    const data = await response.json();
    
    if (!data.uri) {
      throw new Error('Invalid response from metadata upload service');
    }

    return data.uri;
  } catch (error) {
    console.error('Metadata upload error:', error);
    throw error instanceof Error ? error : new Error('Failed to upload metadata to IPFS');
  }
}

export function generateTokenSymbol(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, MAX_SYMBOL_LENGTH);
}

export function formatTokenSupply(supply: number): string {
  if (supply >= 1e9) {
    return `${(supply / 1e9).toFixed(1)}B`;
  } else if (supply >= 1e6) {
    return `${(supply / 1e6).toFixed(1)}M`;
  } else if (supply >= 1e3) {
    return `${(supply / 1e3).toFixed(1)}K`;
  }
  return supply.toString();
}

export function isValidTokenName(name: string): boolean {
  return name.trim().length > 0 && name.length <= MAX_NAME_LENGTH;
}

export function isValidTokenSymbol(symbol: string): boolean {
  return /^[A-Z0-9]{1,10}$/.test(symbol);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidTwitterHandle(handle: string): boolean {
  const cleanHandle = handle.replace('@', '');
  return /^[A-Za-z0-9_]{1,15}$/.test(cleanHandle);
}

function isValidTelegramHandle(handle: string): boolean {
  const cleanHandle = handle.replace('@', '');
  return /^[A-Za-z0-9_]{5,32}$/.test(cleanHandle);
}

export function getTokenMetadataFromUri(uri: string): Promise<TokenMetadata> {
  return fetch(uri)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch metadata');
      }
      return response.json();
    })
    .catch(error => {
      console.error('Fetch metadata error:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch token metadata');
    });
}

export function sanitizeTokenInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export const TOKEN_METADATA_DEFAULTS = {
  decimals: 9,
  supply: 1000000000,
  tags: [] as string[],
} as const;
```
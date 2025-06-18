import React from "react"
```typescript
'use client'

import { useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronRight, User, Settings, Plus, Upload, Image, DollarSign, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TokenMetadata {
  name: string
  symbol: string
  description: string
  image: File | null
  website: string
  twitter: string
  telegram: string
}

interface LaunchConfig {
  initialSupply: string
  initialPrice: string
  liquidityAmount: string
  marketCapTarget: string
}

interface FormErrors {
  name?: string
  symbol?: string
  description?: string
  image?: string
  initialSupply?: string
  initialPrice?: string
  liquidityAmount?: string
}

export default function TokenLaunchForm() {
  const { publicKey, connected, signTransaction } = useWallet()
  const { connection } = useConnection()
  
  const [activeTab, setActiveTab] = useState<string>('metadata')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showPreview, setShowPreview] = useState<boolean>(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  const [metadata, setMetadata] = useState<TokenMetadata>({
    name: '',
    symbol: '',
    description: '',
    image: null,
    website: '',
    twitter: '',
    telegram: ''
  })
  
  const [launchConfig, setLaunchConfig] = useState<LaunchConfig>({
    initialSupply: '1000000000',
    initialPrice: '0.0001',
    liquidityAmount: '5',
    marketCapTarget: '100000'
  })
  
  const [errors, setErrors] = useState<FormErrors>({})

  const validateMetadata = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    
    if (!metadata.name.trim()) {
      newErrors.name = 'Token name is required'
    } else if (metadata.name.length > 32) {
      newErrors.name = 'Token name must be 32 characters or less'
    }
    
    if (!metadata.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required'
    } else if (metadata.symbol.length > 10) {
      newErrors.symbol = 'Token symbol must be 10 characters or less'
    } else if (!/^[A-Z0-9]+$/.test(metadata.symbol)) {
      newErrors.symbol = 'Token symbol must contain only uppercase letters and numbers'
    }
    
    if (!metadata.description.trim()) {
      newErrors.description = 'Token description is required'
    } else if (metadata.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less'
    }
    
    if (!metadata.image) {
      newErrors.image = 'Token image is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [metadata])

  const validateLaunchConfig = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    
    if (!launchConfig.initialSupply || parseFloat(launchConfig.initialSupply) <= 0) {
      newErrors.initialSupply = 'Initial supply must be greater than 0'
    }
    
    if (!launchConfig.initialPrice || parseFloat(launchConfig.initialPrice) <= 0) {
      newErrors.initialPrice = 'Initial price must be greater than 0'
    }
    
    if (!launchConfig.liquidityAmount || parseFloat(launchConfig.liquidityAmount) <= 0) {
      newErrors.liquidityAmount = 'Liquidity amount must be greater than 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [launchConfig])

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }
    
    setMetadata(prev => ({ ...prev, image: file }))
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleMetadataChange = useCallback((field: keyof TokenMetadata, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [errors])

  const handleLaunchConfigChange = useCallback((field: keyof LaunchConfig, value: string) => {
    setLaunchConfig(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [errors])

  const uploadMetadata = async (): Promise<string> => {
    if (!metadata.image) throw new Error('No image selected')
    
    const formData = new FormData()
    formData.append('image', metadata.image)
    formData.append('name', metadata.name)
    formData.append('symbol', metadata.symbol)
    formData.append('description', metadata.description)
    formData.append('website', metadata.website)
    formData.append('twitter', metadata.twitter)
    formData.append('telegram', metadata.telegram)
    
    const response = await fetch('/api/upload-metadata', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error('Failed to upload metadata')
    }
    
    const { metadataUri } = await response.json()
    return metadataUri
  }

  const createToken = async (metadataUri: string): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected')
    }
    
    const response = await fetch('/api/create-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        creator: publicKey.toString(),
        metadataUri,
        initialSupply: launchConfig.initialSupply,
        initialPrice: launchConfig.initialPrice,
        liquidityAmount: launchConfig.liquidityAmount
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to create token')
    }
    
    const { transaction, tokenMint } = await response.json()
    
    const tx = Transaction.from(Buffer.from(transaction, 'base64'))
    const signedTx = await signTransaction(tx)
    
    const signature = await connection.sendRawTransaction(signedTx.serialize())
    await connection.confirmTransaction(signature, 'confirmed')
    
    return tokenMint
  }

  const handleLaunch = async () => {
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }
    
    if (!validateMetadata() || !validateLaunchConfig()) {
      toast.error('Please fix the errors before launching')
      return
    }
    
    setIsLoading(true)
    
    try {
      toast.info('Uploading metadata...')
      const metadataUri = await uploadMetadata()
      
      toast.info('Creating token...')
      const tokenMint = await createToken(metadataUri)
      
      toast.success(`Token launched successfully! Mint: ${tokenMint}`)
      
      // Reset form
      setMetadata({
        name: '',
        symbol: '',
        description: '',
        image: null,
        website: '',
        twitter: '',
        telegram: ''
      })
      setLaunchConfig({
        initialSupply: '1000000000',
        initialPrice: '0.0001',
        liquidityAmount: '5',
        marketCapTarget: '100000'
      })
      setImagePreview(null)
      setActiveTab('metadata')
      
    } catch (error) {
      console.error('Launch error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to launch token')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateMarketCap = useCallback(() => {
    const supply = parseFloat(launchConfig.initialSupply) || 0
    const price = parseFloat(launchConfig.initialPrice) || 0
    return (supply * price).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }, [launchConfig.initialSupply, launchConfig.initialPrice])

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-emerald-500 mb-2">Launch Your Token</h1>
          <p className="text-slate-400">Create and deploy your meme token on Solana</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-emerald-500 flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Token Launch Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                <TabsTrigger value="metadata" className="data-[state=active]:bg-emerald-500">
                  Metadata
                </TabsTrigger>
                <TabsTrigger value="economics" className="data-[state=active]:bg-emerald-500">
                  Economics
                </TabsTrigger>
                <TabsTrigger value="preview" className="data-[state=active]:bg-emerald-500">
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="metadata" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-white">Token Name *</Label>
                      <Input
                        id="name"
                        value={metadata.name}
                        onChange={(e) => handleMetadataChange('name', e.target.value)}
                        placeholder="e.g., Doge Coin"
                        className={cn(
                          "bg-slate-700 border-slate-600 text-white",
                          errors.name && "border-red-500"
                        )}
                      />
                      {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <Label htmlFor="symbol" className="text-white">Token Symbol *</Label>
                      <Input
                        id="symbol"
                        value={metadata.symbol}
                        onChange={(e) => handleMetadataChange('symbol', e.target.value.toUpperCase())}
                        placeholder="e.g., DOGE"
                        className={cn(
                          "bg-slate-700 border-slate-600 text-white",
                          errors.symbol && "border-red-500"
                        )}
                      />
                      {errors.symbol && <p className="text-red-400 text-sm mt-1">{errors.symbol}</p>}
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-white">Description *</Label>
                      <textarea
                        id="description"
                        value={metadata.description}
                        onChange={(e) => handleMetadataChange('description', e.target.value)}
                        placeholder="Describe your token..."
                        rows={4}
                        className={cn(
                          "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none",
                          errors.description && "border-red-500"
                        )}
                      />
                      {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Token Image *</Label>
                      <div className={cn(
                        "border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer",
                        errors.image && "border-red-500"
                      )}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Token preview"
                              className="w-32 h-32 mx-auto rounded-xl object-cover mb-2"
                            />
                          ) : (
                            <Image className="w-16 h-16 mx-auto text-slate-400 mb-2" />
                          )}
                          <p className="text-slate-400">
                            {imagePreview ? 'Click to change image' : 'Click to upload image'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                        </label>
                      </div>
                      {errors.image && <p className="text-red-400 text-sm mt-1">{errors.image}</p>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:
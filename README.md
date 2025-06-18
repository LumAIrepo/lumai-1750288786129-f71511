# PumpClone

A modern meme token platform built with Next.js, TypeScript, and Solana integration.

## Features

- 🚀 Create and launch meme tokens instantly
- 💰 Built-in trading functionality
- 🎨 Modern dark UI with emerald accents
- 🔗 Solana blockchain integration
- 📱 Fully responsive design
- ⚡ Fast and optimized performance

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Blockchain**: Solana Web3.js
- **Wallet**: Solana Wallet Adapter
- **Icons**: Lucide React
- **Notifications**: Sonner

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Solana CLI (optional, for development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pumpclone
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Run the development server:
```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
pumpclone/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Custom components
├── lib/                  # Utility functions
│   ├── utils.ts          # General utilities
│   └── solana.ts         # Solana helpers
├── public/               # Static assets
└── types/                # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## UI Theme

The application uses a consistent dark theme with the following color palette:

- **Primary**: Emerald (emerald-500)
- **Background**: Slate (slate-900)
- **Text**: White
- **Font**: Inter
- **Border Radius**: 0.75rem

## Solana Integration

The platform integrates with Solana blockchain for:

- Token creation and minting
- Trading and swapping
- Wallet connection and management
- Transaction handling

### Supported Wallets

- Phantom
- Solflare
- Backpack
- And more via Solana Wallet Adapter

## Development Guidelines

### Code Style

- Use TypeScript for all files
- Follow ESLint configuration
- Use Tailwind CSS for styling
- Implement proper error handling
- Write clean, readable code

### Component Structure

```typescript
'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"

interface ComponentProps {
  // Define props here
}

export default function Component({ }: ComponentProps) {
  // Component logic here
  
  return (
    // JSX here
  )
}
```

### Import Order

1. React and Next.js imports
2. Third-party libraries
3. UI components
4. Custom components
5. Utilities and helpers
6. Types and interfaces

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables
4. Deploy automatically

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on GitHub.
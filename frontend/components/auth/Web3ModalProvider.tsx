'use client'

import { defaultWagmiConfig } from '@web3modal/wagmi/react'
import { WagmiProvider } from 'wagmi'
import { polygonAmoy, hardhat } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const queryClient = new QueryClient()

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '11111111111111111111111111111111'

const metadata = {
  name: 'Ghachagh',
  description: 'Decentralized Logistics Platform',
  url: 'https://ghachagh.io',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

export function Web3ModalProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    import('@web3modal/wagmi/react').then(({ createWeb3Modal }) => {
        const chains = [hardhat, polygonAmoy] as const
        const wagmiConfig = defaultWagmiConfig({
          chains,
          projectId,
          metadata,
          enableWalletConnect: true,
          enableInjected: true,
          enableEIP6963: true,
          enableCoinbase: true,
        })
        setConfig(wagmiConfig)

        createWeb3Modal({
            wagmiConfig,
            projectId,
            enableAnalytics: true,
            enableOnramp: true
        })
        setMounted(true)
    })
  }, [])

  if (!mounted || !config) return null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

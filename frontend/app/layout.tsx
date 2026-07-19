import './globals.css'
import type { Metadata } from 'next'
import { Web3ModalProvider } from '../components/auth/Web3ModalProvider'

export const metadata: Metadata = {
  title: 'Ghachagh Logistics',
  description: 'Decentralized Logistics Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Web3ModalProvider>
          <header className="p-4 flex justify-between items-center border-b">
            <div className="font-bold text-xl">Ghachagh</div>
            {/* The Web3Modal connect button standard component */}
            <div dangerouslySetInnerHTML={{ __html: '<w3m-button />' }} />
          </header>
          {children}
        </Web3ModalProvider>
      </body>
    </html>
  )
}

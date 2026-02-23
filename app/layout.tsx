import type { Metadata, Viewport } from 'next'
import { Inter, Space_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceMono = Space_Mono({ 
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono' 
})

export const metadata: Metadata = {
  title: "Chihiro's Lost Name - ZK Gaming Experience",
  description: 'An interactive Zero-Knowledge proof game inspired by Spirited Away, where you help Chihiro remember her name through cryptographic puzzles and Git-based adventures.',
  keywords: ['zero-knowledge', 'zk-proofs', 'blockchain', 'game', 'stellar', 'noir'],
  authors: [{ name: 'Chihiro Game Studio' }],
  openGraph: {
    title: "Chihiro's Lost Name",
    description: 'Help Chihiro remember her name through ZK proofs and Git adventures',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a1a2e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}

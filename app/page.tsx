'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className={`max-w-4xl w-full space-y-8 animate-fadeIn ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground font-mono tracking-tight text-balance">
            Chihiro's Lost Name
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Una experiencia de gaming con Zero-Knowledge proofs inspirada en El Viaje de Chihiro
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-12">
          <div className="bg-card border border-border rounded-lg p-6 space-y-2">
            <div className="text-3xl mb-2">🔮</div>
            <h3 className="text-lg font-semibold text-card-foreground">Zero-Knowledge Proofs</h3>
            <p className="text-sm text-muted-foreground">
              Usa criptografía ZK con Noir UltraHonk para probar tu conocimiento sin revelarlo
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-2">
            <div className="text-3xl mb-2">🌊</div>
            <h3 className="text-lg font-semibold text-card-foreground">Multiplayer Real-time</h3>
            <p className="text-sm text-muted-foreground">
              Juega con amigos en tiempo real. Comparte sesiones con un simple link
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-2">
            <div className="text-3xl mb-2">🏯</div>
            <h3 className="text-lg font-semibold text-card-foreground">Blockchain Gaming</h3>
            <p className="text-sm text-muted-foreground">
              Integrado con Stellar blockchain y Freighter wallet para proofs on-chain
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
          <Link
            href="/game"
            className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Empezar Juego →
          </Link>
          <Link
            href="/multiplayer"
            className="bg-secondary text-secondary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Multijugador →
          </Link>
        </div>

        {/* Tech Stack */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground mb-4">Powered by</p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span className="bg-muted px-3 py-1 rounded">Next.js 16</span>
            <span className="bg-muted px-3 py-1 rounded">Supabase Real-time</span>
            <span className="bg-muted px-3 py-1 rounded">Stellar Blockchain</span>
            <span className="bg-muted px-3 py-1 rounded">Noir ZK</span>
            <span className="bg-muted px-3 py-1 rounded">TypeScript</span>
          </div>
        </div>
      </div>
    </main>
  )
}

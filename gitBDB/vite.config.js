import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.{js,ts}'],
    pool: 'forks',
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === 'UNRESOLVED_IMPORT' &&
          warning.message?.includes('@creit-tech/stellar-wallets-kit')
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
  resolve: {
    // 🔴 FUERZA UNA SOLA INSTANCIA — deduplica en bundling
    dedupe: ['@stellar/stellar-sdk'],
    alias: {
      buffer: 'buffer',
      '@creit-tech/stellar-wallets-kit/sdk/modules/freighter.module': path.resolve('./node_modules/@creit-tech/stellar-wallets-kit/esm/sdk/modules/freighter.module.js'),
    },
  },
  optimizeDeps: {
    // 🔴 Pre-bundea TODO el SDK como una sola unidad
    include: ['@stellar/stellar-sdk', '@stellar/stellar-sdk/rpc'],
    // Força que esbuild No cree múltiples entry points
    esbuildOptions: {
      preserveSymlinks: false,
    },
  },
})

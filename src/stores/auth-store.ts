'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { useConnectionStore } from '@/stores/connection-store'

interface AuthStore {
  status: 'idle' | 'connecting' | 'connected' | 'error'
  error?: string
  startDeviceAuth: () => Promise<void>
  disconnectAccount: () => Promise<void>
  setError: (message?: string) => void
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      status: 'idle',
      error: undefined,

      startDeviceAuth: async () => {
        set({ status: 'connecting', error: undefined })
        useConnectionStore.getState().setConnectionStatus({ state: 'connecting' })

        if (typeof window !== 'undefined') {
          window.location.assign('/connection')
        }

        set({ status: 'idle' })
      },

      disconnectAccount: async () => {
        set({ status: 'connecting', error: undefined })
        try {
          const response = await fetch('/api/connection', { method: 'DELETE' })
          const payload = (await response.json().catch(() => ({}))) as { error?: string }

          if (!response.ok) {
            throw new Error(payload.error || 'Failed to disconnect Real-Debrid account')
          }

          set({ status: 'idle', error: undefined })
          useConnectionStore.getState().clearConnection()
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unexpected error disconnecting account'
          set({ status: 'error', error: message })
          throw error
        }
      },

      setError: (message) => set({ error: message }),
    }),
    { name: 'auth-store' }
  )
)

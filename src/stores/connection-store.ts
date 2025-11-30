'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type {
  ConnectionError,
  ConnectionHealth,
  ConnectionState,
  ConnectionStatusPayload,
} from '@/types/connection'
import type { User } from '@/types/real-debrid-api'

interface ConnectionStatus {
  state: ConnectionState
  user?: User
  lastSync?: string
  tokenExpiry?: string
  apiHealth?: ConnectionHealth
  error?: ConnectionError
  reconnectAttempts: number
}

export interface ConnectionStore extends ConnectionStatus {
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void
  checkConnectionHealth: () => Promise<void>
  validateTokens: () => Promise<boolean>
  refreshUser: () => Promise<void>
  clearConnection: () => void
  setError: (error: ConnectionError) => void
  clearError: () => void
  incrementReconnectAttempts: () => void
  resetReconnectAttempts: () => void
}

const initialState: ConnectionStatus = {
  state: 'disconnected',
  apiHealth: 'unknown',
  reconnectAttempts: 0,
}

export const useConnectionStore = create<ConnectionStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setConnectionStatus: (status) =>
        set((current) => ({
          ...current,
          ...status,
          error: Object.prototype.hasOwnProperty.call(status, 'error') ? status.error : current.error,
        })),

      checkConnectionHealth: async () => {
        try {
          const status = await fetchConnectionStatus()

          set({
            state: status.state,
            user: status.user ?? undefined,
            lastSync: status.lastSync ?? undefined,
            tokenExpiry: status.tokenExpiry ?? undefined,
            apiHealth: status.apiHealth ?? 'unknown',
            error: status.error ?? undefined,
          })
        } catch (error) {
          console.error('Connection health check failed', error)
          set({
            state: 'error',
            error: {
              code: 'HEALTH_CHECK_FAILED',
              message:
                error instanceof Error ? error.message : 'Failed to check Real-Debrid connection',
              action: 'Verify your internet connection and retry.',
              severity: 'medium',
              timestamp: new Date().toISOString(),
              details: error,
            },
          })
        }
      },

      validateTokens: async () => {
        const { tokenExpiry } = get()

        if (!tokenExpiry) {
          await get().checkConnectionHealth()
          return get().state === 'connected'
        }

        const expiryTime = Date.parse(tokenExpiry)
        if (Number.isNaN(expiryTime)) {
          await get().checkConnectionHealth()
          return get().state === 'connected'
        }

        const threshold = 5 * 60 * 1000
        const remaining = expiryTime - Date.now()

        if (remaining <= threshold) {
          set({ state: remaining <= 0 ? 'expired' : 'connected', tokenExpiry })
          return remaining > 0
        }

        return true
      },

      refreshUser: async () => {
        try {
          const status = await fetchConnectionStatus()

          set((current) => ({
            ...current,
            state: status.state,
            user: status.user ?? current.user,
            apiHealth: status.apiHealth ?? current.apiHealth,
            lastSync: status.lastSync ?? current.lastSync,
            tokenExpiry: status.tokenExpiry ?? current.tokenExpiry,
            error: status.error ?? current.error,
          }))
        } catch (error) {
          console.error('Failed to refresh Real-Debrid user', error)
        }
      },

      clearConnection: () =>
        set({
          ...initialState,
          user: undefined,
          lastSync: undefined,
          tokenExpiry: undefined,
          error: undefined,
        }),

      setError: (error) => set({ state: 'error', error }),

      clearError: () => set({ error: undefined }),

      incrementReconnectAttempts: () =>
        set((current) => ({ reconnectAttempts: current.reconnectAttempts + 1 })),

      resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
    }),
    { name: 'connection-store' }
  )
)

export async function fetchConnectionStatus(): Promise<ConnectionStatusPayload> {
  const response = await fetch('/api/connection', {
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => ({}))) as ConnectionStatusPayload & {
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to load Real-Debrid connection status')
  }

  return payload
}

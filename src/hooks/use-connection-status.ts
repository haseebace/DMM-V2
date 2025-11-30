'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchConnectionStatus, useConnectionStore } from '@/stores/connection-store'

interface UseConnectionStatusOptions {
  enabled?: boolean
  refetchInterval?: number | false
}

export function useConnectionStatus(options?: UseConnectionStatusOptions) {
  const setConnectionStatus = useConnectionStore((state) => state.setConnectionStatus)

  return useQuery({
    queryKey: ['connection-status'],
    queryFn: fetchConnectionStatus,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 60_000,
    staleTime: 30_000,
    onSuccess: (data) => {
      setConnectionStatus({
        state: data.state,
        user: data.user ?? undefined,
        lastSync: data.lastSync ?? undefined,
        tokenExpiry: data.tokenExpiry ?? undefined,
        apiHealth: data.apiHealth ?? 'unknown',
        error: data.error ?? undefined,
      })
    },
    onError: (error) => {
      setConnectionStatus({
        state: 'error',
        error: {
          code: 'CONNECTION_STATUS_FAILED',
          message:
            error instanceof Error ? error.message : 'Unable to load Real-Debrid connection data',
          action: 'Retry checking your Real-Debrid connection.',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          details: error,
        },
      })
    },
  })
}

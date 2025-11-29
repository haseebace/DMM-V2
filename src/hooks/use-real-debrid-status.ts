import { useCallback, useEffect, useRef, useState } from 'react'

import type { User } from '@/types/real-debrid-api'

interface RateLimitInfo {
  requestsRemaining: number
  resetTime: number
}

interface StatusData {
  user: User | null
  rateLimit: RateLimitInfo
  health: boolean
}

interface StatusError {
  message: string
  action?: string
  requiresReauth?: boolean
  shouldRetry?: boolean
}

export function useRealDebridStatus(pollInterval = 30000) {
  const [data, setData] = useState<StatusData | null>(null)
  const [error, setError] = useState<StatusError | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const abortController = useRef<AbortController | null>(null)

  const fetchStatus = useCallback(async () => {
    abortController.current?.abort()
    const controller = new AbortController()
    abortController.current = controller

    setLoading(true)

    try {
      const response = await fetch('/api/real-debrid/status', {
        signal: controller.signal,
        cache: 'no-store',
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        setError({
          message: payload.error || 'Unable to load Real-Debrid status',
          action: payload.action,
          requiresReauth: payload.requiresReauth,
          shouldRetry: payload.shouldRetry,
        })
        setData(payload.data ?? null)
        return
      }

      setData(payload.data as StatusData)
      setError(null)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return
      }

      setError({
        message: err instanceof Error ? err.message : 'Network error contacting Real-Debrid API',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()

    const intervalId = setInterval(fetchStatus, pollInterval)

    return () => {
      clearInterval(intervalId)
      abortController.current?.abort()
    }
  }, [fetchStatus, pollInterval])

  return {
    data,
    error,
    loading,
    refresh: fetchStatus,
  }
}

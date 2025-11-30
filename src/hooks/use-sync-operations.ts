'use client'

import { useCallback, useEffect } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { SyncConfiguration, SyncStatus } from '@/lib/sync/sync-service'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

type ControlAction = 'pause' | 'resume' | 'cancel'

const STATUS_KEY = ['sync', 'status'] as const
const CONFIG_KEY = ['sync', 'configuration'] as const

async function callSyncApi<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
  })

  const payload = ((await response.json().catch(() => ({}))) as ApiResponse<T>) || {
    success: false,
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || response.statusText)
  }

  return payload
}

export function useSyncOperations() {
  const queryClient = useQueryClient()

  const statusQuery = useQuery({
    queryKey: STATUS_KEY,
    queryFn: async () => (await callSyncApi<SyncStatus>('/api/sync/status')).data!,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  })

  const configurationQuery = useQuery({
    queryKey: CONFIG_KEY,
    queryFn: async () => (await callSyncApi<SyncConfiguration>('/api/sync/configuration')).data!,
    staleTime: 60 * 1000,
  })

  const startMutation = useMutation({
    mutationFn: async (overrides?: Partial<SyncConfiguration>) =>
      (
        await callSyncApi<SyncStatus>('/api/sync/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(overrides ?? {}),
        })
      ).data!,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STATUS_KEY })
    },
  })

  const controlMutation = useMutation({
    mutationFn: async (action: ControlAction) =>
      (
        await callSyncApi<SyncStatus>('/api/sync/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
      ).data!,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STATUS_KEY })
    },
  })

  const configurationMutation = useMutation({
    mutationFn: async (config: Partial<SyncConfiguration>) =>
      (
        await callSyncApi<SyncConfiguration>('/api/sync/configuration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        })
      ).data!,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIG_KEY })
    },
  })

  const updateConfigurationHandler = useCallback(
    (config: Partial<SyncConfiguration>) => configurationMutation.mutateAsync(config),
    [configurationMutation]
  )

  const startSyncHandler = useCallback(
    (overrides?: Partial<SyncConfiguration>) => startMutation.mutateAsync(overrides),
    [startMutation]
  )

  useEffect(() => {
    if (!configurationQuery.data?.autoSync || startMutation.isPending) {
      return
    }

    const eligibleStatuses: SyncStatus['status'][] = ['idle', 'completed', 'error']
    if (!eligibleStatuses.includes(statusQuery.data?.status ?? 'idle')) {
      return
    }

    const intervalMs = (configurationQuery.data.syncInterval ?? 30) * 60 * 1000
    const lastSyncMs = statusQuery.data?.lastSync ? new Date(statusQuery.data.lastSync).getTime() : 0
    const elapsed = lastSyncMs ? Date.now() - lastSyncMs : intervalMs
    const delay = Math.max(intervalMs - elapsed, 0)

    const timer = setTimeout(() => {
      startSyncHandler().catch((error) => {
        console.error('Auto-sync failed', error)
      })
    }, delay)

    return () => clearTimeout(timer)
  }, [
    configurationQuery.data?.autoSync,
    configurationQuery.data?.syncInterval,
    statusQuery.data?.lastSync,
    statusQuery.data?.status,
    startMutation.isPending,
    startSyncHandler,
  ])

  return {
    status: statusQuery.data,
    statusLoading: statusQuery.isLoading,
    statusError: statusQuery.error instanceof Error ? statusQuery.error.message : null,
    refetchStatus: statusQuery.refetch,
    configuration: configurationQuery.data,
    configurationLoading: configurationQuery.isLoading,
    updateConfiguration: updateConfigurationHandler,
    starting: startMutation.isPending,
    controlling: controlMutation.isPending,
    updatingConfiguration: configurationMutation.isPending,
    startSync: startSyncHandler,
    pauseSync: () => controlMutation.mutateAsync('pause'),
    resumeSync: () => controlMutation.mutateAsync('resume'),
    cancelSync: () => controlMutation.mutateAsync('cancel'),
  }
}

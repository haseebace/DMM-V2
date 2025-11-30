'use client'

import { Loader2, PauseCircle, PlayCircle, RefreshCw, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { SyncConfiguration, SyncStatus } from '@/lib/sync/sync-service'

interface SyncButtonProps {
  status?: SyncStatus
  starting: boolean
  controlling: boolean
  onStart: (config?: Partial<SyncConfiguration>) => Promise<unknown>
  onPause: () => Promise<unknown>
  onResume: () => Promise<unknown>
  onCancel: () => Promise<unknown>
}

const getPrimaryLabel = (status?: SyncStatus) => {
  if (!status || status.status === 'idle') {
    return 'Start Sync'
  }
  if (status.status === 'error') {
    return 'Retry Sync'
  }
  if (status.status === 'completed') {
    return 'Run Again'
  }
  return 'Start Sync'
}

export function SyncButton({
  status,
  starting,
  controlling,
  onStart,
  onPause,
  onResume,
  onCancel,
}: SyncButtonProps) {
  const handleStart = () => onStart()
  const isRunning = status?.status === 'running'
  const isPaused = status?.status === 'paused'
  const isIdle = !status || ['idle', 'completed', 'error'].includes(status.status)

  return (
    <div className="flex flex-wrap gap-3">
      {isRunning && (
        <Button onClick={onPause} disabled={controlling} variant="secondary">
          {controlling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PauseCircle className="mr-2 h-4 w-4" />} 
          Pause
        </Button>
      )}

      {isPaused && (
        <Button onClick={onResume} disabled={controlling}>
          {controlling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />} 
          Resume
        </Button>
      )}

      {isIdle && (
        <Button onClick={handleStart} disabled={starting}>
          {starting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : status?.status === 'completed' ? (
            <RefreshCw className="mr-2 h-4 w-4" />
          ) : (
            <PlayCircle className="mr-2 h-4 w-4" />
          )}
          {getPrimaryLabel(status)}
        </Button>
      )}

      {(isRunning || isPaused) && (
        <Button onClick={onCancel} disabled={controlling} variant="destructive">
          {controlling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />} 
          Cancel
        </Button>
      )}
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Link2,
  RefreshCw,
  Unlink,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ConnectionStatusBadge } from '@/components/connection/connection-status-badge'
import { useConnectionStatus } from '@/hooks/use-connection-status'
import { useSyncOperations } from '@/hooks/use-sync-operations'
import { useAuthStore } from '@/stores/auth-store'
import { useConnectionStore } from '@/stores/connection-store'

function formatRelativeTime(timestamp?: string) {
  if (!timestamp) return 'Unknown'
  const value = Date.parse(timestamp)
  if (Number.isNaN(value)) return timestamp

  const diff = Date.now() - value
  if (diff < 60 * 1000) return 'Just now'
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function ConnectionCard() {
  const { refetch, isFetching } = useConnectionStatus()
  const { startSync, status: syncStatus, starting: syncStarting, statusError } = useSyncOperations()
  const { startDeviceAuth, disconnectAccount } = useAuthStore()
  const {
    state,
    user,
    lastSync,
    tokenExpiry,
    apiHealth,
    error,
    clearError,
    clearConnection,
  } = useConnectionStore()

  const [manualSyncError, setManualSyncError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  const tokenStatus = useMemo(() => {
    if (!tokenExpiry) return null
    const expiresAt = Date.parse(tokenExpiry)
    if (Number.isNaN(expiresAt)) {
      return { label: 'Unknown expiry', tone: 'text-yellow-600' }
    }

    const diff = expiresAt - Date.now()
    if (diff <= 0) {
      return { label: 'Tokens expired', tone: 'text-red-600' }
    }
    if (diff <= 5 * 60 * 1000) {
      return { label: 'Expiring soon', tone: 'text-yellow-600' }
    }

    const hours = Math.round(diff / (60 * 60 * 1000))
    return { label: `Valid ~${hours}h`, tone: 'text-emerald-600' }
  }, [tokenExpiry])

  const handleRefresh = async () => {
    await refetch()
  }

  const handleReconnect = async () => {
    await startDeviceAuth()
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await disconnectAccount()
      clearConnection()
    } catch (disconnectError) {
      console.error('Failed to disconnect Real-Debrid account', disconnectError)
    } finally {
      setDisconnecting(false)
    }
  }

  const handleManualSync = async () => {
    setManualSyncError(null)
    try {
      await startSync()
    } catch (syncError) {
      setManualSyncError(
        syncError instanceof Error ? syncError.message : 'Failed to start manual synchronization'
      )
    }
  }

  const renderApiHealthBadge = () => {
    if (!apiHealth || apiHealth === 'unknown') return null

    const healthText =
      apiHealth === 'healthy' ? 'API Healthy' : apiHealth === 'degraded' ? 'API Degraded' : 'API Unhealthy'
    const Icon = apiHealth === 'healthy' ? Wifi : apiHealth === 'degraded' ? Activity : WifiOff
    const colorClass =
      apiHealth === 'healthy'
        ? 'border-emerald-200 text-emerald-600'
        : apiHealth === 'degraded'
          ? 'border-amber-200 text-amber-600'
          : 'border-red-200 text-red-600'

    return (
      <Badge variant="outline" className={colorClass}>
        <Icon className="mr-1 h-3.5 w-3.5" />
        {healthText}
      </Badge>
    )
  }

  const renderError = () => {
    if (!error) return null

    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">{error.message}</div>
            {error.action && <p className="text-sm text-muted-foreground">{error.action}</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Retry
              </Button>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  const renderManualSync = () => (
    <div className="space-y-2 rounded-lg border border-slate-200/60 p-4 dark:border-slate-800/60">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Manual Sync</p>
          <p className="text-xs text-muted-foreground">Trigger an immediate metadata refresh.</p>
        </div>
        <Button onClick={handleManualSync} size="sm" disabled={syncStarting}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncStarting ? 'animate-spin' : ''}`} />
          {syncStarting ? 'Starting…' : 'Start Sync'}
        </Button>
      </div>

      <Progress value={syncStatus?.progress?.percentage ?? 0} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{syncStatus?.progress?.current ?? 'No sync running'}</span>
        <span>{syncStatus?.progress?.percentage ?? 0}%</span>
      </div>
      {(manualSyncError || statusError) && (
        <p className="text-xs text-red-600">{manualSyncError || statusError}</p>
      )}
    </div>
  )

  const renderConnectedState = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Connected account</p>
          <p className="text-base font-semibold">{user?.username ?? 'Unknown user'}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="space-x-2">
          {user?.type && (
            <Badge variant={user.type === 'premium' ? 'default' : 'secondary'}>
              {user.type === 'premium' ? 'Premium' : 'Free'}
            </Badge>
          )}
          {renderApiHealthBadge()}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-slate-200/60 p-4 text-sm dark:border-slate-800/60">
          <p className="text-muted-foreground">Last sync</p>
          <p className="text-base font-semibold">{formatRelativeTime(lastSync)}</p>
        </div>
        <div className="rounded-md border border-slate-200/60 p-4 text-sm dark:border-slate-800/60">
          <p className="text-muted-foreground">Tokens</p>
          <p className={`text-base font-semibold ${tokenStatus?.tone ?? ''}`}>
            {tokenStatus?.label ?? 'Unknown'}
          </p>
        </div>
      </div>

      {renderManualSync()}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" disabled={disconnecting}>
              <Unlink className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Real-Debrid?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove cached tokens from DMM. You can reconnect anytime using the
                device flow.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )

  const renderDisconnectedState = () => (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        Connect your Real-Debrid account to enable synchronization and connection monitoring.
      </p>
      <Button onClick={handleReconnect} className="w-full">
        <Link2 className="mr-2 h-4 w-4" />
        Connect Real-Debrid Account
      </Button>
    </div>
  )

  const renderConnectingState = () => (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span className="font-medium">Connecting to Real-Debrid…</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Complete the OAuth flow in the Real-Debrid window to finish connecting.
      </p>
      <Progress value={undefined} />
    </div>
  )

  const renderExpiredState = () => (
    <div className="space-y-4">
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Your Real-Debrid tokens have expired. Reconnect to continue syncing your library.
        </AlertDescription>
      </Alert>
      <Button onClick={handleReconnect} className="w-full">
        <Link2 className="mr-2 h-4 w-4" />
        Reconnect Account
      </Button>
    </div>
  )

  const renderErrorState = () => (
    <div className="space-y-4">
      {renderError()}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Retry
        </Button>
        <Button onClick={handleReconnect}>
          <Link2 className="mr-2 h-4 w-4" />
          Reconnect
        </Button>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (state) {
      case 'connected':
        return renderConnectedState()
      case 'connecting':
        return renderConnectingState()
      case 'expired':
        return renderExpiredState()
      case 'error':
        return renderErrorState()
      default:
        return renderDisconnectedState()
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {state === 'connected' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {state === 'error' && <AlertTriangle className="h-5 w-5 text-red-500" />}
              {(state === 'disconnected' || state === 'expired') && (
                <Unlink className="h-5 w-5 text-slate-400" />
              )}
              {state === 'connecting' && <RefreshCw className="h-5 w-5 animate-spin" />}
              Real-Debrid Connection
            </CardTitle>
            <CardDescription>Monitor connection health and manage troubleshooting.</CardDescription>
          </div>
          <ConnectionStatusBadge />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{renderContent()}</CardContent>
    </Card>
  )
}

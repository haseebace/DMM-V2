'use client'

import type { ComponentType, SVGProps } from 'react'

import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Unlink } from 'lucide-react'

import { Badge, type BadgeProps } from '@/components/ui/badge'
import { useConnectionStatus } from '@/hooks/use-connection-status'
import { useConnectionStore } from '@/stores/connection-store'
import type { ConnectionState } from '@/types/connection'

interface StatusMeta {
  label: string
  description: string
  variant: BadgeProps['variant']
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const STATUS_CONFIG: Record<ConnectionState, StatusMeta> = {
  disconnected: {
    label: 'Disconnected',
    description: 'No Real-Debrid account linked',
    variant: 'secondary',
    icon: Unlink,
  },
  connecting: {
    label: 'Connecting',
    description: 'OAuth flow in progress',
    variant: 'default',
    icon: RefreshCw,
  },
  connected: {
    label: 'Connected',
    description: 'Real-Debrid account linked',
    variant: 'default',
    icon: CheckCircle2,
  },
  expired: {
    label: 'Expired',
    description: 'Tokens expired - reconnect required',
    variant: 'destructive',
    icon: Clock,
  },
  error: {
    label: 'Error',
    description: 'Connection error detected',
    variant: 'destructive',
    icon: AlertTriangle,
  },
}

interface ConnectionStatusBadgeProps {
  className?: string
}

export function ConnectionStatusBadge({ className }: ConnectionStatusBadgeProps) {
  useConnectionStatus()
  const { state, error } = useConnectionStore((store) => ({ state: store.state, error: store.error }))
  const status = STATUS_CONFIG[state] ?? STATUS_CONFIG.disconnected
  const Icon = status.icon
  const description = error?.message ?? status.description

  return (
    <Badge variant={status.variant} className={className} title={description}>
      <div className="flex items-center gap-1">
        <Icon className="h-3.5 w-3.5" />
        <span>{status.label}</span>
      </div>
    </Badge>
  )
}

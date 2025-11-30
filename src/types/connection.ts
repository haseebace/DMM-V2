import type { User } from '@/types/real-debrid-api'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'expired'

export type ConnectionHealth = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

export interface ConnectionError {
  code: string
  message: string
  action?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  details?: unknown
}

export interface ConnectionStatusPayload {
  state: ConnectionState
  user?: User | null
  lastSync?: string | null
  tokenExpiry?: string | null
  apiHealth?: ConnectionHealth | null
  error?: ConnectionError | null
}

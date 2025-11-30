import { NextResponse } from 'next/server'

import { realDebridClient } from '@/lib/api/real-debrid-client'
import { realDebridService, RealDebridServiceError } from '@/lib/api/real-debrid-service'
import { getSupabaseClient } from '@/lib/database/supabase-client'
import type { ConnectionError, ConnectionStatusPayload } from '@/types/connection'
import type { User } from '@/types/real-debrid-api'

function buildError(
  code: string,
  message: string,
  action?: string,
  severity: ConnectionError['severity'] = 'medium',
  details?: unknown
): ConnectionError {
  return {
    code,
    message,
    action,
    severity,
    timestamp: new Date().toISOString(),
    details,
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseClient(true)
    const { data: tokenRow, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('id, expires_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tokenError) {
      console.error('Failed to read oauth token state', tokenError)
    }

    const now = Date.now()
    let state: ConnectionStatusPayload['state'] = 'disconnected'
    const tokenExpiry: string | null = tokenRow?.expires_at ?? null
    const lastSync: string | null = tokenRow?.updated_at ?? null

    if (tokenRow) {
      if (tokenExpiry) {
        const expiryValue = Date.parse(tokenExpiry)
        state = Number.isNaN(expiryValue) ? 'connected' : expiryValue <= now ? 'expired' : 'connected'
      } else {
        state = 'connected'
      }
    }

    let user: User | null = null
    let apiHealth: ConnectionStatusPayload['apiHealth'] = 'unknown'
    let error: ConnectionError | null = null

    if (state === 'connected' || state === 'expired') {
      try {
        user = await realDebridService.getUserInfo()
      } catch (userError) {
        if (userError instanceof RealDebridServiceError) {
          error = buildError(
            userError.context?.code ?? 'USER_INFO_FAILED',
            userError.context?.message ?? 'Unable to retrieve Real-Debrid user information',
            userError.context?.action ?? 'Reconnect your Real-Debrid account to resolve this issue.',
            'high',
            userError.context ?? userError
          )
        } else {
          error = buildError(
            'USER_INFO_FAILED',
            'Unable to retrieve Real-Debrid user information',
            'Reconnect your Real-Debrid account.',
            'high',
            userError
          )
        }

        if (state !== 'expired') {
          state = 'error'
        }
      }

      const healthy = await realDebridService.healthCheck()
      apiHealth = healthy ? 'healthy' : user ? 'degraded' : 'unhealthy'
      if (!healthy && !error) {
        error = buildError(
          'API_UNHEALTHY',
          'Real-Debrid API is not responding as expected',
          'Retry in a few minutes or verify status.real-debrid.com',
          'medium'
        )
      }
    }

    return NextResponse.json({
      state,
      user,
      lastSync,
      tokenExpiry,
      apiHealth,
      error,
    } satisfies ConnectionStatusPayload)
  } catch (error) {
    console.error('Connection status endpoint error', error)
    return NextResponse.json(
      {
        state: 'error',
        user: null,
        lastSync: null,
        tokenExpiry: null,
        apiHealth: 'unknown',
        error: buildError(
          'CONNECTION_STATUS_ERROR',
          error instanceof Error ? error.message : 'Unexpected connection status failure',
          'Retry in a few minutes.',
          'critical',
          error
        ),
      } satisfies ConnectionStatusPayload,
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const supabase = getSupabaseClient(true)
    const { data: rows, error } = await supabase.from('oauth_tokens').select('id')

    if (error) {
      console.error('Failed to list oauth tokens for deletion', error)
      return NextResponse.json({ error: 'Unable to clear Real-Debrid tokens' }, { status: 500 })
    }

    if (rows && rows.length > 0) {
      const ids = rows.map((row) => row.id).filter(Boolean)
      if (ids.length > 0) {
        const { error: deleteError } = await supabase.from('oauth_tokens').delete().in('id', ids)
        if (deleteError) {
          console.error('Failed to delete oauth tokens', deleteError)
          return NextResponse.json({ error: 'Unable to remove Real-Debrid tokens' }, { status: 500 })
        }
      }
    }

    realDebridClient.clearCachedToken()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Connection disconnect error', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error clearing tokens',
      },
      { status: 500 }
    )
  }
}

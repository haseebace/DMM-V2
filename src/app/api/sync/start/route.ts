import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseClient } from '@/lib/database/supabase-client'
import { syncService, type SyncConfiguration } from '@/lib/sync/sync-service'

interface StartPayload extends Partial<SyncConfiguration> {
  userId?: string
}

const sanitizeConfiguration = (payload: StartPayload): Partial<SyncConfiguration> => {
  const overrides: Partial<SyncConfiguration> = {}

  if (typeof payload.autoSync === 'boolean') {
    overrides.autoSync = payload.autoSync
  }

  if (Number.isFinite(payload.syncInterval) && (payload.syncInterval ?? 0) > 0) {
    overrides.syncInterval = Math.max(1, Number(payload.syncInterval))
  }

  if (Number.isFinite(payload.batchSize) && (payload.batchSize ?? 0) > 0) {
    overrides.batchSize = Math.min(500, Math.max(25, Number(payload.batchSize)))
  }

  if (typeof payload.enableDuplicateDetection === 'boolean') {
    overrides.enableDuplicateDetection = payload.enableDuplicateDetection
  }

  if (Number.isFinite(payload.syncTimeout) && (payload.syncTimeout ?? 0) > 0) {
    overrides.syncTimeout = Math.max(30_000, Number(payload.syncTimeout))
  }

  if (Number.isFinite(payload.maxRetries) && (payload.maxRetries ?? 0) >= 0) {
    overrides.maxRetries = Math.min(10, Math.max(0, Number(payload.maxRetries)))
  }

  return overrides
}

const resolveUserId = async (request: NextRequest): Promise<string | null> => {
  const headerId = request.headers.get('x-user-id') || request.headers.get('x-userid')
  if (headerId) {
    return headerId
  }

  try {
    const supabase = getSupabaseClient(true)
    const { data } = await supabase
      .from('oauth_tokens')
      .select('user_id, id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data?.user_id) {
      return data.user_id
    }

    if (data?.id) {
      return data.id
    }
  } catch (error) {
    console.error('Unable to resolve sync user id', error)
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const payload = ((await request.json().catch(() => ({}))) as StartPayload) ?? {}
    const userId = payload.userId ?? (await resolveUserId(request))

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Real-Debrid account not connected yet' },
        { status: 401 }
      )
    }

    let startPromise: Promise<unknown>

    try {
      const overrides = sanitizeConfiguration(payload)
      startPromise = syncService.startSync(userId, overrides)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start sync'
      return NextResponse.json({ success: false, error: message }, { status: 409 })
    }

    startPromise.catch((error) => {
      console.error('Background sync failure', error)
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Synchronization started',
        data: syncService.getSyncStatus(),
      },
      { status: 202 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected sync start failure'
    console.error('Sync start API error', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

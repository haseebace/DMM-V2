import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseClient } from '@/lib/database/supabase-client'
import { syncService, type SyncConfiguration } from '@/lib/sync/sync-service'

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

const validateConfig = (config: Partial<SyncConfiguration>) => {
  const sanitized: Partial<SyncConfiguration> = {}

  if (typeof config.autoSync === 'boolean') {
    sanitized.autoSync = config.autoSync
  }

  if (Number.isFinite(config.syncInterval) && (config.syncInterval ?? 0) > 0) {
    sanitized.syncInterval = Math.max(5, Number(config.syncInterval))
  }

  if (Number.isFinite(config.batchSize) && (config.batchSize ?? 0) > 0) {
    sanitized.batchSize = Math.min(500, Math.max(25, Number(config.batchSize)))
  }

  if (typeof config.enableDuplicateDetection === 'boolean') {
    sanitized.enableDuplicateDetection = config.enableDuplicateDetection
  }

  if (Number.isFinite(config.syncTimeout) && (config.syncTimeout ?? 0) > 0) {
    sanitized.syncTimeout = Math.max(30_000, Number(config.syncTimeout))
  }

  if (Number.isFinite(config.maxRetries) && (config.maxRetries ?? 0) >= 0) {
    sanitized.maxRetries = Math.min(10, Math.max(0, Number(config.maxRetries)))
  }

  return sanitized
}

export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request)

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ success: true, data: syncService.getSyncConfiguration() })
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request)

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const payload = ((await request.json().catch(() => ({}))) as Partial<SyncConfiguration>) ?? {}
  const sanitized = validateConfig(payload)

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json(
      { success: false, error: 'No valid configuration fields supplied' },
      { status: 400 }
    )
  }

  syncService.updateSyncConfiguration(sanitized)

  return NextResponse.json({ success: true, data: syncService.getSyncConfiguration() })
}

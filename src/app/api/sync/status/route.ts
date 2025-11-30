import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseClient } from '@/lib/database/supabase-client'
import { syncService } from '@/lib/sync/sync-service'

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

export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request)

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ success: true, data: syncService.getSyncStatus() })
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request)

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = ((await request.json().catch(() => ({}))) as { action?: string }) ?? {}
  const action = body.action?.toLowerCase()

  try {
    switch (action) {
      case 'pause':
        await syncService.pauseSync()
        break
      case 'resume':
        await syncService.resumeSync()
        break
      case 'cancel':
        await syncService.cancelSync()
        break
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use pause, resume, or cancel.' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, data: syncService.getSyncStatus() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Control action failed'
    console.error('Sync control API failure', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

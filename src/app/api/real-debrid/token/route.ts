import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseClient } from '@/lib/database/supabase-client'

interface TokenPayload {
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  clientSecret?: string
  tokenType?: string
  realDebridUserId?: string
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TokenPayload
    const {
      accessToken,
      refreshToken,
      expiresIn = 3600,
      clientSecret,
      tokenType,
      realDebridUserId,
      userId,
    } = body

    if (!accessToken || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Missing access token or client secret' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient(true)
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const payload = {
      access_token: accessToken,
      refresh_token: refreshToken ?? null,
      client_secret: clientSecret,
      expires_at: expiresAt,
      expires_in: expiresIn,
      token_type: tokenType ?? 'Bearer',
      real_debrid_id: realDebridUserId ?? null,
      user_id: userId ?? null,
    }

    const { data: existingRow, error: fetchError } = await supabase
      .from('oauth_tokens')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error('Failed to fetch existing OAuth token row', fetchError)
      return NextResponse.json(
        { success: false, error: 'Unable to load existing Real-Debrid token state' },
        { status: 500 }
      )
    }

    let mutationError
    if (existingRow?.id) {
      const { error } = await supabase.from('oauth_tokens').update(payload).eq('id', existingRow.id)
      mutationError = error
    } else {
      const { error } = await supabase.from('oauth_tokens').insert(payload)
      mutationError = error
    }

    if (mutationError) {
      console.error('Failed to persist Real-Debrid tokens', mutationError)
      return NextResponse.json(
        { success: false, error: mutationError.message || 'Unable to save Real-Debrid tokens' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected Real-Debrid token persistence error:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unexpected error saving Real-Debrid tokens',
      },
      { status: 500 }
    )
  }
}

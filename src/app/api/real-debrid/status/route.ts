import { NextResponse } from 'next/server'

import { realDebridService, RealDebridServiceError } from '@/lib/api/real-debrid-service'

export async function GET() {
  try {
    const [rateLimit, health] = await Promise.all([
      realDebridService.getRateLimitInfo(),
      realDebridService.healthCheck(),
    ])

    try {
      const user = await realDebridService.getUserInfo()

      return NextResponse.json({
        success: true,
        data: {
          user,
          rateLimit,
          health,
        },
      })
    } catch (error) {
      if (error instanceof RealDebridServiceError) {
        return NextResponse.json(
          {
            success: false,
            data: {
              user: null,
              rateLimit,
              health,
            },
            error: error.context?.message ?? error.message,
            action: error.context?.action,
            requiresReauth: error.context?.requiresReauth ?? false,
            shouldRetry: error.context?.shouldRetry ?? false,
          },
          { status: error.status ?? 500 }
        )
      }

      throw error
    }
  } catch (error) {
    if (error instanceof RealDebridServiceError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: error.context?.message ?? error.message,
          action: error.context?.action,
          requiresReauth: error.context?.requiresReauth ?? false,
          shouldRetry: error.context?.shouldRetry ?? false,
        },
        { status: error.status ?? 500 }
      )
    }

    console.error('Unexpected Real-Debrid status error:', error)

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown Real-Debrid error',
      },
      { status: 500 }
    )
  }
}

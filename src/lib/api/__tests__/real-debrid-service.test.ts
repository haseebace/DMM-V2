import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { realDebridService } from '@/lib/api/real-debrid-service'
import { realDebridClient } from '@/lib/api/real-debrid-client'
import type { ApiResponse } from '@/lib/api/real-debrid-client'

vi.mock('@/lib/api/real-debrid-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/real-debrid-client')>()
  return {
    ...actual,
    realDebridClient: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      getRateLimitSnapshot: vi.fn(() => ({ tokens: 10, resetTime: Date.now(), config: actual.realDebridClient.getRateLimitSnapshot().config })),
    },
  }
})

const mockedClient = realDebridClient as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  getRateLimitSnapshot: ReturnType<typeof vi.fn>
}

describe('realDebridService integration (mocked Real-Debrid)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const successResponse = <T,>(data: T): ApiResponse<T> => ({
    success: true,
    data,
    status: 200,
    headers: new Headers(),
  })

  it('returns user info when API responds successfully', async () => {
    mockedClient.get.mockResolvedValueOnce(successResponse({ username: 'demo', email: 'demo@example.com' }))

    const user = await realDebridService.getUserInfo()

    expect(user?.username).toBe('demo')
    expect(mockedClient.get).toHaveBeenCalledWith('/user')
  })

  it('returns empty array for files when API fails', async () => {
    mockedClient.get.mockResolvedValueOnce({
      success: false,
      status: 401,
      headers: new Headers(),
      data: undefined,
      error: { code: 'HTTP_401', message: 'Bad token', timestamp: new Date().toISOString(), details: {} },
    })

    await expect(realDebridService.getFiles()).rejects.toThrow('Authentication failed')
  })

  it('returns rate-limit snapshot', async () => {
    mockedClient.getRateLimitSnapshot.mockReturnValue({ tokens: 5, resetTime: Date.now(), config: { requestsPerMinute: 250, burstSize: 10, windowMs: 60000 } })
    const info = await realDebridService.getRateLimitInfo()
    expect(info.requestsRemaining).toBe(5)
  })

  it('health check uses /time endpoint', async () => {
    mockedClient.get.mockResolvedValueOnce(successResponse('2025-11-29 12:00:00'))
    const healthy = await realDebridService.healthCheck()
    expect(healthy).toBe(true)
    expect(mockedClient.get).toHaveBeenCalledWith('/time', expect.any(Object))
  })
})

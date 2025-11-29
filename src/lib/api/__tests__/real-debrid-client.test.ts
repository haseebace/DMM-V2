import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { RealDebridApiClient } from '@/lib/api/real-debrid-client'
import { realDebridConfig } from '@/lib/api/real-debrid-config'

type MockFetch = ReturnType<typeof vi.fn>

const originalFetch = globalThis.fetch
const fetchMock: MockFetch = vi.fn()

const createFetchResponse = ({
  ok = true,
  status = 200,
  data,
  body,
  headers = new Headers(),
}: {
  ok?: boolean
  status?: number
  data?: unknown
  body?: string
  headers?: Headers
}) => {
  const serializedBody = body ?? (data !== undefined ? JSON.stringify(data) : '')
  return {
    ok,
    status,
    headers,
    text: vi.fn().mockResolvedValue(serializedBody),
  }
}

beforeAll(() => {
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
})

afterAll(() => {
  globalThis.fetch = originalFetch
})

describe('RealDebridApiClient', () => {
  let client: RealDebridApiClient
  let authSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchMock.mockReset()
    client = new RealDebridApiClient()
    authSpy = vi.spyOn(client as any, 'getAuthToken').mockResolvedValue('mock-token')
  })

  afterEach(() => {
    authSpy.mockRestore()
  })

  describe('Request Methods', () => {
    it('should make GET requests correctly', async () => {
      const mockResponse = { data: 'test' }
      fetchMock.mockResolvedValueOnce(createFetchResponse({ data: mockResponse }))

      const result = await client.get('/test')

      expect(fetchMock).toHaveBeenCalledWith(
        `${realDebridConfig.apiBaseUrl}/test`,
        expect.objectContaining({ method: 'GET' })
      )

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Headers
      expect(headers.get('Authorization')).toBe('Bearer mock-token')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse)
    })

    it('should make POST requests correctly', async () => {
      const postData = { name: 'test' }
      const mockResponse = { id: '123' }
      fetchMock.mockResolvedValueOnce(createFetchResponse({ status: 201, data: mockResponse }))

      const result = await client.post('/test', postData)

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(init.method).toBe('POST')
      expect(init.body).toBe(JSON.stringify(postData))
      expect(result.data).toEqual(mockResponse)
    })
  })

  describe('Error Handling', () => {
    it('should handle HTTP errors correctly', async () => {
      fetchMock.mockResolvedValueOnce(
        createFetchResponse({
          ok: false,
          status: 404,
          body: JSON.stringify({ error: 'Not found' }),
        })
      )

      const result = await client.get('/nonexistent')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('Not found')
      expect(result.status).toBe(404)
    })

    it('should retry server errors', async () => {
      fetchMock
        .mockResolvedValueOnce(
          createFetchResponse({ ok: false, status: 500, body: 'Server Error' })
        )
        .mockResolvedValueOnce(createFetchResponse({ ok: false, status: 502, body: 'Bad Gateway' }))
        .mockResolvedValueOnce(createFetchResponse({ status: 200, data: { data: 'success' } }))

      const result = await client.get('/retry-test')

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ data: 'success' })
    })

    it('should not retry client errors', async () => {
      fetchMock.mockResolvedValueOnce(
        createFetchResponse({ ok: false, status: 400, body: JSON.stringify({ error: 'Bad' }) })
      )

      const result = await client.get('/bad-request')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
    })
  })

  describe('Rate Limiting', () => {
    it('should implement rate limiting', async () => {
      const rateLimitedClient = new RealDebridApiClient()
      const rateLimitAuthSpy = vi
        .spyOn(rateLimitedClient as any, 'getAuthToken')
        .mockResolvedValue('mock-token')

      fetchMock.mockImplementation(() =>
        Promise.resolve(createFetchResponse({ data: { data: 'test' } }))
      )

      const startTime = Date.now()
      const promises = Array.from({ length: 15 }).map((_, index) =>
        rateLimitedClient.get(`/limit?i=${index}`)
      )
      await Promise.all(promises)
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeGreaterThan(100)
      expect(fetchMock).toHaveBeenCalledTimes(15)

      rateLimitAuthSpy.mockRestore()
    })
  })

  describe('Request Deduplication', () => {
    it('should deduplicate identical requests', async () => {
      fetchMock.mockResolvedValueOnce(createFetchResponse({ data: { data: 'test' } }))

      const responseA = client.get('/dedupe')
      const responseB = client.get('/dedupe')

      const [resultA, resultB] = await Promise.all([responseA, responseB])

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(resultA).toEqual(resultB)
    })
  })
})

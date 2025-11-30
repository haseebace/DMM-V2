import { getSupabaseClient } from '@/lib/database/supabase-client'
import { realDebridConfig } from '@/lib/api/real-debrid-config'

// Rate limiting configuration
export interface RateLimitConfig {
  requestsPerMinute: number
  burstSize: number
  windowMs: number
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  jitter: boolean
}

// API Configuration
export interface ApiConfig {
  baseUrl: string
  timeout: number
  retryConfig: RetryConfig
  rateLimitConfig: RateLimitConfig
}

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  status: number
  headers: Headers
}

// API error types
export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
}

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// Request configuration
export interface RequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retries?: number
  skipRateLimit?: boolean
}

interface TokenRecord {
  id?: string
  access_token: string
  refresh_token?: string | null
  expires_at?: string | null
  client_secret?: string | null
}

// Token bucket implementation for rate limiting
export class TokenBucket {
  private tokens: number
  private lastRefill: number
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    this.tokens = config.burstSize
    this.lastRefill = Date.now()
  }

  async acquire(): Promise<void> {
    this.refill()

    if (this.tokens < 1) {
      const waitTime = this.calculateWaitTime()
      await this.sleep(waitTime)
      return this.acquire()
    }

    this.tokens -= 1
  }

  private refill(): void {
    const now = Date.now()
    const timePassed = now - this.lastRefill
    const tokensToAdd = Math.floor(
      timePassed / (this.config.windowMs / this.config.requestsPerMinute)
    )

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.config.burstSize, this.tokens + tokensToAdd)
      this.lastRefill = now
    }
  }

  private calculateWaitTime(): number {
    const tokensPerMs = this.config.requestsPerMinute / this.config.windowMs
    const tokensNeeded = 1 - this.tokens
    return Math.ceil(tokensNeeded / tokensPerMs)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  getSnapshot(): { tokens: number; lastRefill: number; config: RateLimitConfig } {
    return {
      tokens: this.tokens,
      lastRefill: this.lastRefill,
      config: { ...this.config },
    }
  }
}

// Real-Debrid API client
export class RealDebridApiClient {
  private config: ApiConfig
  private tokenBucket: TokenBucket
  private requestQueue: Map<string, Promise<ApiResponse<any>>> = new Map()
  private cachedToken: { token: string; expiresAt?: number } | null = null
  private refreshPromise: Promise<string | null> | null = null

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      baseUrl: realDebridConfig.apiBaseUrl,
      timeout: 10000,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
        jitter: true,
      },
      rateLimitConfig: {
        requestsPerMinute: 250,
        burstSize: 10,
        windowMs: 60000,
      },
      ...config,
    }

    this.tokenBucket = new TokenBucket(this.config.rateLimitConfig)
  }

  // Main request method
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId(endpoint, options)

    // Deduplicate identical in-flight requests
    if (this.requestQueue.has(requestId)) {
      return this.requestQueue.get(requestId) as Promise<ApiResponse<T>>
    }

    const requestPromise = this.executeRequest<T>(endpoint, options)
    this.requestQueue.set(requestId, requestPromise)

    try {
      return await requestPromise
    } finally {
      this.requestQueue.delete(requestId)
    }
  }

  private async executeRequest<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<ApiResponse<T>> {
    let lastError: ApiError | null = null
    const maxRetries = options.retries ?? this.config.retryConfig.maxRetries

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (!options.skipRateLimit) {
          await this.tokenBucket.acquire()
        }

        const response = await this.makeRequest<T>(endpoint, options)

        if (response.status >= 200 && response.status < 300) {
          return response
        }

        lastError = response.error || this.createApiError(response.status, '')

        // No retries for 4xx except 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return response
        }

        if (response.status < 500 && response.status !== 429) {
          return response
        }
      } catch (error: any) {
        lastError = this.createErrorFromException(error)
      }

      if (attempt < maxRetries) {
        const delay = this.calculateRetryDelay(attempt)
        await this.sleep(delay)
      }
    }

    return {
      success: false,
      error: lastError || {
        code: 'UNKNOWN_ERROR',
        message: 'Request failed after retries',
        timestamp: new Date().toISOString(),
      },
      status: 500,
      headers: new Headers(),
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestOptions): Promise<ApiResponse<T>> {
    const { method = 'GET', headers = {}, body, timeout = this.config.timeout } = options

    // Build full URL
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.config.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

    // Get auth token
    const token = await this.getAuthToken()

    // Prepare headers
    const requestHeaders = new Headers({
      'User-Agent': 'DFM/1.0.0 (+https://your-domain.com)',
      ...headers,
    })

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
    if (!isFormData && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json')
    }

    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }

    // Prepare body
    let requestBody: BodyInit | undefined
    if (body) {
      if (isFormData) {
        requestBody = body
      } else if (
        typeof body === 'string' ||
        body instanceof ArrayBuffer ||
        body instanceof Blob ||
        body instanceof Uint8Array ||
        body instanceof URLSearchParams
      ) {
        requestBody = body as BodyInit
      } else if (
        headers['Content-Type'] &&
        headers['Content-Type'].includes('application/x-www-form-urlencoded')
      ) {
        requestBody = new URLSearchParams(body).toString()
      } else {
        requestBody = JSON.stringify(body)
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const rawResponse = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      let data: T | undefined
      let responseText = ''

      try {
        responseText = await rawResponse.text()
        data = responseText ? (JSON.parse(responseText) as T) : undefined
      } catch {
        data = responseText as any
      }

      return {
        success: rawResponse.ok,
        data,
        error: rawResponse.ok ? undefined : this.createApiError(rawResponse.status, responseText),
        status: rawResponse.status,
        headers: rawResponse.headers,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private createApiError(status: number, responseText: string): ApiError {
    let code: string
    let message: string
    let details: any

    try {
      const errorData = JSON.parse(responseText)
      code = errorData.error_code || errorData.error || `HTTP_${status}`
      message = errorData.error_message || errorData.message || `HTTP ${status} Error`
      details = errorData
    } catch {
      code = `HTTP_${status}`
      message = `HTTP ${status} Error`
      details = { responseText }
    }

    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    }
  }

  private createErrorFromException(error: any): ApiError {
    if (error?.name === 'AbortError') {
      return {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out',
        timestamp: new Date().toISOString(),
      }
    }

    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        timestamp: new Date().toISOString(),
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'Unknown error occurred',
      details: { stack: error?.stack },
      timestamp: new Date().toISOString(),
    }
  }

  private calculateRetryDelay(attempt: number): number {
    const { baseDelay, maxDelay, backoffFactor, jitter } = this.config.retryConfig
    let delay = baseDelay * Math.pow(backoffFactor, attempt)
    if (jitter) {
      delay *= 0.5 + Math.random() * 0.5
    }
    return Math.min(delay, maxDelay)
  }

  private async getAuthToken(): Promise<string | null> {
    if (this.cachedToken && !this.isExpiringSoon(this.cachedToken.expiresAt)) {
      return this.cachedToken.token
    }

    try {
      const tokenRecord = await this.fetchTokenRecord()

      if (!tokenRecord) {
        this.cachedToken = null
        return null
      }

      const expiresAtMs = tokenRecord.expires_at
        ? new Date(tokenRecord.expires_at).getTime()
        : undefined

      if (!this.isExpiringSoon(expiresAtMs)) {
        this.cachedToken = { token: tokenRecord.access_token, expiresAt: expiresAtMs }
        return tokenRecord.access_token
      }

      const refreshedToken = await this.refreshAccessToken(tokenRecord)

      if (refreshedToken) {
        return refreshedToken
      }

      this.cachedToken = null
      return null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  private async fetchTokenRecord(): Promise<TokenRecord | null> {
    const supabase = getSupabaseClient(true)

    const { data, error } = await supabase
      .from('oauth_tokens')
      .select('id, access_token, refresh_token, expires_at, client_secret')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return data as TokenRecord
  }

  private async refreshAccessToken(record: TokenRecord): Promise<string | null> {
    if (!record.refresh_token || !record.client_secret) {
      return null
    }

    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.executeTokenRefresh(record)

    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async executeTokenRefresh(record: TokenRecord): Promise<string | null> {
    try {
      const clientSecret = record.client_secret as string
      const refreshToken = record.refresh_token as string
      const params = new URLSearchParams({
        client_id: realDebridConfig.clientId,
        client_secret: clientSecret,
        code: refreshToken,
        grant_type: realDebridConfig.grantType || 'http://oauth.net/grant_type/device/1.0',
      })

      const response = await fetch(realDebridConfig.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Real-Debrid token refresh failed:', response.status, errorText)
        return null
      }

      const payload = await response.json()

      if (!payload.access_token) {
        console.error('Real-Debrid token refresh response missing access_token')
        return null
      }

      const expiresAtIso = new Date(Date.now() + (payload.expires_in || 3600) * 1000).toISOString()

      const supabase = getSupabaseClient(true)
      let updateQuery = supabase.from('oauth_tokens').update({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token ?? record.refresh_token,
        expires_at: expiresAtIso,
      })

      updateQuery = record.id
        ? updateQuery.eq('id', record.id)
        : updateQuery.eq('access_token', record.access_token)

      const { error } = await updateQuery

      if (error) {
        console.error('Failed to persist refreshed Real-Debrid token:', error)
      }

      this.cachedToken = {
        token: payload.access_token,
        expiresAt: new Date(expiresAtIso).getTime(),
      }

      return payload.access_token
    } catch (error) {
      console.error('Error refreshing Real-Debrid token:', error)
      return null
    }
  }

  private isExpiringSoon(expiresAt?: number, thresholdMs = 60000): boolean {
    if (!expiresAt) {
      return false
    }

    return expiresAt - Date.now() <= thresholdMs
  }

  private generateRequestId(endpoint: string, options: RequestOptions): string {
    const { method = 'GET', body } = options
    const bodyHash = body ? JSON.stringify(body) : ''
    return `${method}:${endpoint}:${bodyHash}`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  getRateLimitSnapshot(): {
    tokens: number
    resetTime: number
    config: RateLimitConfig
  } {
    const snapshot = this.tokenBucket.getSnapshot()
    return {
      tokens: snapshot.tokens,
      resetTime: snapshot.lastRefill + snapshot.config.windowMs,
      config: { ...snapshot.config },
    }
  }

  clearCachedToken(): void {
    this.cachedToken = null
    this.refreshPromise = null
  }

  // HTTP method helpers
  async get<T = any>(
    endpoint: string,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data })
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data })
  }

  async delete<T = any>(
    endpoint: string,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: data })
  }
}

// Export singleton instance
export const realDebridClient = new RealDebridApiClient()

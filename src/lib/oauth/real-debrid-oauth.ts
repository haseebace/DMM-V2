// Real-Debrid OAuth2 Device Code Flow Implementation
// This implements the correct OAuth2 device code flow as specified:
// 1. App requests device code + user code from Real-Debrid
// 2. User authorizes with user code
// 3. App polls device authorization status
// 4. Real-Debrid returns access token when authorized

import { realDebridConfig } from '@/lib/api/real-debrid-config'

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_url: string
  expires_in: number
  interval: number
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

export interface OAuthState {
  device_code: string
  user_code: string
  verification_url: string
  expires_in: number
  interval: number
  expires_at: number
  client_id?: string
  client_secret?: string
}

export class RealDebridOAuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message)
    this.name = 'RealDebridOAuthError'
    this.code = code
    this.status = status
  }
}

// Step 1: Request device code from Real-Debrid
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  try {
    const clientId = realDebridConfig.clientId || 'X245A4XAIBGVM'

    console.log('🔐 Requesting device code from:', realDebridConfig.deviceCodeEndpoint)
    console.log('📱 Using client ID:', clientId)

    // Add additional debugging and CORS handling
    const requestUrl = `${realDebridConfig.deviceCodeEndpoint}?client_id=${encodeURIComponent(clientId)}&new_credentials=yes`
    console.log('🌐 Full request URL:', requestUrl)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DMM-Client/1.0',
        Origin: window.location.origin,
      },
      mode: 'cors',
      credentials: 'omit', // Don't send credentials for cross-origin requests
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    console.log('📡 Device code response status:', response.status, response.statusText)
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Device code request failed:', response.status, errorText)

      // Provide more specific error information
      let errorMessage = `Device code request failed: ${response.statusText}`
      if (response.status === 0) {
        errorMessage =
          'Network error - Unable to reach Real-Debrid API. Check your internet connection.'
      } else if (response.status === 403) {
        errorMessage = 'Forbidden - Check if your client ID is correct'
      } else if (response.status === 429) {
        errorMessage = 'Too many requests - Please wait before trying again'
      } else if (response.status >= 500) {
        errorMessage = 'Real-Debrid server error - Please try again later'
      }

      throw new RealDebridOAuthError(
        `${errorMessage} - ${errorText}`,
        'DEVICE_CODE_REQUEST_FAILED',
        response.status
      )
    }

    const data = await response.json()
    console.log('✅ Device code response received:', data)

    // Validate response structure
    if (!data.device_code || !data.user_code || !data.verification_url) {
      console.error('❌ Invalid device code response structure:', data)
      throw new RealDebridOAuthError(
        'Invalid device code response from Real-Debrid',
        'INVALID_DEVICE_CODE_RESPONSE'
      )
    }

    return {
      device_code: data.device_code,
      user_code: data.user_code,
      verification_url: data.verification_url,
      expires_in: data.expires_in || 1800,
      interval: data.interval || 5,
    }
  } catch (error) {
    console.error('❌ Network error in requestDeviceCode:', error)

    // Handle specific error types
    if (error instanceof RealDebridOAuthError) {
      throw error
    }

    if (error instanceof TypeError) {
      if (error.message.includes('Failed to fetch')) {
        throw new RealDebridOAuthError(
          'CORS/Network Error: Unable to connect to Real-Debrid API. The API may not allow requests from your current domain (localhost).',
          'CORS_ERROR'
        )
      } else if (error.message.includes('NetworkError')) {
        throw new RealDebridOAuthError(
          'Network Error: Unable to reach Real-Debrid API. Please check your internet connection.',
          'NETWORK_ERROR'
        )
      }
    }

    if (error.name === 'AbortError') {
      throw new RealDebridOAuthError(
        'Request timeout - Unable to connect to Real-Debrid API within 10 seconds',
        'TIMEOUT_ERROR'
      )
    }

    throw new RealDebridOAuthError(
      `Network error requesting device code: ${error.message || error}`,
      'NETWORK_ERROR'
    )
  }
}

// Step 1.5: Get device credentials for open-source apps
export async function requestDeviceCredentials(
  deviceCode: string
): Promise<{ client_id: string; client_secret: string }> {
  try {
    const clientId = realDebridConfig.clientId || 'X245A4XAIBGVM'
    const maxAttempts = realDebridConfig.maxPollingAttempts
    const pollingInterval = realDebridConfig.pollingInterval
    let attempt = 0

    console.log(
      '🔐 Requesting device credentials from:',
      realDebridConfig.deviceCredentialsEndpoint
    )
    console.log('📱 Using client ID:', clientId)

    const pollCredentials = async (): Promise<{ client_id: string; client_secret: string }> => {
      attempt++

      if (attempt > maxAttempts) {
        throw new RealDebridOAuthError(
          'Device authorization timed out while waiting for credentials',
          'DEVICE_CREDENTIALS_TIMEOUT'
        )
      }

      const requestUrl = `${realDebridConfig.deviceCredentialsEndpoint}?client_id=${encodeURIComponent(clientId)}&code=${encodeURIComponent(deviceCode)}`
      console.log('🌐 Full request URL:', requestUrl)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DMM-Client/1.0',
          Origin: window.location.origin,
        },
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log('📡 Device credentials response status:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Device credentials received:', data)

        if (!data.client_id || !data.client_secret) {
          console.error('❌ Invalid device credentials response structure:', data)
          throw new RealDebridOAuthError(
            'Invalid device credentials response from Real-Debrid',
            'INVALID_DEVICE_CREDENTIALS_RESPONSE'
          )
        }

        return {
          client_id: data.client_id,
          client_secret: data.client_secret,
        }
      }

      // When the user has not approved yet Real-Debrid returns an error; treat it as "pending"
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        console.log('⏳ Authorization pending for credentials, retrying...')
        await new Promise((resolve) => setTimeout(resolve, pollingInterval))
        return pollCredentials()
      }

      if (response.status === 429) {
        console.log('🐌 Rate limited while requesting credentials, slowing down polling...')
        await new Promise((resolve) => setTimeout(resolve, pollingInterval * 2))
        return pollCredentials()
      }

      const errorText = await response.text()
      console.error('❌ Device credentials request failed:', response.status, errorText)
      throw new RealDebridOAuthError(
        `Device credentials request failed: ${response.statusText} - ${errorText}`,
        'DEVICE_CREDENTIALS_REQUEST_FAILED',
        response.status
      )
    }

    return pollCredentials()
  } catch (error) {
    console.error('❌ Network error in requestDeviceCredentials:', error)

    if (error instanceof RealDebridOAuthError) {
      throw error
    }

    if (error instanceof TypeError) {
      if (error.message.includes('Failed to fetch')) {
        throw new RealDebridOAuthError(
          'CORS/Network Error: Unable to connect to Real-Debrid API. The API may not allow requests from your current domain (localhost).',
          'CORS_ERROR'
        )
      } else if (error.message.includes('NetworkError')) {
        throw new RealDebridOAuthError(
          'Network Error: Unable to reach Real-Debrid API. Please check your internet connection.',
          'NETWORK_ERROR'
        )
      }
    }

    throw new RealDebridOAuthError(
      `Network error requesting device credentials: ${error.message || error}`,
      'NETWORK_ERROR'
    )
  }
}

// Step 2: Poll for authorization status and get access token
export async function pollForAuthorization(
  deviceCode: string,
  options?: {
    onPolling?: (attempt: number, maxAttempts: number) => void
    clientId?: string
    clientSecret?: string
  }
): Promise<TokenResponse> {
  const { onPolling, clientId: overrideClientId, clientSecret } = options || {}
  const maxAttempts = realDebridConfig.maxPollingAttempts
  const pollingInterval = realDebridConfig.pollingInterval
  let attempt = 0

  const poll = async (): Promise<TokenResponse> => {
    attempt++

    if (attempt > maxAttempts) {
      throw new RealDebridOAuthError('Device authorization timed out', 'AUTHORIZATION_TIMEOUT')
    }

    // Callback for UI updates
    onPolling?.(attempt, maxAttempts)

    try {
      const clientId = overrideClientId || realDebridConfig.clientId || 'X245A4XAIBGVM'

      console.log(`🔄 Polling attempt ${attempt}/${maxAttempts} for device code:`, deviceCode)

      // Use the standard token endpoint as per Real-Debrid OAuth2.1 Device Code Flow spec
      const response = await fetch(realDebridConfig.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: clientId,
          ...(clientSecret ? { client_secret: clientSecret } : {}),
          grant_type: realDebridConfig.grantType || 'http://oauth.net/grant_type/device/1.0',
          code: deviceCode,
        }),
      })

      console.log('📡 Token poll response:', response.status, response.statusText)
      console.log('📋 Requested URL:', realDebridConfig.tokenEndpoint)
      console.log('📤 Request body:', {
        client_id: clientId,
        grant_type: realDebridConfig.grantType,
        device_code: deviceCode,
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Authorization successful!', data)

        // Validate token response
        if (!data.access_token) {
          throw new RealDebridOAuthError(
            'Invalid token response from Real-Debrid',
            'INVALID_TOKEN_RESPONSE'
          )
        }

        return {
          access_token: data.access_token,
          token_type: data.token_type || 'Bearer',
          expires_in: data.expires_in || 3600,
          refresh_token: data.refresh_token,
        }
      }

      // Handle authorization pending response (according to OAuth 2.1 spec)
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}))
        console.log('📡 400 Response data:', errorData)

        // Real-Debrid specific error codes for device flow
        if (
          errorData.error === 'authorization_pending' ||
          errorData.error === 'slow_down' ||
          errorData.error_code === 8
        ) {
          console.log('⏳ Authorization pending, continuing to poll...')
          if (errorData.error === 'slow_down') {
            const slowDownInterval = (errorData.interval || pollingInterval) * 2
            console.log(`🐌 Slow down, extending interval to ${slowDownInterval}ms`)
            await new Promise((resolve) => setTimeout(resolve, slowDownInterval))
          } else {
            await new Promise((resolve) => setTimeout(resolve, pollingInterval))
          }
          return poll()
        } else {
          const errorText = JSON.stringify(errorData)
          console.error('❌ Authorization error:', errorText)
          throw new RealDebridOAuthError(
            `Authorization failed: ${errorText}`,
            'AUTHORIZATION_FAILED',
            response.status
          )
        }
      }

      // Handle slow_down response
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}))
        const slowDownInterval = (errorData.interval || pollingInterval) * 2
        console.log('🐌 Slow down, extending interval:', slowDownInterval)
        await new Promise((resolve) => setTimeout(resolve, slowDownInterval))
        return poll()
      }

      // Other errors
      const errorText = await response.text()
      console.error('❌ Unexpected error response:', errorText)
      throw new RealDebridOAuthError(
        `Authorization failed: ${errorText}`,
        'AUTHORIZATION_FAILED',
        response.status
      )
    } catch (error) {
      if (error instanceof RealDebridOAuthError) {
        throw error
      }

      console.error('❌ Network error during polling:', error)
      // Network error, continue polling
      await new Promise((resolve) => setTimeout(resolve, pollingInterval))
      return poll()
    }
  }

  return poll()
}

// Complete OAuth2 flow
export async function startOAuthFlow(
  onDeviceCodeReceived?: (deviceCode: DeviceCodeResponse) => void,
  onPolling?: (attempt: number, maxAttempts: number) => void
): Promise<{ oauthState: OAuthState; tokenResponse: TokenResponse }> {
  try {
    // Step 1: Request device code
    console.log('🚀 Starting OAuth2 device code flow...')
    const deviceCodeResponse = await requestDeviceCode()
    console.log('✅ Device code received:', deviceCodeResponse)

    // Store OAuth state
    const oauthState: OAuthState = {
      device_code: deviceCodeResponse.device_code,
      user_code: deviceCodeResponse.user_code,
      verification_url: deviceCodeResponse.verification_url,
      expires_in: deviceCodeResponse.expires_in,
      interval: deviceCodeResponse.interval,
      expires_at: Date.now() + deviceCodeResponse.expires_in * 1000,
    }

    console.log('🔄 OAuth state created:', oauthState)

    // Notify UI
    onDeviceCodeReceived?.(deviceCodeResponse)

    // Step 1.5: Get device credentials for open-source apps (polls until user authorizes)
    console.log('🔑 Waiting for device credentials after user authorization...')
    const deviceCredentials = await requestDeviceCredentials(deviceCodeResponse.device_code)
    console.log('✅ Device credentials received:', deviceCredentials)

    // Update OAuth state with new client credentials
    const updatedOAuthState: OAuthState = {
      device_code: deviceCodeResponse.device_code,
      user_code: deviceCodeResponse.user_code,
      verification_url: deviceCodeResponse.verification_url,
      expires_in: deviceCodeResponse.expires_in,
      interval: deviceCodeResponse.interval,
      expires_at: Date.now() + deviceCodeResponse.expires_in * 1000,
      client_id: deviceCredentials.client_id,
      client_secret: deviceCredentials.client_secret,
    }

    console.log('🔄 Updated OAuth state with device credentials:', updatedOAuthState)

    // Step 2: Start polling for authorization with new credentials
    console.log('⏳ Starting authorization polling with device credentials...')
    const tokenResponse = await pollForAuthorization(deviceCodeResponse.device_code, {
      onPolling,
      clientId: deviceCredentials.client_id,
      clientSecret: deviceCredentials.client_secret,
    })

    return { oauthState: updatedOAuthState, tokenResponse }
  } catch (error) {
    console.error('❌ OAuth flow failed:', error)
    throw error
  }
}

// Check if OAuth state is still valid
export function isOAuthStateValid(oauthState: OAuthState): boolean {
  return Date.now() < oauthState.expires_at
}

// Format user code for display (with spaces for readability)
export function formatUserCode(userCode: string): string {
  return userCode.match(/.{1,4}/g)?.join('-') || userCode
}

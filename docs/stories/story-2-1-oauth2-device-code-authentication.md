# Story 2.1: OAuth2 Device Code Authentication Flow

**Epic:** Real-Debrid Integration
**Priority:** Critical | **Story Points:** 5 | **Tech Spec Level:** Detailed Implementation

**Status:** Ready for Development

---

## User Story

As a user,
I want to connect my Real-Debrid account to DMM using device code authentication,
So that I can authorize the application to access my Real-Debrid files securely.

---

## Technical Specification

### Overview

This story implements the OAuth2 Device Code flow for Real-Debrid integration, allowing users to securely connect their Real-Debrid accounts to DMM without exposing credentials. This implements Option 3 (Open Source Apps) from Real-Debrid's authentication documentation.

### Technology Stack

- **OAuth2 Flow**: Device Code Authorization Grant (RFC 8628)
- **Real-Debrid Client ID**: X245A4XAIBGVM (Open Source Apps)
- **API Integration**: Next.js API routes for server-side OAuth
- **State Management**: Zustand for authentication state
- **UI Components**: shadcn/ui (dialog, button, input, alert)
- **Database**: Supabase for storing OAuth tokens
- **Polling**: Server-sent events for real-time status updates

### Real-Debrid OAuth2 Device Code Flow

#### 1. Request Device Code

```
POST https://api.real-debrid.com/oauth/v2/device/code
Content-Type: application/x-www-form-urlencoded

client_id=X245A4XAIBGVM
&new_credentials=yes
&scope=default
```

#### 2. Display Device Code to User

Response includes:

- `device_code`: Code to enter on Real-Debrid website
- `user_code`: User-friendly display code
- `verification_url`: `https://real-debrid.com/device`
- `expires_in`: Time until code expires (typically 1800 seconds)
- `interval`: Polling interval (typically 5 seconds)

#### 3. User Authorization

User visits verification URL and enters the device code

#### 4. Exchange Device Code for Credentials

```
POST https://api.real-debrid.com/oauth/v2/device/credentials
Content-Type: application/x-www-form-urlencoded

client_id=X245A4XAIBGVM
&code=DEVICE_CODE_FROM_STEP_1
```

#### 5. Exchange Credentials for Access Token

```
POST https://api.real-debrid.com/oauth/v2/token
Content-Type: application/x-www-form-urlencoded

client_id=X245A4XAIBGVM
&client_secret=CLIENT_SECRET_FROM_STEP_4
&code=CODE_FROM_STEP_4
&grant_type=urn:ietf:params:oauth:grant-type:device_code
```

### Implementation Tasks

#### 1. Create Database Schema for OAuth Tokens

**Update migration:**

```sql
-- OAuth tokens table (already created in Story 1.2, ensure this schema)
CREATE TABLE oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  real_debrid_user_id VARCHAR(255), -- Store Real-Debrid user ID for reference
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  client_secret TEXT, -- Store client secret from step 4
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Device codes table for tracking active authentication attempts
CREATE TABLE device_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_code TEXT NOT NULL,
  user_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_code)
);

-- Add indexes for performance
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);
CREATE INDEX idx_device_codes_user_id ON device_codes(user_id);
CREATE INDEX idx_device_codes_expires_at ON device_codes(expires_at);
```

**Validation:**

- [ ] OAuth tokens table matches required schema
- [ ] Device codes table is created for tracking attempts
- [ ] Indexes optimize performance for authentication queries
- [ ] RLS policies allow users to manage their own tokens

#### 2. Create OAuth Configuration

**File: `src/lib/oauth/real-debrid-oauth.ts`:**

```typescript
import { realDebridConfig } from '@/lib/api/real-debrid-config'

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_url: string
  expires_in: number
  interval: number
}

export interface DeviceCredentialsResponse {
  client_id: string
  client_secret: string
  code: string
}

export interface TokenExchangeResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

export interface OAuthState {
  deviceCode?: string
  userCode?: string
  verificationUrl?: string
  expiresAt?: Date
  interval?: number
  status: 'idle' | 'pending' | 'authorized' | 'error' | 'connected'
  error?: string
}

// Device code flow implementation
export class RealDebridOAuth {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  // Step 1: Request device code
  async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const response = await fetch(realDebridConfig.endpoints.deviceCode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: realDebridConfig.clientId,
        new_credentials: 'yes',
        scope: realDebridConfig.oauth.scope,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to request device code: ${response.statusText}`)
    }

    return response.json()
  }

  // Step 4: Exchange device code for credentials
  async exchangeDeviceCode(deviceCode: string): Promise<DeviceCredentialsResponse> {
    const response = await fetch(realDebridConfig.endpoints.deviceCredentials, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: realDebridConfig.clientId,
        code: deviceCode,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to exchange device code: ${response.statusText}`)
    }

    return response.json()
  }

  // Step 5: Exchange credentials for access token
  async exchangeForAccessToken(clientSecret: string, code: string): Promise<TokenExchangeResponse> {
    const response = await fetch(realDebridConfig.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: realDebridConfig.clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: realDebridConfig.oauth.grantType,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to exchange for access token: ${response.statusText}`)
    }

    return response.json()
  }

  // Start polling for authorization status
  startPolling(deviceCode: string, interval: number, callback: () => Promise<void>) {
    // Clear existing polling for this device code
    this.stopPolling(deviceCode)

    const pollInterval = setInterval(async () => {
      try {
        await callback()
      } catch (error) {
        console.error('Polling error:', error)
        this.stopPolling(deviceCode)
      }
    }, interval * 1000)

    this.pollingIntervals.set(deviceCode, pollInterval)
  }

  // Stop polling for a device code
  stopPolling(deviceCode: string) {
    const interval = this.pollingIntervals.get(deviceCode)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(deviceCode)
    }
  }

  // Clean up expired device codes
  cleanupExpiredCodes() {
    for (const [code, interval] of this.pollingIntervals) {
      this.stopPolling(code)
    }
  }
}

export const realDebridOAuth = new RealDebridOAuth()
```

**Validation:**

- [ ] OAuth class implements device code flow correctly
- [ ] All three OAuth steps are supported
- [ ] Polling mechanism prevents excessive API calls
- [ ] Error handling covers all failure scenarios
- [ ] TypeScript interfaces match Real-Debrid API responses

#### 3. Create API Routes for OAuth

**File: `src/app/api/auth/device/code/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { realDebridOAuth } from '@/lib/oauth/real-debrid-oauth'
import { getSupabaseClient } from '@/lib/database/supabase-client'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = getSupabaseClient(true)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Request device code from Real-Debrid
    const deviceCodeResponse = await realDebridOAuth.requestDeviceCode()

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + deviceCodeResponse.expires_in * 1000)

    // Store device code in database
    const { error: dbError } = await supabase.from('device_codes').insert({
      user_id: user.id,
      device_code: deviceCodeResponse.device_code,
      user_code: deviceCodeResponse.user_code,
      expires_at: expiresAt.toISOString(),
    })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to store device code' }, { status: 500 })
    }

    // Start polling for authorization
    realDebridOAuth.startPolling(deviceCodeResponse.device_code, deviceCodeResponse.interval, () =>
      checkDeviceAuthorization(deviceCodeResponse.device_code, user.id)
    )

    return NextResponse.json({
      deviceCode: deviceCodeResponse.device_code,
      userCode: deviceCodeResponse.user_code,
      verificationUrl: deviceCodeResponse.verification_url,
      expiresIn: deviceCodeResponse.expires_in,
      interval: deviceCodeResponse.interval,
    })
  } catch (error) {
    console.error('Device code error:', error)
    return NextResponse.json({ error: 'Failed to initiate device authorization' }, { status: 500 })
  }
}

async function checkDeviceAuthorization(deviceCode: string, userId: string) {
  const supabase = getSupabaseClient(true)

  try {
    // Check if device code has been authorized
    const credentials = await realDebridOAuth.exchangeDeviceCode(deviceCode)

    // Exchange credentials for access token
    const tokenResponse = await realDebridOAuth.exchangeForAccessToken(
      credentials.client_secret,
      credentials.code
    )

    // Store tokens in database
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000)

    await supabase.from('oauth_tokens').upsert({
      user_id: userId,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || null,
      client_secret: credentials.client_secret,
      expires_at: expiresAt.toISOString(),
    })

    // Clean up device code
    await supabase.from('device_codes').delete().match({ device_code: deviceCode })

    // Stop polling
    realDebridOAuth.stopPolling(deviceCode)

    console.log('Authorization successful for user:', userId)
  } catch (error) {
    // This is expected if authorization hasn't completed yet
    // Check if device code has expired
    const { data: deviceRecord } = await supabase
      .from('device_codes')
      .select('expires_at')
      .eq('device_code', deviceCode)
      .single()

    if (deviceRecord && new Date(deviceRecord.expires_at) < new Date()) {
      // Device code expired, clean up and stop polling
      await supabase.from('device_codes').delete().match({ device_code: deviceCode })

      realDebridOAuth.stopPolling(deviceCode)
      console.log('Device code expired for user:', userId)
    }
  }
}
```

**File: `src/app/api/auth/device/status/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/database/supabase-client'
import { realDebridOAuth } from '@/lib/oauth/real-debrid-oauth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const deviceCode = searchParams.get('deviceCode')

    if (!deviceCode) {
      return NextResponse.json({ error: 'Device code is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = getSupabaseClient(true)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check device code status
    const { data: deviceRecord, error: deviceError } = await supabase
      .from('device_codes')
      .select('*')
      .eq('device_code', deviceCode)
      .eq('user_id', user.id)
      .single()

    if (deviceError || !deviceRecord) {
      return NextResponse.json({
        status: 'not_found',
      })
    }

    // Check if expired
    if (new Date(deviceRecord.expires_at) < new Date()) {
      return NextResponse.json({
        status: 'expired',
        expiredAt: deviceRecord.expires_at,
      })
    }

    // Check if tokens exist (authorization completed)
    const { data: tokenRecord } = await supabase
      .from('oauth_tokens')
      .select('expires_at')
      .eq('user_id', user.id)
      .single()

    if (tokenRecord) {
      return NextResponse.json({
        status: 'connected',
        connectedAt: tokenRecord.created_at,
      })
    }

    return NextResponse.json({
      status: 'pending',
      expiresAt: deviceRecord.expires_at,
      userCode: deviceRecord.user_code,
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Failed to check authorization status' }, { status: 500 })
  }
}
```

**File: `src/app/api/auth/disconnect/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/database/supabase-client'
import { realDebridOAuth } from '@/lib/oauth/real-debrid-oauth'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = getSupabaseClient(true)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Clean up any active device codes
    await supabase.from('device_codes').delete().eq('user_id', user.id)

    // Stop any active polling
    const { data: deviceCodes } = await supabase
      .from('device_codes')
      .select('device_code')
      .eq('user_id', user.id)

    if (deviceCodes) {
      for (const { device_code } of deviceCodes) {
        realDebridOAuth.stopPolling(device_code)
      }
    }

    // Remove OAuth tokens
    const { error: tokenError } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', user.id)

    if (tokenError) {
      console.error('Token deletion error:', tokenError)
      return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Account disconnected successfully',
    })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 })
  }
}
```

**Validation:**

- [ ] Device code endpoint initiates OAuth flow correctly
- [ ] Status endpoint provides real-time authorization updates
- [ ] Disconnect endpoint cleans up all authentication data
- [ ] All endpoints are protected with authentication
- [ ] Error handling covers all scenarios

#### 4. Create OAuth State Management

**File: `src/stores/auth-store.ts`:**

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { OAuthState } from '@/lib/oauth/real-debrid-oauth'

interface AuthStore extends OAuthState {
  // Actions
  startDeviceAuth: () => Promise<void>
  checkAuthStatus: (deviceCode: string) => Promise<void>
  disconnectAccount: () => Promise<void>
  resetState: () => void
  setError: (error: string) => void
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      status: 'idle',

      // Start device authentication
      startDeviceAuth: async () => {
        try {
          set({ status: 'pending', error: undefined })

          const response = await fetch('/api/auth/device/code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to start authentication')
          }

          const data = await response.json()

          set({
            deviceCode: data.deviceCode,
            userCode: data.userCode,
            verificationUrl: data.verificationUrl,
            expiresAt: new Date(Date.now() + data.expiresIn * 1000),
            interval: data.interval,
            status: 'pending',
          })

          // Start status polling
          const pollStatus = async () => {
            const { deviceCode, expiresAt, status } = get()

            if (!deviceCode || status !== 'pending') return
            if (expiresAt && new Date() > expiresAt) {
              set({ status: 'error', error: 'Authorization code expired' })
              return
            }

            try {
              const statusResponse = await fetch(`/api/auth/device/status?deviceCode=${deviceCode}`)

              if (!statusResponse.ok) {
                const error = await statusResponse.json()
                set({ status: 'error', error: error.error })
                return
              }

              const statusData = await statusResponse.json()

              switch (statusData.status) {
                case 'connected':
                  set({ status: 'connected' })
                  break
                case 'expired':
                  set({ status: 'error', error: 'Authorization code expired' })
                  break
                case 'not_found':
                  set({ status: 'error', error: 'Authorization session not found' })
                  break
                case 'pending':
                  // Continue polling
                  break
                default:
                  set({ status: 'error', error: 'Unknown authorization status' })
              }
            } catch (error) {
              console.error('Status polling error:', error)
              // Don't set error state for polling errors, just log them
            }
          }

          // Start polling with the interval from the response
          const pollInterval = setInterval(pollStatus, (get().interval || 5) * 1000)

          // Clean up polling when component unmounts or authorization completes
          return () => clearInterval(pollInterval)
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof Error ? error.message : 'Authentication failed',
          })
        }
      },

      // Check authentication status
      checkAuthStatus: async (deviceCode: string) => {
        try {
          const response = await fetch(`/api/auth/device/status?deviceCode=${deviceCode}`)

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to check status')
          }

          const data = await response.json()

          switch (data.status) {
            case 'connected':
              set({ status: 'connected' })
              break
            case 'expired':
              set({ status: 'error', error: 'Authorization code expired' })
              break
            case 'pending':
              // Continue pending state
              break
            default:
              set({ status: 'error', error: 'Unknown authorization status' })
          }
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof Error ? error.message : 'Status check failed',
          })
        }
      },

      // Disconnect account
      disconnectAccount: async () => {
        try {
          set({ status: 'pending', error: undefined })

          const response = await fetch('/api/auth/disconnect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to disconnect account')
          }

          // Reset state
          get().resetState()
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof Error ? error.message : 'Disconnection failed',
          })
        }
      },

      // Reset state
      resetState: () => {
        set({
          deviceCode: undefined,
          userCode: undefined,
          verificationUrl: undefined,
          expiresAt: undefined,
          interval: undefined,
          status: 'idle',
          error: undefined,
        })
      },

      // Set error
      setError: (error: string) => {
        set({ status: 'error', error })
      },
    }),
    {
      name: 'auth-store',
    }
  )
)
```

**Validation:**

- [ ] Zustand store manages OAuth state correctly
- [ ] Device authentication flow is properly implemented
- [ ] Status polling works with automatic cleanup
- [ ] Error handling covers all scenarios
- [ ] Store can be reset and disconnected correctly

#### 5. Create Authentication UI Components

**File: `src/components/auth/device-auth-dialog.tsx`:**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Copy, ExternalLink, RefreshCw, Check, X, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface DeviceAuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeviceAuthDialog({ open, onOpenChange }: DeviceAuthDialogProps) {
  const { status, userCode, verificationUrl, expiresAt, error, startDeviceAuth, resetState } =
    useAuthStore()

  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  // Calculate time remaining
  useEffect(() => {
    if (!expiresAt) return

    const calculateTimeRemaining = () => {
      const now = new Date()
      const expiry = new Date(expiresAt)
      const remaining = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000))
      setTimeRemaining(remaining)
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  // Start authentication when dialog opens
  useEffect(() => {
    if (open && status === 'idle') {
      startDeviceAuth()
    }
  }, [open, status, startDeviceAuth])

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    onOpenChange(newOpen)
  }

  // Copy user code to clipboard
  const copyUserCode = async () => {
    if (!userCode) return

    try {
      await navigator.clipboard.writeText(userCode)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Open verification URL
  const openVerificationUrl = () => {
    if (!verificationUrl) return
    window.open(verificationUrl, '_blank')
  }

  // Format time remaining
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to Real-Debrid</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Initial/Pending State */}
          {status === 'pending' && userCode && (
            <div className="space-y-4">
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Enter this code on the Real-Debrid website:
                </p>

                <div className="flex items-center justify-center gap-2">
                  <Input
                    value={userCode}
                    readOnly
                    className="w-32 text-center font-mono text-2xl font-bold"
                  />
                  <Button size="sm" variant="outline" onClick={copyUserCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button onClick={openVerificationUrl} className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Real-Debrid Authorization Page
                </Button>

                {verificationUrl && (
                  <p className="break-all text-xs text-muted-foreground">{verificationUrl}</p>
                )}
              </div>

              {timeRemaining > 0 && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>Code expires in {formatTime(timeRemaining)}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-center">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Waiting for authorization...
                </span>
              </div>
            </div>
          )}

          {/* Connected State */}
          {status === 'connected' && (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-6 w-6" />
                  <span className="font-medium">Successfully Connected!</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Your Real-Debrid account has been connected to DMM.
              </p>

              <Button onClick={() => onOpenChange(false)} className="w-full">
                Continue to Application
              </Button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => startDeviceAuth()} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>

                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {status === 'idle' && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Initializing authentication...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**File: `src/components/auth/connect-button.tsx`:**

```tsx
'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { DeviceAuthDialog } from './device-auth-dialog'
import { Link, LogOut } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ConnectButton() {
  const { status, disconnectAccount } = useAuthStore()
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Real-Debrid account?')) {
      await disconnectAccount()
    }
  }

  if (status === 'connected') {
    return (
      <div className="space-y-2">
        <Alert>
          <Link className="h-4 w-4" />
          <AlertDescription>Your Real-Debrid account is connected.</AlertDescription>
        </Alert>

        <Button variant="outline" onClick={handleDisconnect} className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect Account
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button onClick={() => setShowAuthDialog(true)} className="w-full">
        <Link className="mr-2 h-4 w-4" />
        Connect to Real-Debrid
      </Button>

      <DeviceAuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  )
}
```

**Validation:**

- [ ] Device authentication dialog provides clear user guidance
- [ ] Copy functionality works for device codes
- [ ] Status updates provide real-time feedback
- [ ] Error states are handled gracefully
- [ ] Connected state shows successful connection

#### 6. Create Connection Page

**File: `src/app/connection/page.tsx`:**

```tsx
import { ConnectButton } from '@/components/auth/connect-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ConnectionPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Connect to Real-Debrid</h1>
          <p className="text-muted-foreground">
            Connect your Real-Debrid account to start organizing your files with DMM.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Real-Debrid Integration</CardTitle>
            <CardDescription>
              DMM uses OAuth2 device code flow to securely connect to your Real-Debrid account
              without storing your credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConnectButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                1
              </div>
              <div>
                <h4 className="font-medium">Click Connect</h4>
                <p className="text-sm text-muted-foreground">Start the authentication process</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                2
              </div>
              <div>
                <h4 className="font-medium">Enter Device Code</h4>
                <p className="text-sm text-muted-foreground">
                  Copy the code and enter it on real-debrid.com/device
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                3
              </div>
              <div>
                <h4 className="font-medium">Authorize Access</h4>
                <p className="text-sm text-muted-foreground">
                  Grant DMM permission to access your files
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                4
              </div>
              <div>
                <h4 className="font-medium">Start Organizing</h4>
                <p className="text-sm text-muted-foreground">
                  Your files will sync and you can create virtual folders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Validation:**

- [ ] Connection page provides clear instructions
- [ ] User experience flows logically through steps
- [ ] UI matches application design system
- [ ] Page is responsive and accessible
- [ ] Connect button integrates properly

### Acceptance Criteria

#### Given-When-Then Format

**GIVEN** the foundation is set up and I'm on the DMM application at `localhost:3000/connection`
**WHEN** I click the "Connect to Real-Debrid" button
**THEN** I see a device code displayed on screen with instructions to visit `real-debrid.com/device`

**AND** following user journey works correctly:

1. **Device Code Display Validation:**
   - ✅ Device code appears in the authentication dialog
   - ✅ User-friendly code is displayed prominently
   - ✅ Verification URL is provided with a link button
   - ✅ Copy button works to copy the code to clipboard
   - ✅ Code expiration timer shows remaining time
   - ✅ Instructions are clear and easy to follow

2. **Authorization Process Validation:**
   - ✅ After entering code on Real-Debrid website, application detects authorization
   - ✅ Device code is exchanged for credentials automatically
   - ✅ Credentials are exchanged for access/refresh tokens
   - ✅ Tokens are stored securely in the database
   - ✅ User sees confirmation that account is connected
   - ✅ User is redirected to `/home` after successful connection

3. **Real-time Status Updates Validation:**
   - ✅ Authorization status updates automatically without page refresh
   - ✅ Progress indicators show the current step
   - ✅ Error messages display clearly if authorization fails
   - ✅ Timeout handling works for expired device codes
   - ✅ Polling stops efficiently after successful authorization

4. **Security Validation:**
   - ✅ OAuth2 device code flow is implemented correctly
   - ✅ Client ID matches Real-Debrid Open Source Apps (X245A4XAIBGVM)
   - ✅ Access tokens are stored securely with expiration times
   - ✅ Refresh tokens are available for token renewal
   - ✅ User credentials are never exposed to the client
   - ✅ Row Level Security protects user OAuth data

5. **Error Handling Validation:**
   - ✅ Network errors show user-friendly messages
   - ✅ Invalid device codes are handled gracefully
   - ✅ Expired device codes provide clear error messages
   - ✅ Authorization denials show appropriate feedback
   - ✅ Retry functionality works for failed attempts
   - ✅ Connection can be attempted multiple times

### Prerequisites

- Epic 1: Foundation & Infrastructure (all stories)
- Supabase project must be created and configured
- Real-Debrid OAuth configuration must be available

### Dependencies

- Story 1.1: Project Initialization with Next.js 16 and shadcn/ui
- Story 1.2: Database Schema Setup
- Story 1.3: Configuration and Environment Setup
- Story 1.4: Development Workflow Setup

### Technical Implementation Notes

1. **OAuth Flow**: Implement complete RFC 8628 device code flow
2. **Security**: Never expose client secret or tokens to browser
3. **Polling**: Implement efficient polling with automatic cleanup
4. **State Management**: Use Zustand for consistent OAuth state
5. **User Experience**: Provide clear feedback throughout the process
6. **Error Recovery**: Allow users to retry failed authentication

### Definition of Done

- [ ] OAuth2 device code flow is fully implemented
- [ ] Real-Debrid API integration is working correctly
- [ ] Device authentication UI provides excellent user experience
- [ ] Real-time status updates work seamlessly
- [ ] Token storage is secure and properly managed
- [ ] Error handling covers all failure scenarios
- [ ] Connection page provides clear instructions
- [ ] All acceptance criteria are validated
- [ ] Security best practices are followed

### Risk Mitigation

1. **Token Security**: Ensure tokens are never exposed to client
2. **Rate Limiting**: Respect Real-Debrid API rate limits
3. **User Experience**: Provide clear guidance for non-technical users
4. **Error Recovery**: Handle all possible OAuth failure scenarios
5. **Browser Compatibility**: Test across different browsers
6. **Network Issues**: Handle connectivity problems gracefully

### Validation Commands

```bash
# Start development server
npm run dev

# Test device code endpoint
curl -X POST http://localhost:3000/api/auth/device/code \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"

# Test status endpoint
curl "http://localhost:3000/api/auth/device/status?deviceCode=TEST_CODE"

# Test disconnect endpoint
curl -X POST http://localhost:3000/api/auth/disconnect \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"

# Verify database tables
npx supabase db describe oauth_tokens
npx supabase db describe device_codes
```

### 🚨 Constraints Section - **MANDATORY BEFORE READY FOR REVIEW**

This section **MUST** be completed and validated before this story can be marked as "Ready for Review". All checkpoints must pass without errors.

#### **Pre-Development Constraints**

- [ ] **Story 1.1 Completion**: Project Initialization story is fully completed and validated
- [ ] **Story 1.2 Completion**: Database Schema Setup story is fully completed and validated
- [ ] **Story 1.3 Completion**: Configuration and Environment Setup story is fully completed and validated
- [ ] **Story 1.4 Completion**: Development Workflow Setup story is fully completed and validated
- [ ] **Real-Debrid Setup**: Real-Debrid client ID and endpoints are configured in environment
- [ ] **OAuth Review**: OAuth2 device code flow implementation has been reviewed against RFC 8628

#### **Database Schema Constraints**

- [ ] **OAuth Tokens Table**: OAuth tokens table matches required schema with proper indexes
- [ ] **Device Codes Table**: Device codes table is created for tracking authentication attempts
- [ ] **Database Indexes**: Performance indexes are created for OAuth queries
- [ ] **RLS Policies**: Row Level Security policies allow users to manage their own OAuth tokens
- [ ] **Migration Validation**: All database migrations run successfully without errors

#### **OAuth Implementation Constraints**

- [ ] **Device Code Request**: Device code request implements Step 1 of OAuth2 flow correctly
- [ ] **Credentials Exchange**: Device code exchange implements Step 4 of OAuth2 flow correctly
- [ ] **Token Exchange**: Access token exchange implements Step 5 of OAuth2 flow correctly
- [ ] **TypeScript Interfaces**: All OAuth response types are properly typed and validated
- [ ] **Error Handling**: Comprehensive error handling covers all OAuth failure scenarios
- [ ] **Polling Management**: Efficient polling prevents excessive API calls and cleans up expired codes

#### **API Routes Constraints**

- [ ] **Device Code Endpoint**: `/api/auth/device/code` endpoint initiates OAuth flow correctly
- [ ] **Status Endpoint**: `/api/auth/device/status` endpoint provides real-time authorization updates
- [ ] **Disconnect Endpoint**: `/api/auth/disconnect` endpoint cleans up all authentication data
- [ ] **Authentication Protection**: All OAuth endpoints are protected with proper authentication
- [ ] **Database Integration**: API routes integrate correctly with Supabase database
- [ ] **Error Responses**: Consistent error responses across all OAuth endpoints

#### **State Management Constraints**

- [ ] **Zustand Store**: OAuth state is properly managed with Zustand store
- [ ] **State Transitions**: All OAuth state transitions (idle, pending, authorized, connected, error) work correctly
- [ ] **Real-time Updates**: Authorization status updates in real-time without page refresh
- [ ] **Persistence**: OAuth state persists across page reloads and browser sessions
- [ ] **Cleanup**: Proper cleanup of expired codes and cancelled authentication attempts

#### **UI Components Constraints**

- [ ] **Device Authentication Dialog**: Authentication dialog provides clear user guidance and functionality
- [ ] **Code Display**: Device code and user code are displayed prominently with copy functionality
- [ ] **Status Indicators**: Real-time status indicators show current authentication step
- [ ] **Timer Display**: Countdown timer shows code expiration with appropriate formatting
- [ ] **Error States**: All error states are handled gracefully with retry options
- [ ] **Connected State**: Successful connection state provides clear confirmation and next steps

#### **Integration Testing Constraints**

- [ ] **OAuth Flow Testing**: Complete OAuth2 device code flow works end-to-end
- [ ] **Token Storage**: Access and refresh tokens are stored securely in database
- [ ] **Authorization Detection**: Application detects when authorization is completed on Real-Debrid
- [ ] **Token Refresh**: Refresh token mechanism works for token renewal
- [ ] **Connection Management**: Users can connect and disconnect accounts repeatedly
- [ ] **Browser Compatibility**: OAuth flow works across different browsers and platforms

#### **Security Constraints**

- [ ] **Client Secret Protection**: Client secret is never exposed to browser or client-side code
- [ ] **Token Security**: Access tokens are stored securely with proper expiration handling
- [ ] **OAuth Compliance**: Implementation follows OAuth2 device code flow RFC 8628 specifications
- [ ] **Real-Debrid Integration**: Uses correct Real-Debrid client ID and endpoints for Open Source Apps
- [ ] **Database Security**: OAuth tokens are protected with Row Level Security policies
- [ ] **API Security**: All OAuth API routes are properly authenticated and authorized

#### **User Experience Constraints**

- [ ] **Clear Instructions**: Users receive clear, step-by-step instructions throughout OAuth flow
- [ ] **Real-time Feedback**: Status updates provide immediate feedback on authentication progress
- [ ] **Error Recovery**: Users can retry authentication easily if it fails
- [ ] **Accessibility**: Authentication UI is accessible and follows WCAG guidelines
- [ ] **Responsive Design**: Authentication components work on mobile and desktop devices
- [ ] **Loading States**: Appropriate loading states and progress indicators are provided

#### **Final Implementation Validation**

- [ ] **Codebase Verification**: All OAuth authentication files exist in actual codebase
- [ ] **Functional Testing**: Manual verification that OAuth flow works as specified
- [ ] **Documentation Accuracy**: OAuth implementation matches technical specification
- [ ] **Acceptance Criteria Validation**: ALL acceptance criteria checkpoints pass
- [ ] **Story Completion Confirmation**: Story can be marked as "Done" with confidence

#### **Constraints Validation Commands**

```bash
# Environment and project validation
npm run dev
# Expected: Development server starts without OAuth configuration errors

# Database schema validation (MUST pass)
npx supabase db describe oauth_tokens
# Expected: Table exists with correct schema (id, user_id, access_token, refresh_token, client_secret, expires_at)

npx supabase db describe device_codes
# Expected: Table exists with correct schema (id, user_id, device_code, user_code, expires_at)

npx supabase db describe --indexes oauth_tokens
# Expected: Indexes present for user_id, expires_at

npx supabase db describe --indexes device_codes
# Expected: Indexes present for user_id, expires_at, device_code

# OAuth implementation validation (MUST pass)
node -e "
import { realDebridOAuth } from './src/lib/oauth/real-debrid-oauth.ts';
console.log('OAuth class loaded:', typeof realDebridOAuth);
console.log('Request device code method:', typeof realDebridOAuth.requestDeviceCode);
"  # Expected: OAuth class loads with all methods

# Test OAuth class methods
node -e "
const { realDebridOAuth } = require('./src/lib/oauth/real-debrid-oauth.ts');
try {
  console.log('Testing OAuth implementation...');
  // Test method existence
  console.log('requestDeviceCode:', typeof realDebridOAuth.requestDeviceCode);
  console.log('exchangeDeviceCode:', typeof realDebridOAuth.exchangeDeviceCode);
  console.log('exchangeForAccessToken:', typeof realDebridOAuth.exchangeForAccessToken);
  console.log('startPolling:', typeof realDebridOAuth.startPolling);
  console.log('stopPolling:', typeof realDebridOAuth.stopPolling);
  console.log('cleanupExpiredCodes:', typeof realDebridOAuth.cleanupExpiredCodes);
  console.log('✅ OAuth implementation loaded successfully');
} catch (error) {
  console.error('❌ OAuth implementation error:', error.message);
  process.exit(1);
}
"  # Expected: All OAuth methods exist and are callable

# API routes validation (MUST pass)
curl -X POST http://localhost:3000/api/auth/device/code \
  -H "Authorization: Bearer TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -w "%{http_code}\n" -o /dev/stdout
# Expected: 401 (Unauthorized) or proper error response for unauthenticated request

curl -X GET "http://localhost:3000/api/auth/device/status?deviceCode=TEST_CODE" \
  -w "%{http_code}\n" -o /dev/stdout
# Expected: 200 with proper JSON response structure

curl -X POST http://localhost:3000/api/auth/disconnect \
  -H "Authorization: Bearer TEST_TOKEN" \
  -w "%{http_code}\n" -o /dev/stdout
# Expected: 401 (Unauthorized) or proper error response for unauthenticated request

# State management validation (MUST pass)
node -e "
import { useAuthStore } from './src/stores/auth-store.ts';
console.log('Auth store loaded:', typeof useAuthStore);
"  # Expected: Auth store loads without errors

# UI components validation (MUST pass)
npx next build
# Expected: Build completes without OAuth component errors

# Test UI component rendering
node -e "
import DeviceAuthDialog from './src/components/auth/device-auth-dialog.tsx';
import ConnectButton from './src/components/auth/connect-button.tsx';
console.log('Device Auth Dialog component loaded');
console.log('Connect Button component loaded');
"  # Expected: Components import without errors

# TypeScript compilation validation (MUST pass)
npm run type-check
# Expected: No TypeScript errors in OAuth implementation

# Build validation (MUST pass)
npm run build
# Expected: Build completes successfully with OAuth functionality

# Linting validation (MUST pass)
npm run lint src/lib/oauth/ src/app/api/auth/ src/stores/auth-store.ts src/components/auth/
# Expected: No linting errors in OAuth implementation

# OAuth flow integration test
# Manual test steps (MUST pass):
# 1. Navigate to http://localhost:3000/connection
# 2. Click "Connect to Real-Debrid" button
# 3. Verify device code dialog opens with user code
# 4. Verify copy button works (copy user code to clipboard)
# 5. Verify verification URL button opens correct Real-Debrid page
# 6. Verify timer shows countdown from expiration time
# 7. Manually test expired device code handling
# Expected: All steps work correctly with proper error handling

# Database integration validation (MUST pass)
# Test with real Supabase connection
node -e "
import { getSupabaseClient } from './src/lib/database/supabase-client.ts';
const client = getSupabaseClient(true);
console.log('Supabase client for OAuth:', client ? 'loaded' : 'failed');
"  # Expected: Supabase client loads successfully

# Security validation
grep -r "client_secret" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
# Expected: No client_secret exposed in client-side code

# Environment validation
cat .env.local | grep -E "(REAL_DEBRID_|NEXT_PUBLIC_SUPABASE_)"
# Expected: Required OAuth environment variables are present

# Test coverage validation (if tests exist)
npm run test src/lib/oauth/ src/app/api/auth/ src/stores/auth-store.ts
# Expected: OAuth tests pass (if implemented)

# Performance validation
# Check that OAuth implementation doesn't have memory leaks or excessive polling
echo "Checking OAuth polling cleanup..."
node -e "
const { realDebridOAuth } = require('./src/lib/oauth/real-debrid-oauth.ts');
console.log('Polling intervals before cleanup:', realDebridOAuth.pollingIntervals.size);
realDebridOAuth.cleanupExpiredCodes();
console.log('Polling intervals after cleanup:', realDebridOAuth.pollingIntervals.size);
"  # Expected: Polling intervals are properly managed and cleaned up

# Error handling validation
# Test various OAuth error scenarios
curl -X POST http://localhost:3000/api/auth/device/code \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -w "%{http_code}\n" -o /dev/stdout
# Expected: 401 with proper error message

curl -X POST http://localhost:3000/api/auth/device/code \
  -H "Authorization: Bearer VALID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' \
  -w "%{http_code}\n" -o /dev/stdout
# Expected: 400 or 500 with proper error message

# Final integration validation
npm run build && npm run start &
sleep 5
curl -s http://localhost:3000/connection | grep -q "Connect to Real-Debrid"
pkill -f "next start"
# Expected: Connection page loads with OAuth functionality
```

#### **Constraints Sign-off**

- [ ] **Developer Validation**: I have personally executed all validation commands and confirm they pass
- [ ] **OAuth Implementation Review**: I have verified that OAuth2 device code flow matches this story's specification
- [ ] **Testing Confirmation**: All OAuth implementation, API routes, UI components, and integration validations pass
- [ ] **Ready for Review**: This story meets all constraints and is ready for team review

**⚠️ CRITICAL**: This story CANNOT be marked as "Ready for Review" until ALL constraints in this section are completed and validated. Any failed constraint must be resolved before proceeding.

---

**Story created by:** AI Agent (Technical Architect)
**Date:** 2025-11-27
**Technical Specification Status:** Complete
**Ready for Development:** ✅

_This story implements secure OAuth2 device code authentication for Real-Debrid integration, providing users with a secure and user-friendly way to connect their accounts to DMM._

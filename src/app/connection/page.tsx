'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, X } from 'lucide-react'
import {
  startOAuthFlow,
  isOAuthStateValid,
  formatUserCode,
  type OAuthState,
  type DeviceCodeResponse,
  type TokenResponse,
} from '@/lib/oauth/real-debrid-oauth'
import OAuthTest from '@/components/debug/oauth-test'
import { useRealDebridStatus } from '@/hooks/use-real-debrid-status'

type ConnectionState = 'idle' | 'generating' | 'waiting' | 'polling' | 'success' | 'error'

export default function ConnectionPage() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [deviceCodeResponse, setDeviceCodeResponse] = useState<DeviceCodeResponse | null>(null)
  const [oauthState, setOAuthState] = useState<OAuthState | null>(null)
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null)
  const [pollingAttempt, setPollingAttempt] = useState<number>(0)
  const [logs, setLogs] = useState<string[]>([])
  const [showDeviceDialog, setShowDeviceDialog] = useState(false)
  const [error, setError] = useState<string>('')
  const {
    data: statusData,
    error: statusError,
    loading: statusLoading,
    refresh: refreshStatus,
  } = useRealDebridStatus()

  const rateLimitResetLabel = statusData
    ? new Date(statusData.rateLimit.resetTime).toLocaleTimeString()
    : '—'

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const handleRefreshStatus = () => {
    refreshStatus()
    addLog('🔁 Requested Real-Debrid status refresh')
  }

  const persistTokens = async (token: TokenResponse, oauthCtx: OAuthState | null) => {
    const clientSecret = oauthCtx?.client_secret
    if (!clientSecret) {
      addLog('⚠️ Missing client secret; cannot persist Real-Debrid tokens.')
      return
    }

    try {
      const response = await fetch('/api/real-debrid/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresIn: token.expires_in,
          clientSecret,
          tokenType: token.token_type,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        addLog(`⚠️ Failed to save Real-Debrid tokens: ${payload.error || response.statusText}`)
        return
      }

      addLog('💾 Real-Debrid tokens saved.')
    } catch (error: any) {
      console.error('Failed to persist Real-Debrid tokens', error)
      addLog(`⚠️ Error saving tokens: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleConnect = async () => {
    try {
      setConnectionState('generating')
      setShowDeviceDialog(true)
      setError('')
      addLog('🔄 Requesting device code from Real-Debrid...')

      const { oauthState: flowState, tokenResponse: token } = await startOAuthFlow(
        // Callback when device code is received
        (deviceCodeData: DeviceCodeResponse) => {
          try {
            addLog('✅ Device code received from Real-Debrid')
            addLog(`📱 User Code: ${formatUserCode(deviceCodeData.user_code)}`)
            addLog(`🔗 Verification URL: ${deviceCodeData.verification_url}`)
            addLog(`⏰ Code expires in: ${deviceCodeData.expires_in} seconds`)
            addLog(`⏳ Polling interval: ${deviceCodeData.interval} seconds`)
            setDeviceCodeResponse(deviceCodeData)
            setConnectionState('waiting')
          } catch (error) {
            console.error('❌ Error handling device code response:', error)
            addLog(`❌ Device code handling error: ${error.message}`)
            setConnectionState('error')
            setError('Failed to process device code response')
          }
        },
        // Callback during polling
        (attempt: number, maxAttempts: number) => {
          setPollingAttempt(attempt)
          addLog(`⏳ Checking authorization (${attempt}/${maxAttempts})...`)
          setConnectionState('polling')
        }
      )

      if (token) {
        await persistTokens(token, flowState)
        await refreshStatus()

        setOAuthState(flowState)
        setTokenResponse(token)
        setConnectionState('success')
        addLog('🎉 Authorization successful! Access token received')
        addLog(`🔑 Token type: ${token.token_type}`)
        addLog(`⏰ Token expires in: ${token.expires_in} seconds`)
        if (token.refresh_token) {
          addLog('🔄 Refresh token received')
        }

        // Auto-close success dialog
        setTimeout(() => {
          setShowDeviceDialog(false)
          setConnectionState('idle')
        }, 3000)
      }
    } catch (error: any) {
      setConnectionState('error')
      const errorMessage = error?.message || 'Unknown error occurred'
      setError(errorMessage)
      addLog(`❌ Error: ${errorMessage}`)
      console.error('OAuth2 flow error:', error)
    }
  }

  const handleRetry = () => {
    setShowDeviceDialog(false)
    setConnectionState('idle')
    setDeviceCodeResponse(null)
    setOAuthState(null)
    setTokenResponse(null)
    setPollingAttempt(0)
    setError('')
    addLog('🔄 Retrying connection...')
  }

  const handleGoToRealDebrid = () => {
    if (deviceCodeResponse) {
      window.open(deviceCodeResponse.verification_url, '_blank')
      addLog('🌐 Opening Real-Debrid verification page...')
      setConnectionState('waiting')
    }
  }

  const handleCopyUserCode = async () => {
    if (!deviceCodeResponse) return
    try {
      await navigator.clipboard.writeText(deviceCodeResponse.user_code)
      addLog('📋 User code copied to clipboard')
      toast.success('User code copied')
    } catch (copyError) {
      console.error('Failed to copy user code:', copyError)
      addLog('⚠️ Failed to copy user code')
      toast.error('Failed to copy code')
    }
  }

  // Check if OAuth state is still valid
  useEffect(() => {
    if (oauthState && !isOAuthStateValid(oauthState)) {
      setConnectionState('error')
      setError('Device code has expired. Please try again.')
      addLog('⏰ Device code expired')
    }
  }, [oauthState])

  const formatUserCodeForDisplay = (userCode: string) => {
    return formatUserCode(userCode)
  }

  const sanitizedUserCode = deviceCodeResponse?.user_code.replace(/[^A-Za-z0-9]/g, '') ?? ''
  const otpLength = sanitizedUserCode.length || (deviceCodeResponse?.user_code?.length ?? 0) || 8

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/v904-nunny-012.jpg")' }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          {connectionState === 'success' && tokenResponse && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Connection Successful!</AlertTitle>
              <AlertDescription className="text-green-700">
                You have successfully connected to Real-Debrid. Token type:{' '}
                {tokenResponse.token_type}
                {tokenResponse.access_token && (
                  <div className="mt-2 rounded bg-green-100 p-2 text-xs">
                    <strong>Access Token:</strong> {tokenResponse.access_token.substring(0, 20)}...
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {connectionState === 'error' && (
            <Alert className="mb-6 border-red-200 bg-red-50" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Failed</AlertTitle>
              <AlertDescription>
                {error || 'Unable to connect to Real-Debrid. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Connect to Real-Debrid</CardTitle>
              <CardDescription>
                Link your account to access premium streaming content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertDialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    onClick={handleConnect}
                    className="w-full"
                    size="lg"
                    disabled={connectionState !== 'idle'}
                  >
                    {connectionState === 'idle' && 'Connect to Real-Debrid'}
                    {connectionState === 'generating' && (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Requesting Code...
                      </>
                    )}
                    {connectionState === 'waiting' && 'Waiting for Authorization...'}
                    {connectionState === 'polling' && (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking... ({pollingAttempt})
                      </>
                    )}
                    {connectionState === 'success' && 'Connected Successfully'}
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-500 ease-out sm:max-w-md">
                  <AlertDialogHeader>
                    <div className="flex items-start justify-between">
                      <AlertDialogTitle>
                        {deviceCodeResponse ? 'Device Code Generated' : 'Requesting Device Code...'}
                      </AlertDialogTitle>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowDeviceDialog(false)}
                        className="h-6 w-6 rounded-full p-0 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </AlertDialogHeader>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4">
                      {deviceCodeResponse ? (
                        <>
                          <p>Your device code is ready. Follow these steps to connect:</p>

                          <div className="space-y-3">
                            <div className="flex items-center justify-center rounded-lg bg-muted p-4">
                              <InputOTP
                                value={sanitizedUserCode}
                                maxLength={otpLength}
                                disabled
                                className="w-full max-w-xs justify-center"
                              >
                                <InputOTPGroup className="flex w-full justify-center gap-2">
                                  {Array.from({ length: otpLength }).map((_, index) => (
                                    <InputOTPSlot
                                      key={index}
                                      index={index}
                                      className="h-11 w-10 font-mono text-lg font-semibold"
                                    />
                                  ))}
                                </InputOTPGroup>
                              </InputOTP>
                            </div>

                            <ol className="list-inside list-decimal space-y-2 text-sm">
                              <li>Note your user code shown above</li>
                              <li>Click "Go to Real-Debrid" button below</li>
                              <li>Enter the code on the Real-Debrid website</li>
                              <li>Click "Authorize" on the Real-Debrid website</li>
                              <li>
                                Wait for authorization confirmation (we'll check automatically)
                              </li>
                            </ol>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <span className="ml-2">Requesting device code...</span>
                        </div>
                      )}
                    </div>
                  </AlertDialogDescription>

                  <AlertDialogFooter className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
                    {deviceCodeResponse && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={handleCopyUserCode}
                          size="sm"
                          className="h-10 min-w-[7rem]"
                          disabled={connectionState === 'polling'}
                        >
                          Copy Code
                        </Button>
                        <AlertDialogAction
                          onClick={handleGoToRealDebrid}
                          disabled={connectionState === 'polling'}
                          size="sm"
                          className="h-10 min-w-[10rem]"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Go to Real-Debrid
                        </AlertDialogAction>
                      </>
                    )}

                    {connectionState === 'error' && (
                      <Button variant="outline" onClick={handleRetry} className="w-full">
                        Try Again
                      </Button>
                    )}
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="space-y-2 text-center text-sm text-muted-foreground">
                <p>Click the button above to start the OAuth2 device code flow.</p>
                <p>
                  This will request a device code from Real-Debrid and guide you through the
                  authorization process.
                </p>
              </div>

              {/* Connection Logs */}
              {logs.length > 0 && (
                <div className="mt-4 max-h-32 overflow-y-auto rounded-lg bg-gray-900 p-4 text-green-400">
                  <h4 className="mb-2 text-sm font-semibold text-white">Connection Logs:</h4>
                  <div className="space-y-1 font-mono text-xs">
                    {logs.slice(-5).map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-xl">Real-Debrid Status</CardTitle>
                  <CardDescription>
                    Monitor account health, friendly errors, and current rate limit usage.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshStatus}
                  disabled={statusLoading}
                >
                  {statusLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Refresh Status
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {statusError.requiresReauth ? 'Reconnect Required' : 'Real-Debrid Issue'}
                  </AlertTitle>
                  <AlertDescription>
                    <span>{statusError.message}</span>
                    {statusError.action && (
                      <span className="mt-2 block text-sm text-muted-foreground">
                        {statusError.action}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Rate limit remaining</p>
                  <p className="text-3xl font-semibold">
                    {statusData?.rateLimit.requestsRemaining ?? '—'} / 250
                  </p>
                  <p className="text-xs text-muted-foreground">Resets at {rateLimitResetLabel}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Connected account</p>
                  {statusData?.user ? (
                    <div>
                      <p className="text-lg font-semibold">{statusData.user.username}</p>
                      <p className="text-sm text-muted-foreground">{statusData.user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Plan: {statusData.user.type?.toUpperCase() || 'Unknown'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not connected yet. Authorize Real-Debrid to see account details.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className={`h-2 w-2 rounded-full ${statusData?.health ? 'bg-green-500' : 'bg-red-500'}`}
                />
                <span>API health check {statusData?.health ? 'passed' : 'failed'}.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

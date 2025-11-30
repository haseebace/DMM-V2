import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing Real-Debrid API connection from server...')

    const clientId = 'X245A4XAIBGVM'
    const deviceCodeUrl = `https://api.real-debrid.com/oauth/v2/device/code?client_id=${encodeURIComponent(clientId)}`

    console.log('📡 Making request to:', deviceCodeUrl)

    const response = await fetch(deviceCodeUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DMM-Server/1.0',
      },
    })

    console.log('📡 Server response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Server request failed:', response.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Device code request failed: ${response.statusText}`,
          status: response.status,
          details: errorText,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Server response received:', data)

    if (!data.device_code || !data.user_code || !data.verification_url) {
      console.error('❌ Invalid response structure:', data)

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid device code response from Real-Debrid',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        device_code: data.device_code,
        user_code: data.user_code,
        verification_url: data.verification_url,
        expires_in: data.expires_in || 1800,
        interval: data.interval || 5,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const type = error instanceof Error ? error.constructor.name : typeof error
    console.error('❌ Server error:', error)

    return NextResponse.json(
      {
        success: false,
        error: `Network error: ${message}`,
        type,
      },
      { status: 500 }
    )
  }
}

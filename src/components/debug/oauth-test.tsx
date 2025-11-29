'use client'

import React, { useState } from 'react'
import { realDebridConfig } from '@/lib/api/real-debrid-config'

export default function OAuthTest() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addResult = (message: string) => {
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  const testConnection = async () => {
    setIsLoading(true)
    setTestResults([])

    try {
      // Test 1: Check if we can make basic requests
      addResult('🔍 Starting OAuth connection test...')

      // Test 2: Check API endpoints accessibility
      addResult(`📍 Device Code Endpoint: ${realDebridConfig.deviceCodeEndpoint}`)
      addResult(`📍 Client ID: ${realDebridConfig.clientId}`)
      addResult(`📍 Token Endpoint: ${realDebridConfig.tokenEndpoint}`)

      // Test 3: Try to fetch device code
      addResult('📡 Attempting to fetch device code...')

      const clientId = realDebridConfig.clientId || 'X245A4XAIBGVM'
      const url = `${realDebridConfig.deviceCodeEndpoint}?client_id=${encodeURIComponent(clientId)}`

      addResult(`🌐 Request URL: ${url}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DMM-Client/1.0',
        },
        mode: 'cors', // Explicitly set CORS mode
      })

      addResult(`📊 Response Status: ${response.status} ${response.statusText}`)
      addResult(
        `📋 Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`
      )

      if (response.ok) {
        const data = await response.json()
        addResult(`✅ Response Data: ${JSON.stringify(data, null, 2)}`)

        if (data.device_code && data.user_code && data.verification_url) {
          addResult('🎉 Device code request successful!')
          addResult(`📱 User Code: ${data.user_code}`)
          addResult(`🔗 Verification URL: ${data.verification_url}`)
        } else {
          addResult('❌ Invalid response structure')
        }
      } else {
        const errorText = await response.text()
        addResult(`❌ Error Response: ${errorText}`)
      }
    } catch (error) {
      addResult(`💥 Network Error: ${error}`)

      // Test for CORS specifically
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        addResult('🚫 This appears to be a CORS or network error')
        addResult('🔧 Try checking if the API allows requests from your domain')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const testTokenEndpoint = async () => {
    setIsLoading(true)
    setTestResults([])

    try {
      addResult('🔍 Testing token endpoint with mock device code...')

      const clientId = realDebridConfig.clientId || 'X245A4XAIBGVM'
      const mockDeviceCode = 'MOCK-DEVICE-CODE-FOR-TESTING'

      addResult(`📍 Token Endpoint: ${realDebridConfig.tokenEndpoint}`)
      addResult(`📱 Mock Device Code: ${mockDeviceCode}`)
      addResult('📡 Attempting token exchange...')

      const response = await fetch(realDebridConfig.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': 'DMM-Client/1.0',
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: realDebridConfig.grantType,
          device_code: mockDeviceCode,
        }),
        mode: 'cors',
      })

      addResult(`📊 Token Response Status: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()
        addResult(`✅ Token Response: ${JSON.stringify(data, null, 2)}`)
      } else {
        const errorText = await response.text()
        addResult(`❌ Token Error: ${errorText}`)

        // Parse error if possible
        try {
          const errorData = JSON.parse(errorText)
          addResult(`📋 Parsed Error: ${JSON.stringify(errorData, null, 2)}`)
        } catch (e) {
          addResult(`📋 Raw Error: ${errorText}`)
        }
      }
    } catch (error) {
      addResult(`💥 Token Test Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto my-8 max-w-2xl rounded-lg border p-4 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">Real-Debrid OAuth Test</h2>

      <div className="space-y-4">
        <button
          onClick={testConnection}
          disabled={isLoading}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test OAuth Connection'}
        </button>

        {testResults.length > 0 && (
          <div className="rounded border bg-gray-50 p-4 dark:bg-gray-800">
            <h3 className="mb-2 font-semibold">Test Results:</h3>
            <div className="max-h-96 space-y-1 overflow-y-auto whitespace-pre-wrap font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index} className="border-b border-gray-200 pb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

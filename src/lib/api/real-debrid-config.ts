import { z } from 'zod'

// Type exports
export type RealDebridConfig = z.infer<typeof realDebridConfigSchema>
export type AppConfig = z.infer<typeof appConfigSchema>

// Real-Debrid API configuration schema
export const realDebridConfigSchema = z.object({
  clientId: z.string(),
  deviceCodeEndpoint: z.string().url(),
  deviceCredentialsEndpoint: z.string().url(),
  tokenEndpoint: z.string().url(),
  apiBaseUrl: z.string().url(),
  scope: z.string().default('default'),
  grantType: z.string().default('http://oauth.net/grant_type/device/1.0'),
  refreshToken: z.string().optional(),
  expiresInSeconds: z.number().default(3600),
  pollingInterval: z.number().default(5000),
  maxPollingAttempts: z.number().default(120),
})

// Application configuration schema
export const appConfigSchema = z.object({
  enableRealdebridSync: z.boolean().default(false),
  enableDebugMode: z.boolean().default(false),
  errorTrackingDsn: z.string().optional(),
  analyticsId: z.string().optional(),
})

// Real-Debrid OAuth2 Device Code Flow Configuration
export const realDebridConfig: RealDebridConfig = {
  clientId: process.env.NEXT_PUBLIC_REALDEBRID_CLIENT_ID || 'X245A4XAIBGVM', // Default open-source client ID
  deviceCodeEndpoint: 'https://api.real-debrid.com/oauth/v2/device/code',
  deviceCredentialsEndpoint: 'https://api.real-debrid.com/oauth/v2/device/credentials',
  tokenEndpoint: 'https://api.real-debrid.com/oauth/v2/token',
  apiBaseUrl: 'https://api.real-debrid.com/rest/1.0',
  scope: 'unrestrict torrents downloads user', // Open source app scope
  grantType: 'http://oauth.net/grant_type/device/1.0',
  pollingInterval: 5000, // 5 seconds
  maxPollingAttempts: 120, // 10 minutes max polling time
}

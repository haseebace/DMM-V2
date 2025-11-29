import { z } from 'zod'

// Real-Debrid API base configuration
export const realDebridConfigSchema = z.object({
  clientId: z.string(),
  deviceCodeEndpoint: z.string().url(),
  deviceCredentialsEndpoint: z.string().url(),
  tokenEndpoint: z.string().url(),
  apiBaseUrl: z.string().url(),
  scope: z.string().default('default'),
  grantType: z.string().default('urn:ietf:params:oauth:grant-type:device_code'),
  refreshToken: z.string().optional(),
  expiresInSeconds: z.number().default(3600),
})

// Environment configuration schema
const envConfigSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_VERSION: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
  NEXT_PUBLIC_ENABLE_REALDEBRID_SYNC: z.boolean().default(false),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
})

// Application configuration schema
const appConfigSchema = z.object({
  enableRealdebridSync: z.boolean().default(false),
  enableDebugMode: z.boolean().default(false),
  errorTrackingDsn: z.string().optional(),
  analyticsId: z.string().optional(),
})

// Server configuration schema
const serverConfigSchema = z.object({
  isServer: z.boolean(),
})

// Environment validation function for Real-Debrid configuration
export function validateRealDebridConfig(config: unknown) {
  return realDebridConfigSchema.safeParse(config)
}

export function validateEnvironmentConfig(config: unknown) {
  return appConfigSchema.safeParse(config)
}

export function validateServerConfig(config: unknown) {
  return serverConfigSchema.safeParse(config)
}

// Environment validation function
export function validateEnvironment(env: Record<string, unknown>) {
  const errors: string[] = []

  // Validate required environment variables
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('❌ Real-Debrid API credentials not configured')
  }

  // Validate application variables
  if (!env.NEXT_PUBLIC_APP_URL || !env.NEXT_PUBLIC_APP_NAME || !env.NEXT_PUBLIC_APP_VERSION) {
    errors.push('NEXT_PUBLIC_APP_URL is required')
    errors.push('NEXT_PUBLIC_APP_NAME is required')
    errors.push('NEXT_PUBLIC_APP_VERSION is required')
  }

  // Validate environment type
  if (!env.NODE_ENV || !['development', 'production', 'test'].includes(env.NODE_ENV as string)) {
    errors.push('NODE_ENV must be development, production, or test')
  }

  // Return validation results
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      config: null,
    }
  }

  return {
    valid: true,
    errors: [],
    config: env,
  }
}

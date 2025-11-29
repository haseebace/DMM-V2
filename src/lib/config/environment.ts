// Environment management utilities for DMM configuration

export const ENVIRONMENT_VARIABLES = {
  // Supabase configuration
  SUPABASE_URL: 'NEXT_PUBLIC_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  SUPABASE_SERVICE_KEY: 'SUPABASE_SERVICE_ROLE_KEY',

  // Application configuration
  APP_URL: 'NEXT_PUBLIC_APP_URL',
  APP_NAME: 'NEXT_PUBLIC_APP_NAME',
  APP_VERSION: 'NEXT_PUBLIC_APP_VERSION',
  ENVIRONMENT: 'NODE_ENV',
  LOG_LEVEL: 'LOG_LEVEL',

  // Real-Debrid configuration
  ENABLE_REALDEBRID_SYNC: 'NEXT_PUBLIC_ENABLE_REALDEBRID_SYNC',
  ANALYTICS_ID: 'NEXT_PUBLIC_ANALYTICS_ID',
  ERROR_TRACKING_DSN: 'NEXT_PUBLIC_SENTRY_DSN',
} as const

// Get environment variable with validation
export function getEnvVar(key: string): string | undefined {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Environment variable ${key} is not set`)
  }

  return value
}

// Set environment variable with validation
export function setEnvVar(key: string, value: string): void {
  if (typeof process !== 'undefined' && process.env) {
    process.env[key] = value
    console.log(`✅ Set environment variable ${key}=${value}`)
  } else {
    console.warn('⚠️ Cannot set environment variable in this environment')
  }
}

// Validate all required environment variables
export function validateRequiredEnvironment(): { valid: boolean; errors: string[] } {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_APP_VERSION',
    'NODE_ENV',
    'LOG_LEVEL',
    'NEXT_PUBLIC_ENABLE_REALDEBRID_SYNC',
    'NEXT_PUBLIC_ANALYTICS_ID',
    'NEXT_PUBLIC_SENTRY_DSN',
  ]

  const errors: string[] = []

  for (const key of requiredVars) {
    const value = getEnvVar(key)
    if (!value) {
      errors.push(`Environment variable ${key} is not set`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Get current environment configuration
export function getCurrentEnvironment(): Record<string, string> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || 'NOT_SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'NOT_SET',
    NEXT_PUBLIC_APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL') || 'NOT_SET',
    NEXT_PUBLIC_APP_NAME: getEnvVar('NEXT_PUBLIC_APP_NAME') || 'NOT_SET',
    NEXT_PUBLIC_APP_VERSION: getEnvVar('NEXT_PUBLIC_APP_VERSION') || 'NOT_SET',
    NODE_ENV: getEnvVar('NODE_ENV') || 'development',
    LOG_LEVEL: getEnvVar('LOG_LEVEL') || 'info',
    NEXT_PUBLIC_ENABLE_REALDEBRID_SYNC: getEnvVar('NEXT_PUBLIC_ENABLE_REALDEBRID_SYNC') || 'false',
    NEXT_PUBLIC_ANALYTICS_ID: getEnvVar('NEXT_PUBLIC_ANALYTICS_ID') || 'NOT_SET',
    NEXT_PUBLIC_SENTRY_DSN: getEnvVar('NEXT_PUBLIC_SENTRY_DSN') || 'NOT_SET',
  }
}

// Load environment-specific configuration
export function loadEnvironmentConfig(): {
  enableRealdebridSync: boolean
  enableDebugMode: boolean
  errorTrackingDsn?: string
  analyticsId?: string
  env: Record<string, string>
} {
  const env = getCurrentEnvironment()

  return {
    enableRealdebridSync: env.NEXT_PUBLIC_ENABLE_REALDEBRID_SYNC === 'true',
    enableDebugMode: env.LOG_LEVEL === 'debug',
    errorTrackingDsn:
      env.NEXT_PUBLIC_SENTRY_DSN !== 'NOT_SET' ? env.NEXT_PUBLIC_SENTRY_DSN : undefined,
    analyticsId:
      env.NEXT_PUBLIC_ANALYTICS_ID !== 'NOT_SET' ? env.NEXT_PUBLIC_ANALYTICS_ID : undefined,
    env,
  }
}

// Console environment information
export function logEnvironmentInfo(): void {
  const env = getCurrentEnvironment()

  console.group('🔧 Environment Configuration')
  console.log('Supabase URL:', env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('App URL:', env.NEXT_PUBLIC_APP_URL)
  console.log('Environment:', env.NODE_ENV)
  console.log('Log Level:', env.LOG_LEVEL)
  console.log('Real-Debrid Sync:', env.NEXT_PUBLIC_ENABLE_REALDEBRID_SYNC)

  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0) {
    console.log('✅ Supabase credentials configured')
  } else {
    console.warn('⚠️ Supabase credentials not configured')
  }
}

// Server-side environment check
export function isServer(): boolean {
  return typeof window === 'undefined'
}

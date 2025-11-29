// Configuration management utilities for DMM

/**
 * Get environment variable with validation
 */
export function getEnvVar(key: string): string {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Environment variable ${key} is not set`)
  }

  return value
}

/**
 * Get all environment variables with validation
 */
export function getAllEnvVars(): Record<string, string> {
  const env: Record<string, string> = {}

  // Supabase variables
  env.SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')!
  env.SUPABASE_ANON_KEY = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')!
  env.SUPABASE_SERVICE_KEY = getEnvVar('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')!

  // Application variables
  env.NEXT_PUBLIC_APP_URL = getEnvVar('NEXT_PUBLIC_APP_URL')!
  env.NEXT_PUBLIC_APP_NAME = getEnvVar('NEXT_PUBLIC_APP_NAME')!
  env.NEXT_PUBLIC_APP_VERSION = getEnvVar('NEXT_PUBLIC_APP_VERSION')!

  // Environment
  env.NODE_ENV = getEnvVar('NODE_ENV')!
  env.LOG_LEVEL = getEnvVar('LOG_LEVEL')!

  // Feature flags
  env.NEXT_PUBLIC_ENABLE_REALDEBRID_SYNC =
    getEnvVar('NEXT_PUBLIC_ENABLE_REALDEBRID_SYNC') || 'false'
  env.NEXT_PUBLIC_SENTRY_DSN =
    getEnvVar('NEXT_PUBLIC_SENTRY_DSN') || 'placeholder-for-error-tracking'
  env.NEXT_PUBLIC_ANALYTICS_ID =
    getEnvVar('NEXT_PUBLIC_ANALYTICS_ID') || 'placeholder-for-analytics'

  return env
}

/**
 * Get public runtime configuration
 */
export function getPublicConfig(): Record<string, string | boolean | number> {
  return {
    supabaseUrl: getEnvVar('NEXT_PUBLIC_SUPABASE_URL')!,
    appUrl: getEnvVar('NEXT_PUBLIC_APP_URL')!,
    appName: getEnvVar('NEXT_PUBLIC_APP_NAME')!,
    appVersion: getEnvVar('NEXT_PUBLIC_APP_VERSION')!,
    enableRealdebridSync: getEnvVar('NEXT_PUBLIC_ENABLE_REALDEBRID_SYNC') === 'true',
    enableDebugMode: getEnvVar('LOG_LEVEL') === 'debug',
    nodeEnv: getEnvVar('NODE_ENV'),
  }
}

/**
 * Get server runtime configuration
 */
export function getServerConfig(): Record<string, string | boolean> {
  return {
    isServer: false,
    supabaseUrl: getEnvVar('NEXT_PUBLIC_SUPABASE_URL')!,
    appUrl: getEnvVar('NEXT_PUBLIC_APP_URL')!,
    appName: getEnvVar('NEXT_PUBLIC_APP_NAME')!,
    nodeEnv: getEnvVar('NODE_ENV'),
  }
}

/**
 * Configuration validation for development
 */
export function validateForDevelopment(): { valid: boolean; errors: string[] } {
  const env = getAllEnvVars()
  const errors: string[] = []

  // Required Supabase variables
  if (!env.SUPABASE_URL) errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  if (!env.SUPABASE_ANON_KEY) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  if (!env.SUPABASE_SERVICE_KEY) errors.push('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is required')

  // Required application variables
  if (!env.NEXT_PUBLIC_APP_URL) errors.push('NEXT_PUBLIC_APP_URL is required')
  if (!env.NEXT_PUBLIC_APP_NAME) errors.push('NEXT_PUBLIC_APP_NAME is required')
  if (!env.NEXT_PUBLIC_APP_VERSION) errors.push('NEXT_PUBLIC_APP_VERSION is required')
  if (!env.NODE_ENV) errors.push('NODE_ENV is required')

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Configuration validation for production
 */
export function validateForProduction(): { valid: boolean; errors: string[] } {
  const env = getAllEnvVars()
  const errors: string[] = []

  // Production must have all required variables
  if (!env.SUPABASE_URL) errors.push('NEXT_PUBLIC_SUPABASE_URL is required for production')
  if (!env.SUPABASE_ANON_KEY)
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for production')
  if (!env.SUPABASE_SERVICE_KEY)
    errors.push('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is required for production')

  // Application variables must be set in production
  if (!env.NEXT_PUBLIC_APP_URL) errors.push('NEXT_PUBLIC_APP_URL must be set in production')
  if (!env.NEXT_PUBLIC_APP_NAME) errors.push('NEXT_PUBLIC_APP_NAME must be set in production')
  if (!env.NEXT_PUBLIC_APP_VERSION) errors.push('NEXT_PUBLIC_APP_VERSION must be set in production')

  // Environment must be production
  if (env.NODE_ENV !== 'production') errors.push('NODE_ENV must be "production"')

  return {
    valid: errors.length === 0,
    errors,
  }
}

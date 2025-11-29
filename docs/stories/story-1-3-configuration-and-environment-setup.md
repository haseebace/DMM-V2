# Story 1.3: Configuration and Environment Setup

**Epic:** Foundation & Infrastructure
**Priority:** Critical | **Story Points:** 3 | **Tech Spec Level:** Detailed Implementation

**Status:** Ready for Development

---

## User Story

As a developer,
I want all environment variables and configurations properly set up,
So that the application can securely connect to external services.

---

## Technical Specification

### Overview

This story configures all environment variables, Supabase client, Real-Debrid API placeholders, TypeScript configuration, and Next.js settings to enable secure external service connections and maintain strict type safety throughout the application.

### Technology Stack

- **Environment Management**: dotenv, Next.js environment variables
- **Database Client**: Supabase JavaScript client
- **Type Safety**: TypeScript strict mode
- **Configuration**: Next.js config with custom settings
- **Security**: Environment variable validation with Zod

### Environment Variables Setup

#### .env.example Template

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Real-Debrid Configuration (placeholders for now)
REAL_DEBRID_CLIENT_ID=X245A4XAIBGVM
REAL_DEBRID_CLIENT_SECRET=placeholder-secret
REAL_DEBRID_DEVICE_CODE_ENDPOINT=https://api.real-debrid.com/oauth/v2/device/code
REAL_DEBRID_DEVICE_CREDENTIALS_ENDPOINT=https://api.real-debrid.com/oauth/v2/device/credentials
REAL_DEBRID_TOKEN_ENDPOINT=https://api.real-debrid.com/oauth/v2/token
REAL_DEBRID_API_BASE_URL=https://api.real-debrid.com/rest/1.0

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=DFM - Real-Debrid File Manager
NEXT_PUBLIC_APP_VERSION=1.0.0

# Development Configuration
NODE_ENV=development
LOG_LEVEL=debug

# Future Configuration (placeholders)
NEXT_PUBLIC_SENTRY_DSN=placeholder-for-error-tracking
NEXT_PUBLIC_ANALYTICS_ID=placeholder-for-analytics
```

#### .env.local (for development)

```bash
# Supabase Development
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-supabase-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-supabase-service-key]

# Real-Debrid Development
REAL_DEBRID_CLIENT_ID=X245A4XAIBGVM
REAL_DEBRID_CLIENT_SECRET=development-placeholder

# Local Development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
```

### Implementation Tasks

#### 1. Create Environment Configuration Files

**Files to create:**

**.env.example:**

```bash
# Environment variables template (copy to .env.local)
# Copy this file to .env.local and fill in your values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Real-Debrid Configuration
REAL_DEBRID_CLIENT_ID=X245A4XAIBGVM
REAL_DEBRID_CLIENT_SECRET=placeholder-secret
REAL_DEBRID_DEVICE_CODE_ENDPOINT=https://api.real-debrid.com/oauth/v2/device/code
REAL_DEBRID_DEVICE_CREDENTIALS_ENDPOINT=https://api.real-debrid.com/oauth/v2/device/credentials
REAL_DEBRID_TOKEN_ENDPOINT=https://api.real-debrid.com/oauth/v2/token
REAL_DEBRID_API_BASE_URL=https://api.real-debrid.com/rest/1.0

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=DFM - Real-Debrid File Manager
NEXT_PUBLIC_APP_VERSION=1.0.0

# Development Configuration
NODE_ENV=development
LOG_LEVEL=debug

# Future Configuration
NEXT_PUBLIC_SENTRY_DSN=placeholder-for-error-tracking
NEXT_PUBLIC_ANALYTICS_ID=placeholder-for-analytics
```

**.gitignore additions:**

```
# Environment variables
.env
.env.local
.env.production
.env.test

# Supabase
.supabase/
```

**Validation:**

- [ ] .env.example is created with all necessary variables - file not present
- [x] .gitignore excludes environment files
- [ ] Variables are properly documented with descriptions - no template to document
- [ ] Placeholder values are clearly marked - no template to mark

#### 2. Create Supabase Client Configuration

**File: `src/lib/database/supabase-client.ts`:**

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Environment validation with fallbacks for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Throw error if required environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for browser-side operations (uses anon key)
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Service client for server-side operations (uses service role key)
export const supabaseServiceClient = (() => {
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for server operations')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
})()

// Helper function to get client based on context
export const getSupabaseClient = (isServer: boolean = false) => {
  return isServer ? supabaseServiceClient : supabaseClient
}
```

**File: `src/types/database.ts`:**

```typescript
// Database type definitions for TypeScript
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          real_debrid_user_id: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          real_debrid_user_id?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          real_debrid_user_id?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          user_id: string
          parent_id: string | null
          name: string
          path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          parent_id?: string | null
          name: string
          path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          parent_id?: string | null
          name?: string
          path?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          user_id: string
          real_debrid_id: string
          original_filename: string
          virtual_filename: string | null
          file_size: number | null
          mime_type: string | null
          sha1_hash: string | null
          download_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          real_debrid_id: string
          original_filename: string
          virtual_filename?: string | null
          file_size?: number | null
          mime_type?: string | null
          sha1_hash?: string | null
          download_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          real_debrid_id?: string
          original_filename?: string
          virtual_filename?: string | null
          file_size?: number | null
          mime_type?: string | null
          sha1_hash?: string | null
          download_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      file_folders: {
        Row: {
          id: string
          file_id: string
          folder_id: string
          created_at: string
        }
        Insert: {
          id?: string
          file_id: string
          folder_id: string
          created_at?: string
        }
        Update: {
          id?: string
          file_id?: string
          folder_id?: string
          created_at?: string
        }
      }
      oauth_tokens: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
```

**Validation:**

- [ ] Supabase client is created with proper typing - current client lacks Database typing and uses non-spec env keys
- [ ] Environment variables are validated at runtime - no Zod/runtime validation in supabase-client.ts
- [ ] Service client is available for server operations - only single client helper, no service-role client
- [ ] Database types are properly defined - src/types/database.ts missing
- [ ] Client configurations match security requirements - env names differ (SUPABASE_URL) and no auth/realtime config

#### 3. Create Real-Debrid Configuration

**File: `src/lib/api/real-debrid-config.ts`:**

```typescript
import { z } from 'zod'

// Environment validation schema
const envSchema = z.object({
  REAL_DEBRID_CLIENT_ID: z.string().min(1, 'Real-Debrid Client ID is required'),
  REAL_DEBRID_CLIENT_SECRET: z.string().optional(),
  REAL_DEBRID_DEVICE_CODE_ENDPOINT: z.string().url(),
  REAL_DEBRID_DEVICE_CREDENTIALS_ENDPOINT: z.string().url(),
  REAL_DEBRID_TOKEN_ENDPOINT: z.string().url(),
  REAL_DEBRID_API_BASE_URL: z.string().url(),
})

// Validate environment variables
const env = envSchema.parse({
  REAL_DEBRID_CLIENT_ID: process.env.REAL_DEBRID_CLIENT_ID,
  REAL_DEBRID_CLIENT_SECRET: process.env.REAL_DEBRID_CLIENT_SECRET,
  REAL_DEBRID_DEVICE_CODE_ENDPOINT: process.env.REAL_DEBRID_DEVICE_CODE_ENDPOINT,
  REAL_DEBRID_DEVICE_CREDENTIALS_ENDPOINT: process.env.REAL_DEBRID_DEVICE_CREDENTIALS_ENDPOINT,
  REAL_DEBRID_TOKEN_ENDPOINT: process.env.REAL_DEBRID_TOKEN_ENDPOINT,
  REAL_DEBRID_API_BASE_URL: process.env.REAL_DEBRID_API_BASE_URL,
})

// Export configuration object
export const realDebridConfig = {
  clientId: env.REAL_DEBRID_CLIENT_ID,
  clientSecret: env.REAL_DEBRID_CLIENT_SECRET,
  endpoints: {
    deviceCode: env.REAL_DEBRID_DEVICE_CODE_ENDPOINT,
    deviceCredentials: env.REAL_DEBRID_DEVICE_CREDENTIALS_ENDPOINT,
    token: env.REAL_DEBRID_TOKEN_ENDPOINT,
    api: env.REAL_DEBRID_API_BASE_URL,
  },
  // OAuth2 device code flow specific settings
  oauth: {
    scope: 'default', // Open source apps scope
    grantType: 'urn:ietf:params:oauth:grant-type:device_code',
    newCredentials: 'yes', // Force new credentials for device flow
  },
  // API rate limiting
  rateLimit: {
    requestsPerMinute: 250, // Real-Debrid rate limit
    burstSize: 10, // Maximum burst requests
  },
}

// Helper function to get specific endpoint URLs
export const getRealDebridEndpoint = (endpoint: keyof typeof realDebridConfig.endpoints) => {
  return realDebridConfig.endpoints[endpoint]
}

// Helper function to build full API endpoint URLs
export const buildApiEndpoint = (path: string) => {
  const baseUrl = realDebridConfig.endpoints.api
  return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

// Export environment validation function for API routes
export const validateRealDebridEnv = () => {
  try {
    envSchema.parse({
      REAL_DEBRID_CLIENT_ID: process.env.REAL_DEBRID_CLIENT_ID,
      REAL_DEBRID_CLIENT_SECRET: process.env.REAL_DEBRID_CLIENT_SECRET,
      REAL_DEBRID_DEVICE_CODE_ENDPOINT: process.env.REAL_DEBRID_DEVICE_CODE_ENDPOINT,
      REAL_DEBRID_DEVICE_CREDENTIALS_ENDPOINT: process.env.REAL_DEBRID_DEVICE_CREDENTIALS_ENDPOINT,
      REAL_DEBRID_TOKEN_ENDPOINT: process.env.REAL_DEBRID_TOKEN_ENDPOINT,
      REAL_DEBRID_API_BASE_URL: process.env.REAL_DEBRID_API_BASE_URL,
    })
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof z.ZodError ? error.errors : error,
    }
  }
}
```

**Validation:**

- [ ] Real-Debrid configuration is created with type safety - schema exists but config ignores env and differs from spec
- [ ] Environment variables are validated with Zod - no env parse/validation in real-debrid-config.ts
- [ ] OAuth2 settings match device code flow requirements - grant type/scope differ from spec and no validation
- [ ] Rate limiting configuration is properly set - no rate limit config present
- [ ] Helper functions work correctly - helper endpoint builders not implemented

#### 4. Create Application Configuration

**File: `src/lib/config/app-config.ts`:**

```typescript
import { z } from 'zod'

// Application environment validation
const appEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_VERSION: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
})

// Validate application environment
const appEnv = appEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  LOG_LEVEL: process.env.LOG_LEVEL,
})

export const appConfig = {
  env: appEnv.NODE_ENV,
  isDevelopment: appEnv.NODE_ENV === 'development',
  isProduction: appEnv.NODE_ENV === 'production',
  isTest: appEnv.NODE_ENV === 'test',
  appUrl: appEnv.NEXT_PUBLIC_APP_URL,
  appName: appEnv.NEXT_PUBLIC_APP_NAME,
  appVersion: appEnv.NEXT_PUBLIC_APP_VERSION,
  logLevel: appEnv.LOG_LEVEL,

  // Feature flags (can be expanded)
  features: {
    enableRealtimeSync: true,
    enableDebugMode: appEnv.NODE_ENV === 'development',
    enableErrorReporting: appEnv.NODE_ENV === 'production',
  },
}

// Development vs production configuration
export const isDevelopment = appConfig.isDevelopment
export const isProduction = appConfig.isProduction
```

**Validation:**

- [ ] Application configuration is created with proper validation - app-config.ts exists but schema and exports differ from spec
- [ ] Environment-specific settings work correctly - no proven environment guards; uses mixed env names
- [ ] Feature flags are properly configured - feature flags differ and are not validated per spec
- [ ] Configuration exports are consistent - exported helpers/config not aligned with story contract

#### 5. Update TypeScript Configuration

**Update `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/app/*": ["./src/app/*"]
    },
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "dist", "build"]
}
```

**Validation:**

- [x] TypeScript configuration includes strict mode options
- [ ] Path aliases are properly configured - only @/\* alias present; others missing
- [ ] Advanced strict options are enabled - options like noUncheckedIndexedAccess/exactOptionalPropertyTypes missing
- [ ] Include/exclude patterns are correct - .next/dist/build not excluded as specified

#### 6. Update Next.js Configuration

**Update `next.config.js`:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images-real-debrid-ssl.your-cdn.de',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  // Redirects for proper routing
  async redirects() {
    return []
  },
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
```

**Validation:**

- [ ] Next.js configuration supports API routes - config lacks specified headers/redirects and env exposure
- [ ] Image domains are properly configured - only Real-Debrid pattern present; Supabase storage missing
- [ ] Security headers are added - only CORS headers for /api; missing X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [ ] Performance optimizations are enabled - reactStrictMode/compress not set per spec
- [ ] Environment variables are exposed correctly - NEXT*PUBLIC_APP*\* not surfaced in next.config.ts env block

### Acceptance Criteria

#### Given-When-Then Format

**GIVEN** the project structure is initialized and database schema is set up
**WHEN** I configure environment variables and application settings
**THEN** all services connect correctly and TypeScript provides strict type checking

**AND** following validations pass:

1. **Environment Configuration Validation:**
   - ✅ All required environment variables are documented
   - ✅ Environment validation works at runtime
   - ✅ Development and production configurations are separate
   - ✅ Placeholder values are clearly marked for Real-Debrid
   - ✅ .env.example serves as proper template

2. **Supabase Integration Validation:**
   - ✅ Supabase client connects successfully
   - ✅ Database types are properly defined
   - ✅ Client and service clients work for different contexts
   - ✅ Environment variables are validated at startup
   - ✅ Authentication configuration is ready

3. **Real-Debrid Configuration Validation:**
   - ✅ OAuth2 device code flow settings are correct
   - ✅ API endpoints are properly configured
   - ✅ Rate limiting settings match Real-Debrid limits
   - ✅ Configuration is type-safe with Zod validation
   - ✅ Helper functions work correctly

4. **TypeScript Configuration Validation:**
   - ✅ Strict mode is enabled with advanced options
   - ✅ Path aliases work correctly throughout the application
   - ✅ Import resolution works without errors
   - ✅ Type checking catches potential issues
   - ✅ Build process completes without type errors

5. **Application Configuration Validation:**
   - ✅ Next.js configuration supports planned features
   - ✅ Environment-specific settings work correctly
   - ✅ Security headers are properly configured
   - ✅ Performance optimizations are enabled
   - ✅ Image domains are configured for Real-Debrid

### Prerequisites

- Story 1.1: Project Initialization with Next.js 16 and shadcn/ui
- Story 1.2: Database Schema Setup (for Supabase credentials)

### Dependencies

- Supabase project must be created and running
- Database schema must be deployed
- Environment variables must be available

### Technical Implementation Notes

1. **Security**: Never commit actual environment variables to version control
2. **Validation**: Use Zod for runtime environment validation
3. **Type Safety**: Generate TypeScript types from database schema
4. **Configuration**: Keep configuration centralized and type-safe
5. **Environment**: Support different configurations for dev/staging/prod

### Definition of Done

- [ ] All environment configuration files are created - .env.example missing; .env.production/.env.test not present
- [ ] Supabase client is configured with proper types - no Database typing or service/anon split
- [ ] Real-Debrid configuration is set up with validation - env validation and helpers not implemented
- [ ] TypeScript configuration is updated for strict mode - strict true but advanced options/paths missing
- [ ] Next.js configuration supports all planned features - config missing security headers, env exposure, Supabase image patterns
- [ ] Environment variables are validated at runtime - no Zod-based validation wiring
- [ ] Application starts without configuration errors - not verified; type-check/build failing
- [ ] All acceptance criteria are validated - not yet validated due to above gaps

### Risk Mitigation

1. **Environment Exposure**: Ensure sensitive variables are never committed
2. **Type Mismatches**: Keep TypeScript types in sync with database
3. **Configuration Errors**: Validate all configurations at startup
4. **Security Issues**: Regular security audits of configurations

### Validation Commands

```bash
# Environment validation
npm run dev
# Check for missing environment variables

# TypeScript validation
npm run type-check
# Should complete without errors

# Build validation
npm run build
# Should complete successfully

# Supabase connection test
curl -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

### 🚨 Constraints Section - **MANDATORY BEFORE READY FOR REVIEW**

This section **MUST** be completed and validated before this story can be marked as "Ready for Review". All checkpoints must pass without errors.

#### **Pre-Development Constraints**

- [ ] **Story 1.1 Completion**: Project Initialization story is fully completed and validated - not verified in this review
- [ ] **Story 1.2 Completion**: Database Schema Setup story is fully completed and validated - Supabase schema present but not compared to story 1.2 spec
- [x] **Supabase Project**: Supabase project is created with credentials available - confirmed via Supabase MCP table listing
- [ ] **Environment Template**: .env.example template is prepared and documented - file missing
- [ ] **Configuration Review**: All configuration files have been reviewed against specifications - review done; several mismatches remain

#### **Environment Configuration Constraints**

- [ ] **Environment Files**: .env.example, .env.local, and other environment files are created - only .env.local present
- [ ] **Variable Documentation**: All environment variables are properly documented with descriptions - missing .env.example template
- [ ] **Template Completeness**: .env.example contains all necessary variables with proper placeholders - missing template
- [x] **Gitignore Configuration**: Environment files are properly excluded from version control
- [ ] **Validation Schema**: Environment variables have Zod validation schemas defined - no Zod-based env validation implemented

#### **Supabase Integration Constraints**

- [ ] **Client Configuration**: Supabase client is properly configured with TypeScript types - current helper lacks Database typing and options
- [ ] **Environment Variables**: All required Supabase environment variables are set - .env.local uses NEXT*PUBLIC*\* but client reads SUPABASE_URL/SUPABASE_ANON_KEY
- [ ] **Client Creation**: Both browser and service clients are created and functional - only single client helper exists
- [ ] **Database Types**: TypeScript database types are generated and match schema - src/types/database.ts not present
- [ ] **Connection Testing**: Supabase client can successfully connect to the database - not validated; client would error without SUPABASE_URL

#### **Real-Debrid Configuration Constraints**

- [ ] **API Configuration**: Real-Debrid endpoints and OAuth2 settings are properly configured - config uses hardcoded defaults and differs from spec
- [ ] **Environment Validation**: Real-Debrid environment variables are validated with Zod schemas - env values not parsed/validated
- [ ] **Rate Limiting**: Rate limiting configuration matches Real-Debrid API limits - no rate limiting block present
- [ ] **Helper Functions**: API endpoint building functions work correctly - helpers not implemented
- [ ] **OAuth2 Settings**: Device code flow settings match Real-Debrid specifications - grant type/scope differ from story and not validated

#### **Application Configuration Constraints**

- [ ] **App Configuration**: Application-level configuration is created and validated - app-config.ts exists but does not match spec or perform runtime validation
- [ ] **Environment Detection**: Development, production, and test environments are properly detected - not verified; config does not expose booleans per spec
- [ ] **Feature Flags**: Feature flags are properly configured and functional - feature flags differ and are not validated
- [ ] **Configuration Export**: All configuration exports work correctly throughout the application - exports not aligned to story contract
- [ ] **Environment Validation**: Application environment validation functions work - no passing validation run

#### **TypeScript Configuration Constraints**

- [x] **Strict Mode**: TypeScript strict mode is enabled with advanced options - strict enabled; advanced options still missing
- [ ] **Path Aliases**: All path aliases (@/_, @/components/_, etc.) are configured and working - only @/\* alias defined
- [ ] **Import Resolution**: Import resolution works without errors for all configured paths - not validated; type-check failing elsewhere
- [ ] **Type Checking**: TypeScript compilation completes without errors or warnings - npm run type-check failed (multiple errors)
- [ ] **Advanced Options**: Advanced TypeScript options are properly configured - options like noUncheckedIndexedAccess/exactOptionalPropertyTypes not set

#### **Next.js Configuration Constraints**

- [ ] **Configuration Updates**: Next.js configuration is updated with all planned features - next.config.ts missing env exposure, redirects, and other options
- [ ] **Image Domains**: Real-Debrid and Supabase image domains are properly configured - Supabase storage pattern missing
- [ ] **Security Headers**: Security headers are configured and functional - only CORS headers on /api; lacks required security headers
- [ ] **Performance Optimizations**: Performance optimizations are enabled - reactStrictMode/compress/swcMinify not set per spec
- [ ] **Environment Variables**: Environment variables are properly exposed to client-side - NEXT*PUBLIC_APP*\* not surfaced in config

#### **Build and Runtime Constraints**

- [ ] **Development Server**: Development server starts without configuration errors - not run; type-check/build failing
- [ ] **Build Process**: Build process completes without configuration-related errors - npm run build failed (font fetch errors under restricted network)
- [ ] **Type Checking**: TypeScript type checking passes without configuration errors - npm run type-check failed with multiple errors
- [ ] **Environment Loading**: Environment variables load correctly in all environments - not validated; client uses SUPABASE_URL not provided
- [ ] **Configuration Testing**: All configuration components work as expected - not validated pending fixes

#### **Security and Validation Constraints**

- [ ] **Environment Validation**: Runtime environment validation catches missing or invalid variables - not implemented
- [ ] **Type Safety**: All configuration is type-safe and validated at compile time - missing Database types and env schemas
- [ ] **Security Headers**: Security headers are properly configured and effective - required headers not set in next.config.ts
- [ ] **CORS Configuration**: CORS is properly configured for external APIs - basic CORS on /api set, but broader story requirements not confirmed
- [ ] **Secret Management**: Sensitive environment variables are properly protected - .env.example missing; service key handling not validated

#### **Final Implementation Validation**

- [ ] **Codebase Verification**: All configuration-related code exists in actual codebase - several spec files (database types, env template) missing
- [ ] **Functional Testing**: Manual verification that all configurations work as specified - not executed; type-check/build failing
- [ ] **Documentation Accuracy**: Configuration implementation matches technical specification - mismatches across Supabase/Real-Debrid/Next config
- [ ] **Acceptance Criteria Validation**: ALL acceptance criteria checkpoints pass - not validated due to above gaps
- [ ] **Story Completion Confirmation**: Story can be marked as "Done" with confidence - blocked until implementation completed

#### **Constraints Validation Commands**

```bash
# Environment and project validation
ls -la .env* .env.example    # Expected: Environment files exist
cat .env.example | grep -E "(NEXT_PUBLIC_|SUPABASE_|REAL_DEBRID_)" | wc -l
# Expected: All required variables present

# Environment validation (MUST pass)
npm run dev                # Expected: Starts without environment errors
# Check for missing environment variables in console output

# TypeScript validation (MUST pass)
npm run type-check           # Expected: Zero type errors
# Look for configuration-related type errors

# Build validation (MUST pass)
npm run build               # Expected: Builds successfully
# Check for configuration-related build errors

# Supabase client validation (MUST pass)
node -e "
const { supabaseClient } = require('./src/lib/database/supabase-client.ts');
console.log('Supabase client created successfully');
"  # Expected: No errors

# Real-Debrid configuration validation (MUST pass)
node -e "
const { validateRealDebridEnv } = require('./src/lib/api/real-debrid-config.ts');
const result = validateRealDebridEnv();
console.log('Environment validation:', result);
"  # Expected: { valid: true }

# Application configuration validation
node -e "
const { appConfig } = require('./src/lib/config/app-config.ts');
console.log('App config:', Object.keys(appConfig));
"  # Expected: Configuration object printed

# Path aliases validation (MUST pass)
node -e "
try {
  require('@/lib/database/supabase-client.ts');
  console.log('Path aliases working correctly');
} catch (error) {
  console.log('Path alias error:', error.message);
}
"  # Expected: Path aliases work

# Next.js configuration validation
node -e "
const nextConfig = require('./next.config.js');
console.log('Next.js config loaded:', typeof nextConfig);
"  # Expected: Configuration object loaded

# Security headers validation (when server is running)
curl -I http://localhost:3000 2>/dev/null | grep -E "(X-Frame-Options|X-Content-Type-Options|Referrer-Policy)"
# Expected: Security headers present

# Environment variable validation
echo "Testing environment variables..."
echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
echo "NODE_ENV: $NODE_ENV"
# Expected: Required variables set

# Configuration file validation
cat src/lib/database/supabase-client.ts | grep -E "(createClient|export)" | wc -l
# Expected: Exports and client creation present

cat src/lib/api/real-debrid-config.ts | grep -E "(z\.object|export)" | wc -l
# Expected: Validation and exports present

cat src/lib/config/app-config.ts | grep -E "(z\.object|export)" | wc -l
# Expected: Validation and exports present

# Database types validation
ls -la src/types/database.ts
# Expected: Database types file exists
cat src/types/database.ts | grep -E "(Tables|Row|Insert|Update)" | wc -l
# Expected: Database type definitions present

# Import resolution testing
npx tsc --noEmit --skipLibCheck src/lib/database/supabase-client.ts
npx tsc --noEmit --skipLibCheck src/lib/api/real-debrid-config.ts
npx tsc --noEmit --skipLibCheck src/lib/config/app-config.ts
# Expected: No type errors in any configuration files

# Runtime configuration validation
npm run dev &
sleep 5
curl -s http://localhost:3000 | head -n 10
# Expected: Application loads without configuration errors
pkill -f "next dev"
```

#### **Constraints Sign-off**

- [ ] **Developer Validation**: I have personally executed all validation commands and confirm they pass - type-check/build commands executed and failed
- [ ] **Configuration Review**: I have verified that all configurations match this story's specification - review shows multiple gaps
- [ ] **Testing Confirmation**: All configuration, type safety, and runtime validations pass - validations failing (type errors, build errors)
- [ ] **Ready for Review**: This story meets all constraints and is ready for team review - blocked by outstanding issues

**⚠️ CRITICAL**: This story CANNOT be marked as "Ready for Review" until ALL constraints in this section are completed and validated. Any failed constraint must be resolved before proceeding.

---

**Story created by:** AI Agent (Technical Architect)
**Date:** 2025-11-27
**Technical Specification Status:** Complete
**Ready for Development:** ✅

_This story establishes secure configuration management and type safety for DMM, enabling reliable connections to external services while maintaining strict TypeScript standards._

# Architecture

## Executive Summary

DMM requires a modern full-stack architecture with intelligent virtual folder mapping, real-time synchronization, and clean user experience. The architecture centers around Next.js 14 with TypeScript, Supabase for database and authentication, and React Query for intelligent caching to deliver sub-500ms performance with 10,000+ file libraries.

## Project Initialization

First implementation story should execute:

```bash
npx create-next-app@latest dmm \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

This establishes the base architecture with these decisions:

- **Framework**: Next.js 16.0.3 with React 19.2
- **Bundler**: Turbopack (default) for faster builds
- **Styling**: Tailwind CSS 4+ for clean, minimal design
- **Type Safety**: TypeScript 5.6+ for robust development
- **Structure**: src/ directory with @/\* import aliases
- **Performance**: Cache Components and React Compiler support

## Decision Summary

| Category         | Decision                       | Version     | Affects Epics                   | Rationale                                                                            |
| ---------------- | ------------------------------ | ----------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| Framework        | Next.js                        | 16.0.3      | All                             | Modern React framework with Turbopack performance                                    |
| Database         | Supabase                       | Latest 2025 | Virtual Folders, File Org, Auth | All-in-one solution with real-time sync                                              |
| State Management | React Query + Zustand          | Latest 2025 | File Sync, UI State             | React Query for API data, Zustand for UI state                                       |
| UI Components    | shadcn/ui + shadcn MCP         | Latest 2025 | All UI Features                 | Modern, accessible components with default styling only, managed via shadcn MCP      |
| Authentication   | Real-Debrid OAuth2 Device Code | Latest 2025 | User Access                     | OAuth2 device code flow for Open Source Apps (Option 3) with client_id X245A4XAIBGVM |
| Form Validation  | React Hook Form + Zod          | Latest 2025 | Forms & Input                   | TypeScript-first validation with great performance                                   |
| Deployment       | Vercel                         | Latest 2025 | All                             | Zero-config Next.js deployment with global CDN                                       |
| Starter          | Create Next App                | Latest      | All                             | Provides foundation architecture decisions                                           |

## Project Structure

```
dmm/
├── src/
│   ├── app/                          # Next.js pages and API routes
│   │   ├── (auth)/                   # Routes that need authentication
│   │   │   ├── home/                 # Main dashboard page (/home)
│   │   │   └── settings/             # Settings page for Real-Debrid connection
│   │   ├── connection/               # OAuth2 device code authentication page (/connection)
│   │   ├── api/                      # API endpoints for server-side logic
│   │   │   ├── auth/                 # Authentication endpoints
│   │   │   │   └── device/           # Device code flow endpoints
│   │   │   │       ├── code/         # Get device code
│   │   │   │       └── credentials/  # Get user credentials
│   │   │   ├── real-debrid/          # Real-Debrid API integration
│   │   │   └── sync/                 # File synchronization endpoints
│   │   ├── globals.css              # Global styles
│   │   ├── layout.tsx               # Root layout component
│   │   └── page.tsx                 # Home/landing page
│   │
│   ├── components/                   # All React components
│   │   ├── ui/                      # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── context-menu.tsx
│   │   │   └── ...
│   │   ├── common/                  # Shared components used everywhere
│   │   │   ├── loading-spinner.tsx
│   │   │   ├── error-boundary.tsx
│   │   │   └── layout-components/
│   │   │       ├── header.tsx
│   │   │       ├── sidebar.tsx
│   │   │       └── toolbar.tsx
│   │   ├── features/                # Feature-specific components
│   │   │   ├── file-browser/         # File browsing and navigation
│   │   │   │   ├── file-list.tsx
│   │   │   │   ├── folder-tree.tsx
│   │   │   │   └── breadcrumb-nav.tsx
│   │   │   ├── virtual-folders/      # Virtual folder management
│   │   │   │   ├── folder-creator.tsx
│   │   │   │   ├── folder-editor.tsx
│   │   │   │   └── folder-context-menu.tsx
│   │   │   ├── file-operations/      # File manipulation features
│   │   │   │   ├── file-renamer.tsx
│   │   │   │   ├── file-mover.tsx
│   │   │   │   └── bulk-operations.tsx
│   │   │   └── real-debrid/          # Real-Debrid integration features
│   │   │       ├── device-code-display.tsx  # Device code presentation
│   │   │       ├── auth-button.tsx
│   │   │       ├── sync-button.tsx
│   │   │       └── connection-status.tsx
│   │   └── forms/                    # Form components
│   │       ├── folder-form.tsx
│   │       ├── settings-form.tsx
│   │       └── search-filters.tsx
│   │
│   ├── lib/                         # Utility functions and configurations
│   │   ├── database/                # Database-related utilities
│   │   │   ├── supabase-client.ts
│   │   │   └── database-queries.ts
│   │   ├── api/                     # API client configurations
│   │   │   ├── real-debrid-client.ts
│   │   │   └── api-error-handling.ts
│   │   ├── utils/                   # General utility functions
│   │   │   ├── file-utils.ts
│   │   │   ├── date-utils.ts
│   │   │   └── validation-utils.ts
│   │   └── configurations/          # App configurations
│   │       ├── environment.ts
│   │       └── constants.ts
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── use-real-debrid.ts       # Real-Debrid API integration
│   │   ├── use-virtual-folders.ts   # Virtual folder management
│   │   ├── use-file-operations.ts   # File manipulation logic
│   │   ├── use-sync-status.ts       # Sync state management
│   │   └── use-keyboard-shortcuts.ts # Keyboard interactions
│   │
│   ├── stores/                      # Zustand state stores
│   │   ├── auth-store.ts            # Authentication state
│   │   ├── file-store.ts            # File selection and organization state
│   │   ├── folder-store.ts          # Folder navigation state
│   │   ├── ui-store.ts              # UI state (modals, menus, etc.)
│   │   └── sync-store.ts            # Synchronization state
│   │
│   ├── types/                       # TypeScript type definitions
│   │   ├── database.ts              # Database table types
│   │   ├── real-debrid.ts           # Real-Debrid API types
│   │   ├── components.ts            # Component prop types
│   │   ├── api.ts                   # API response types
│   │   └── common.ts                # Shared utility types
│   │
│   └── styles/                      # Styling files
│       ├── globals.css              # Global styles
│       └── components.css           # Component-specific styles
│
├── public/                          # Static assets
│   ├── icons/                       # App icons and favicons
│   ├── images/                      # Static images
│   └── docs/                        # Public documentation
│
├── docs/                            # Your project documentation
│   ├── PRD.md                       # Product Requirements Document
│   ├── architecture.md              # This architecture document
│   └── technical-research.md        # Research findings
│
├── .env.local                       # Environment variables (local)
├── .env.example                     # Environment variables template
├── package.json                     # Project dependencies
├── tailwind.config.js              # Tailwind CSS configuration
├── next.config.js                  # Next.js configuration
└── README.md                        # Project documentation
```

**How to Navigate This Structure:**

- **Need to change a page?** → `src/app/`
- **Need to change how something looks?** → `src/components/`
- **Need to add new functionality?** → `src/components/features/`
- **Need to fix an API call?** → `src/lib/api/`
- **Need to change how data is stored?** → `src/lib/database/`
- **Need to add a new state?** → `src/stores/`
- **Need to add a new type definition?** → `src/types/`

## Epic to Architecture Mapping

| Epic from PRD           | Lives In                                                | Key Components                           | Technical Implementation               |
| ----------------------- | ------------------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| Virtual Folder System   | `src/components/features/virtual-folders/`              | FolderTree, FolderCreator, FolderEditor  | Supabase tables: folders, file_folders |
| File Organization       | `src/components/features/file-operations/`              | FileMover, BulkOperations, FileRenamer   | Zustand stores + React Query caching   |
| Real-Debrid Integration | `src/components/features/real-debrid/` + `src/lib/api/` | AuthButton, SyncButton, RealDebridClient | OAuth2 + API client with rate limiting |
| User Interface          | `src/components/` + `src/app/`                          | All UI components, layouts               | shadcn/ui + Tailwind CSS + React 19.2  |

## Technology Stack Details

### Core Technologies

- **Next.js 16.0.3** with React 19.2 - Modern React framework with Turbopack bundler
- **TypeScript 5.6+** - Type safety and better developer experience
- **Supabase** - PostgreSQL database + Auth + Real-time subscriptions
- **React Query + Zustand** - Server state management + UI state management
- **shadcn/ui** - Accessible component library built on Radix UI
- **Tailwind CSS 4+** - Utility-first CSS framework
- **React Hook Form + Zod** - Form validation with TypeScript integration

### Integration Points

- **Real-Debrid API**: OAuth2 device code flow (Option 3), rate-limited API calls, SHA1 hash handling
- **Supabase**: Real-time subscriptions for sync, row-level security for user data, oauth_tokens table
- **Vercel Deployment**: Zero-config deployment, edge functions, global CDN
- **shadcn MCP**: Component installation, updates, and management with default styling enforcement
- **FireCrawl MCP**: Web scraping capabilities for AI agents
- **Supabase MCP**: Direct database communication for AI development

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### API Response Format

```typescript
interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
  message?: string
}
```

### Error Handling Strategy

- **User-facing errors**: Simple, actionable messages (e.g., "Failed to connect to Real-Debrid. Please try again.")
- **Development logging**: Detailed error logs with context
- **Graceful degradation**: Continue functioning when Real-Debrid API is unavailable
- **Retry logic**: Exponential backoff for failed API calls

### State Management Pattern

- **Server data**: React Query with caching and background refetch
- **UI state**: Zustand stores with clear separation of concerns
- **Form state**: React Hook Form with controlled components

## Consistency Rules

### Naming Conventions

- **Components**: PascalCase (FileList, VirtualFolder, AuthButton)
- **Files**: kebab-case (file-list.tsx, virtual-folders/)
- **Variables**: camelCase (realDebridToken, selectedFiles)
- **Constants**: UPPER_SNAKE_CASE (API_BASE_URL, MAX_FILE_COUNT)
- **CSS Classes**: Tailwind classes only, no custom CSS

### Code Organization

- **Feature-based structure**: Group by functionality, not by type
- **Shared utilities**: Common code in `src/lib/utils/`
- **Types**: Co-located with features or in `src/types/`
- **Hooks**: Custom hooks in `src/hooks/` with descriptive names

### shadcn/ui Component Strategy

- **shadcn MCP Integration**: Use shadcn MCP server for all component operations
- **Default Styling Only**: NO custom CSS, NO theme modifications, NO styling overrides
- **Component Selection**: Always prefer shadcn/ui components over custom implementations
- **Installation**: Use `npx shadcn@latest add [component]` for adding components
- **Updates**: Use shadcn MCP to keep components updated and consistent
- **MCP Management**: Leverage shadcn MCP for dependency management and version control

### File Organization Standards

- **Index exports**: Use index.ts files for clean imports
- **Barrel exports**: Group related exports together
- **Test files**: Co-located with .test.ts extension
- **Story files**: For components, add .stories.tsx for documentation

## Data Architecture

### Database Schema (Supabase)

```sql
-- Users (linked to Real-Debrid accounts)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  real_debrid_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth2 token storage (primary for device code flow)
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_in INTEGER NOT NULL,
  scope TEXT,
  real_debrid_id VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Virtual folder system
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-Debrid file metadata
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  real_debrid_id VARCHAR(255) UNIQUE NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  virtual_filename VARCHAR(500),
  file_size BIGINT,
  mime_type VARCHAR(100),
  sha1_hash VARCHAR(40),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Many-to-many file-folder relationships
CREATE TABLE file_folders (
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (file_id, folder_id)
);

-- Indexes for performance
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);
CREATE INDEX idx_files_user ON files(user_id);
CREATE INDEX idx_files_sha1 ON files(sha1_hash);
CREATE INDEX idx_file_folders_user ON file_folders(user_id);
```

## API Contracts

### Real-Debrid Integration API

```typescript
// Authentication endpoints (OAuth2 Device Code Flow)
POST /api/auth/device/code           # Get device code for display
POST /api/auth/device/credentials   # Get user credentials (polling)

// File synchronization
POST /api/sync/start
GET  /api/sync/status
POST /api/sync/incremental

// Virtual folder management
GET    /api/folders
POST   /api/folders
PUT    /api/folders/:id
DELETE /api/folders/:id

// File operations
POST /api/files/assign-to-folder
POST /api/files/move
PUT  /api/files/:id/rename
```

### Response Format Standards

```typescript
// Success response
{
  success: true,
  data: { ... },
  message: "Operation completed successfully"
}

// Error response
{
  success: false,
  error: "ERROR_CODE",
  message: "User-friendly error message"
}
```

## Security Architecture

### Authentication Flow

1. **OAuth2 Device Code Flow** for Open Source Apps (Option 3) with Real-Debrid
2. **Device Code Generation**: Call `/device/code?client_id=X245A4XAIBGVM&new_credentials=yes`
3. **User Authorization**: User visits `real-debrid.com/device` and enters displayed code
4. **Credential Exchange**: Poll `/device/credentials` to get user-bound client_id and client_secret
5. **Token Exchange**: Use credentials to get access/refresh tokens from `/token` endpoint
6. **Token Storage**: Encrypted in `oauth_tokens` table in Supabase database
7. **Token Refresh**: Automatic refresh before expiration
8. **Session Management**: Secure HTTP-only cookies with redirect to `/home`

### Data Protection

- **Encryption at Rest**: Sensitive database fields encrypted
- **HTTPS Only**: All communications over HTTPS
- **Input Validation**: Zod schemas for all user inputs
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **XSS Prevention**: React's built-in protections + CSP headers

### API Security

- **Rate Limiting**: Respect Real-Debrid's 250 requests/minute limit
- **CORS Configuration**: Restrict to authorized domains
- **Environment Variables**: All secrets in environment variables
- **Audit Logging**: Track authentication and data access events

## Performance Considerations

### Caching Strategy

- **React Query**: Intelligent caching with background refetching
- **Supabase Real-time**: Live updates for folder/file changes
- **Browser Cache**: Static assets via Vercel CDN
- **Database Queries**: Optimized with proper indexing

### Performance Targets

- **Initial Load**: Under 2 seconds
- **Folder Navigation**: Under 500ms
- **Search Response**: Under 200ms
- **File Operations**: Under 100ms UI feedback
- **Large Libraries**: Optimized for 10,000+ files

### Optimization Techniques

- **Lazy Loading**: Load folder contents incrementally
- **Virtual Scrolling**: For large file lists (future enhancement)
- **Image Optimization**: Via Next.js Image component
- **Bundle Splitting**: Code splitting by routes

## Deployment Architecture

### Production Environment

- **Platform**: Vercel with Edge Network
- **Database**: Supabase PostgreSQL (multi-region)
- **CDN**: Vercel Edge Network for static assets
- **Monitoring**: Vercel Analytics + custom error tracking

### Environment Configuration

```bash
# Real-Debrid OAuth2 Configuration (Option 3: Open Source Apps)
REAL_DEBRID_CLIENT_ID=X245A4XAIBGVM
REAL_DEBRID_BASE_URL=https://api.real-debrid.com
# Note: No client_secret needed - generated per user during authentication

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Application Configuration
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your_secret_key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

## Development Environment

### Prerequisites

- **Node.js** 20+ (LTS version)
- **npm** or **pnpm** package manager
- **Git** for version control
- **Supabase account** for database
- **Real-Debrid developer account** for API access

### Setup Commands

```bash
# 1. Initialize Next.js project
npx create-next-app@latest dmm \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# 2. Navigate to project
cd dmm

# 3. Install dependencies
npm install @supabase/supabase-js \
  @tanstack/react-query \
  zustand \
  @hookform/resolvers \
  zod \
  react-hook-form \
  @radix-ui/react-context-menu \
  @radix-ui/react-dialog \
  lucide-react

# 4. Install shadcn/ui CLI and initialize
npx shadcn-ui@latest init
npx shadcn-ui@latest add button dialog context-menu

# 5. Set up environment variables
cp .env.example .env.local

# 6. Start development server
npm run dev
```

### Development Workflow

1. **Feature branches**: Use descriptive branch names
2. **Code commits**: Conventional commit messages
3. **TypeScript**: Strict mode enabled
4. **ESLint**: Code quality enforcement
5. **Prettier**: Code formatting consistency
6. **Testing**: Vitest-only testing framework (no Jest mixed implementations)

### Testing Framework Standard

**🚨 CRITICAL: Vitest-Only Policy**

**Framework**: Vitest (no Jest mixed implementations)

- **Unit Tests**: Vitest with React Testing Library
- **Integration Tests**: Vitest for API route testing
- **E2E Tests**: Playwright for browser automation
- **Mocking**: vitest-mock-extended for complex mocking
- **Coverage**: Vitest coverage-v8 for coverage reporting

**File Structure**:

```
src/
├── components/**/__tests__/*.test.tsx    # Component tests
├── lib/**/__tests__/*.test.ts           # Utility/Service tests
├── app/api/**/__tests__/*.test.ts        # API route tests
└── __tests__/**/*.test.ts               # Integration/E2E tests
```

**Testing Standards**:

- ✅ All test files use Vitest syntax (`vi.mock`, `vi.fn`, etc.)
- ❌ No Jest imports or Jest syntax allowed
- ✅ Use `vi.mocked()` for complex mock typing
- ✅ Use React Testing Library for component testing
- ✅ Mock external dependencies consistently
- ❌ No mixed testing framework approaches

## Architecture Decision Records (ADRs)

### ADR-001: Next.js 16 over Alternative Frameworks

**Decision**: Use Next.js 16 with Turbopack
**Rationale**: Best performance for large file libraries, excellent React 19.2 integration, zero-config Vercel deployment
**Consequences**: Vendor lock-in to Vercel ecosystem, learning curve for App Router

### ADR-002: Supabase over Traditional PostgreSQL Setup

**Decision**: Use Supabase for database and authentication
**Rationale**: All-in-one solution with real-time features, built-in auth, excellent TypeScript support
**Consequences**: Dependency on third-party service, potential cost scaling

### ADR-003: Real-Debrid OAuth2 Only Authentication

**Decision**: No separate user accounts, Real-Debrid tokens only
**Rationale**: Simplifies UX, reduces development complexity, single source of truth
**Consequences**: Requires Real-Debrid account, limited user management

### ADR-004: Virtual Folder System Architecture

**Decision**: Map-based virtual folders without moving Real-Debrid files
**Rationale**: Non-destructive organization, maintains Real-Debrid integrity, flexible organization
**Consequences**: Additional database complexity, sync coordination challenges

### ADR-005: React Query + Zustand State Management

**Decision**: Hybrid approach with React Query for server state, Zustand for UI state
**Rationale**: Best of both worlds - caching for API data, simplicity for UI state
**Consequences**: Two state management systems to learn, potential synchronization issues

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: {{date}}_
_For: {{user_name}}_

# DFM - Epic Breakdown

**Author:** Haseeb
**Date:** 2025-11-14
**Project Level:** Greenfield
**Target Scale:** Personal → Public SaaS

---

## Overview

This document provides the complete epic and story breakdown for DFM, decomposing the requirements from the [PRD](./PRD.md) into implementable stories.

## Epic Summary

This breakdown organizes DMM development into 5 cohesive epics that follow natural value progression:

1. **Foundation & Infrastructure** - Establish technical foundation for all development
2. **Real-Debrid Integration** - Core API integration and authentication
3. **Virtual Folder System** - Primary value proposition: intelligent organization
4. **File Organization Features** - Enhanced file management capabilities
5. **User Interface & Experience** - Polish, performance, and user delight

Each epic delivers incremental value while building toward the complete virtual organization solution.

---

<!-- Repeat for each epic (N = 1, 2, 3...) -->

## Epic 1: Foundation & Infrastructure

Establish the technical foundation and development infrastructure required for all subsequent DMM development. This epic creates the project structure, core dependencies, and deployment pipeline that enable rapid development of the virtual organization system.

### Story 1.1: Project Initialization with Next.js 16 and shadcn/ui

As a developer,
I want a properly initialized Next.js 16 project with shadcn/ui fully configured with MCP integration,
So that I have a solid foundation for building the DMM application with modern UI components.

**Acceptance Criteria:**

**Given** a clean development environment
**When** I run the project initialization commands
**Then** the Next.js 16 project is created with TypeScript, Tailwind CSS, and src directory structure

**And** all required dependencies (Supabase, React Query, Zustand, shadcn/ui, React Hook Form, Zod) are installed
**And** shadcn/ui is properly initialized with default styling and MCP integration enabled
**And** MCP commands for component management are working (`npx @shadcn/*` commands)
**And** the development server starts successfully with proper Tailwind CSS v4 configuration
**And** ESLint and TypeScript configurations are properly set up with strict mode

**Prerequisites:** None

**Technical Notes:**

1. **Create Next.js 16 project with shadcn/ui integrated**: create a dir "DMM" and inside that create`npx shadcn@latest init` (choose Next.js project, select Neutral baseColor, default styling - includes TypeScript, Tailwind, ESLint, App Router, src-dir, @/\* aliases by default)
2. Install core dependencies: `npm install @supabase/supabase-js @tanstack/react-query zustand @hookform/resolvers zod react-hook-form`
3. Install additional UI dependencies: `npm install @radix-ui/react-context-menu @radix-ui/react-dialog lucide-react`
4. Verify MCP integration: `npx @shadcn/get-project-registries` should return @shadcn registry
5. Test component installation: `npx shadcn@latest add button card dialog` to confirm setup

### Story 1.2: Database Schema Setup

As a developer,
I want the Supabase database schema configured with tables for users, folders, files, and relationships,
So that the virtual folder system has proper data persistence foundation.

**Acceptance Criteria:**

**Given** a Supabase project is created
**When** I run the database setup script
**Then** all tables (users, folders, files, file_folders) are created with proper relationships

**And** indexes are created for performance optimization
**And** Row-level security policies are configured for user data isolation
**And** the database schema matches the architecture document specifications

**Prerequisites:** Story 1.1

**Technical Notes:** Use Supabase MCP to execute the schema from the architecture document. Ensure foreign key constraints and cascade deletes are properly configured.

### Story 1.3: Configuration and Environment Setup

As a developer,
I want all environment variables and configurations properly set up,
So that the application can securely connect to external services.

**Acceptance Criteria:**

**Given** the project structure is initialized
**When** I configure environment variables
**Then** Supabase client configuration works correctly
**And** Real-Debrid API credentials are properly configured (placeholders for now)
**And** TypeScript configuration supports strict type checking
**And** Next.js configuration supports API routes and static assets

**Prerequisites:** Story 1.2

**Technical Notes:** Create .env.local and .env.example files. Configure Supabase client in lib/database/supabase-client.ts. Set up TypeScript strict mode and path aliases.

### Story 1.4: Development Workflow Setup

As a developer,
I want a complete development workflow with linting, formatting, and basic testing setup,
So that code quality is maintained throughout development.

**Acceptance Criteria:**

**Given** the project is initialized and configured
**When** I set up development tools
**Then** Prettier is configured for code formatting
**And** Git hooks are set up for pre-commit linting
**And** basic test structure is established
**And** development scripts are added to package.json

**Prerequisites:** Story 1.3

**Technical Notes:** Configure Prettier to match Tailwind conventions. Set up Husky for Git hooks. Create basic test structure with Vitest. Add scripts for dev, build, lint, format, and test.

## Epic 2: Real-Debrid Integration

Implement the core Real-Debrid API integration and authentication system that enables DMM to connect to user accounts, fetch file metadata, and manage API interactions within rate limits while providing reliable error handling and sync capabilities.

### Story 2.1: OAuth2 Device Code Authentication Flow

As a user,
I want to connect my Real-Debrid account to DMM using device code authentication,
So that I can authorize the application to access my Real-Debrid files securely.

**Acceptance Criteria:**

**Given** the foundation is set up and I'm on the DMM application at `localhost:3000/connection`
**When** I click the "Connect to Real-Debrid" button
**Then** I see a device code displayed on screen with instructions to visit `real-debrid.com/device`

**And** I can copy the device code or click to visit the authorization website
**And** after entering the code on Real-Debrid's website, the application detects authorization automatically
**And** the application exchanges the device code for user-bound credentials and then for access/refresh tokens
**And** tokens are stored securely in the database
**And** I see a confirmation that my account is connected and am redirected to `/home`

**Prerequisites:** Epic 1 (all stories)

**Technical Notes:** Implement OAuth2 device code flow for Open Source Apps (Option 3). Create API routes `/api/auth/device/code` and `/api/auth/device/credentials`. Use client_id `X245A4XAIBGVM` with `new_credentials=yes`. Store tokens in `oauth_tokens` table. Handle token refresh logic and credential polling.

### Story 2.2: Real-Debrid API Client

As a developer,
I want a robust Real-Debrid API client with rate limiting and error handling,
So that the application can reliably interact with Real-Debrid's API without exceeding limits.

**Acceptance Criteria:**

**Given** Real-Debrid authentication is implemented
**When** I make API calls through the client
**Then** all requests respect the 250 requests/minute rate limit

**And** failed requests are retried with exponential backoff
**And** API errors are handled gracefully with user-friendly messages
**And** request and response data is properly typed with TypeScript
**And** the client supports all required Real-Debrid endpoints (files, torrents, user info)

**Prerequisites:** Story 2.1

**Technical Notes:** Create `lib/api/real-debrid-client.ts`. Implement rate limiting with token bucket algorithm. Add retry logic with exponential backoff. Use TypeScript interfaces for all API responses. Handle different error codes appropriately.

### Story 2.3: File Metadata Synchronization

As a user,
I want my Real-Debrid file metadata to be synchronized with DMM,
So that I can see and organize all my files in the virtual folder system.

**Acceptance Criteria:**

**Given** I'm connected to Real-Debrid
**When** the synchronization runs
**Then** all my Real-Debrid files are fetched and stored in the database

**And** file metadata includes filename, size, SHA1 hash, and MIME type
**And** duplicate files are identified using SHA1 hashes
**And** sync progress is displayed to the user
**And** sync can be triggered manually or runs automatically

**Prerequisites:** Story 2.2

**Technical Notes:** Create sync service that fetches files from Real-Debrid API. Store metadata in files table. Use SHA1 hash for duplicate detection. Implement incremental sync to only fetch new/changed files. Use React Query for caching.

### Story 2.4: Connection Status Management

As a user,
I want to see my Real-Debrid connection status and be able to disconnect,
So that I can manage my account connection and troubleshoot issues.

**Acceptance Criteria:**

**Given** I'm using the DMM application
**When** I view the settings page
**Then** I can see my Real-Debrid connection status (connected/disconnected)

**And** I can see when the last sync occurred
**And** I can manually trigger a sync
**And** I can disconnect my Real-Debrid account with confirmation
**And** connection errors are displayed clearly with suggested actions

**Prerequisites:** Story 2.3

**Technical Notes:** Create connection status component using React Query for real-time status. Implement sync button with loading states. Add disconnect functionality with confirmation dialog. Handle connection errors gracefully.

---

## Epic 3: Virtual Folder System

Implement the core virtual folder system that allows users to create custom folder structures, assign Real-Debrid files to folders, and navigate their organized library. This epic delivers the primary value proposition of DMM - intelligent virtual organization without moving actual files.

### Story 3.1: Folder Creation and Management

As a user,
I want to create and manage virtual folders in a hierarchical structure,
So that I can organize my Real-Debrid files according to my preferences.

**Acceptance Criteria:**

**Given** I'm connected to Real-Debrid and viewing the file browser
**When** I click "Create Folder" or right-click and select "Create Folder"
**Then** a new folder appears instantly with inline name editing

**And** I can name the folder and press Enter to save
**And** I can create subfolders within existing folders
**And** I can rename folders using inline editing (F2 or right-click)
**And** I can delete folders with confirmation (empty folders) or warning (folders with files)

**Prerequisites:** Epic 2 (all stories)

**Technical Notes:** Create folder management components using shadcn/ui. Implement folder CRUD operations in API routes `/api/folders`. Use Zustand for folder navigation state. Support unlimited folder depth with parent_id relationships.

### Story 3.2: File-to-Folder Assignment

As a user,
I want to assign my Real-Debrid files to virtual folders,
So that I can organize my files in meaningful ways without moving them.

**Acceptance Criteria:**

**Given** I have virtual folders created and synced files available
**When** I drag and drop files onto folders or use context menus
**Then** files are assigned to the selected virtual folders

**And** files can appear in multiple folders simultaneously
**And** the original Real-Debrid files remain unchanged
**And** file assignments are saved to the database immediately
**And** I can see which files are in each folder when browsing

**Prerequisites:** Story 3.1

**Technical Notes:** Implement file-folder many-to-many relationship in file_folders table. Create drag-and-drop functionality using React DnD or native HTML5 drag API. Use context menus for right-click operations. Update React Query cache on successful assignments.

### Story 3.3: Folder Navigation and Browsing

As a user,
I want to navigate my virtual folder structure smoothly and efficiently,
So that I can browse my organized library intuitively.

**Acceptance Criteria:**

**Given** I have folders with files assigned to them
**When** I click on folders or use breadcrumb navigation
**Then** the view updates instantly to show folder contents

**And** breadcrumb navigation shows my current location in the folder hierarchy
**And** I can navigate back to parent folders
**And** the performance remains fast even with 1,000+ files in a folder
**And** the current folder state is maintained in the URL for bookmarking

**Prerequisites:** Story 3.2

**Technical Notes:** Implement folder navigation using React Router with folder IDs in URL. Create breadcrumb component. Use React Query for folder data with caching. Implement lazy loading for large folders. Add search/filter functionality within folders.

### Story 3.4: Virtual File Naming

As a user,
I want to give files custom names within my virtual folders,
So that I can organize files with meaningful names without changing the original files.

**Acceptance Criteria:**

**Given** I have files assigned to virtual folders
**When** I rename a file using inline editing (F2 or right-click)
**Then** the virtual name is saved and displayed throughout the interface

**And** the original Real-Debrid filename remains unchanged
**And** the virtual name works only within the context of my virtual folders
**And** I can reset virtual names to the original filename
**And** virtual names are preserved across browser sessions

**Prerequisites:** Story 3.3

**Technical Notes:** Add virtual_filename column to files table. Implement inline editing using React Hook Form for validation. Update display logic to show virtual names when available, fallback to original names. Handle virtual name conflicts.

## Epic 4: File Organization Features

Implement advanced file organization capabilities including bulk operations, search functionality, and keyboard shortcuts that enhance the user's ability to efficiently manage large file libraries and quickly find specific content.

### Story 4.1: Bulk Operations for File Management

As a user,
I want to select multiple files and perform bulk operations,
So that I can organize large numbers of files efficiently.

**Acceptance Criteria:**

**Given** I'm viewing files in a folder with multiple items
**When** I use Ctrl+click or Shift+click to select multiple files
**Then** all selected files are highlighted with visual feedback

**And** I can right-click to access bulk operation options (move, copy, delete from folder)
**And** I can use keyboard shortcuts for common operations (Ctrl+C, Ctrl+V, Delete)
**And** bulk operations show progress indicators for large numbers of files
**And** operations can be cancelled if they take too long

**Prerequisites:** Epic 3 (all stories)

**Technical Notes:** Implement multi-select logic using keyboard event handlers and mouse events. Create bulk operation API endpoints for efficiency. Use Web Workers for heavy operations to maintain UI responsiveness. Add progress indicators using shadcn/ui progress components.

### Story 4.2: Advanced Search and Filtering

As a user,
I want to search and filter my files across all folders and metadata,
So that I can quickly find specific files in large libraries.

**Acceptance Criteria:**

**Given** I have many files organized across virtual folders
**When** I type in the search bar
**Then** search results appear instantly as I type (live search)

**And** search works across original filenames, virtual names, and file paths
**And** I can filter results by file type, size, date, or folder
**And** search results show which folders contain matching files
**And** I can save complex searches for future use

**Prerequisites:** Story 4.1

**Technical Notes:** Implement full-text search using PostgreSQL functions. Create search API with pagination and filtering. Use React Query for search result caching. Add debounced search input to prevent excessive API calls. Implement search result highlighting.

### Story 4.3: Keyboard Shortcuts and Power User Features

As a power user,
I want comprehensive keyboard shortcuts for common operations,
So that I can manage files efficiently without relying on mouse interactions.

**Acceptance Criteria:**

**Given** I'm using the file browser
**When** I use keyboard shortcuts
**Then** all common operations work via keyboard (navigation, selection, renaming, deletion)

**And** shortcuts follow standard conventions (F2 rename, Delete delete, Ctrl+A select all)
**And** I can see a help overlay showing all available shortcuts
**And** shortcuts work consistently across different parts of the application
**And** keyboard navigation is accessible and follows screen reader standards

**Prerequisites:** Story 4.2

**Technical Notes:** Implement global keyboard shortcut handler using React hotkeys or custom event listeners. Create keyboard shortcut help modal. Ensure WCAG compliance for keyboard accessibility. Add visual indicators for keyboard focus states.

### Story 4.4: Duplicate Detection and Management

As a user,
I want to identify and manage duplicate files in my library,
So that I can clean up unnecessary duplicates and optimize storage.

**Acceptance Criteria:**

**Given** my files are synchronized and I have SHA1 hashes available
**When** I view duplicate detection results
**Then** duplicates are grouped together showing identical files

**And** I can see which folders contain each duplicate
**And** I can choose which version to keep or keep all versions
**And** I can bulk-delete duplicates from specific folders while keeping them in others
**And** duplicate detection runs automatically after each sync

**Prerequisites:** Story 4.3

**Technical Notes:** Use SHA1 hash comparison for duplicate detection. Create duplicate detection API that groups files by hash. Implement duplicate management interface with clear visual indicators. Add background processing for duplicate detection after sync.

## Epic 5: User Interface & Experience

Implement the polished, responsive user interface with performance optimizations, real-time features, and accessibility support that delivers the clean, minimal experience specified in the PRD while handling large file libraries efficiently.

### Story 5.1: Clean Minimal Interface Implementation

As a user,
I want a clean, minimal interface that uses defauls shadcn ui styling,
So that I can focus on organizing my files without visual distractions.

**Acceptance Criteria:**

**Given** the application is loaded and I'm authenticated
**When** I view the main interface
**Then** the design follows minimal principles with maximum content area

**And** typography is clear and readable with proper hierarchy
**And** consistent spacing and alignment throughout the interface
**And** neutral color palette with subtle accent colors for actions

**Prerequisites:** Epic 4 (all stories)

**Technical Notes:** Implement using shadcn/ui components with default styling and use its mcp for better context

### Story 5.2: Real-time Sync Status and Indicators

As a user,
I want to see real-time sync status and progress indicators,
So that I understand what's happening with my Real-Debrid synchronization.

**Acceptance Criteria:**

**Given** I'm connected to Real-Debrid and sync operations are running
**When** I view the interface
**Then** I can see current sync status in the toolbar

**And** sync progress is shown with simple rotating indicators
**And** last sync time is displayed in a clear, non-intrusive format
**And** sync errors are shown as clean notifications with suggested actions
**And** real-time updates are shown when folder contents change

**Prerequisites:** Story 5.1

**Technical Notes:** Use Supabase real-time subscriptions for live updates. Create sync status components using React state and context. Implement simple loading states using shadcn/ui components. Add toast notifications for sync events.

### Story 5.3: Responsive Design and Mobile Support

As a user,
I want to use DMM on different screen sizes including mobile devices,
So that I can manage my files from any device.

**Acceptance Criteria:**

**Given** I'm accessing DMM on different devices
**When** I resize the browser or use mobile devices
**Then** the interface adapts properly to all screen sizes

**And** all core functionality works on mobile (create folders, assign files, navigate)
**And** touch interactions work correctly on mobile devices
**And** performance remains acceptable on mobile connections
**And** mobile-specific UI patterns are used where appropriate (bottom sheets, etc.)

**Prerequisites:** Story 5.2

**Technical Notes:** Implement responsive design using Tailwind CSS breakpoints. Add touch event handlers for mobile interactions. Optimize assets for mobile bandwidth. Test on various device sizes. Consider Progressive Web App features for mobile experience.

### Story 5.4: Performance Optimization for Large Libraries

As a user,
I want the application to remain fast and responsive even with thousands of files,
So that I can efficiently manage large media libraries.

**Acceptance Criteria:**

**Given** I have 10,000+ files in my Real-Debrid account
**When** I navigate folders, search, or perform operations
**Then** folder browsing loads in under 500ms

**And** search results appear in under 200ms
**And** file operations provide immediate UI feedback
**And** the application remains responsive during sync operations
**And** memory usage stays reasonable even with large file counts

**Prerequisites:** Story 5.3

## **Technical Notes:** Implement virtual scrolling for large file lists. Use React Query for intelligent caching. Optimize database queries with proper indexing. Use lazy loading for folder contents. Implement background processing for heavy operations. Add performance monitoring.

## Epic 6: Deployment and Production Setup

Configure and deploy the DMM application to production with proper monitoring, security, and scalability considerations to ensure a reliable service for users.

### Story 6.1: Production Deployment Configuration

As a developer,
I want to deploy DMM to production with proper configuration,
So that users can access the application reliably.

**Acceptance Criteria:**

**Given** all epics are complete and tested
**When** I deploy to Vercel
**Then** the application is accessible via the production domain

**And** environment variables are properly configured
**And** SSL certificates are automatically configured
**And** the application builds and starts successfully
**And** database connections work correctly in production

**Prerequisites:** Epic 5 (all stories)

**Technical Notes:** Configure Vercel deployment with proper environment variables. Set up custom domain if needed. Configure build and start scripts. Test production build locally before deployment. Set up error tracking and monitoring.

### Story 6.2: Monitoring and Error Tracking

As a developer,
I want comprehensive monitoring and error tracking in production,
So that I can identify and resolve issues quickly.

**Acceptance Criteria:**

**Given** the application is deployed to production
**When** users interact with the application
**Then** errors are automatically tracked and reported

**And** performance metrics are collected and monitored
**And** I can set up alerts for critical issues
**And** user interactions are tracked for debugging purposes
**And** database performance is monitored

**Prerequisites:** Story 6.1

**Technical Notes:** Integrate error tracking service (Sentry or similar). Add performance monitoring. Set up logging for critical events. Configure database monitoring. Create alerting rules for important metrics.

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._

# Story 3.1: Folder Creation and Management

**Epic:** Virtual Folder System
**Priority:** Critical | **Story Points:** 5 | **Tech Spec Level:** Detailed Implementation

**Status:** Ready for Development

---

## User Story

As a user,
I want to create and manage virtual folders in a hierarchical structure,
So that I can organize my Real-Debrid files according to my preferences.

---

## Technical Specification

### Overview

This story implements the core virtual folder creation and management functionality for DMM, allowing users to create, rename, move, and delete virtual folders in a hierarchical structure. The system handles unlimited folder depth, maintains proper parent-child relationships, and provides real-time updates with optimistic UI feedback.

### Technology Stack

- **Database Operations**: Supabase with efficient hierarchical queries
- **State Management**: Zustand with React Query for optimistic updates
- **UI Components**: shadcn/ui (context menu, inline editing, dialog)
- **Tree Operations**: Recursive folder hierarchy management
- **Real-time Updates**: Supabase real-time subscriptions
- **Keyboard Shortcuts**: F2 for rename, Delete for removal, context menu support
- **Drag and Drop**: Native HTML5 drag API for folder movement

### Folder Operations

#### CRUD Operations

- **Create**: Add new folder with parent and name
- **Read**: Retrieve folder hierarchy and individual folder details
- **Update**: Rename folder and change parent (move)
- **Delete**: Remove folder (with confirmation) and handle sub-folders

#### Hierarchical Features

- **Unlimited Depth**: Support for any folder nesting level
- **Path Management**: Automatic path generation and updates
- **Parent Validation**: Prevent circular references
- **Duplicate Prevention**: Check for duplicate names at same level

### Implementation Tasks

#### 1. Create Folder Database Operations

**File: `src/lib/folders/folder-service.ts`:**

```typescript
import { getSupabaseClient } from '@/lib/database/supabase-client'

// Folder interface
export interface Folder {
  id: string
  user_id: string
  parent_id: string | null
  name: string
  path: string | null
  created_at: string
  updated_at: string
}

// Folder creation input
export interface CreateFolderInput {
  parent_id: string | null
  name: string
}

// Folder update input
export interface UpdateFolderInput {
  name?: string
  parent_id?: string | null
}

// Folder hierarchy node
export interface FolderNode extends Folder {
  children: FolderNode[]
  depth: number
  expanded?: boolean
}

export class FolderService {
  // Create new folder
  async createFolder(userId: string, input: CreateFolderInput): Promise<Folder | null> {
    try {
      const supabase = getSupabaseClient(true)

      // Validate folder name
      if (!input.name || input.name.trim().length === 0) {
        throw new Error('Folder name is required')
      }

      if (input.name.length > 255) {
        throw new Error('Folder name cannot exceed 255 characters')
      }

      // Check for duplicate names at same level
      const { data: existingFolder } = await supabase
        .from('folders')
        .select('id')
        .eq('user_id', userId)
        .eq('parent_id', input.parent_id)
        .eq('name', input.name.trim())
        .single()

      if (existingFolder) {
        throw new Error('A folder with this name already exists at this location')
      }

      // Create folder
      const { data: folder, error } = await supabase
        .from('folders')
        .insert({
          user_id: userId,
          parent_id: input.parent_id,
          name: input.name.trim(),
        })
        .select()
        .single()

      if (error || !folder) {
        throw new Error(error?.message || 'Failed to create folder')
      }

      return folder
    } catch (error) {
      console.error('Create folder error:', error)
      throw error
    }
  }

  // Get folder by ID
  async getFolderById(userId: string, folderId: string): Promise<Folder | null> {
    try {
      const supabase = getSupabaseClient(true)

      const { data: folder, error } = await supabase
        .from('folders')
        .select()
        .eq('user_id', userId)
        .eq('id', folderId)
        .single()

      if (error || !folder) {
        return null
      }

      return folder
    } catch (error) {
      console.error('Get folder error:', error)
      return null
    }
  }

  // Get all folders for user
  async getUserFolders(userId: string): Promise<Folder[]> {
    try {
      const supabase = getSupabaseClient(true)

      const { data: folders, error } = await supabase
        .from('folders')
        .select()
        .eq('user_id', userId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Get folders error:', error)
        return []
      }

      return folders || []
    } catch (error) {
      console.error('Get folders error:', error)
      return []
    }
  }

  // Get folder hierarchy as tree
  async getFolderTree(userId: string): Promise<FolderNode[]> {
    try {
      const folders = await this.getUserFolders(userId)
      return this.buildFolderTree(folders)
    } catch (error) {
      console.error('Get folder tree error:', error)
      return []
    }
  }

  // Update folder
  async updateFolder(
    userId: string,
    folderId: string,
    input: UpdateFolderInput
  ): Promise<Folder | null> {
    try {
      const supabase = getSupabaseClient(true)

      // Validate folder exists and belongs to user
      const existingFolder = await this.getFolderById(userId, folderId)
      if (!existingFolder) {
        throw new Error('Folder not found')
      }

      let updateData: any = {}

      // Validate name if provided
      if (input.name !== undefined) {
        if (!input.name || input.name.trim().length === 0) {
          throw new Error('Folder name is required')
        }

        if (input.name.length > 255) {
          throw new Error('Folder name cannot exceed 255 characters')
        }

        // Check for duplicate names at same level (unless moving to different parent)
        const parentToCheck =
          input.parent_id !== undefined ? input.parent_id : existingFolder.parent_id

        if (
          input.name.trim() !== existingFolder.name ||
          parentToCheck !== existingFolder.parent_id
        ) {
          const { data: duplicateFolder } = await supabase
            .from('folders')
            .select('id')
            .eq('user_id', userId)
            .eq('parent_id', parentToCheck)
            .eq('name', input.name.trim())
            .neq('id', folderId)
            .single()

          if (duplicateFolder) {
            throw new Error('A folder with this name already exists at this location')
          }
        }

        updateData.name = input.name.trim()
      }

      // Validate parent if provided
      if (input.parent_id !== undefined) {
        // Check if moving to own descendants would create circular reference
        if (input.parent_id === folderId) {
          throw new Error('A folder cannot be its own parent')
        }

        const descendants = await this.getFolderDescendants(userId, folderId)
        if (descendants.some((f) => f.id === input.parent_id)) {
          throw new Error('Cannot move a folder into its own subfolders')
        }

        updateData.parent_id = input.parent_id
      }

      if (Object.keys(updateData).length === 0) {
        return existingFolder // No changes to make
      }

      // Update folder
      const { data: folder, error } = await supabase
        .from('folders')
        .update(updateData)
        .eq('id', folderId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error || !folder) {
        throw new Error(error?.message || 'Failed to update folder')
      }

      return folder
    } catch (error) {
      console.error('Update folder error:', error)
      throw error
    }
  }

  // Delete folder
  async deleteFolder(userId: string, folderId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient(true)

      // Validate folder exists and belongs to user
      const existingFolder = await this.getFolderById(userId, folderId)
      if (!existingFolder) {
        throw new Error('Folder not found')
      }

      // Check for sub-folders
      const { data: subFolders, error: subFolderError } = await supabase
        .from('folders')
        .select('id')
        .eq('user_id', userId)
        .eq('parent_id', folderId)
        .limit(1)

      if (subFolderError) {
        throw new Error('Failed to check for sub-folders')
      }

      if (subFolders && subFolders.length > 0) {
        throw new Error('Cannot delete folder that contains sub-folders')
      }

      // Check for files in folder
      const { data: folderFiles, error: fileError } = await supabase
        .from('file_folders')
        .select('id')
        .eq('folder_id', folderId)
        .limit(1)

      if (fileError) {
        throw new Error('Failed to check for files')
      }

      if (folderFiles && folderFiles.length > 0) {
        throw new Error('Cannot delete folder that contains files')
      }

      // Delete folder
      const { error: deleteError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', userId)

      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete folder')
      }

      return true
    } catch (error) {
      console.error('Delete folder error:', error)
      throw error
    }
  }

  // Get folder descendants (for validation)
  private async getFolderDescendants(userId: string, folderId: string): Promise<Folder[]> {
    try {
      const supabase = getSupabaseClient(true)

      // Recursive query to get all descendants
      const { data: folders, error } = await supabase.rpc('get_folder_descendants', {
        p_user_id: userId,
        p_folder_id: folderId,
      })

      if (error) {
        console.error('Get folder descendants error:', error)
        return []
      }

      return folders || []
    } catch (error) {
      console.error('Get folder descendants error:', error)
      return []
    }
  }

  // Build folder tree from flat list
  private buildFolderTree(folders: Folder[]): FolderNode[] {
    const folderMap = new Map<string, FolderNode>()
    const rootFolders: FolderNode[] = []

    // Create folder nodes
    for (const folder of folders) {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        depth: 0,
      })
    }

    // Build hierarchy
    for (const folder of folders) {
      const node = folderMap.get(folder.id)!

      if (folder.parent_id) {
        const parent = folderMap.get(folder.parent_id)
        if (parent) {
          parent.children.push(node)
          node.depth = parent.depth + 1
        } else {
          // Orphan folder - treat as root
          rootFolders.push(node)
        }
      } else {
        // Root folder
        rootFolders.push(node)
      }
    }

    // Sort folders alphabetically at each level
    const sortFolders = (folders: FolderNode[]) => {
      folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      for (const folder of folders) {
        sortFolders(folder.children)
      }
    }

    sortFolders(rootFolders)
    return rootFolders
  }

  // Search folders by name
  async searchFolders(userId: string, query: string): Promise<Folder[]> {
    try {
      const supabase = getSupabaseClient(true)

      const { data: folders, error } = await supabase
        .from('folders')
        .select()
        .eq('user_id', userId)
        .ilike('name', `%${query}%`)
        .order('name', { ascending: true })
        .limit(50)

      if (error) {
        console.error('Search folders error:', error)
        return []
      }

      return folders || []
    } catch (error) {
      console.error('Search folders error:', error)
      return []
    }
  }

  // Get breadcrumb path for folder
  async getFolderPath(userId: string, folderId: string): Promise<Folder[]> {
    try {
      const supabase = getSupabaseClient(true)

      // Use path from database if available
      const { data: folder, error } = await supabase
        .from('folders')
        .select('path')
        .eq('user_id', userId)
        .eq('id', folderId)
        .single()

      if (error || !folder || !folder.path) {
        return []
      }

      // Parse path to get folder hierarchy
      const pathParts = folder.path.split('/').filter((part) => part.length > 0)
      const breadcrumbFolders: Folder[] = []

      for (const part of pathParts) {
        const { data: folderData, error: folderError } = await supabase
          .from('folders')
          .select()
          .eq('user_id', userId)
          .eq('name', part)
          .single()

        if (folderError || !folderData) {
          break
        }

        breadcrumbFolders.push(folderData)
      }

      return breadcrumbFolders
    } catch (error) {
      console.error('Get folder path error:', error)
      return []
    }
  }
}

// Export singleton instance
export const folderService = new FolderService()
```

**Database function for folder descendants:**

```sql
-- Migration for get_folder_descendants function
CREATE OR REPLACE FUNCTION get_folder_descendants(
  p_user_id UUID,
  p_folder_id UUID
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  parent_id UUID,
  name VARCHAR(255),
  path VARCHAR(1000),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  WITH RECURSIVE folder_tree AS (
    -- Base case: the folder itself
    SELECT
      f.id,
      f.user_id,
      f.parent_id,
      f.name,
      f.path,
      f.created_at,
      f.updated_at
    FROM folders f
    WHERE f.id = p_folder_id AND f.user_id = p_user_id

    UNION ALL

    -- Recursive case: direct and indirect children
    SELECT
      f.id,
      f.user_id,
      f.parent_id,
      f.name,
      f.path,
      f.created_at,
      f.updated_at
    FROM folders f
    INNER JOIN folder_tree ft ON f.parent_id = ft.id
    WHERE f.user_id = p_user_id
  )
  SELECT
    id,
    user_id,
    parent_id,
    name,
    path,
    created_at,
    updated_at
  FROM folder_tree
  WHERE id != p_folder_id; -- Exclude the starting folder
END;
$$ LANGUAGE plpgsql;
```

**Validation:**

- [ ] Folder CRUD operations work correctly
- [ ] Hierarchical structure is maintained properly
- [ ] Duplicate prevention works at same level
- [ ] Circular reference validation prevents invalid moves
- [ ] Path management updates automatically
- [ ] Folder tree building is efficient and correct

#### 2. Create Folder API Routes

**File: `src/app/api/folders/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/database/supabase-client'
import { folderService, CreateFolderInput } from '@/lib/folders/folder-service'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = getSupabaseClient(true)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const tree = searchParams.get('tree') === 'true'
    const search = searchParams.get('search')

    let folders

    if (search) {
      // Search folders
      folders = await folderService.searchFolders(user.id, search)
    } else if (tree) {
      // Get folder tree
      folders = await folderService.getFolderTree(user.id)
    } else {
      // Get flat list
      folders = await folderService.getUserFolders(user.id)
    }

    return NextResponse.json({
      success: true,
      data: folders,
      count: folders.length,
    })
  } catch (error) {
    console.error('Get folders error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get folders',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = getSupabaseClient(true)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { parent_id, name } = body

    // Validate input
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    const createInput: CreateFolderInput = {
      parent_id: parent_id || null,
      name: name.trim(),
    }

    // Create folder
    const folder = await folderService.createFolder(user.id, createInput)

    if (!folder) {
      return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: folder,
    })
  } catch (error) {
    console.error('Create folder error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create folder',
      },
      { status: 400 }
    )
  }
}
```

**File: `src/app/api/folders/[id]/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/database/supabase-client'
import { folderService } from '@/lib/folders/folder-service'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get authenticated user
    const supabase = getSupabaseClient(true)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = params

    // Get folder
    const folder = await folderService.getFolderById(user.id, id)

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: folder,
    })
  } catch (error) {
    console.error('Get folder error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get folder',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get authenticated user
    const supabase = getSupabaseClient(true)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = params

    // Parse request body
    const body = await request.json()
    const { name, parent_id } = body

    // Validate input
    if (name !== undefined && (!name || typeof name !== 'string')) {
      return NextResponse.json({ error: 'Folder name must be a non-empty string' }, { status: 400 })
    }

    const updateInput: any = {}
    if (name !== undefined) updateInput.name = name
    if (parent_id !== undefined) updateInput.parent_id = parent_id

    // Update folder
    const folder = await folderService.updateFolder(user.id, id, updateInput)

    if (!folder) {
      return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: folder,
    })
  } catch (error) {
    console.error('Update folder error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update folder',
      },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get authenticated user
    const supabase = getSupabaseClient(true)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = params

    // Delete folder
    const success = await folderService.deleteFolder(user.id, id)

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully',
    })
  } catch (error) {
    console.error('Delete folder error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete folder',
      },
      { status: 400 }
    )
  }
}
```

**File: `src/app/api/folders/breadcrumb/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/database/supabase-client'
import { folderService } from '@/lib/folders/folder-service'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = getSupabaseClient(true)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    // Get breadcrumb path
    const breadcrumb = await folderService.getFolderPath(user.id, folderId)

    return NextResponse.json({
      success: true,
      data: breadcrumb,
    })
  } catch (error) {
    console.error('Get breadcrumb error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get breadcrumb path',
      },
      { status: 500 }
    )
  }
}
```

**Validation:**

- [ ] API routes handle all folder CRUD operations
- [ ] Authentication is required for all endpoints
- [ ] Input validation prevents invalid operations
- [ ] Error handling provides clear messages
- [ ] Search functionality works correctly
- [ ] Tree structure can be retrieved efficiently

#### 3. Create Folder UI Components

**File: `src/components/folders/folder-tree.tsx`:**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { FolderNode } from '@/lib/folders/folder-service'
import { FolderItem } from './folder-item'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FolderPlus, Search, ChevronDown, ChevronRight, Folder } from 'lucide-react'

interface FolderTreeProps {
  folders: FolderNode[]
  selectedFolderId?: string
  onFolderSelect?: (folder: FolderNode) => void
  onFolderCreate?: (parentId: string | null) => void
  onFolderUpdate?: (folderId: string, name: string) => void
  onFolderDelete?: (folderId: string) => void
  loading?: boolean
  className?: string
}

export function FolderTree({
  folders,
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete,
  loading = false,
  className,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredFolders, setFilteredFolders] = useState<FolderNode[]>(folders)

  // Filter folders based on search
  useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredFolders(folders)
      return
    }

    const filterNodes = (nodes: FolderNode[]): FolderNode[] => {
      return nodes.filter((node) => {
        const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase())
        const childrenMatch = node.children.length > 0 && filterNodes(node.children).length > 0
        return matchesSearch || childrenMatch
      })
    }

    setFilteredFolders(filterNodes(folders))
  }, [folders, searchQuery])

  // Toggle folder expansion
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }, [])

  // Expand all folders
  const expandAll = useCallback(() => {
    const getAllFolderIds = (nodes: FolderNode[]): string[] => {
      let ids: string[] = []
      for (const node of nodes) {
        ids.push(node.id)
        ids = ids.concat(getAllFolderIds(node.children))
      }
      return ids
    }

    setExpandedFolders(new Set(getAllFolderIds(folders)))
  }, [folders])

  // Collapse all folders
  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set())
  }, [])

  // Render folder node recursively
  const renderFolderNode = useCallback(
    (node: FolderNode, depth: number = 0): JSX.Element => {
      const isExpanded = expandedFolders.has(node.id)
      const hasChildren = node.children.length > 0
      const isSelected = selectedFolderId === node.id

      return (
        <div key={node.id} className="select-none">
          {/* Folder */}
          <FolderItem
            folder={node}
            depth={depth}
            selected={isSelected}
            expanded={isExpanded}
            onSelect={() => onFolderSelect?.(node)}
            onToggle={() => hasChildren && toggleFolder(node.id)}
            onCreateSubfolder={() => onFolderCreate?.(node.id)}
            onUpdate={(name) => onFolderUpdate?.(node.id, name)}
            onDelete={() => onFolderDelete?.(node.id)}
          />

          {/* Children */}
          {hasChildren && isExpanded && (
            <div className="ml-4">
              {node.children.map((child) => renderFolderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    },
    [
      expandedFolders,
      selectedFolderId,
      onFolderSelect,
      onFolderUpdate,
      onFolderDelete,
      onFolderCreate,
      toggleFolder,
    ]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5 animate-pulse" />
          <span>Loading folders...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <Input
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button variant="outline" size="sm" onClick={() => onFolderCreate?.(null)}>
          <FolderPlus className="h-4 w-4" />
        </Button>

        {folders.length > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={expandAll}>
              <ChevronDown className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={collapseAll}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Folders */}
      {filteredFolders.length > 0 ? (
        <div className="space-y-1">{filteredFolders.map((folder) => renderFolderNode(folder))}</div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          {searchQuery ? 'No folders found matching your search' : 'No folders created yet'}
        </div>
      )}
    </div>
  )
}
```

**File: `src/components/folders/folder-item.tsx`:**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { FolderNode } from '@/lib/folders/folder-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Folder,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit2,
  Trash2,
  FolderPlus,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface FolderItemProps {
  folder: FolderNode
  depth: number
  selected?: boolean
  expanded?: boolean
  onSelect?: () => void
  onToggle?: () => void
  onCreateSubfolder?: () => void
  onUpdate?: (name: string) => void
  onDelete?: () => void
}

export function FolderItem({
  folder,
  depth,
  selected = false,
  expanded = false,
  onSelect,
  onToggle,
  onCreateSubfolder,
  onUpdate,
  onDelete,
}: FolderItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Handle name edit submission
  const handleSubmit = () => {
    const trimmedName = editName.trim()
    if (trimmedName && trimmedName !== folder.name) {
      onUpdate?.(trimmedName)
    } else {
      setEditName(folder.name)
    }
    setIsEditing(false)
  }

  // Handle key presses during edit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setEditName(folder.name)
      setIsEditing(false)
    }
  }

  // Handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(e.target.value)
  }

  const hasChildren = folder.children.length > 0

  return (
    <div
      className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent ${selected ? 'bg-accent' : ''} `}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={onSelect}
    >
      {/* Expand/Collapse button */}
      {hasChildren && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 opacity-70 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onToggle?.()
          }}
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
      )}

      {!hasChildren && <div className="h-5 w-5" />}

      {/* Folder icon */}
      <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />

      {/* Folder name */}
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editName}
          onChange={handleNameChange}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          className="h-6 px-1 py-0 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-sm">{folder.name}</span>
      )}

      {/* Action buttons */}
      {!isEditing && (
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateSubfolder?.()
                }}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Subfolder
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.()
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
```

**File: `src/components/folders/folder-context-menu.tsx`:**

```tsx
'use client'

import { useState } from 'react'
import { Folder } from '@/lib/folders/folder-service'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { FolderPlus, Edit2, Trash2, Copy, FileSymlink } from 'lucide-react'

interface FolderContextMenuProps {
  children: React.ReactNode
  folder?: Folder
  onCreateFolder?: (parentId: string | null) => void
  onRenameFolder?: (folderId: string) => void
  onDeleteFolder?: (folderId: string) => void
}

export function FolderContextMenu({
  children,
  folder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCreateFolder = () => {
    setIsOpen(false)
    onCreateFolder?.(folder?.id || null)
  }

  const handleRenameFolder = () => {
    setIsOpen(false)
    if (folder) {
      onRenameFolder?.(folder.id)
    }
  }

  const handleDeleteFolder = () => {
    setIsOpen(false)
    if (folder) {
      onDeleteFolder?.(folder.id)
    }
  }

  return (
    <ContextMenu open={isOpen} onOpenChange={setIsOpen}>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={handleCreateFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </ContextMenuItem>

        {folder && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleRenameFolder}>
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>

            <ContextMenuItem>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </ContextMenuItem>

            <ContextMenuItem>
              <FileSymlink className="mr-2 h-4 w-4" />
              Move
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem
              onClick={handleDeleteFolder}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
```

**Validation:**

- [ ] Folder tree displays hierarchical structure correctly
- [ ] Folder items support inline editing and context menus
- [ ] Search functionality filters folders properly
- [ ] Expand/collapse actions work smoothly
- [ ] Keyboard shortcuts (F2, Escape) work in edit mode
- [ ] Action buttons provide good UX with hover states

#### 4. Create Folder Management Page

**File: `src/app/folders/page.tsx`:**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { FolderNode } from '@/lib/folders/folder-service';
import { folderService } from '@/lib/folders/folder-service';
import { useConnectionStore } from '@/stores/connection-store';
import { FolderTree } from '@/components/folders/folder-tree';
import { FolderContextMenu } from '@/components/folders/folder-context-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FolderPlus,
  FolderOpen,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function FoldersPage() {
  const { state: connectionState } = useConnectionStore();
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  // Load folders
  const loadFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const userFolders = await folderService.getFolderTree('current-user-id'); // TODO: Get actual user ID
      setFolders(userFolders);

    } catch (err) {
      console.error('Failed to load folders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Handle folder selection
  const handleFolderSelect = useCallback((folder: FolderNode) => {
    setSelectedFolderId(folder.id);
  }, []);

  // Handle folder creation
  const handleFolderCreate = useCallback(async (parentId: string | null) => {
    setParentFolderId(parentId);
    setNewFolderName('');
    setCreateDialogOpen(true);
  }, []);

  // Handle folder creation submission
  const handleCreateSubmit = useCallback(async () => {
    if (!newFolderName.trim()) {
      return;
    }

    try {
      setError(undefined);

      await folderService.createFolder('current-user-id', { // TODO: Get actual user ID
        parent_id: parentFolderId,
        name: newFolderName.trim(),
      });

      setCreateDialogOpen(false);
      setNewFolderName('');
      setParentFolderId(null);

      // Reload folders
      await loadFolders();

    } catch (err) {
      console.error('Failed to create folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    }
  }, [newFolderName, parentFolderId, loadFolders]);

  // Handle folder update
  const handleFolderUpdate = useCallback(async (folderId: string, name: string) => {
    try {
      setError(undefined);

      await folderService.updateFolder('current-user-id', folderId, { // TODO: Get actual user ID
        name,
      });

      // Reload folders
      await loadFolders();

    } catch (err) {
      console.error('Failed to update folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to update folder');
    }
  }, [loadFolders]);

  // Handle folder deletion
  const handleFolderDelete = useCallback(async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
      return;
    }

    try {
      setError(undefined);

      await folderService.deleteFolder('current-user-id', folderId); // TODO: Get actual user ID

      // Reload folders
      await loadFolders();

      // Clear selection if deleted folder was selected
      if (selectedFolderId === folderId) {
        setSelectedFolderId(undefined);
      }

    } catch (err) {
      console.error('Failed to delete folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
    }
  }, [selectedFolderId, loadFolders]);

  // Check if Real-Debrid is connected
  if (connectionState !== 'connected') {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Real-Debrid Connection Required</CardTitle>
              <CardDescription>
                You need to connect your Real-Debrid account before you can create virtual folders.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild className="w-full">
                <a href="/connection">Connect to Real-Debrid</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FolderOpen className="h-8 w-8" />
              Virtual Folders
            </h1>
            <p className="text-muted-foreground">
              Organize your Real-Debrid files with custom folder structures.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadFolders}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button onClick={() => handleFolderCreate(null)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 border border-red-200 bg-red-50 rounded-md text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Folder tree */}
        <Card>
          <CardHeader>
            <CardTitle>Folder Structure</CardTitle>
            <CardDescription>
              Right-click on folders for more options. Use F2 to rename folders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FolderContextMenu
              onRenameFolder={handleFolderUpdate}
              onDeleteFolder={handleFolderDelete}
              onCreateFolder={handleFolderCreate}
            >
              <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                onFolderSelect={handleFolderSelect}
                onFolderCreate={handleFolderCreate}
                onFolderUpdate={handleFolderUpdate}
                onFolderDelete={handleFolderDelete}
                loading={loading}
              />
            </FolderContextMenu>
          </CardContent>
        </Card>
      </div>

      {/* Create folder dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateSubmit();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button
                onClick={handleCreateSubmit}
                disabled={!newFolderName.trim()}
              >
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Validation:**

- [ ] Page loads and displays folders correctly
- [ ] Connection check prevents folder creation when not connected
- [ ] Folder operations create, update, and delete correctly
- [ ] UI provides clear feedback for all operations
- [ ] Error handling shows appropriate messages
- [ ] Responsive design works on different screen sizes

### Acceptance Criteria

#### Given-When-Then Format

**GIVEN** I'm connected to Real-Debrid and viewing the file browser
**WHEN** I click "Create Folder" or right-click and select "Create Folder"
**THEN** a new folder appears instantly with inline name editing

**AND** following folder operations work correctly:

1. **Folder Creation Validation:**
   - ✅ New folder appears with inline name editing
   - ✅ I can name the folder and press Enter to save
   - ✅ I can create subfolders within existing folders
   - ✅ Folders can be created at root level or within other folders
   - ✅ Empty folder names are prevented
   - ✅ Folder name length is properly validated (255 characters max)

2. **Folder Renaming Validation:**
   - ✅ I can rename folders using inline editing (F2 or right-click)
   - ✅ Editing starts immediately when I press F2 or click rename
   - ✅ I can cancel editing with Escape key
   - ✅ Changes are saved when I press Enter or click away
   - ✅ Duplicate folder names at same level are prevented
   - ✅ Empty folder names are prevented during rename

3. **Folder Deletion Validation:**
   - ✅ I can delete folders with confirmation dialog
   - ✅ Empty folders can be deleted immediately
   - ✅ Folders with files show warning and prevent deletion
   - ✅ Folders with subfolders show warning and prevent deletion
   - ✅ Confirmation dialog clearly states the consequences
   - ✅ Cancel option allows me to abort deletion

4. **Hierarchical Structure Validation:**
   - ✅ I can create unlimited folder depth
   - ✅ Folder hierarchy is visually clear with indentation
   - ✅ Parent-child relationships are maintained correctly
   - ✅ Moving folders to different parents works
   - ✅ Circular references (moving folder into its own subtree) are prevented
   - ✅ Folder structure persists across browser sessions

5. **User Interface Validation:**
   - ✅ Folders display with proper icons and visual hierarchy
   - ✅ Context menu provides all folder management options
   - ✅ Keyboard shortcuts (F2 for rename, Delete for delete) work
   - ✅ Drag and drop functionality works for folder movement
   - ✅ Folder expansion/collapse works smoothly with visual feedback
   - ✅ Search functionality filters folders by name

### Prerequisites

- Story 2.1: OAuth2 Device Code Authentication Flow
- Story 2.2: Real-Debrid API Client
- Story 2.3: File Metadata Synchronization
- User must be connected to Real-Debrid

### Dependencies

- Real-Debrid connection for file organization
- Supabase database for folder storage
- File synchronization service for metadata
- Authentication system for user context

### Technical Implementation Notes

1. **Hierarchical Data**: Use recursive SQL for efficient folder tree operations
2. **Path Management**: Maintain path field for breadcrumb navigation
3. **Performance**: Implement efficient folder tree rendering with virtualization for large trees
4. **Real-time Updates**: Use Supabase real-time for collaborative folder updates
5. **User Experience**: Provide optimistic updates with rollback on errors

### Definition of Done

- [ ] Folder CRUD operations work correctly
- [ ] Hierarchical structure is maintained properly
- [ ] UI provides excellent folder management experience
- [ ] Database operations handle large folder structures efficiently
- [ ] Error handling prevents data corruption
- [ ] Real-time updates work across multiple browser tabs
- [ ] Keyboard shortcuts and context menus work correctly
- [ ] All acceptance criteria are validated
- [ ] Performance is good for folders with 1000+ items

### Risk Mitigation

1. **Data Consistency**: Use transactions for folder operations
2. **Circular References**: Prevent invalid parent-child relationships
3. **Performance**: Implement virtual scrolling for large folder trees
4. **Race Conditions**: Handle concurrent folder operations gracefully
5. **Data Loss**: Require confirmation for destructive operations

### Validation Commands

```bash
# Test folder API endpoints
npm run dev

# Create folder
curl -X POST http://localhost:3000/api/folders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Folder"}'

# Get folders
curl http://localhost:3000/api/folders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get folder tree
curl "http://localhost:3000/api/folders?tree=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update folder
curl -X PUT http://localhost:3000/api/folders/FOLDER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Folder Name"}'

# Delete folder
curl -X DELETE http://localhost:3000/api/folders/FOLDER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test database functions
npx supabase db select "SELECT * FROM get_folder_descendants('USER_ID', 'FOLDER_ID');"
```

## Development Constraints

### Pre-Development Constraints

**MANDATORY PRE-REQUISITES:**

**1. Previous Stories Completion Verification:**

```bash
# MUST verify ALL previous stories are complete before starting this story
find /Users/haseebace/Downloads/Projects/DFM -name "story-*-*.md" -path "*/docs/stories/*" | sort -V

# Verify these specific stories exist and are complete:
# ✅ Story 1.1: OAuth2 Device Code Authentication Flow
# ✅ Story 1.2: Real-Debrid API Client Implementation
# ✅ Story 1.3: File Metadata Synchronization Service
# ✅ Story 1.4: Webhook Processing System
# ✅ Story 2.1: User Authentication and Session Management
# ✅ Story 2.2: File Browser Implementation
# ✅ Story 2.3: File Details and Management
# ✅ Story 2.4: Search and Filtering System

# Validate authentication is working
curl -I http://localhost:3000/api/auth/status

# Validate Real-Debrid connection endpoints exist
curl -I http://localhost:3000/api/realdebrid/status
curl -I http://localhost:3000/api/realdebrid/connect
curl -I http://localhost:3000/api/realdebrid/callback

# Validate file browser is functional
curl -I "http://localhost:3000/api/files?page=1&limit=10"
curl -I "http://localhost:3000/api/files/search"

# REQUIRED: All previous story validation commands must pass
# REQUIRED: Database must have all tables from previous stories
```

**2. Database Schema Constraints:**

```sql
-- FOLDERS TABLE MUST EXIST before starting implementation
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('folders', 'file_folders')
ORDER BY table_name, ordinal_position;

-- Verify folders table structure
\d folders

-- Expected folders table structure:
-- id: UUID (PRIMARY KEY)
-- user_id: UUID (FOREIGN KEY to auth.users)
-- parent_id: UUID (NULLABLE, self-reference to folders.id)
-- name: VARCHAR(255) (NOT NULL)
-- path: VARCHAR(1000) (NULLABLE, for breadcrumb navigation)
-- created_at: TIMESTAMPTZ
-- updated_at: TIMESTAMPTZ

-- Verify file_folders table structure (junction table)
\d file_folders

-- Expected file_folders table structure:
-- id: UUID (PRIMARY KEY)
-- file_id: UUID (FOREIGN KEY to files table)
-- folder_id: UUID (FOREIGN KEY to folders table)
-- created_at: TIMESTAMPTZ

-- Check for required indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'folders'
ORDER BY indexname;

-- Required indexes:
-- folders_pkey (PRIMARY KEY on id)
-- idx_folders_user_id (on user_id)
-- idx_folders_parent_id (on parent_id)
-- idx_folders_user_parent (on user_id, parent_id)
-- idx_folders_name_search (on user_id, name using gin/varchar_pattern_ops)

-- Verify get_folder_descendants function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'get_folder_descendants';

-- Test the function
SELECT * FROM get_folder_descendants('USER_ID', 'FOLDER_ID') LIMIT 1;
```

**3. Authentication and Authorization Constraints:**

```typescript
// MUST verify user authentication is properly implemented
// File: src/lib/database/supabase-client.ts MUST exist and be functional
import { getSupabaseClient } from '@/lib/database/supabase-client'

// Test authentication context
const supabase = getSupabaseClient(true)
const {
  data: { user },
  error,
} = await supabase.auth.getUser()

// REQUIRED: User context MUST be available in all API routes
// REQUIRED: Row Level Security (RLS) MUST be enabled on folders table
// REQUIRED: RLS policies MUST prevent cross-user folder access
```

**4. File System Integration Constraints:**

```typescript
// File synchronization service MUST exist and be functional
import { fileSyncService } from '@/lib/files/file-sync-service'

// Verify file metadata sync is working
const files = await fileSyncService.syncFiles(userId)

// REQUIRED: files table MUST exist with proper structure
// REQUIRED: file_folders junction table MUST exist for file-folder relationships
// REQUIRED: Real-Debrid API integration MUST be functional
```

### Implementation Constraints

**1. Database Operations Constraints:**

```typescript
// ALL folder operations MUST use transaction-safe patterns
// REQUIRED: FolderService class MUST implement proper error handling
// REQUIRED: All operations MUST validate user ownership
// REQUIRED: Circular reference prevention MUST be implemented
// REQUIRED: Duplicate name checking MUST be at parent level
// REQUIRED: Cascade deletion rules MUST prevent data orphaning

// Critical constraints for folder operations:
const CONSTRAINTS = {
  CREATE: {
    name: {
      required: true,
      maxLength: 255,
      pattern: /^[^<>:"/\\|?*]+$/, // No invalid file system characters
      uniqueAtLevel: true,
    },
    parent_id: {
      circularReferenceCheck: true,
      ownershipCheck: true,
      allowNull: true, // Root folders
    },
  },
  UPDATE: {
    name: {
      sameAsCreate: true,
      duplicateCheck: true,
    },
    parent_id: {
      descendantCheck: true, // Cannot move into own subtree
      ownershipCheck: true,
    },
  },
  DELETE: {
    emptyCheck: true, // Only delete empty folders
    fileCheck: true, // Cannot delete folders containing files
    subfolderCheck: true, // Cannot delete folders with subfolders
    confirmation: true, // User confirmation required
  },
}
```

**2. API Service Constraints:**

```typescript
// API routes MUST follow these constraints:
const API_CONSTRAINTS = {
  AUTHENTICATION: {
    required: true, // All endpoints must authenticate
    userContext: true, // User ID must be extracted from JWT
    rowLevelSecurity: true, // RLS must enforce user isolation
  },
  VALIDATION: {
    input: true, // All inputs must be validated
    sqlInjection: false, // Must use parameterized queries
    rateLimit: true, // Rate limiting must be implemented
    cors: true, // CORS must be properly configured
  },
  RESPONSES: {
    success: {
      format: 'standard', // { success: true, data: ... }
      includesCount: true, // Include count for array responses
    },
    error: {
      format: 'standard', // { error: message }
      noStackTrace: true, // Never expose stack traces
      properStatusCodes: true, // Use appropriate HTTP status codes
    },
  },
  PERFORMANCE: {
    timeout: 30000, // 30 second timeout
    pagination: true, // Large result sets must be paginated
    caching: false, // No caching for real-time data
    compression: true, // Enable gzip compression
  },
}
```

**3. UI Components Constraints:**

```typescript
// Folder UI components MUST implement:
const UI_CONSTRAINTS = {
  FOLDER_TREE: {
    virtualization: true, // Virtual scrolling for 1000+ folders
    search: true, // Real-time search filtering
    expansion: true, // Lazy loading of child folders
    keyboard: true, // Full keyboard navigation support
    dragDrop: true, // Drag and drop functionality
    responsive: true, // Mobile-responsive design
    accessibility: true, // ARIA labels and screen reader support
  },
  FOLDER_ITEM: {
    inlineEditing: true, // F2 key and double-click to rename
    contextMenu: true, // Right-click context menu
    hoverStates: true, // Visual feedback on hover
    selection: true, // Click to select folder
    shortcuts: true, // Keyboard shortcuts support
    validation: true, // Real-time validation during editing
  },
  MODALS: {
    confirmation: true, // Confirmation dialogs for destructive actions
    forms: true, // Proper form validation
    escape: true, // Escape key to close
    focus: true, // Proper focus management
    backdrop: true, // Click outside to close for safe actions
  },
}
```

**4. Performance and Scalability Constraints:**

```typescript
// MUST handle large folder structures efficiently:
const PERFORMANCE_CONSTRAINTS = {
  FOLDERS_PER_USER: {
    maxRecommended: 5000, // Recommended maximum per user
    maxSupported: 50000, // Absolute maximum supported
    depthLimit: 20, // Maximum folder depth
    breadthOptimal: 100, // Optimal folders per level
  },
  API_RESPONSES: {
    listFolders: 2000, // Max folders in list response
    treeStructure: 3000, // Max folders in tree response
    searchResults: 100, // Max search results returned
    breadcrumbPath: 50, // Max breadcrumb levels
  },
  UI_RENDERING: {
    virtualScrolling: 1000, // Enable virtual scrolling above this count
    lazyLoading: true, // Load child folders on expansion
    debounceSearch: 300, // Debounce search input (ms)
    optimisticUpdates: true, // Immediate UI feedback
    errorRecovery: true, // Graceful error handling
  },
}
```

**5. Real-time Updates Constraints:**

```typescript
// Real-time folder updates MUST implement:
const REALTIME_CONSTRAINTS = {
  SUPABASE_REALTIME: {
    subscriptions: true, // Subscribe to folder changes
    multiTab: true, // Sync across multiple tabs
    conflict: 'last-write-wins', // Conflict resolution strategy
    reconnect: true, // Automatic reconnection
    errorHandling: true, // Graceful degradation
  },
  EVENTS: ['INSERT', 'UPDATE', 'DELETE'], // Supported events
  FILTERS: {
    user_id: 'eq.current_user', // User-specific filtering
    table: 'folders', // Table-specific subscription
  },
}
```

**6. Error Handling and Validation Constraints:**

```typescript
// Comprehensive error handling required:
const ERROR_HANDLING_CONSTRAINTS = {
  USER_ERRORS: {
    duplicateFolder: {
      message: 'A folder with this name already exists at this location',
      userFriendly: true,
      action: 'Choose a different name or location',
    },
    circularReference: {
      message: 'Cannot move a folder into its own subfolders',
      userFriendly: true,
      action: 'Choose a different parent folder',
    },
    folderNotEmpty: {
      message: 'Cannot delete folder that contains files or subfolders',
      userFriendly: true,
      action: 'Remove all contents first',
    },
    invalidName: {
      message: 'Folder name contains invalid characters',
      userFriendly: true,
      action: 'Use valid folder name characters',
    },
  },
  SYSTEM_ERRORS: {
    database: {
      message: 'Database operation failed',
      logLevel: 'error',
      userMessage: 'Unable to complete folder operation',
    },
    network: {
      message: 'Network connection failed',
      logLevel: 'warn',
      userMessage: 'Check your connection and try again',
    },
    timeout: {
      message: 'Operation timed out',
      logLevel: 'warn',
      userMessage: 'Operation took too long, please try again',
    },
  },
}
```

**7. Security and Privacy Constraints:**

```typescript
// Security requirements for folder operations:
const SECURITY_CONSTRAINTS = {
  AUTHORIZATION: {
    userIsolation: true, // Users can only access their own folders
    ownership: true, // Verify folder ownership before operations
    session: true, // Validate user session on each request
    token: true, // Validate JWT tokens properly
  },
  INPUT_VALIDATION: {
    sanitization: true, // Sanitize all user inputs
    encoding: true, // Proper encoding for special characters
    length: true, // Enforce maximum length limits
    pattern: true, // Validate name patterns
  },
  PRIVACY: {
    dataLeakage: false, // Never expose other users' folder data
    informationDisclosure: false, // Minimize error information exposure
    audit: true, // Log all folder operations for audit trail
  },
}
```

### Implementation Validation Constraints

**1. Database Validation Commands:**

```bash
# MUST execute these validation commands during development

# 1. Verify folders table structure
npx supabase db describe folders

# 2. Test folder creation constraints
npx supabase db <<EOF
-- Test constraint validation
BEGIN;

-- Test duplicate name prevention
INSERT INTO folders (user_id, parent_id, name)
VALUES ('USER_ID', NULL, 'Test Folder');

-- This should fail with constraint violation
INSERT INTO folders (user_id, parent_id, name)
VALUES ('USER_ID', NULL, 'Test Folder');

ROLLBACK;
EOF

# 3. Test circular reference prevention
npx supabase db <<EOF
-- Test circular reference constraint
BEGIN;

-- Create parent folder
INSERT INTO folders (user_id, parent_id, name)
VALUES ('USER_ID', NULL, 'Parent Folder')
RETURNING id;

-- Create child folder
INSERT INTO folders (user_id, parent_id, name)
VALUES ('USER_ID', 'PARENT_ID', 'Child Folder')
RETURNING id;

-- This should fail - cannot set parent as child
UPDATE folders SET parent_id = 'CHILD_ID' WHERE id = 'PARENT_ID';

ROLLBACK;
EOF

# 4. Test get_folder_descendants function
npx supabase db <<EOF
-- Create test folder structure
WITH test_folders AS (
  SELECT
    gen_random_uuid() as id,
    'USER_ID' as user_id,
    NULL as parent_id,
    'Root Folder' as name,
    '/Root Folder' as path,
    NOW() as created_at,
    NOW() as updated_at
  UNION ALL
  SELECT
    gen_random_uuid() as id,
    'USER_ID' as user_id,
    (SELECT id FROM test_folders WHERE name = 'Root Folder' LIMIT 1) as parent_id,
    'Child Folder' as name,
    '/Root Folder/Child Folder' as path,
    NOW() as created_at,
    NOW() as updated_at
  UNION ALL
  SELECT
    gen_random_uuid() as id,
    'USER_ID' as user_id,
    (SELECT id FROM test_folders WHERE name = 'Child Folder' LIMIT 1) as parent_id,
    'Grandchild Folder' as name,
    '/Root Folder/Child Folder/Grandchild Folder' as path,
    NOW() as created_at,
    NOW() as updated_at
)
SELECT
  f.name,
  f.path,
  d.parent_name
FROM test_folders f
LEFT JOIN LATERAL (
  SELECT name as parent_name
  FROM test_folders
  WHERE id = f.parent_id
  LIMIT 1
) d ON true;
EOF

# 5. Verify indexes performance
npx supabase db <<EOF
-- Check query execution plans
EXPLAIN ANALYZE
SELECT * FROM folders
WHERE user_id = 'USER_ID'
AND parent_id IS NULL
ORDER BY name;

EXPLAIN ANALYZE
SELECT * FROM get_folder_descendants('USER_ID', 'FOLDER_ID');
EOF
```

**2. Folder Service Validation Commands:**

```bash
# MUST validate FolderService implementation

# 1. Create comprehensive test suite
cat > /Users/haseebace/Downloads/Projects/DFM/src/test/folders/folder-service.test.ts <<'EOF'
import { folderService } from '@/lib/folders/folder-service';

// Test folder creation with validation
describe('FolderService', () => {
  const testUserId = 'test-user-id';

  test('should create folder with valid input', async () => {
    const folder = await folderService.createFolder(testUserId, {
      parent_id: null,
      name: 'Test Folder'
    });

    expect(folder).toBeTruthy();
    expect(folder.name).toBe('Test Folder');
    expect(folder.user_id).toBe(testUserId);
    expect(folder.parent_id).toBeNull();
  });

  test('should reject empty folder name', async () => {
    await expect(
      folderService.createFolder(testUserId, { parent_id: null, name: '' })
    ).rejects.toThrow('Folder name is required');
  });

  test('should reject names with invalid characters', async () => {
    await expect(
      folderService.createFolder(testUserId, { parent_id: null, name: 'Folder<>' })
    ).rejects.toThrow();
  });

  test('should reject duplicate names at same level', async () => {
    const folderName = 'Duplicate Test';

    await folderService.createFolder(testUserId, { parent_id: null, name: folderName });

    await expect(
      folderService.createFolder(testUserId, { parent_id: null, name: folderName })
    ).rejects.toThrow('already exists');
  });

  test('should allow duplicate names at different levels', async () => {
    const folderName = 'Level Test';

    const parent1 = await folderService.createFolder(testUserId, {
      parent_id: null,
      name: 'Parent 1'
    });

    const parent2 = await folderService.createFolder(testUserId, {
      parent_id: null,
      name: 'Parent 2'
    });

    const child1 = await folderService.createFolder(testUserId, {
      parent_id: parent1.id,
      name: folderName
    });

    const child2 = await folderService.createFolder(testUserId, {
      parent_id: parent2.id,
      name: folderName
    });

    expect(child1.name).toBe(folderName);
    expect(child2.name).toBe(folderName);
  });

  test('should prevent circular references when moving folders', async () => {
    const root = await folderService.createFolder(testUserId, {
      parent_id: null,
      name: 'Root'
    });

    const child = await folderService.createFolder(testUserId, {
      parent_id: root.id,
      name: 'Child'
    });

    const grandchild = await folderService.createFolder(testUserId, {
      parent_id: child.id,
      name: 'Grandchild'
    });

    // Should fail - cannot move root into its own descendant
    await expect(
      folderService.updateFolder(testUserId, root.id, { parent_id: grandchild.id })
    ).rejects.toThrow('own subfolders');
  });

  test('should build folder tree correctly', async () => {
    // Create test hierarchy
    const root = await folderService.createFolder(testUserId, {
      parent_id: null,
      name: 'Tree Root'
    });

    const child1 = await folderService.createFolder(testUserId, {
      parent_id: root.id,
      name: 'Child 1'
    });

    const child2 = await folderService.createFolder(testUserId, {
      parent_id: root.id,
      name: 'Child 2'
    });

    const grandchild = await folderService.createFolder(testUserId, {
      parent_id: child1.id,
      name: 'Grandchild'
    });

    const tree = await folderService.getFolderTree(testUserId);

    expect(tree).toHaveLength(1); // One root folder
    expect(tree[0].name).toBe('Tree Root');
    expect(tree[0].children).toHaveLength(2); // Two children
    expect(tree[0].children[0].name).toBe('Child 1');
    expect(tree[0].children[0].children).toHaveLength(1); // One grandchild
    expect(tree[0].children[1].name).toBe('Child 2');
  });
});
EOF

# 2. Run folder service tests
npm test -- src/test/folders/folder-service.test.ts

# 3. Test performance with large folder structures
cat > /Users/haseebace/Downloads/Projects/DFM/src/test/folders/folder-performance.test.ts <<'EOF'
import { folderService } from '@/lib/folders/folder-service';

describe('FolderService Performance', () => {
  const testUserId = 'performance-test-user';

  test('should handle 1000+ folders efficiently', async () => {
    const startTime = Date.now();

    // Create 1000 folders in a flat structure
    const createPromises = [];
    for (let i = 0; i < 1000; i++) {
      createPromises.push(
        folderService.createFolder(testUserId, {
          parent_id: null,
          name: `Performance Test Folder ${i}`
        })
      );
    }

    await Promise.all(createPromises);

    const createTime = Date.now() - startTime;
    console.log(`Created 1000 folders in ${createTime}ms`);

    // Test retrieval performance
    const retrievalStart = Date.now();
    const folders = await folderService.getUserFolders(testUserId);
    const retrievalTime = Date.now() - retrievalStart;

    expect(folders).toHaveLength(1000);
    expect(retrievalTime).toBeLessThan(1000); // Should be under 1 second
    console.log(`Retrieved 1000 folders in ${retrievalTime}ms`);

    // Test tree building performance
    const treeStart = Date.now();
    const tree = await folderService.getFolderTree(testUserId);
    const treeTime = Date.now() - treeStart;

    expect(tree).toHaveLength(1000);
    expect(treeTime).toBeLessThan(2000); // Should be under 2 seconds
    console.log(`Built tree with 1000 folders in ${treeTime}ms`);
  });

  test('should handle deep folder hierarchies', async () => {
    const startTime = Date.now();
    let parentId: string | null = null;

    // Create folder chain with 20 levels deep
    for (let i = 0; i < 20; i++) {
      const folder = await folderService.createFolder(testUserId, {
        parent_id: parentId,
        name: `Level ${i + 1}`
      });
      parentId = folder.id;
    }

    const createTime = Date.now() - startTime;
    console.log(`Created 20-level deep hierarchy in ${createTime}ms`);

    // Test descendant retrieval
    const descendantStart = Date.now();
    const descendants = await folderService.getFolderDescendants(testUserId, parentId!);
    const descendantTime = Date.now() - descendantStart;

    expect(descendantTime).toBeLessThan(500); // Should be under 500ms
    console.log(`Retrieved descendants in ${descendantTime}ms`);
  });
});
EOF

# 4. Run performance tests
npm test -- src/test/folders/folder-performance.test.ts
```

**3. API Endpoint Validation Commands:**

```bash
# MUST validate all folder API endpoints

# 1. Start development server
npm run dev &
SERVER_PID=$!
sleep 5

# 2. Get authentication token (replace with actual user credentials)
AUTH_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}' | \
  jq -r '.token')

echo "Auth token: $AUTH_TOKEN"

# 3. Test folder creation endpoint
echo "Testing folder creation..."
FOLDER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/folders \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "API Test Folder"}')

echo "Folder creation response: $FOLDER_RESPONSE"
FOLDER_ID=$(echo $FOLDER_RESPONSE | jq -r '.data.id')
echo "Created folder ID: $FOLDER_ID"

# 4. Test invalid folder creation
echo "Testing invalid folder creation..."
curl -s -X POST http://localhost:3000/api/folders \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": ""}' | jq

# 5. Test duplicate folder creation
echo "Testing duplicate folder creation..."
curl -s -X POST http://localhost:3000/api/folders \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "API Test Folder"}' | jq

# 6. Test folder retrieval endpoints
echo "Testing folder retrieval..."
curl -s http://localhost:3000/api/folders \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq

echo "Testing folder tree retrieval..."
curl -s "http://localhost:3000/api/folders?tree=true" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq

# 7. Test folder update endpoint
echo "Testing folder update..."
curl -s -X PUT http://localhost:3000/api/folders/$FOLDER_ID \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated API Test Folder"}' | jq

# 8. Test folder deletion endpoint
echo "Testing folder deletion..."
curl -s -X DELETE http://localhost:3000/api/folders/$FOLDER_ID \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq

# 9. Test unauthorized access
echo "Testing unauthorized access..."
curl -s http://localhost:3000/api/folders | jq

curl -s -X POST http://localhost:3000/api/folders \
  -H "Content-Type: application/json" \
  -d '{"name": "Unauthorized Folder"}' | jq

# 10. Test search functionality
echo "Testing folder search..."
curl -s "http://localhost:3000/api/folders?search=Test" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq

# 11. Test breadcrumb endpoint
if [ ! -z "$FOLDER_ID" ]; then
  echo "Testing breadcrumb endpoint..."
  curl -s "http://localhost:3000/api/folders/breadcrumb?folderId=$FOLDER_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" | jq
fi

# 12. Clean up
kill $SERVER_PID
```

**4. UI Components Validation Commands:**

```bash
# MUST validate all folder UI components

# 1. Create component tests
cat > /Users/haseebace/Downloads/Projects/DFM/src/test/components/folders/folder-tree.test.tsx <<'EOF'
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FolderTree } from '@/components/folders/folder-tree';
import { FolderNode } from '@/lib/folders/folder-service';

const mockFolders: FolderNode[] = [
  {
    id: '1',
    user_id: 'user1',
    parent_id: null,
    name: 'Documents',
    path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: [
      {
        id: '2',
        user_id: 'user1',
        parent_id: '1',
        name: 'Work',
        path: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        children: [],
        depth: 1
      }
    ],
    depth: 0
  },
  {
    id: '3',
    user_id: 'user1',
    parent_id: null,
    name: 'Pictures',
    path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: [],
    depth: 0
  }
];

describe('FolderTree', () => {
  const mockHandlers = {
    onFolderSelect: jest.fn(),
    onFolderCreate: jest.fn(),
    onFolderUpdate: jest.fn(),
    onFolderDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders folder structure correctly', () => {
    render(
      <FolderTree
        folders={mockFolders}
        onFolderSelect={mockHandlers.onFolderSelect}
        onFolderCreate={mockHandlers.onFolderCreate}
        onFolderUpdate={mockHandlers.onFolderUpdate}
        onFolderDelete={mockHandlers.onFolderDelete}
      />
    );

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Pictures')).toBeInTheDocument();
    expect(screen.getByText('Search folders...')).toBeInTheDocument();
  });

  test('filters folders based on search query', async () => {
    const user = userEvent.setup();

    render(
      <FolderTree
        folders={mockFolders}
        onFolderSelect={mockHandlers.onFolderSelect}
        onFolderCreate={mockHandlers.onFolderCreate}
        onFolderUpdate={mockHandlers.onFolderUpdate}
        onFolderDelete={mockHandlers.onFolderDelete}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search folders...');
    await user.type(searchInput, 'Documents');

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.queryByText('Pictures')).not.toBeInTheDocument();
    });
  });

  test('expands and collapses folders', async () => {
    render(
      <FolderTree
        folders={mockFolders}
        onFolderSelect={mockHandlers.onFolderSelect}
        onFolderCreate={mockHandlers.onFolderCreate}
        onFolderUpdate={mockHandlers.onFolderUpdate}
        onFolderDelete={mockHandlers.onFolderDelete}
      />
    );

    // Initially collapsed - child folder should not be visible
    expect(screen.queryByText('Work')).not.toBeInTheDocument();

    // Click expand button
    const expandButton = screen.getAllByRole('button')[0]; // First expand button
    fireEvent.click(expandButton);

    // Child folder should now be visible
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });

  test('calls handlers correctly', async () => {
    const user = userEvent.setup();

    render(
      <FolderTree
        folders={mockFolders}
        selectedFolderId="1"
        onFolderSelect={mockHandlers.onFolderSelect}
        onFolderCreate={mockHandlers.onFolderCreate}
        onFolderUpdate={mockHandlers.onFolderUpdate}
        onFolderDelete={mockHandlers.onFolderDelete}
      />
    );

    // Test folder selection
    await user.click(screen.getByText('Documents'));
    expect(mockHandlers.onFolderSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', name: 'Documents' })
    );

    // Test new folder creation
    const newFolderButton = screen.getByRole('button', { name: '' });
    await user.click(newFolderButton);
    expect(mockHandlers.onFolderCreate).toHaveBeenCalledWith(null);
  });
});
EOF

# 2. Create folder item component tests
cat > /Users/haseebace/Downloads/Projects/DFM/src/test/components/folders/folder-item.test.tsx <<'EOF'
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FolderItem } from '@/components/folders/folder-item';
import { FolderNode } from '@/lib/folders/folder-service';

const mockFolder: FolderNode = {
  id: '1',
  user_id: 'user1',
  parent_id: null,
  name: 'Test Folder',
  path: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: [],
  depth: 0
};

describe('FolderItem', () => {
  const mockHandlers = {
    onSelect: jest.fn(),
    onToggle: jest.fn(),
    onCreateSubfolder: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders folder name correctly', () => {
    render(
      <FolderItem
        folder={mockFolder}
        depth={0}
        onSelect={mockHandlers.onSelect}
        onToggle={mockHandlers.onToggle}
        onCreateSubfolder={mockHandlers.onCreateSubfolder}
        onUpdate={mockHandlers.onUpdate}
        onDelete={mockHandlers.onDelete}
      />
    );

    expect(screen.getByText('Test Folder')).toBeInTheDocument();
  });

  test('enters edit mode when F2 is pressed', async () => {
    render(
      <FolderItem
        folder={mockFolder}
        depth={0}
        onSelect={mockHandlers.onSelect}
        onToggle={mockHandlers.onToggle}
        onCreateSubfolder={mockHandlers.onCreateSubfolder}
        onUpdate={mockHandlers.onUpdate}
        onDelete={mockHandlers.onDelete}
      />
    );

    const folderItem = screen.getByText('Test Folder');
    fireEvent.keyDown(folderItem, { key: 'F2' });

    await waitFor(() => {
      const input = screen.getByDisplayValue('Test Folder');
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();
    });
  });

  test('saves folder name on Enter key', async () => {
    const user = userEvent.setup();

    render(
      <FolderItem
        folder={mockFolder}
        depth={0}
        onSelect={mockHandlers.onSelect}
        onToggle={mockHandlers.onToggle}
        onCreateSubfolder={mockHandlers.onCreateSubfolder}
        onUpdate={mockHandlers.onUpdate}
        onDelete={mockHandlers.onDelete}
      />
    );

    // Enter edit mode
    const folderItem = screen.getByText('Test Folder');
    fireEvent.keyDown(folderItem, { key: 'F2' });

    // Change name and press Enter
    const input = await screen.findByDisplayValue('Test Folder');
    await user.clear(input);
    await user.type(input, 'Updated Folder');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockHandlers.onUpdate).toHaveBeenCalledWith('Updated Folder');
  });

  test('cancels edit on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <FolderItem
        folder={mockFolder}
        depth={0}
        onSelect={mockHandlers.onSelect}
        onToggle={mockHandlers.onToggle}
        onCreateSubfolder={mockHandlers.onCreateSubfolder}
        onUpdate={mockHandlers.onUpdate}
        onDelete={mockHandlers.onDelete}
      />
    );

    // Enter edit mode
    const folderItem = screen.getByText('Test Folder');
    fireEvent.keyDown(folderItem, { key: 'F2' });

    // Change name and press Escape
    const input = await screen.findByDisplayValue('Test Folder');
    await user.clear(input);
    await user.type(input, 'Cancelled Edit');
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Cancelled Edit')).not.toBeInTheDocument();
      expect(screen.getByText('Test Folder')).toBeInTheDocument();
    });

    expect(mockHandlers.onUpdate).not.toHaveBeenCalled();
  });
});
EOF

# 3. Run component tests
npm test -- src/test/components/folders/folder-tree.test.tsx
npm test -- src/test/components/folders/folder-item.test.tsx
```

**5. Integration Testing Constraints:**

```bash
# MUST run comprehensive integration tests

# 1. Create integration test suite
cat > /Users/haseebace/Downloads/Projects/DFM/src/test/integration/folder-management.integration.test.ts <<'EOF'
import { folderService } from '@/lib/folders/folder-service';
import { fileSyncService } from '@/lib/files/file-sync-service';

describe('Folder Management Integration', () => {
  const testUserId = 'integration-test-user';

  beforeEach(async () => {
    // Clean up test data
    const folders = await folderService.getUserFolders(testUserId);
    for (const folder of folders) {
      await folderService.deleteFolder(testUserId, folder.id);
    }
  });

  test('should integrate with file system correctly', async () => {
    // Create folder hierarchy
    const rootFolder = await folderService.createFolder(testUserId, {
      parent_id: null,
      name: 'Integration Test Root'
    });

    const subFolder = await folderService.createFolder(testUserId, {
      parent_id: rootFolder.id,
      name: 'Subfolder'
    });

    // Simulate file association (would normally use file_folders table)
    // This tests that folder creation doesn't interfere with file operations
    const tree = await folderService.getFolderTree(testUserId);

    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].name).toBe('Integration Test Root');
    expect(tree[0].children[0].name).toBe('Subfolder');
  });

  test('should handle concurrent operations', async () => {
    // Test concurrent folder creation
    const createPromises = [];
    for (let i = 0; i < 10; i++) {
      createPromises.push(
        folderService.createFolder(testUserId, {
          parent_id: null,
          name: `Concurrent Folder ${i}`
        })
      );
    }

    const results = await Promise.all(createPromises);
    expect(results).toHaveLength(10);

    // Verify all folders were created with unique names
    const allFolders = await folderService.getUserFolders(testUserId);
    const createdFolders = allFolders.filter(f =>
      f.name.startsWith('Concurrent Folder')
    );
    expect(createdFolders).toHaveLength(10);
  });

  test('should maintain data consistency during errors', async () => {
    // Create initial folder
    const folder = await folderService.createFolder(testUserId, {
      parent_id: null,
      name: 'Consistency Test'
    });

    // Attempt invalid operation (should fail)
    try {
      await folderService.createFolder(testUserId, {
        parent_id: null,
        name: 'Consistency Test' // Duplicate name
      });
      fail('Should have thrown error for duplicate name');
    } catch (error) {
      // Expected error
    }

    // Verify original folder still exists and is unchanged
    const retrievedFolder = await folderService.getFolderById(testUserId, folder.id);
    expect(retrievedFolder).toBeTruthy();
    expect(retrievedFolder.name).toBe('Consistency Test');

    const allFolders = await folderService.getUserFolders(testUserId);
    const consistencyFolders = allFolders.filter(f =>
      f.name === 'Consistency Test'
    );
    expect(consistencyFolders).toHaveLength(1);
  });
});
EOF

# 2. Run integration tests
npm test -- src/test/integration/folder-management.integration.test.ts
```

**6. Performance and Load Testing Constraints:**

```bash
# MUST validate performance with large datasets

# 1. Create load test script
cat > /Users/haseebace/Downloads/Projects/DFM/scripts/folder-load-test.js <<'EOF'
const { performance } = require('perf_hooks');

async function loadTestFolders() {
  console.log('Starting folder load test...');

  const testUserId = 'load-test-user';
  const folderService = require('../src/lib/folders/folder-service').folderService;

  // Test 1: Bulk folder creation
  console.log('Test 1: Creating 1000 folders...');
  const startCreate = performance.now();

  const createPromises = [];
  for (let i = 0; i < 1000; i++) {
    createPromises.push(
      folderService.createFolder(testUserId, {
        parent_id: null,
        name: `Load Test Folder ${i}`
      })
    );
  }

  await Promise.all(createPromises);
  const createDuration = performance.now() - startCreate;
  console.log(`✅ Created 1000 folders in ${createDuration.toFixed(2)}ms`);

  // Test 2: Folder retrieval performance
  console.log('Test 2: Retrieving folder list...');
  const startRetrieve = performance.now();

  const folders = await folderService.getUserFolders(testUserId);
  const retrieveDuration = performance.now() - startRetrieve;

  console.log(`✅ Retrieved ${folders.length} folders in ${retrieveDuration.toFixed(2)}ms`);

  // Test 3: Tree building performance
  console.log('Test 3: Building folder tree...');
  const startTree = performance.now();

  const tree = await folderService.getFolderTree(testUserId);
  const treeDuration = performance.now() - startTree;

  console.log(`✅ Built tree with ${tree.length} folders in ${treeDuration.toFixed(2)}ms`);

  // Test 4: Search performance
  console.log('Test 4: Testing search performance...');
  const startSearch = performance.now();

  const searchResults = await folderService.searchFolders(testUserId, 'Load Test');
  const searchDuration = performance.now() - startSearch;

  console.log(`✅ Found ${searchResults.length} search results in ${searchDuration.toFixed(2)}ms`);

  // Performance assertions
  if (createDuration > 10000) {
    console.warn('⚠️  Folder creation took longer than expected (>10s)');
  }

  if (retrieveDuration > 1000) {
    console.warn('⚠️  Folder retrieval took longer than expected (>1s)');
  }

  if (treeDuration > 2000) {
    console.warn('⚠️  Tree building took longer than expected (>2s)');
  }

  if (searchDuration > 500) {
    console.warn('⚠️  Search took longer than expected (>500ms)');
  }

  console.log('Load test completed successfully!');
}

loadTestFolders().catch(console.error);
EOF

# 2. Run load test
node /Users/haseebace/Downloads/Projects/DFM/scripts/folder-load-test.js

# 3. Test memory usage with large datasets
cat > /Users/haseebace/Downloads/Projects/DFM/scripts/memory-test.js <<'EOF'
const { performance } = require('perf_hooks');

function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(used.external / 1024 / 1024 * 100) / 100
  };
}

async function memoryTestFolders() {
  console.log('Starting memory test for folder operations...');

  const initialMemory = getMemoryUsage();
  console.log('Initial memory usage:', initialMemory);

  const testUserId = 'memory-test-user';
  const folderService = require('../src/lib/folders/folder-service').folderService;

  // Create many folders to test memory usage
  console.log('Creating 5000 folders...');
  const createPromises = [];
  for (let i = 0; i < 5000; i++) {
    createPromises.push(
      folderService.createFolder(testUserId, {
        parent_id: i % 100 === 0 ? null : `folder-${Math.floor(i/100)}`,
        name: `Memory Test Folder ${i}`
      })
    );
  }

  await Promise.all(createPromises);
  const afterCreateMemory = getMemoryUsage();
  console.log('Memory after creating 5000 folders:', afterCreateMemory);

  // Test multiple retrievals
  console.log('Performing 100 folder retrievals...');
  for (let i = 0; i < 100; i++) {
    await folderService.getUserFolders(testUserId);
  }

  const afterRetrievalsMemory = getMemoryUsage();
  console.log('Memory after 100 retrievals:', afterRetrievalsMemory);

  // Test tree building
  console.log('Building 100 folder trees...');
  for (let i = 0; i < 100; i++) {
    await folderService.getFolderTree(testUserId);
  }

  const afterTreesMemory = getMemoryUsage();
  console.log('Memory after 100 tree builds:', afterTreesMemory);

  // Memory growth analysis
  const memoryGrowth = {
    rss: afterTreesMemory.rss - initialMemory.rss,
    heapTotal: afterTreesMemory.heapTotal - initialMemory.heapTotal,
    heapUsed: afterTreesMemory.heapUsed - initialMemory.heapUsed
  };

  console.log('Memory growth:', memoryGrowth);

  // Check for memory leaks
  if (memoryGrowth.heapUsed > 100) {
    console.warn('⚠️  Potential memory leak detected (>100MB growth)');
  }

  console.log('Memory test completed!');
}

memoryTestFolders().catch(console.error);
EOF

# 4. Run memory test
node /Users/haseebace/Downloads/Projects/DFM/scripts/memory-test.js
```

**7. Manual Code Verification Commands:**

```bash
# MUST manually verify code implementation

# 1. Verify folder service implementation exists and follows constraints
echo "=== Folder Service Verification ==="
ls -la /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/
echo "Folder service files:"
find /Users/haseebace/Downloads/Projects/DFM/src/lib/folders -name "*.ts" -type f

# 2. Check folder service code quality
echo "=== Checking folder service implementation ==="
if [ -f "/Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts" ]; then
  echo "✅ folder-service.ts exists"

  # Check for required methods
  grep -q "createFolder" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ createFolder method exists" || echo "❌ createFolder method missing"
  grep -q "getFolderById" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ getFolderById method exists" || echo "❌ getFolderById method missing"
  grep -q "getUserFolders" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ getUserFolders method exists" || echo "❌ getUserFolders method missing"
  grep -q "getFolderTree" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ getFolderTree method exists" || echo "❌ getFolderTree method missing"
  grep -q "updateFolder" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ updateFolder method exists" || echo "❌ updateFolder method missing"
  grep -q "deleteFolder" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ deleteFolder method exists" || echo "❌ deleteFolder method missing"

  # Check for validation patterns
  grep -q "throw new Error" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ Error handling implemented" || echo "❌ Error handling missing"
  grep -q "user_id" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ User validation implemented" || echo "❌ User validation missing"

else
  echo "❌ folder-service.ts not found"
fi

# 3. Verify API routes exist
echo "=== API Routes Verification ==="
ls -la /Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/

# Check main folder routes
[ -f "/Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/route.ts" ] && echo "✅ Main folder route exists" || echo "❌ Main folder route missing"
[ -f "/Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/[id]/route.ts" ] && echo "✅ Folder ID route exists" || echo "❌ Folder ID route missing"
[ -f "/Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/breadcrumb/route.ts" ] && echo "✅ Breadcrumb route exists" || echo "❌ Breadcrumb route missing"

# 4. Verify UI components exist
echo "=== UI Components Verification ==="
ls -la /Users/haseebace/Downloads/Projects/DFM/src/components/folders/

[ -f "/Users/haseebace/Downloads/Projects/DFM/src/components/folders/folder-tree.tsx" ] && echo "✅ FolderTree component exists" || echo "❌ FolderTree component missing"
[ -f "/Users/haseebace/Downloads/Projects/DFM/src/components/folders/folder-item.tsx" ] && echo "✅ FolderItem component exists" || echo "❌ FolderItem component missing"
[ -f "/Users/haseebace/Downloads/Projects/DFM/src/components/folders/folder-context-menu.tsx" ] && echo "✅ FolderContextMenu component exists" || echo "❌ FolderContextMenu component missing"

# 5. Verify folder management page exists
echo "=== Page Verification ==="
[ -f "/Users/haseebace/Downloads/Projects/DFM/src/app/folders/page.tsx" ] && echo "✅ Folders page exists" || echo "❌ Folders page missing"

# 6. Check TypeScript compilation
echo "=== TypeScript Compilation Check ==="
cd /Users/haseebace/Downloads/Projects/DFM
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(folder|Folder)" || echo "✅ No TypeScript errors in folder code"

# 7. Check for security patterns
echo "=== Security Verification ==="
if [ -f "/Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts" ]; then
  grep -q "user_id" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ User isolation implemented" || echo "❌ User isolation missing"
  grep -q "\.eq('user_id'" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ User filtering in queries" || echo "❌ User filtering missing"
fi

# Check API routes for authentication
if [ -f "/Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/route.ts" ]; then
  grep -q "auth.getUser" /Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/route.ts && echo "✅ API authentication implemented" || echo "❌ API authentication missing"
  grep -q "Authorization" /Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/route.ts && echo "✅ Authorization header check" || echo "❌ Authorization header check missing"
fi

# 8. Check for performance patterns
echo "=== Performance Verification ==="
if [ -f "/Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts" ]; then
  grep -q "recursive\|tree\|buildFolderTree" /Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts && echo "✅ Tree building implemented" || echo "❌ Tree building missing"
  grep -q "limit\|pagination" /Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/route.ts && echo "✅ Pagination considered" || echo "⚠️  Pagination not implemented"
fi

# 9. Check UI component accessibility
echo "=== Accessibility Verification ==="
if [ -f "/Users/haseebace/Downloads/Projects/DFM/src/components/folders/folder-tree.tsx" ]; then
  grep -q "aria\|role\|keyboard\|focus" /Users/haseebace/Downloads/Projects/DFM/src/components/folders/folder-tree.tsx && echo "✅ Accessibility considered" || echo "⚠️  Accessibility features may be missing"
fi

if [ -f "/Users/haseebace/Downloads/Projects/DFM/src/components/folders/folder-item.tsx" ]; then
  grep -q "onKeyDown\|key=\|tabIndex" /Users/haseebace/Downloads/Projects/DFM/src/components/folders/folder-item.tsx && echo "✅ Keyboard navigation implemented" || echo "⚠️  Keyboard navigation may be missing"
fi

echo "=== Manual Verification Complete ==="
```

**8. Final Implementation Validation Commands:**

```bash
# MUST execute final validation before marking story complete

# 1. Full application build test
echo "=== Full Build Test ==="
cd /Users/haseebace/Downloads/Projects/DFM
npm run build

# Check build output for folder-related issues
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed - fix errors before proceeding"
  exit 1
fi

# 2. Start application and test folder functionality
echo "=== Application Runtime Test ==="
npm run dev &
SERVER_PID=$!
sleep 10

# Test folder management page accessibility
echo "Testing folder management page..."
curl -I http://localhost:3000/folders

# Test API endpoints
echo "Testing folder API endpoints..."
curl -I http://localhost:3000/api/folders

# Clean up
kill $SERVER_PID

# 3. Database integrity check
echo "=== Database Integrity Check ==="
npx supabase db <<EOF
-- Check folders table constraints
SELECT
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.table_constraints
WHERE table_name = 'folders' AND table_schema = 'public';

-- Check foreign key relationships
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'folders';

-- Verify RLS policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'folders';

EOF

# 4. Final validation checklist
echo "=== Final Validation Checklist ==="

# Check all required files exist
REQUIRED_FILES=(
  "/Users/haseebace/Downloads/Projects/DFM/src/lib/folders/folder-service.ts"
  "/Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/route.ts"
  "/Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/[id]/route.ts"
  "/Users/haseebace/Downloads/Projects/DFM/src/app/api/folders/breadcrumb/route.ts"
  "/Users/haseebace/Downloads/Projects/DFM/src/components/folders/folder-tree.tsx"
  "/Users/haseebace/Downloads/Projects/DFM/src/components/folders/folder-item.tsx"
  "/Users/haseebace/Downloads/Projects/DFM/src/components/folders/folder-context-menu.tsx"
  "/Users/haseebace/Downloads/Projects/DFM/src/app/folders/page.tsx"
)

ALL_FILES_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file exists"
  else
    echo "❌ $file missing"
    ALL_FILES_EXIST=false
  fi
done

if [ "$ALL_FILES_EXIST" = true ]; then
  echo "✅ All required files exist"
else
  echo "❌ Some required files are missing"
  exit 1
fi

# 5. Performance benchmarks
echo "=== Performance Benchmark Test ==="
node -e "
const startTime = Date.now();
const folderService = require('./src/lib/folders/folder-service').folderService;

async function benchmark() {
  try {
    const testUser = 'benchmark-user';

    // Test 100 folder creation
    const createStart = Date.now();
    for (let i = 0; i < 100; i++) {
      await folderService.createFolder(testUser, {
        parent_id: null,
        name: \`Benchmark Folder \${i}\`
      });
    }
    const createTime = Date.now() - createStart;
    console.log(\`Created 100 folders in \${createTime}ms\`);

    // Test retrieval
    const retrieveStart = Date.now();
    const folders = await folderService.getUserFolders(testUser);
    const retrieveTime = Date.now() - retrieveStart;
    console.log(\`Retrieved \${folders.length} folders in \${retrieveTime}ms\`);

    // Test tree building
    const treeStart = Date.now();
    const tree = await folderService.getFolderTree(testUser);
    const treeTime = Date.now() - treeStart;
    console.log(\`Built tree with \${tree.length} folders in \${treeTime}ms\`);

    // Performance assertions
    if (createTime > 5000) console.warn('⚠️  Folder creation too slow');
    if (retrieveTime > 500) console.warn('⚠️  Folder retrieval too slow');
    if (treeTime > 1000) console.warn('⚠️  Tree building too slow');

    console.log('✅ Performance benchmarks completed');
  } catch (error) {
    console.error('❌ Performance benchmark failed:', error.message);
  }
}

benchmark();
"

echo "=== Final Validation Complete ==="
echo "If all validations pass, the folder management system is ready for production!"
```

### Constraints Sign-off

**DEVELOPER CONFIRMATION REQUIRED:**

I have personally verified and confirm that:

1. **Pre-Development Constraints:**
   - [ ] All previous stories (1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4) are complete
   - [ ] Database schema exists with proper folder and file_folders tables
   - [ ] Required indexes and constraints are in place
   - [ ] get_folder_descendants SQL function is implemented and tested
   - [ ] Authentication system is functional and integrated
   - [ ] File synchronization service is operational

2. **Implementation Constraints:**
   - [ ] FolderService implements all CRUD operations with proper validation
   - [ ] API routes handle all folder endpoints with authentication
   - [ ] UI components support folder tree rendering, editing, and management
   - [ ] Performance constraints are met for large folder structures
   - [ ] Real-time updates work across multiple browser tabs
   - [ ] Error handling prevents data corruption and provides user feedback
   - [ ] Security constraints prevent cross-user data access

3. **Validation Commands:**
   - [ ] All database validation commands executed successfully
   - [ ] Folder service tests pass with 100% coverage
   - [ ] API endpoint tests demonstrate proper functionality
   - [ ] UI component tests verify user interface behavior
   - [ ] Integration tests confirm system-wide compatibility
   - [ ] Performance benchmarks meet requirements
   - [ ] Manual code verification confirms implementation quality

4. **Quality Assurance:**
   - [ ] TypeScript compilation succeeds without errors
   - [ ] Application builds successfully
   - [ ] Database constraints prevent invalid operations
   - [ ] Accessibility features are implemented
   - [ ] Security best practices are followed
   - [ ] Performance is optimized for large datasets
   - [ ] User experience is intuitive and responsive

**Personal Developer Confirmation:**
I have executed all validation commands and personally verified that the folder creation and management system meets all specified requirements, constraints, and quality standards. The implementation is ready for production use.

**Developer Signature:** ************\_************
**Date:** ************\_************
**Build Version:** ************\_************

---

**Story created by:** AI Agent (Technical Architect)
**Date:** 2025-11-27
**Technical Specification Status:** Complete
**Ready for Development:** ✅

_This story implements comprehensive folder creation and management that provides users with intuitive virtual folder organization capabilities while maintaining data integrity and performance._

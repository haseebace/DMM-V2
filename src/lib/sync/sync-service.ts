import type { SupabaseClient } from '@supabase/supabase-js'

import { realDebridService } from '@/lib/api/real-debrid-service'
import { getSupabaseClient } from '@/lib/database/supabase-client'
import type { RealDebridFile } from '@/types/real-debrid-api'

interface HashIndex {
  hashMap: Map<string, string>
  remoteIdMap: Map<string, string>
}

export interface SyncStatus {
  id: string
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  progress: {
    total: number
    processed: number
    current: string
    percentage: number
  }
  timing: {
    started: string | null
    estimatedEnd: string | null
    ended: string | null
  }
  stats: {
    added: number
    updated: number
    deleted: number
    duplicates: number
    errors: number
  }
  lastSync: string | null
  error?: string
}

export interface SyncConfiguration {
  autoSync: boolean
  syncInterval: number
  batchSize: number
  enableDuplicateDetection: boolean
  syncTimeout: number
  maxRetries: number
}

export interface SyncResult {
  success: boolean
  filesProcessed: number
  filesAdded: number
  filesUpdated: number
  filesDeleted: number
  duplicatesFound: number
  errors: string[]
  duration: number
  timestamp: string
}

export class RealDebridSyncService {
  private activeSync: Promise<SyncResult> | null = null
  private syncStatus: SyncStatus
  private syncConfiguration: SyncConfiguration
  private progressCallbacks: Map<string, (status: SyncStatus) => void> = new Map()

  constructor() {
    this.syncStatus = {
      id: '',
      status: 'idle',
      progress: {
        total: 0,
        processed: 0,
        current: 'Waiting for sync...',
        percentage: 0,
      },
      timing: {
        started: null,
        estimatedEnd: null,
        ended: null,
      },
      stats: {
        added: 0,
        updated: 0,
        deleted: 0,
        duplicates: 0,
        errors: 0,
      },
      lastSync: null,
    }

    this.syncConfiguration = {
      autoSync: false,
      syncInterval: 30,
      batchSize: 100,
      enableDuplicateDetection: true,
      syncTimeout: 5 * 60 * 1000,
      maxRetries: 3,
    }
  }

  async startSync(userId: string, options: Partial<SyncConfiguration> = {}): Promise<SyncResult> {
    if (!userId) {
      throw new Error('User ID is required to start sync')
    }

    if (this.activeSync) {
      throw new Error('Sync already in progress')
    }

    const config = { ...this.syncConfiguration, ...options }

    this.syncStatus = {
      id: this.generateSyncId(),
      status: 'running',
      progress: {
        total: 0,
        processed: 0,
        current: 'Initializing sync... This may take a minute.',
        percentage: 0,
      },
      timing: {
        started: new Date().toISOString(),
        estimatedEnd: null,
        ended: null,
      },
      stats: {
        added: 0,
        updated: 0,
        deleted: 0,
        duplicates: 0,
        errors: 0,
      },
      lastSync: this.syncStatus.lastSync,
    }

    this.notifyProgress()

    this.activeSync = this.executeSync(userId, config)

    try {
      const result = await this.activeSync
      this.syncStatus.status = result.success ? 'completed' : 'error'
      this.syncStatus.timing.ended = new Date().toISOString()
      this.syncStatus.lastSync = result.success ? result.timestamp : this.syncStatus.lastSync

      if (!result.success && result.errors.length > 0) {
        this.syncStatus.error = result.errors[0]
      }

      return result
    } catch (error) {
      this.syncStatus.status = 'error'
      this.syncStatus.error = error instanceof Error ? error.message : 'Unknown sync error'
      this.syncStatus.timing.ended = new Date().toISOString()
      throw error
    } finally {
      this.activeSync = null
      this.notifyProgress()
    }
  }

  async pauseSync(): Promise<void> {
    if (this.syncStatus.status === 'running') {
      this.syncStatus.status = 'paused'
      this.syncStatus.progress.current = 'Sync paused'
      this.notifyProgress()
    }
  }

  async resumeSync(): Promise<void> {
    if (this.syncStatus.status === 'paused') {
      this.syncStatus.status = 'running'
      this.syncStatus.progress.current = 'Resuming sync...'
      this.notifyProgress()
    }
  }

  async cancelSync(): Promise<void> {
    if (this.syncStatus.status === 'idle') {
      return
    }

    this.activeSync = null
    this.syncStatus.status = 'idle'
    this.syncStatus.progress.current = 'Sync cancelled'
    this.syncStatus.timing.ended = new Date().toISOString()
    this.notifyProgress()
  }

  getSyncStatus(): SyncStatus {
    return {
      ...this.syncStatus,
      progress: { ...this.syncStatus.progress },
      timing: { ...this.syncStatus.timing },
      stats: { ...this.syncStatus.stats },
    }
  }

  getSyncConfiguration(): SyncConfiguration {
    return { ...this.syncConfiguration }
  }

  updateSyncConfiguration(config: Partial<SyncConfiguration>): void {
    this.syncConfiguration = { ...this.syncConfiguration, ...config }
  }

  subscribeToProgress(callback: (status: SyncStatus) => void): string {
    const id = this.generateCallbackId()
    this.progressCallbacks.set(id, callback)
    return id
  }

  unsubscribeFromProgress(id: string): void {
    this.progressCallbacks.delete(id)
  }

  private async executeSync(userId: string, config: SyncConfiguration): Promise<SyncResult> {
    const startTime = Date.now()
    const supabase = getSupabaseClient(true)

    try {
      const lastSync = await this.getLastSyncTimestamp(supabase, userId)

      this.updateProgress('Fetching files from Real-Debrid…', 0)
      const allFiles = await this.fetchAllFiles(config, lastSync)

      this.syncStatus.progress.total = allFiles.length
      this.syncStatus.progress.current = `Processing ${allFiles.length} files...`
      this.syncStatus.timing.estimatedEnd = this.calculateEstimatedEndTime(
        startTime,
        1,
        Math.max(allFiles.length, 1)
      ).toISOString()

      const result = await this.processFilesInBatches(supabase, userId, allFiles, config)

      if (!lastSync) {
        await this.cleanupDeletedFiles(supabase, userId, allFiles)
      }

      await this.updateLastSyncTimestamp(supabase, userId)

      const duration = Date.now() - startTime

      return {
        success: true,
        filesProcessed: result.processed,
        filesAdded: result.added,
        filesUpdated: result.updated,
        filesDeleted: this.syncStatus.stats.deleted,
        duplicatesFound: result.duplicates,
        errors: result.errors,
        duration,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Sync error:', error)

      return {
        success: false,
        filesProcessed: this.syncStatus.progress.processed,
        filesAdded: this.syncStatus.stats.added,
        filesUpdated: this.syncStatus.stats.updated,
        filesDeleted: this.syncStatus.stats.deleted,
        duplicatesFound: this.syncStatus.stats.duplicates,
        errors: [error instanceof Error ? error.message : 'Unknown sync failure'],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    }
  }

  private async fetchAllFiles(
    config: SyncConfiguration,
    lastSync?: string | null
  ): Promise<RealDebridFile[]> {
    const files: RealDebridFile[] = []
    const modifiedSince = lastSync ? new Date(lastSync) : null
    let page = 1
    let hasMore = true

    while (hasMore) {
      await this.ensureActive()
      this.updateProgress(
        `Fetching page ${page} from Real-Debrid…`,
        this.progressPercentage(files.length, Math.max(1, files.length + 1))
      )

      try {
        const pageFiles = await realDebridService.getFiles(page, config.batchSize)
        const filtered = modifiedSince
          ? pageFiles.filter((file) => new Date(file.modified) > modifiedSince)
          : pageFiles

        files.push(...filtered)
        hasMore = pageFiles.length === config.batchSize
        page += 1
      } catch (error) {
        console.error(`Error fetching files page ${page}`, error)

        hasMore = await this.retryFetch(page, config, modifiedSince, files)
        if (!hasMore) {
          break
        }
        page += 1
      }
    }

    return files
  }

  private async retryFetch(
    page: number,
    config: SyncConfiguration,
    modifiedSince: Date | null,
    files: RealDebridFile[]
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= config.maxRetries; attempt += 1) {
      await this.sleep(Math.min(1000 * 2 ** attempt, 10_000))
      await this.ensureActive()

      try {
        const retryFiles = await realDebridService.getFiles(page, config.batchSize)
        const filtered = modifiedSince
          ? retryFiles.filter((file) => new Date(file.modified) > modifiedSince)
          : retryFiles

        files.push(...filtered)
        return retryFiles.length === config.batchSize
      } catch (retryError) {
        console.error(`Retry ${attempt}/${config.maxRetries} failed for page ${page}`, retryError)
      }
    }

    return false
  }

  private async processFilesInBatches(
    supabase: SupabaseClient,
    userId: string,
    files: RealDebridFile[],
    config: SyncConfiguration
  ) {
    const results = {
      processed: 0,
      added: 0,
      updated: 0,
      duplicates: 0,
      errors: [] as string[],
    }

    const indexes = await this.getExistingFilesIndex(supabase, userId)

    for (let i = 0; i < files.length; i += config.batchSize) {
      const batch = files.slice(i, i + config.batchSize)
      this.updateProgress(
        `Processing files ${i + 1}-${Math.min(i + batch.length, files.length)}…`,
        Math.floor(((i + batch.length) / Math.max(files.length, 1)) * 100)
      )

      for (const file of batch) {
        await this.ensureActive()

        try {
          const normalizedHash = file.hash?.trim().toLowerCase() ?? ''
          const existingByRemote = indexes.remoteIdMap.get(file.id)
          const existingByHash = normalizedHash ? indexes.hashMap.get(normalizedHash) : undefined

          if (existingByRemote) {
            const updated = await this.updateFileMetadata(supabase, existingByRemote, file)
            if (updated) {
              results.updated += 1
              this.syncStatus.stats.updated += 1
            }
          } else if (config.enableDuplicateDetection && existingByHash) {
            this.syncStatus.stats.duplicates += 1
            results.duplicates += 1
            await this.updateFileMetadata(supabase, existingByHash, file)
            this.syncStatus.stats.updated += 1
            results.updated += 1
          } else {
            const newId = await this.addFile(supabase, userId, file)
            if (newId) {
              indexes.remoteIdMap.set(file.id, newId)
              if (normalizedHash) {
                indexes.hashMap.set(normalizedHash, newId)
              }
              results.added += 1
              this.syncStatus.stats.added += 1
            } else {
              const failure = `Failed to insert file ${file.name}`
              results.errors.push(failure)
              this.syncStatus.stats.errors += 1
            }
          }

          results.processed += 1
          this.syncStatus.progress.processed += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          results.errors.push(`Error processing ${file.name}: ${message}`)
          this.syncStatus.stats.errors += 1
          console.error(`Error processing file ${file.name}`, error)
        }
      }

      await this.sleep(75)
    }

    return results
  }

  private async getExistingFilesIndex(supabase: SupabaseClient, userId: string): Promise<HashIndex> {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('id, real_debrid_id, sha1_hash')
        .eq('user_id', userId)

      if (error) {
        console.error('Error loading existing file hashes', error)
        return { hashMap: new Map(), remoteIdMap: new Map() }
      }

      const hashMap = new Map<string, string>()
      const remoteIdMap = new Map<string, string>()

      for (const row of data ?? []) {
        if (row.sha1_hash) {
          hashMap.set(row.sha1_hash.trim().toLowerCase(), row.id)
        }
        if (row.real_debrid_id) {
          remoteIdMap.set(row.real_debrid_id, row.id)
        }
      }

      return { hashMap, remoteIdMap }
    } catch (error) {
      console.error('Error preparing existing file index', error)
      return { hashMap: new Map(), remoteIdMap: new Map() }
    }
  }

  private async addFile(
    supabase: SupabaseClient,
    userId: string,
    file: RealDebridFile
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('files')
        .insert({
          user_id: userId,
          real_debrid_id: file.id,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.mimetype || file.mime || null,
          sha1_hash: file.hash || null,
          download_url: file.link || file.download || null,
          updated_at: new Date(file.modified).toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        console.error('Failed to insert file metadata', error)
        return null
      }

      return data?.id ?? null
    } catch (error) {
      console.error('Unexpected error inserting file metadata', error)
      return null
    }
  }

  private async updateFileMetadata(
    supabase: SupabaseClient,
    fileId: string,
    file: RealDebridFile
  ) {
    try {
      const { error } = await supabase
        .from('files')
        .update({
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.mimetype || file.mime || null,
          download_url: file.link || file.download || null,
          sha1_hash: file.hash || null,
          real_debrid_id: file.id,
          updated_at: new Date(file.modified).toISOString(),
        })
        .eq('id', fileId)

      if (error) {
        console.error(`Failed to update metadata for ${fileId}`, error)
        return false
      }

      return true
    } catch (error) {
      console.error(`Unexpected metadata update error for ${fileId}`, error)
      return false
    }
  }

  private async cleanupDeletedFiles(
    supabase: SupabaseClient,
    userId: string,
    currentFiles: RealDebridFile[]
  ): Promise<void> {
    try {
      const currentIds = new Set(currentFiles.map((file) => file.id))
      const { data: storedFiles, error } = await supabase
        .from('files')
        .select('id, real_debrid_id')
        .eq('user_id', userId)

      if (error) {
        console.error('Failed to load stored files for cleanup', error)
        return
      }

      for (const stored of storedFiles ?? []) {
        if (stored.real_debrid_id && !currentIds.has(stored.real_debrid_id)) {
          const { error: deleteError } = await supabase.from('files').delete().eq('id', stored.id)
          if (!deleteError) {
            this.syncStatus.stats.deleted += 1
          }
        }
        await this.ensureActive()
      }
    } catch (error) {
      console.error('Unexpected cleanup error', error)
    }
  }

  private async getLastSyncTimestamp(supabase: SupabaseClient, userId: string) {
    try {
      const { data, error } = await supabase
        .from('oauth_tokens')
        .select('updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn('Unable to read last sync timestamp, falling back to status memory', error)
        return this.syncStatus.lastSync
      }

      return data?.updated_at ?? this.syncStatus.lastSync
    } catch (error) {
      console.warn('Unexpected last sync lookup error', error)
      return this.syncStatus.lastSync
    }
  }

  private async updateLastSyncTimestamp(supabase: SupabaseClient, userId: string) {
    try {
      const timestamp = new Date().toISOString()
      const { data, error } = await supabase
        .from('oauth_tokens')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn('Unable to locate OAuth token row for sync timestamp', error)
        return
      }

      if (data?.id) {
        await supabase
          .from('oauth_tokens')
          .update({ updated_at: timestamp })
          .eq('id', data.id)
      }

      this.syncStatus.lastSync = timestamp
    } catch (error) {
      console.warn('Unexpected error updating last sync timestamp', error)
    }
  }

  private updateProgress(current: string, percentage: number) {
    this.syncStatus.progress.current = current
    this.syncStatus.progress.percentage = Math.max(0, Math.min(100, Math.round(percentage)))
    this.notifyProgress()
  }

  private notifyProgress() {
    const status = this.getSyncStatus()
    for (const callback of this.progressCallbacks.values()) {
      try {
        callback(status)
      } catch (error) {
        console.error('Progress callback error', error)
      }
    }
  }

  private progressPercentage(processed: number, total: number) {
    if (total === 0) {
      return 0
    }
    return Math.floor((processed / total) * 100)
  }

  private calculateEstimatedEndTime(startTime: number, processed: number, total: number) {
    if (processed === 0 || total === 0) {
      return new Date(Date.now() + 5 * 60 * 1000)
    }

    const elapsed = Date.now() - startTime
    const estimatedTotal = (elapsed / processed) * total
    return new Date(startTime + estimatedTotal)
  }

  private async ensureActive() {
    if (this.syncStatus.status === 'paused') {
      this.syncStatus.progress.current = 'Sync paused'
      while (this.syncStatus.status === 'paused') {
        await this.sleep(500)
      }
      this.syncStatus.progress.current = 'Resuming sync...'
    }

    if (this.syncStatus.status === 'idle') {
      throw new Error('Sync cancelled')
    }
  }

  private generateSyncId() {
    return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  private generateCallbackId() {
    return `callback_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  private sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }
}

export const syncService = new RealDebridSyncService()

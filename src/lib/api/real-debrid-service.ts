import { realDebridClient, type ApiError, type ApiResponse } from '@/lib/api/real-debrid-client'
import { RealDebridErrorHandler } from '@/lib/api/error-handler'
import type {
  User,
  RealDebridFile,
  Torrent,
  Stream,
  Download,
  FilesResponse,
  TorrentsResponse,
  StreamsResponse,
  DownloadsResponse,
} from '@/types/real-debrid-api'

type ErrorContext = ReturnType<typeof RealDebridErrorHandler.handleError>

export class RealDebridServiceError extends Error {
  constructor(
    message: string,
    public readonly context?: ErrorContext,
    public readonly originalError?: ApiError,
    public readonly status?: number
  ) {
    super(message)
    this.name = 'RealDebridServiceError'
  }
}

export class RealDebridService {
  // User API methods
  async getUserInfo(): Promise<User> {
    const response = await realDebridClient.get<User>('/user')
    return this.unwrap(response, 'Failed to get user info')
  }

  // Files API methods
  async getFiles(
    page: number = 1,
    perPage: number = 100,
    search?: string
  ): Promise<RealDebridFile[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      perPage: perPage.toString(),
      ...(search ? { search } : {}),
    })
    try {
      const response = await realDebridClient.get<FilesResponse>(`/files?${params}`)
      const data = this.unwrap(response, 'Failed to get files')
      return data.files
    } catch (error) {
      if (error instanceof RealDebridServiceError && error.status === 404) {
        console.warn('Real-Debrid /files endpoint unavailable, falling back to /downloads')
        return this.getDownloadsFallback(page, perPage, search)
      }
      throw error
    }
  }

  async getFileById(id: string): Promise<RealDebridFile> {
    const response = await realDebridClient.get<RealDebridFile>(`/files/${id}`)
    return this.unwrap(response, 'Failed to get file')
  }

  async uploadFile(file: File): Promise<RealDebridFile> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await realDebridClient.post<RealDebridFile>('/upload', formData, {
      timeout: 60000,
    })

    return this.unwrap(response, 'Failed to upload file')
  }

  async deleteFile(id: string): Promise<void> {
    const response = await realDebridClient.delete(`/files/${id}`)
    this.ensureSuccess(response, 'Failed to delete file')
  }

  async searchFiles(query: string, page: number = 1): Promise<RealDebridFile[]> {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
    })
    const response = await realDebridClient.get<FilesResponse>(`/files/search?${params}`)
    const data = this.unwrap(response, 'Failed to search files')
    return data.files
  }

  // Torrents API methods
  async getTorrents(): Promise<Torrent[]> {
    const response = await realDebridClient.get<TorrentsResponse>('/torrents')
    const data = this.unwrap(response, 'Failed to get torrents')
    return data.torrents
  }

  async getTorrentById(id: string): Promise<Torrent> {
    const response = await realDebridClient.get<Torrent>(`/torrents/${id}`)
    return this.unwrap(response, 'Failed to get torrent')
  }

  async addMagnet(magnet: string): Promise<Torrent> {
    const response = await realDebridClient.post<Torrent>('/torrents/add/magnet', { magnet })
    return this.unwrap(response, 'Failed to add magnet link')
  }

  async addTorrentFile(torrentFile: File): Promise<Torrent> {
    const formData = new FormData()
    formData.append('file', torrentFile)

    const response = await realDebridClient.post<Torrent>('/torrents/add/file', formData, {
      timeout: 60000,
    })

    return this.unwrap(response, 'Failed to add torrent file')
  }

  async selectFiles(torrentId: string, fileIds: string[]): Promise<Torrent> {
    const response = await realDebridClient.post<Torrent>(`/torrents/selectFiles/${torrentId}`, {
      files: fileIds,
    })
    return this.unwrap(response, 'Failed to select torrent files')
  }

  async deleteTorrent(torrentId: string): Promise<void> {
    const response = await realDebridClient.delete(`/torrents/${torrentId}`)
    this.ensureSuccess(response, 'Failed to delete torrent')
  }

  // Streaming API methods
  async getStreams(fileId: string, quality?: string): Promise<Stream[]> {
    const params = quality ? `?${new URLSearchParams({ quality })}` : ''
    const response = await realDebridClient.get<StreamsResponse>(`/streams/${fileId}${params}`)
    const data = this.unwrap(response, 'Failed to get streams')
    return data.streams
  }

  // Downloads API methods
  async getDownloads(page: number = 1, perPage: number = 50): Promise<Download[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      perPage: perPage.toString(),
    })
    const response = await realDebridClient.get<DownloadsResponse>(`/downloads?${params}`)
    const data = this.unwrap(response, 'Failed to get downloads')
    return data.downloads
  }

  async getDownloadById(id: string): Promise<Download> {
    const response = await realDebridClient.get<Download>(`/downloads/${id}`)
    return this.unwrap(response, 'Failed to get download')
  }

  async createDownload(link: string, password?: string): Promise<Download> {
    const payload = password ? { link, password } : { link }
    const response = await realDebridClient.post<Download>('/downloads', payload)
    return this.unwrap(response, 'Failed to create download')
  }

  async deleteDownload(id: string): Promise<void> {
    const response = await realDebridClient.delete(`/downloads/${id}`)
    this.ensureSuccess(response, 'Failed to delete download')
  }

  private async getDownloadsFallback(
    page: number,
    perPage: number,
    search?: string
  ): Promise<RealDebridFile[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      perPage: perPage.toString(),
      ...(search ? { search } : {}),
    })

    const response = await realDebridClient.get<DownloadsResponse>(`/downloads?${params}`)
    const data = this.unwrap(response, 'Failed to get downloads for sync')

    return (data.downloads || []).map((download) => this.mapDownloadToFile(download))
  }

  private mapDownloadToFile(download: Download): RealDebridFile {
    const fallbackName = download.filename || download.name || download.id
    return {
      id: download.id,
      name: fallbackName,
      size: download.size ?? 0,
      hash: '',
      mimetype: '',
      created: download.generated,
      modified: download.generated,
      download: download.link || download.id,
      link: download.link || '',
      hoster: download.hoster || download.host || '',
      host: download.host || '',
      filename: download.filename || fallbackName,
      extension: '',
      mime: '',
      icon: '',
      path: '',
      streamable: false,
    }
  }

  // Utility methods
  async healthCheck(): Promise<boolean> {
    try {
      const response = await realDebridClient.get<string>('/time', {
        skipRateLimit: true,
        retries: 1,
        timeout: 5000,
      })

      return response.success && typeof response.data === 'string'
    } catch (error) {
      console.error('Real-Debrid health check failed:', error)
      return false
    }
  }

  async getRateLimitInfo(): Promise<{ requestsRemaining: number; resetTime: number }> {
    const snapshot = realDebridClient.getRateLimitSnapshot()
    return {
      requestsRemaining: Math.max(0, Math.floor(snapshot.tokens)),
      resetTime: snapshot.resetTime,
    }
  }

  private unwrap<T>(response: ApiResponse<T>, action: string): T {
    if (!response.success || response.data === undefined || response.data === null) {
      this.raiseError(action, response)
    }

    return response.data as T
  }

  private ensureSuccess(response: ApiResponse<unknown>, action: string): void {
    if (!response.success) {
      this.raiseError(action, response)
    }
  }

  private raiseError(action: string, response: ApiResponse<unknown>): never {
    const apiError =
      response.error ||
      RealDebridErrorHandler.createApiError(response.status, `${action}. Status ${response.status}`)

    const handled = RealDebridErrorHandler.handleError(apiError)
    RealDebridErrorHandler.logError(apiError, action)

    throw new RealDebridServiceError(handled.message, handled, apiError, response.status)
  }
}

export const realDebridService = new RealDebridService()

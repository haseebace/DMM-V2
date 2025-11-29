// User information
export interface User {
  id: string
  username: string
  email: string
  type: 'free' | 'premium'
  avatar: string
  locale: string
  points: number
  premium: number
  createdAt: number
}

// File information
export interface RealDebridFile {
  id: string
  name: string
  size: number
  hash: string
  mimetype: string
  created: string
  modified: string
  download: string
  link: string
  hoster: string
  host: string
  filename: string
  extension: string
  mime: string
  icon: string
  path: string
  parentId?: string
  streamable: boolean
}

// Torrent information
export interface Torrent {
  id: string
  name: string
  hash: string
  size: number
  status: 'downloading' | 'downloaded' | 'error' | 'magnet_error' | 'waiting_files_selection'
  progress: number
  speed: number
  seeders: number
  peers: number
  eta: number
  created: string
  finished: string
  host: string
  hoster: string
  hosts?: string[]
  links: string[]
  files?: TorrentFile[]
}

export interface TorrentFile {
  id: string
  name: string
  size: number
  path: string
  selected: boolean
}

// Streaming information
export interface Stream {
  id: string
  name: string
  quality: string
  codec: string
  bitrate: number
  direct: string
}

// Download information
export interface Download {
  id: string
  name: string
  hoster: string
  host: string
  link: string
  filename: string
  size: number
  generated: string
  expires: string
}

// API response wrappers
export interface FilesResponse {
  files: RealDebridFile[]
  total: number
  page: number
  perPage: number
  pages: number
}

export interface TorrentsResponse {
  torrents: Torrent[]
  total: number
}

export interface StreamsResponse {
  streams: Stream[]
  quality: string
}

export interface DownloadsResponse {
  downloads: Download[]
  total: number
}

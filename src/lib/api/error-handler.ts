import type { ApiError } from '@/lib/api/real-debrid-client'

export class RealDebridErrorHandler {
  static readonly errorMessages: Record<string, string> = {
    HTTP_400: 'Bad request - Please check your input',
    HTTP_401: 'Authentication failed - Please reconnect your account',
    HTTP_403: "Access forbidden - You don't have permission for this action",
    HTTP_404: 'Resource not found',
    HTTP_429: 'Too many requests - Please try again later',
    HTTP_500: 'Server error - Please try again later',
    HTTP_502: 'Bad gateway - Service temporarily unavailable',
    HTTP_503: 'Service unavailable - Please try again later',
    HTTP_504: 'Gateway timeout - Request took too long',
    NETWORK_ERROR: 'Network connection failed - Please check your internet connection',
    REQUEST_TIMEOUT: 'Request timed out - Please try again',
    bad_token: 'Invalid access token - Please reconnect your account',
    token_expired: 'Access token expired - Please reconnect your account',
    no_server: 'No available server for this request',
    no_file: 'File not found or has been removed',
    invalid_link: 'Invalid download link',
    file_too_big: 'File size exceeds limit',
    hoster_not_supported: 'File host is not supported',
    premium_needed: 'Premium account required for this action',
    premium_only: 'This feature is only available to premium users',
    quota_exceeded: 'Daily quota exceeded',
    magnet_invalid: 'Invalid magnet link',
    magnet_not_supported: 'Torrent type not supported',
    torrent_not_found: 'Torrent not found',
    torrent_already_exists: 'Torrent already exists in your account',
    torrent_no_files: 'No files available in this torrent',
    torrent_files_selection_required: 'Please select files to download',
  }

  static handleError(error: ApiError): {
    message: string
    shouldRetry: boolean
    requiresReauth: boolean
    action?: string
  } {
    const { code, message } = error
    const customMessage = RealDebridErrorHandler.errorMessages[code] || message

    const requiresReauth = ['bad_token', 'token_expired', 'HTTP_401'].includes(code)
    const shouldRetry = [
      'HTTP_429',
      'HTTP_500',
      'HTTP_502',
      'HTTP_503',
      'HTTP_504',
      'NETWORK_ERROR',
      'REQUEST_TIMEOUT',
      'no_server',
    ].includes(code)

    let action: string | undefined
    if (requiresReauth) {
      action = 'Please reconnect your Real-Debrid account'
    } else if (code === 'premium_needed' || code === 'premium_only') {
      action = 'Upgrade to Real-Debrid Premium for this feature'
    } else if (code === 'quota_exceeded') {
      action = 'Try again tomorrow or upgrade to Premium'
    } else if (code === 'file_too_big') {
      action = 'Please use a smaller file or upgrade to Premium'
    } else if (code === 'magnet_invalid') {
      action = 'Please check your magnet link'
    } else if (code === 'torrent_files_selection_required') {
      action = 'Please select which files you want to download'
    } else if (code === 'HTTP_429') {
      action = 'Please wait a moment and try again'
    } else if (code === 'NETWORK_ERROR') {
      action = 'Please check your internet connection'
    }

    return {
      message: customMessage,
      shouldRetry,
      requiresReauth,
      action,
    }
  }

  static getErrorSeverity(error: ApiError): 'low' | 'medium' | 'high' | 'critical' {
    const { code } = error

    if (['bad_token', 'token_expired', 'HTTP_401'].includes(code)) {
      return 'critical'
    }

    if (['premium_needed', 'premium_only', 'quota_exceeded'].includes(code)) {
      return 'high'
    }

    if (['HTTP_429', 'HTTP_500', 'HTTP_502', 'HTTP_503', 'HTTP_504'].includes(code)) {
      return 'medium'
    }

    return 'low'
  }

  static logError(error: ApiError, context?: string): void {
    const severity = RealDebridErrorHandler.getErrorSeverity(error)
    const errorInfo = {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      context,
      severity,
    }

    switch (severity) {
      case 'critical':
        console.error('[critical] Real-Debrid API error', errorInfo)
        break
      case 'high':
        console.error('[high] Real-Debrid API error', errorInfo)
        break
      case 'medium':
        console.warn('[medium] Real-Debrid API error', errorInfo)
        break
      default:
        console.info('[low] Real-Debrid API error', errorInfo)
        break
    }
  }

  static createApiError(codeOrStatus: number | string, message: string, details?: any): ApiError {
    const code = typeof codeOrStatus === 'number' ? `HTTP_${codeOrStatus}` : codeOrStatus
    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    }
  }
}

export const errorHandler = RealDebridErrorHandler

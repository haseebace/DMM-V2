# Real-Debrid API Integration Documentation

## Overview

This document provides comprehensive documentation for the Real-Debrid API integration implemented in the Download Manager Mobile (DMM) application. The integration uses OAuth2 Device Code Authentication Flow (RFC 8628) to provide secure access to Real-Debrid's premium debridging services.

## Authentication Flow

### OAuth2 Device Code Authentication

The application implements the OAuth2 Device Code Authentication Flow as defined in RFC 8628. This flow is optimized for devices and applications that cannot easily display web-based authentication.

#### Client Configuration

- **Client ID**: `X245A4XAIBGVM` (Open-source app client)
- **OAuth Base URL**: `https://api.real-debrid.com/oauth/v2/`
- **API Base URL**: `https://api.real-debrid.com/rest/1.0/`
- **Required Scopes**: `unrestrict`, `torrents`, `downloads`, `user`

#### Authentication Process

1. **Device Code Request**

   ```
   GET /oauth/v2/device/code?client_id=X245A4XAIBGVM
   ```

   Response:

   ```json
   {
     "device_code": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
     "user_code": "ABCDEF0123456",
     "interval": 5,
     "expires_in": 1800,
     "verification_url": "https://real-debrid.com/device"
   }
   ```

2. **User Authorization**
   - User navigates to `verification_url`
   - User enters the `user_code`
   - User logs in (if not already authenticated)
   - User authorizes the application

3. **Token Polling**
   - Application polls token endpoint every `interval` seconds
   - Polling continues until authorization is complete or timeout

4. **Access Token Grant**

   ```
   POST /oauth/v2/token
   Content-Type: application/x-www-form-urlencoded

   client_id=X245A4XAIBGVM
   &code=DEVICE_CODE_FROM_STEP_1
   &grant_type=urn:ietf:params:oauth:grant-type:device_code
   ```

   Success Response:

   ```json
   {
     "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
     "expires_in": 3600,
     "token_type": "Bearer",
     "refresh_token": "def50200e1b4c4f8c4f8c4f8c4f8c4f8c4f8c4f8"
   }
   ```

## API Endpoints

### Core Authentication

#### Disable Access Token

```http
DELETE /rest/1.0/disable_access_token
Authorization: Bearer {access_token}
```

**Response**: 204 No Content

**Error Codes**:

- `401`: Bad token (expired, invalid)

### User Information

#### Get Current User Info

```http
GET /rest/1.0/user
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "id": 42,
  "username": "administrator",
  "email": "user@example.com",
  "points": 12347428,
  "avatar": "https://s.real-debrid.com/images/avatars/42424242424.png",
  "type": "premium",
  "premium": 666666,
  "expiration": "2032-06-06T04:42:42.000Z"
}
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

### Link Unrestriction

#### Check Link Availability

```http
POST /rest/1.0/unrestrict/check
Content-Type: application/x-www-form-urlencoded

link={original_link}&password={optional_password}
```

**Response**:

```json
{
  "id": "string",
  "filename": "string",
  "filesize": 123456789,
  "host": "rapidgator.net",
  "chunks": 4,
  "crc": 1,
  "download": "string",
  "streamable": 1
}
```

**Error Codes**:

- `503`: File unavailable

#### Unrestrict Link

```http
POST /rest/1.0/unrestrict/link
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}

link={original_link}&password={optional_password}&remote={0|1}
```

**Response (Single Link)**:

```json
{
  "id": "string",
  "filename": "example.mp4",
  "filesize": 1234567890,
  "link": "https://original-hoster.com/file",
  "host": "rapidgator.net",
  "chunks": 8,
  "crc": 1,
  "download": "https://real-debrid.com/d/ABC123XYZ456",
  "streamable": 1
}
```

**Response (Multiple Links - e.g., YouTube)**:

```json
{
  "id": "string",
  "filename": "video_title",
  "filesize": 0,
  "link": "https://youtube.com/watch?v=ABC123",
  "host": "youtube.com",
  "chunks": 0,
  "crc": 0,
  "download": "",
  "streamable": 1,
  "type": "string",
  "alternative": [
    {
      "id": "720p",
      "filename": "video_720p.mp4",
      "download": "https://real-debrid.com/d/720p_ABC123",
      "type": "720p"
    },
    {
      "id": "1080p",
      "filename": "video_1080p.mp4",
      "download": "https://real-debrid.com/d/1080p_ABC123",
      "type": "1080p"
    }
  ]
}
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Unrestrict Folder

```http
POST /rest/1.0/unrestrict/folder
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}

link={folder_link}
```

**Response**:

```json
[
  {
    "id": "string",
    "filename": "file1.zip",
    "filesize": 123456789,
    "link": "https://hoster.com/file1.zip",
    "host": "rapidgator.net",
    "chunks": 4,
    "crc": 1,
    "download": "https://real-debrid.com/d/FILE1ABC",
    "streamable": 0
  },
  {
    "id": "string",
    "filename": "file2.zip",
    "filesize": 987654321,
    "link": "https://hoster.com/file2.zip",
    "host": "rapidgator.net",
    "chunks": 8,
    "crc": 1,
    "download": "https://real-debrid.com/d/FILE2XYZ",
    "streamable": 0
  }
]
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

### Container File Decryption

#### Decrypt Container File

```http
PUT /rest/1.0/unrestrict/containerFile
Content-Type: multipart/form-data
Authorization: Bearer {access_token}

file={container_file}
```

**Supported Container Types**:

- RSDF (.rsdf)
- CCF (.ccf)
- CCF3 (.ccf3)
- DLC (.dlc)

**Response**:

```json
[
  {
    "id": "string",
    "filename": "decrypted_file.zip",
    "mimeType": "application/zip",
    "filesize": 123456789,
    "link": "https://hoster.com/decrypted_file.zip",
    "host": "rapidgator.net",
    "chunks": 4,
    "download": "https://real-debrid.com/d/DECRYPT123",
    "generated": "2023-12-01T10:30:00.000Z"
  }
]
```

**Error Codes**:

- `400`: Bad Request (invalid container format)
- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked, not premium)
- `503`: Service unavailable

#### Decrypt Container from Link

```http
POST /rest/1.0/unrestrict/containerLink
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}

link={container_url}
```

**Response**: Same as file-based container decryption

**Error Codes**:

- `400`: Bad Request (invalid container URL)
- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked, not premium)
- `503`: Service unavailable

### Downloads Management

#### Get User Downloads

```http
GET /rest/1.0/downloads
Authorization: Bearer {access_token}

?offset=0&page=1&limit=100
```

**Parameters**:

- `offset`: Starting offset (0 to X-Total-Count header)
- `page`: Pagination system (mutually exclusive with offset)
- `limit`: Entries per page (0-500, default: 100)

**Response**:

```json
[
  {
    "id": "string",
    "filename": "downloaded_file.zip",
    "mimeType": "application/zip",
    "filesize": 123456789,
    "link": "https://original-hoster.com/file.zip",
    "host": "rapidgator.net",
    "chunks": 4,
    "crc": 1,
    "download": "https://real-debrid.com/d/DOWNLOAD123",
    "generated": "2023-12-01T10:30:00.000Z"
  }
]
```

**Headers**:

- `X-Total-Count`: Total number of downloads
- `Link`: Pagination links

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Delete Download

```http
DELETE /rest/1.0/downloads/delete/{download_id}
Authorization: Bearer {access_token}
```

**Response**: 204 No Content

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)
- `404`: Unknown resource

### Torrents Management

#### Get User Torrents

```http
GET /rest/1.0/torrents
Authorization: Bearer {access_token}

?offset=0&page=1&limit=100&filter=active
```

**Parameters**:

- `offset`: Starting offset
- `page`: Pagination system
- `limit`: Entries per page (0-500, default: 100)
- `filter`: "active" to show only active torrents

**Response**:

```json
[
  {
    "id": "ABC123XYZ456",
    "filename": "example_torrent",
    "hash": "3c3e9c4b4c4f8c4f8c4f8c4f8c4f8c4f8c4f8",
    "bytes": 1073741824,
    "host": "rapidgator.net",
    "split": 1073741824,
    "progress": 75,
    "status": "downloading",
    "added": "2023-12-01T10:00:00.000Z",
    "links": ["https://real-debrid.com/torrent/ABC123/file1"],
    "speed": 1048576,
    "seeders": 15
  }
]
```

**Torrent Status Values**:

- `magnet_error`: Magnet link conversion failed
- `magnet_conversion`: Converting magnet to torrent
- `waiting_files_selection`: Waiting for user to select files
- `queued`: Queued for download
- `downloading`: Currently downloading
- `downloaded`: Download completed
- `error`: Download error occurred
- `virus`: Virus detected
- `compressing`: Compressing files
- `uploading`: Uploading to file hoster
- `dead`: Torrent dead/no seeders

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Get Torrent Information

```http
GET /rest/1.0/torrents/info/{torrent_id}
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "id": "ABC123XYZ456",
  "filename": "complete_torrent_package",
  "original_filename": "Original.Torrent.Name",
  "hash": "3c3e9c4b4c4f8c4f8c4f8c4f8c4f8c4f8c4f8",
  "bytes": 2147483648,
  "original_bytes": 4294967296,
  "host": "rapidgator.net",
  "split": 1073741824,
  "progress": 100,
  "status": "downloaded",
  "added": "2023-12-01T10:00:00.000Z",
  "files": [
    {
      "id": 1,
      "path": "/video1.mp4",
      "bytes": 1073741824,
      "selected": 1
    },
    {
      "id": 2,
      "path": "/video2.mp4",
      "bytes": 1073741824,
      "selected": 0
    }
  ],
  "links": ["https://real-debrid.com/d/VIDEO1ABC", "https://real-debrid.com/d/VIDEO2XYZ"],
  "ended": "2023-12-01T12:30:00.000Z"
}
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Get Active Torrent Count

```http
GET /rest/1.0/torrents/activeCount
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "nb": 3,
  "limit": 20
}
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Get Available Hosts

```http
GET /rest/1.0/torrents/availableHosts
Authorization: Bearer {access_token}
```

**Response**:

```json
[
  {
    "host": "rapidgator.net",
    "max_file_size": 2147483648
  },
  {
    "host": "uploaded.net",
    "max_file_size": 2147483648
  }
]
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Add Torrent File

```http
PUT /rest/1.0/torrents/addTorrent
Content-Type: multipart/form-data
Authorization: Bearer {access_token}

host={host_domain}&file={torrent_file}
```

**Response**: 201 Created

```json
{
  "id": "NEW123TORRENT",
  "uri": "https://real-debrid.com/torrent/NEW123TORRENT"
}
```

**Error Codes**:

- `400`: Bad Request (invalid torrent file)
- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked, not premium)
- `503`: Service unavailable

#### Add Magnet Link

```http
POST /rest/1.0/torrents/addMagnet
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}

magnet={magnet_link}&host={host_domain}
```

**Response**: 201 Created

```json
{
  "id": "MAGNET123TORRENT",
  "uri": "https://real-debrid.com/torrent/MAGNET123TORRENT"
}
```

**Error Codes**:

- `400`: Bad Request (invalid magnet link)
- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked, not premium)
- `503`: Service unavailable

#### Select Torrent Files

```http
POST /rest/1.0/torrents/selectFiles/{torrent_id}
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}

files={file_ids_comma_separated_or_all}
```

**Response**: 204 No Content

**Error Codes**:

- `202`: Action already done
- `400`: Bad Request
- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked, not premium)
- `404`: Wrong parameter (invalid file id(s)) / Unknown resource (invalid id)

#### Delete Torrent

```http
DELETE /rest/1.0/torrents/delete/{torrent_id}
Authorization: Bearer {access_token}
```

**Response**: 204 No Content

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)
- `404`: Unknown resource

### Traffic Information

#### Get Traffic Information

```http
GET /rest/1.0/traffic
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "rapidgator.net": {
    "left": 10737418240,
    "bytes": 5368709120,
    "links": 150,
    "limit": 64424509440,
    "type": "gigabytes",
    "extra": 0,
    "reset": "monthly"
  },
  "uploaded.net": {
    "left": 53687091200,
    "bytes": 26843545600,
    "links": 75,
    "limit": 32212254720,
    "type": "gigabytes",
    "extra": 10737418240,
    "reset": "monthly"
  }
}
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Get Traffic Details

```http
GET /rest/1.0/traffic/details
Authorization: Bearer {access_token}

?start=2023-11-01&end=2023-12-01
```

**Parameters**:

- `start`: Start date (YYYY-MM-DD, default: one week ago)
- `end`: End date (YYYY-MM-DD, default: today)
- **Warning**: Period cannot exceed 31 days

**Response**:

```json
{
  "2023-12-01": {
    "rapidgator.net": {
      "1fichier.com": 1073741824,
      "uptobox.com": 2147483648,
      "uploaded.net": 536870912
    },
    "bytes": 3245328394
  },
  "2023-11-30": {
    "rapidgator.net": {
      "1fichier.com": 536870912,
      "uptobox.com": 1073741824
    },
    "bytes": 1627426336
  }
}
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

### Streaming Support

#### Get Streaming Transcodes

```http
GET /rest/1.0/streaming/transcode/{file_id}
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "apple": {
    "1080": "https://real-debrid.com/streaming/1080/playlist.m3u8",
    "720": "https://real-debrid.com/streaming/720/playlist.m3u8"
  },
  "dash": {
    "1080": "https://real-debrid.com/streaming/1080/manifest.mpd",
    "720": "https://real-debrid.com/streaming/720/manifest.mpd"
  },
  "liveMP4": {
    "1080": "https://real-debrid.com/streaming/1080/video.mp4",
    "720": "https://real-debrid.com/streaming/720/video.mp4"
  },
  "h264WebM": {
    "1080": "https://real-debrid.com/streaming/1080/video.webm",
    "720": "https://real-debrid.com/streaming/720/video.webm"
  }
}
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Get Media Information

```http
GET /rest/1.0/streaming/mediaInfos/{file_id}
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "filename": "Movie.Title.2023.1080p.BluRay.x264",
  "hoster": "rapidgator.net",
  "link": "https://rapidgator.net/file/movie.mp4",
  "type": "movie",
  "season": null,
  "episode": null,
  "year": "2023",
  "duration": 7265.45,
  "bitrate": 2500000,
  "size": 2147483648,
  "details": {
    "video": {
      "1": {
        "stream": "https://real-debrid.com/streaming/video1",
        "lang": "English",
        "lang_iso": "eng",
        "codec": "h264",
        "colorspace": "yuv420p",
        "width": 1920,
        "height": 1080
      }
    },
    "audio": {
      "1": {
        "stream": "https://real-debrid.com/streaming/audio1",
        "lang": "English",
        "lang_iso": "eng",
        "codec": "aac",
        "sampling": 48000,
        "channels": 6
      }
    },
    "subtitles": [
      {
        "1": {
          "stream": "https://real-debrid.com/streaming/subs1",
          "lang": "English",
          "lang_iso": "eng",
          "type": "SRT"
        }
      }
    ]
  },
  "poster_path": "https://real-debrid.com/posters/movie123.jpg",
  "audio_image": "https://real-debrid.com/audio/movie123.jpg",
  "backdrop_path": "https://real-debrid.com/backdrops/movie123.jpg"
}
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)
- `503`: Service unavailable (problem finding metadata)

### Hosts Information

#### Get Supported Hosts

```http
GET /rest/1.0/hosts
```

**Response**:

```json
{
  "rapidgator.net": {
    "id": "rapidgator",
    "name": "RapidGator",
    "image": "https://real-debrid.com/images/hosts/rapidgator.png"
  },
  "uploaded.net": {
    "id": "uploaded",
    "name": "Uploaded",
    "image": "https://real-debrid.com/images/hosts/uploaded.png"
  }
}
```

#### Get Hosts Status

```http
GET /rest/1.0/hosts/status
```

**Response**:

```json
{
  "rapidgator.net": {
    "id": "rapidgator",
    "name": "RapidGator",
    "image": "https://real-debrid.com/images/hosts/rapidgator.png",
    "supported": 1,
    "status": "up",
    "check_time": "2023-12-01T12:00:00.000Z",
    "competitors_status": {
      "alldebrid.com": {
        "status": "up",
        "check_time": "2023-12-01T12:00:00.000Z"
      },
      "debrid-link.fr": {
        "status": "down",
        "check_time": "2023-12-01T11:45:00.000Z"
      }
    }
  }
}
```

#### Get Supported Regex Patterns

```http
GET /rest/1.0/hosts/regex
```

**Response**:

```json
[
  "https?://(?:www\\.)?rapidgator\\.net/file/\\w+",
  "https?://(?:www\\.)?uploaded\\.net/file/\\w+",
  "https?://(?:www\\.)?1fichier\\.com/\\?\\w+"
]
```

#### Get Folder Regex Patterns

```http
GET /rest/1.0/hosts/regexFolder
```

**Response**:

```json
[
  "https?://(?:www\\.)?rapidgator\\.net/folder/\\w+",
  "https?://(?:www\\.)?uploaded\\.net/folder/\\w+"
]
```

#### Get Supported Domains

```http
GET /rest/1.0/hosts/domains
```

**Response**:

```json
["rapidgator.net", "uploaded.net", "1fichier.com", "uptobox.com"]
```

### User Settings

#### Get User Settings

```http
GET /rest/1.0/settings
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "download_ports": ["80", "443"],
  "download_port": "443",
  "locales": {
    "en": "English",
    "fr": "Français"
  },
  "locale": "en",
  "streaming_qualities": ["4K", "1080", "720", "480"],
  "streaming_quality": "1080",
  "mobile_streaming_quality": "720",
  "streaming_languages": {
    "en": "English",
    "fr": "Français",
    "es": "Español"
  },
  "streaming_language_preference": "en",
  "streaming_cast_audio": ["default", "english"],
  "streaming_cast_audio_preference": "default"
}
```

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Update User Setting

```http
POST /rest/1.0/settings/update
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}

setting_name={setting_name}&setting_value={setting_value}
```

**Available Settings**:

- `download_port`: Download port ("80", "443")
- `locale`: User interface language ("en", "fr", etc.)
- `streaming_language_preference`: Streaming audio language
- `streaming_quality`: Streaming quality ("4K", "1080", "720", "480")
- `mobile_streaming_quality`: Mobile streaming quality
- `streaming_cast_audio_preference`: Google Cast audio preference

**Response**: 204 No Content

**Error Codes**:

- `400`: Bad request (bad setting value or setting name)
- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Convert Fidelity Points

```http
POST /rest/1.0/settings/convertPoints
Authorization: Bearer {access_token}
```

**Response**: 204 No Content

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)
- `503`: Service unavailable (not enough points)

#### Change Password

```http
POST /rest/1.0/settings/changePassword
Authorization: Bearer {access_token}
```

**Response**: 204 No Content

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Upload Avatar

```http
PUT /rest/1.0/settings/avatarFile
Content-Type: multipart/form-data
Authorization: Bearer {access_token}

avatar={avatar_image_file}
```

**Response**: 204 No Content

**Error Codes**:

- `400`: Bad Request (invalid image format)
- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

#### Delete Avatar

```http
DELETE /rest/1.0/settings/avatarDelete
Authorization: Bearer {access_token}
```

**Response**: 204 No Content

**Error Codes**:

- `401`: Bad token (expired, invalid)
- `403`: Permission denied (account locked)

## Rate Limiting

- **Rate Limit**: 250 requests per minute
- **Exceeded Limit**: HTTP 429 response
- **Consequences**: Temporary block for unspecified duration
- **Best Practice**: Implement exponential backoff and request queuing

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Human readable error message",
  "error_code": 8
}
```

### Common Error Codes

| Code | Description                         |
| ---- | ----------------------------------- |
| -1   | Internal error                      |
| 1    | Missing parameter                   |
| 2    | Bad parameter value                 |
| 3    | Unknown method                      |
| 4    | Method not allowed                  |
| 5    | Slow down                           |
| 6    | Resource unreachable                |
| 7    | Resource not found                  |
| 8    | Bad token                           |
| 9    | Permission denied                   |
| 10   | Two-factor authentication needed    |
| 11   | Two-factor authentication pending   |
| 12   | Invalid login                       |
| 13   | Invalid password                    |
| 14   | Account locked                      |
| 15   | Account not activated               |
| 16   | Unsupported hoster                  |
| 17   | Hoster in maintenance               |
| 18   | Hoster limit reached                |
| 19   | Hoster temporarily unavailable      |
| 20   | Hoster not available for free users |
| 21   | Too many active downloads           |
| 22   | IP address not allowed              |
| 23   | Traffic exhausted                   |
| 24   | File unavailable                    |
| 25   | Service unavailable                 |
| 26   | Upload too big                      |
| 27   | Upload error                        |
| 28   | File not allowed                    |
| 29   | Torrent too big                     |
| 30   | Torrent file invalid                |
| 31   | Action already done                 |
| 32   | Image resolution error              |
| 33   | Torrent already active              |
| 34   | Too many requests                   |
| 35   | Infringing file                     |
| 36   | Fair usage limit                    |
| 37   | Disabled endpoint                   |

## Implementation Details

### Database Schema

The application stores OAuth tokens and device codes in Supabase database:

#### OAuth Tokens Table

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scope TEXT[] NOT NULL DEFAULT '{unrestrict,torrents,downloads,user}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Device Codes Table

```sql
CREATE TABLE device_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_code TEXT NOT NULL UNIQUE,
  user_code TEXT NOT NULL,
  verification_url TEXT NOT NULL,
  interval INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Security Considerations

1. **Token Storage**: Access tokens stored encrypted in database
2. **HTTPS Only**: All API communication over HTTPS
3. **Token Expiration**: Automatic token refresh before expiration
4. **Rate Limiting**: Client-side rate limiting implemented
5. **Input Validation**: All user inputs validated before API calls
6. **Row Level Security**: Database access restricted by user ID

### Client Implementation

#### OAuth Service Implementation

```typescript
interface DeviceCodeResponse {
  device_code: string
  user_code: string
  interval: number
  expires_in: number
  verification_url: string
}

interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  refresh_token: string
}

class RealDebridOAuthService {
  private readonly clientId = 'X245A4XAIBGVM'
  private readonly oauthBaseUrl = 'https://api.real-debrid.com/oauth/v2/'
  private readonly apiBaseUrl = 'https://api.real-debrid.com/rest/1.0/'

  async initiateDeviceCode(): Promise<DeviceCodeResponse> {
    const response = await fetch(`${this.oauthBaseUrl}device/code?client_id=${this.clientId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`OAuth initiation failed: ${response.status}`)
    }

    return response.json()
  }

  async pollForToken(deviceCode: string): Promise<TokenResponse> {
    const response = await fetch(`${this.oauthBaseUrl}token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Token polling failed')
    }

    return response.json()
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${this.oauthBaseUrl}token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        code: refreshToken,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    return response.json()
  }
}
```

#### API Service Implementation

```typescript
class RealDebridAPIService {
  private readonly apiBaseUrl = 'https://api.real-debrid.com/rest/1.0/'

  async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    accessToken: string
  ): Promise<T> {
    const url = `${this.apiBaseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new RealDebridAPIError(
        error.error || 'API request failed',
        response.status,
        error.error_code
      )
    }

    return response.json()
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    return this.makeAuthenticatedRequest('user', {}, accessToken)
  }

  async unrestrictLink(
    link: string,
    password?: string,
    remote = false,
    accessToken: string
  ): Promise<UnrestrictResponse> {
    const params = new URLSearchParams({ link })
    if (password) params.append('password', password.toString())
    if (remote) params.append('remote', '1')

    return this.makeAuthenticatedRequest(
      'unrestrict/link',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      },
      accessToken
    )
  }

  async getDownloads(page = 1, limit = 100, accessToken: string): Promise<Download[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    return this.makeAuthenticatedRequest(`downloads?${params}`, {}, accessToken)
  }

  async getTorrents(
    filter?: 'active',
    page = 1,
    limit = 100,
    accessToken: string
  ): Promise<Torrent[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    if (filter) params.append('filter', filter)

    return this.makeAuthenticatedRequest(`torrents?${params}`, {}, accessToken)
  }
}
```

## Testing

### Unit Tests

- OAuth flow initiation and token polling
- API request authentication and error handling
- Token refresh mechanisms
- Rate limiting implementation

### Integration Tests

- End-to-end OAuth authentication flow
- Real API calls with test credentials
- Error scenario handling (network failures, expired tokens)
- Torrent upload and file selection workflow

### Manual Testing

1. **OAuth Flow**: Test complete authentication process on real devices
2. **Link Unrestriction**: Test with various hoster links
3. **Torrent Management**: Test torrent upload, monitoring, and download
4. **Streaming**: Test video streaming transcoding and playback
5. **Error Scenarios**: Test network failures, rate limits, token expiration

## Troubleshooting

### Common Issues

1. **OAuth Timeout**: Device codes expire after 1800 seconds (30 minutes)
2. **Rate Limiting**: Implement exponential backoff for HTTP 429 errors
3. **Token Expiration**: Refresh tokens 5 minutes before expiration
4. **Network Failures**: Implement retry logic with configurable limits
5. **Invalid Links**: Validate links before making API calls

### Debug Logging

Enable debug logging to troubleshoot API integration issues:

```typescript
const DEBUG = process.env.NODE_ENV === 'development'

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[Real-Debrid API] ${message}`, data || '')
  }
}
```

### Health Checks

Implement periodic health checks to monitor API availability:

```typescript
async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch('https://api.real-debrid.com/rest/1.0/time')
    return response.ok
  } catch {
    return false
  }
}
```

## Conclusion

This documentation provides a comprehensive guide for integrating Real-Debrid's API into the DMM application. The implementation follows OAuth2 best practices and includes robust error handling, rate limiting, and security measures to ensure reliable and secure operation.

For additional information or support, refer to the official Real-Debrid API documentation at https://api.real-debrid.com/

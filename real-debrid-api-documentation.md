# Real-Debrid API Documentation

---

## Quick Reference (DMM usage)

- Base URL: `https://api.real-debrid.com/rest/1.0/`
- Auth: Bearer token required for most endpoints (device flow from Story 2.1).
- Rate limits: **250 requests/min** (HTTP 429 when exceeded). Build retries/backoff into the client.
- Common endpoints for our client: `/user`, `/files`, `/torrents`, `/downloads`, `/unrestrict/*`.
- Errors: JSON body with `error` and optional `error_code`; handle 401/403 for token issues and 429 for limits.

## Implementation details

- Methods are grouped by namespaces (e.g. "unrestrict", "user").
- Supported HTTP verbs are GET, POST, PUT, and DELETE. If your client does not support all HTTP verbs you can overide the verb with _X-HTTP-Verb_ HTTP header.
- Unless specified otherwise in the method's documentation, all successful API calls return HTTP code 200 with a JSON object.
- Errors are returned with HTTP code 4XX or 5XX, a JSON object with properties "error" (an error message) and "error_code" (optional, an integer).
- Every string passed to and from the API needs to be UTF-8 encoded. For maximum compatibility, normalize to [Unicode Normalization Form C](http://unicode.org/reports/tr15/) (NFC) before UTF-8 encoding.
- The API sends ETag headers and supports the _If-None-Match_ header.
- Dates are formatted according to the Javascript method [date.toJSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toJSON).
- Unless specified otherwise, all API methods require authentication.
- The API is limited to **250 requests per minute**, all refused requests will return HTTP 429 error and will count in the limit (bruteforcing will leave you blocked for undefined amount of time)

## API methods

The Base URL of the Rest API is:

```
https://api.real-debrid.com/rest/1.0/
```

---

#### GET /disable_access_token

Disable current access token

Disable current access token, returns 204 HTTP code

##### Return value:

None

##### Possible HTTP error codes:

| HTTP Status Code | Reason                       |
| ---------------- | ---------------------------- |
| 401              | Bad token (expired, invalid) |

#### GET /time

Get server time

Get server time, raw data returned. This request is not requiring authentication.

##### Return value:

Y-m-d H:i:s

#### GET /time/iso

Get server time in ISO

Get server time in ISO, raw data returned. This request is not requiring authentication.

##### Return value:

Y-m-dTH:i:sO

### /user

#### GET /user

Get current user info

Returns some informations on the current user.

##### Return value:

User show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

### /unrestrict

#### POST /unrestrict/check

Check a link

Check if a file is downloadable on the concerned hoster. This request is not requiring authentication.

##### Parameters:

|      | Name     | Type   | Description                                    |
| ---- | -------- | ------ | ---------------------------------------------- |
| POST | link \*  | string | The original hoster link                       |
| POST | password | string | Password to unlock the file access hoster side |

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason           |
| ---------------- | ---------------- |
| 503              | File unavailable |

#### POST /unrestrict/link

Unrestrict a link

Unrestrict a hoster link and get a new unrestricted link

##### Parameters:

|      | Name     | Type   | Description                                                                          |
| ---- | -------- | ------ | ------------------------------------------------------------------------------------ |
| POST | link \*  | string | The original hoster link                                                             |
| POST | password | string | Password to unlock the file access hoster side                                       |
| POST | remote   | int    | 0 or 1, use Remote traffic, dedicated servers and account sharing protections lifted |

##### Return value for a unique generated link:

show schema

##### Return value for multiple generated links (ex Youtube):

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### POST /unrestrict/folder

Unrestrict a folder link

Unrestrict a hoster folder link and get individual links, returns an empty array if no links found.

##### Parameters:

|      | Name    | Type   | Description            |
| ---- | ------- | ------ | ---------------------- |
| POST | link \* | string | The hoster folder link |

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### PUT /unrestrict/containerFile

Decrypt container file

Decrypt a container file (RSDF, CCF, CCF3, DLC)

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                                          |
| ---------------- | ----------------------------------------------- |
| 400              | Bad Request (see _error_ message)               |
| 401              | Bad token (expired, invalid)                    |
| 403              | Permission denied (account locked, not premium) |
| 503              | Service unavailable (see _error_ message)       |

#### POST /unrestrict/containerLink

Decrypt container file from link

Decrypt a container file from a link.

##### Parameters:

|      | Name    | Type   | Description                     |
| ---- | ------- | ------ | ------------------------------- |
| POST | link \* | string | HTTP Link of the container file |

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                                          |
| ---------------- | ----------------------------------------------- |
| 400              | Bad Request (see _error_ message)               |
| 401              | Bad token (expired, invalid)                    |
| 403              | Permission denied (account locked, not premium) |
| 503              | Service unavailable (see _error_ message)       |

### /traffic

#### GET /traffic

Traffic informations for limited hosters

Get traffic informations for limited hosters (limits, current usage, extra packages)

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### GET /traffic/details

Traffic details on used hosters

Get traffic details on each hoster used during a defined period

##### Parameters:

|     | Name  | Type              | Description                       |
| --- | ----- | ----------------- | --------------------------------- |
| GET | start | date (YYYY-MM-DD) | Start period, default: a week ago |
| GET | end   | date (YYYY-MM-DD) | End period, default: today        |

**Warning:** The period can not exceed 31 days.

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

### /streaming

#### GET /streaming/transcode/{id}

Get transcoding links for given file

Get transcoding links for given file, {id} from /downloads or /unrestrict/link

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### GET /streaming/mediaInfos/{id}

Get media informations for given file

Get detailled media informations for given file, {id} from /downloads or /unrestrict/link

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                                                      |
| ---------------- | ----------------------------------------------------------- |
| 401              | Bad token (expired, invalid)                                |
| 403              | Permission denied (account locked)                          |
| 503              | Service unavailable (problem finding metadata of the media) |

### /downloads

#### GET /downloads

Get user downloads list

Get user downloads list

##### Parameters:

|     | Name   | Type | Description                                                                   |
| --- | ------ | ---- | ----------------------------------------------------------------------------- |
| GET | offset | int  | Starting offset (must be within 0 and _X-Total-Count_ HTTP header)            |
| GET | page   | int  | Pagination system                                                             |
| GET | limit  | int  | Entries returned per page / request (must be within 0 and 5000, default: 100) |

**Warning:** You can not use both _offset_ and _page_ at the same time, _page_ is prioritzed in case it happens.

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### DELETE /downloads/delete/{id}

Delete a link from downloads list

Delete a link from downloads list, returns 204 HTTP code

##### Return value:

None

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |
| 404              | Unknown Ressource                  |

### /torrents

#### GET /torrents

Get user torrents list

Get user torrents list

##### Parameters:

|     | Name   | Type   | Description                                                                   |
| --- | ------ | ------ | ----------------------------------------------------------------------------- |
| GET | offset | int    | Starting offset (must be within 0 and _X-Total-Count_ HTTP header)            |
| GET | page   | int    | Pagination system                                                             |
| GET | limit  | int    | Entries returned per page / request (must be within 0 and 5000, default: 100) |
| GET | filter | string | "active", list active torrents only                                           |

**Warning:** You can not use both _offset_ and _page_ at the same time, _page_ is prioritzed in case it happens.

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### GET /torrents/info/{id}

Get infos on torrent

Get all informations on the asked torrent

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### GET /torrents/activeCount

Get currently active torrents number

Get currently active torrents number and the current maximum limit

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### GET /torrents/availableHosts

Get available hosts

Get available hosts to upload the torrent to.

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### PUT /torrents/addTorrent

Add torrent file

Add a torrent file to download, return a 201 HTTP code.

##### Parameters:

|     | Name | Type   | Description                                             |
| --- | ---- | ------ | ------------------------------------------------------- |
| GET | host | string | Hoster domain (retrieved from /torrents/availableHosts) |

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                                          |
| ---------------- | ----------------------------------------------- |
| 400              | Bad Request (see _error_ message)               |
| 401              | Bad token (expired, invalid)                    |
| 403              | Permission denied (account locked, not premium) |
| 503              | Service unavailable (see _error_ message)       |

#### POST /torrents/addMagnet

Add magnet link

Add a magnet link to download, return a 201 HTTP code.

##### Parameters:

|      | Name      | Type   | Description                                             |
| ---- | --------- | ------ | ------------------------------------------------------- |
| POST | magnet \* | string | Magnet link                                             |
| POST | host      | string | Hoster domain (retrieved from /torrents/availableHosts) |

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                                          |
| ---------------- | ----------------------------------------------- |
| 400              | Bad Request (see _error_ message)               |
| 401              | Bad token (expired, invalid)                    |
| 403              | Permission denied (account locked, not premium) |
| 503              | Service unavailable (see _error_ message)       |

#### POST /torrents/selectFiles/{id}

Select files of a torrent

Select files of a torrent to start it, returns 204 HTTP code.

##### Parameters:

|      | Name     | Type   | Description                                   |
| ---- | -------- | ------ | --------------------------------------------- |
| POST | files \* | string | Selected files IDs (comma separated) or "all" |

**Warning:** To get file IDs, use /torrents/info/{id}

##### Return value:

None

##### Possible HTTP error codes:

| HTTP Status Code | Reason                                                                |
| ---------------- | --------------------------------------------------------------------- |
| 202              | Action already done                                                   |
| 400              | Bad Request (see _error_ message)                                     |
| 401              | Bad token (expired, invalid)                                          |
| 403              | Permission denied (account locked, not premium)                       |
| 404              | Wrong parameter (invalid file id(s)) / Unknown ressource (invalid id) |

#### DELETE /torrents/delete/{id}

Delete a torrent from torrents list

Delete a torrent from torrents list, returns 204 HTTP code

##### Return value:

None

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |
| 404              | Unknown Ressource                  |

### /hosts

#### GET /hosts

Get supported hosts

Get supported hosts. This request is not requiring authentication.

##### Return value:

show schema

#### GET /hosts/status

Get status of hosters

Get status of supported hosters or not and their status on competitors.

##### Return value:

show schema

#### GET /hosts/regex

Get all supported regex.

Get all supported links Regex, useful to find supported links inside a document. This request is not requiring authentication.

##### Return value:

show schema

#### GET /hosts/regexFolder

Get all supported regex for folder links.

Get all supported folder Regex, useful to find supported links inside a document. This request is not requiring authentication.

##### Return value:

show schema

#### GET /hosts/domains

Get all supported domains.

Get all hoster domains supported on the service. This request is not requiring authentication.

##### Return value:

show schema

### /settings

#### GET /settings

Get current user settings

Get current user settings with possible values to update.

##### Return value:

show schema

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### POST /settings/update

Update a user setting

Update a user setting, returns 204 HTTP code.

##### Parameters:

|      | Name             | Type   | Description                                                                                                                                    |
| ---- | ---------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| POST | setting_name \*  | string | "download_port", "locale", "streaming_language_preference", "streaming_quality", "mobile_streaming_quality", "streaming_cast_audio_preference" |
| POST | setting_value \* | string | Possible values are available in _/settings_                                                                                                   |

##### Return value:

None

##### Possible HTTP error codes:

| HTTP Status Code | Reason                                          |
| ---------------- | ----------------------------------------------- |
| 400              | Bad request (bad setting value or setting name) |
| 401              | Bad token (expired, invalid)                    |
| 403              | Permission denied (account locked)              |

#### POST /settings/convertPoints

Convert fidelity points

Convert fidelity points, returns 204 HTTP code.

##### Return value:

None

##### Possible HTTP error codes:

| HTTP Status Code | Reason                                  |
| ---------------- | --------------------------------------- |
| 401              | Bad token (expired, invalid)            |
| 403              | Permission denied (account locked)      |
| 503              | Service unavailable (not enough points) |

#### POST /settings/changePassword

Send verification email to change the password

Send the verification email to change the password, returns 204 HTTP code.

##### Return value:

None

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### PUT /settings/avatarFile

Upload avatar image

Upload a new user avatar image, returns 204 HTTP code.

##### Return value:

None

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 400              | Bad Request (see _error_ message)  |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

#### DELETE /settings/avatarDelete

Reset user avatar

Reset user avatar image to default, returns 204 HTTP code

##### Return value:

None

##### Possible HTTP error codes:

| HTTP Status Code | Reason                             |
| ---------------- | ---------------------------------- |
| 401              | Bad token (expired, invalid)       |
| 403              | Permission denied (account locked) |

### /support

```
{
    "id": int,
    "username": "string",
    "email": "string",
    "points": int, // Fidelity points
    "locale": "string", // User language
    "avatar": "string", // URL
    "type": "string", // "premium" or "free"
    "premium": int, // seconds left as a Premium user
    "expiration": "string" // jsonDate
}
```

```
{
    "id": "string",
    "filename": "string",
    "mimeType": "string", // Mime Type of the file, guessed by the file extension
    "filesize": int, // Filesize in bytes, 0 if unknown
    "link": "string", // Original link
    "host": "string", // Host main domain
    "chunks": int, // Max Chunks allowed
    "crc": int, // Disable / enable CRC check
    "download": "string", // Generated link
    "streamable": int // Is the file streamable on website
}
```

```
{
    "id": "string",
    "filename": "string",
    "filesize": int, // Filesize in bytes, 0 if unknown
    "link": "string", // Original link
    "host": "string", // Host main domain
    "chunks": int, // Max Chunks allowed
    "crc": int, // Disable / enable CRC check
    "download": "string", // Generated link
    "streamable": int // Is the file streamable on website
    "type": "string", // Type of the file (in general, its quality)
    "alternative": [\
        {\
            "id": "string",\
            "filename": "string",\
            "download": "string",\
            "type": "string"\
        },\
        {\
            "id": "string",\
            "filename": "string",\
            "download": "string",\
            "type": "string"\
        }\
    ]
}
```

```
[\
    {\
        "id": "string",\
        "filename": "string",\
        "mimeType": "string", // Mime Type of the file, guessed by the file extension\
        "filesize": int, // bytes, 0 if unknown\
        "link": "string", // Original link\
        "host": "string", // Host main domain\
        "chunks": int, // Max Chunks allowed\
        "download": "string", // Generated link\
        "generated": "string" // jsonDate\
    },\
    {\
        "id": "string",\
        "filename": "string",\
        "mimeType": "string",\
        "filesize": int,\
        "link": "string",\
        "host": "string",\
        "chunks": int,\
        "download": "string",\
        "generated": "string",\
        "type": "string" // Type of the file (in general, its quality)\
    }\
]
```

```
{
    "string": { // Host main domain
        "left": int, // Available bytes / links to use
        "bytes": int, // Bytes downloaded
        "links": int, // Links unrestricted
        "limit": int,
        "type": "string", // "links", "gigabytes", "bytes"
        "extra": int, // Additional traffic / links the user may have buy
        "reset": "string" // "daily", "weekly" or "monthly"
    },
    "string": {
        "left": int,
        "bytes": int,
        "links": int,
        "limit": int,
        "type": "string",
        "extra": int,
        "reset": "string"
    }
}
```

```
{
    "YYYY-MM-DD": {
        "host": { // By Host main domain
            "string": int, // bytes downloaded on concerned host
            "string": int,
            "string": int,
            "string": int,
            "string": int,
            "string": int
        },
        "bytes": int // Total downloaded (in bytes) this day
    },
    "YYYY-MM-DD": {
        "host": {
            "string": int,
            "string": int,
            "string": int,
            "string": int,
            "string": int,
        },
        "bytes": int
    }
}
```

```
[\
    {\
        "id": "string",\
        "filename": "string",\
        "hash": "string", // SHA1 Hash of the torrent\
        "bytes": int, // Size of selected files only\
        "host": "string", // Host main domain\
        "split": int, // Split size of links\
        "progress": int, // Possible values: 0 to 100\
        "status": "downloaded", // Current status of the torrent: magnet_error, magnet_conversion, waiting_files_selection, queued, downloading, downloaded, error, virus, compressing, uploading, dead\
        "added": "string", // jsonDate\
        "links": [\
            "string" // Host URL\
        ],\
        "ended": "string", // !! Only present when finished, jsonDate\
        "speed": int, // !! Only present in "downloading", "compressing", "uploading" status\
        "seeders": int // !! Only present in "downloading", "magnet_conversion" status\
    },\
    {\
        "id": "string",\
        "filename": "string",\
        "hash": "string",\
        "bytes": int,\
        "host": "string",\
        "split": int,\
        "progress": int,\
        "status": "downloaded",\
        "added": "string",\
        "links": [\
            "string",\
            "string"\
        ],\
        "ended": "string"\
    },\
]
```

```
[\
    {\
        "id": "string",\
        "filename": "string",\
        "original_filename": "string", // Original name of the torrent\
        "hash": "string", // SHA1 Hash of the torrent\
        "bytes": int, // Size of selected files only\
        "original_bytes": int, // Total size of the torrent\
        "host": "string", // Host main domain\
        "split": int, // Split size of links\
        "progress": int, // Possible values: 0 to 100\
        "status": "downloaded", // Current status of the torrent: magnet_error, magnet_conversion, waiting_files_selection, queued, downloading, downloaded, error, virus, compressing, uploading, dead\
        "added": "string", // jsonDate\
        "files": [\
            {\
                "id": int,\
                "path": "string", // Path to the file inside the torrent, starting with "/"\
                "bytes": int,\
                "selected": int // 0 or 1\
            },\
            {\
                "id": int,\
                "path": "string", // Path to the file inside the torrent, starting with "/"\
                "bytes": int,\
                "selected": int // 0 or 1\
            }\
        ],\
        "links": [\
            "string" // Host URL\
        ],\
        "ended": "string", // !! Only present when finished, jsonDate\
        "speed": int, // !! Only present in "downloading", "compressing", "uploading" status\
        "seeders": int // !! Only present in "downloading", "magnet_conversion" status\
    }\
]
```

```
{
    "id": "string",
    "uri": "string" // URL of the created ressource
}
```

```
{
    "id": "string",
    "uri": "string" // URL of the created ressource
}
```

```
[\
    {\
        "host": "string", // Host main domain\
        "max_file_size": int // Max split size possible\
    },\
    {\
        "host": "string", // Host main domain\
        "max_file_size": int // Max split size possible\
    }\
]
```

```
{
    "string": { // First hash
        "string": [ // hoster, ex: "rd"\
            // All file IDs variants\
            {\
                "int": { // file ID, you must ask all file IDs from this array on /selectFiles to get instant downloading\
                    "filename": "string",\
                    "filesize": int\
                },\
                "int": { // file ID\
                    "filename": "string",\
                    "filesize": int\
                }\
            },\
            {\
                "int": { // file ID\
                    "filename": "string",\
                    "filesize": int\
                }\
            }\
        ]
    },
    "string": { // Second hash
        "string": [ // hoster, ex: "rd"\
            // All file IDs variants\
            {\
                "int": { // file ID, you must ask all file IDs from this array on /selectFiles to get instant downloading\
                    "filename": "string",\
                    "filesize": int\
                },\
                "int": { // file ID\
                    "filename": "string",\
                    "filesize": int\
                }\
            },\
            {\
                "int": { // file ID\
                    "filename": "string",\
                    "filesize": int\
                }\
            }\
        ]
    }
}
```

```
{
    "nb": int, // Number of currently active torrents
    "limit": int // Maximum number of active torrents you can have
}
```

```
[\
    "string", // URL\
    "string",\
    "string"\
]
```

```
[\
    "string", // URL\
    "string",\
    "string"\
]
```

```
[\
    "string", // Domain\
    "string",\
    "string"\
]
```

```
[\
    "string", // RegExp\
    "string",\
    "string"\
]
```

```
{
    "string": { // Host main domain
        "id": "string",
        "name": "string",
        "image": "string" // URL
    },
    "string": {
        "id": "string",
        "name": "string",
        "image": "string"
    }
}
```

```
{
    "string": { // Host main domain
        "id": "string",
        "name": "string",
        "image": "string", // URL
        "supported": int, // 0 or 1
        "status": "string", // "up" / "down" / "unsupported"
        "check_time": "string", // jsonDate
        "competitors_status": {
            "string": { // Competitor domain
                "status": "string", // "up" / "down" / "unsupported"
                "check_time": "string" // jsonDate
            },
            "string": {
                "status": "string",
                "check_time": "string"
            },
            "string": {
                "status": "string",
                "check_time": "string"
            }
        }
    },
    "string": {
        "id": "string",
        "name": "string",
        "image": "string",
        "supported": int,
        "status": "string",
        "check_time": "string",
        "competitors_status": {
            "string": {
                "status": "string",
                "check_time": "string"
            },
            "string": {
                "status": "string",
                "check_time": "string"
            },
            "string": {
                "status": "string",
                "check_time": "string"
            }
        }
    }
}
```

```
{
    "string": [ // Category name\
        {\
            "id": int, // Forum ID\
            "name": "string", // Forum name\
            "description": "string", // Forum description\
            "topics": int, // Number of topics inside the concerned forum\
            "posts": int, // Number of posts inside the concerned forum\
            "unread_content": int, // 0 or 1\
            "last_post": { // Last post details\
                "id": int,\
                "topic_id": int,\
                "user_id": int,\
                "user_name": "string",\
                "user_level": "string", // "user", "banned", "moderator", "administrator"\
                "date": "string" // jsonDate\
            }\
        },\
        {\
            "id": int,\
            "name": "string",\
            "description": "string",\
            "topics": int,\
            "posts": int,\
            "unread_content": int,\
            "last_post": {\
                "id": int,\
                "topic_id": int,\
                "user_id": int,\
                "user_name": "string",\
                "user_level": "string",\
                "date": "string"\
            }\
        }\
    ],\
    "string": [\
        {\
            "id": int,\
            "name": "string",\
            "description": "string",\
            "topics": int,\
            "posts": int,\
            "unread_content": int,\
            "last_post": {\
                "id": int,\
                "topic_id": int,\
                "user_id": int,\
                "user_name": "string",\
                "user_level": "string",\
                "date": "string"\
            }\
        },\
        {\
            "id": int,\
            "name": "string",\
            "description": "string",\
            "topics": int,\
            "posts": int,\
            "unread_content": int,\
            "last_post": {\
                "id": int,\
                "topic_id": int,\
                "user_id": int,\
                "user_name": "string",\
                "user_level": "string",\
                "date": "string"\
            }\
        }\
    ]
}
```

```
{
    "host": "string", // Host main domain
    "link": "string",
    "filename": "string",
    "filesize": int,
    "supported": int
}
```

```
{
    "apple": { // M3U8 Live Streaming format
        "quality": "string",
        "quality": "string"
    },
    "dash": { // MPD Live Streaming format
        "quality": "string",
        "quality": "string"
    },
    "liveMP4": { // Live MP4
        "quality": "string",
        "quality": "string"
    },
    "h264WebM": { // Live H264 WebM
        "quality": "string",
        "quality": "string"
    }
}
```

```
{
    "filename": "string", // Cleaned filename
    "hoster": "string", // File hosted on
    "link": "string", // Original content link
    "type": "string", // "movie" / "show" / "audio"
    "season": "string", // if found, else null
    "episode": "string", // if found, else null
    "year": "string", // if found, else null
    "duration": float, // media duration in seconds
    "bitrate": int, // birate of the media file
    "size": int, // original filesize in bytes
    "details": {
        "video": {
            "und1": { // if available, lang in iso_639 followed by a number ID
                "stream": "string",
                "lang": "string", // Language in plain text (ex "English", "French")
                "lang_iso": "string", // Language in iso_639 (ex fre, eng)
                "codec": "string", // Codec of the video (ex "h264", "divx")
                "colorspace": "string", // Colorspace of the video (ex "yuv420p")
                "width": int, // Width of the video (ex 1980)
                "height": int // Height of the video (ex 1080)
            }
        },
        "audio": {
            "und1": { // if available, lang in iso_639 followed by a number ID
                "stream": "string",
                "lang": "string", // Language in plain text (ex "English", "French")
                "lang_iso": "string", // Language in iso_639 (ex fre, eng)
                "codec": "string", // Codec of the audio (ex "aac", "mp3")
                "sampling": int, // Audio sampling rate
                "channels": float // Number of channels (ex 2, 5.1, 7.1)
            }
        },
        "subtitles": [\
            "und1": { // if available, lang in iso_639 followed by a number ID\
                "stream": "string",\
                "lang": "string", // Language in plain text (ex English, French)\
                "lang_iso": "string", // Language in iso_639 (ex fre, eng)\
                "type": "string" // Format of subtitles (ex "ASS" / "SRT")\
            }\
        ]
    },
    "poster_path": "string", // URL of the poster image if found / available
    "audio_image": "string", // URL of the music image in HD if found / available
    "backdrop_path": "string" // URL of the backdrop image if found / available
}
```

```
{
    "download_ports": [ // Possible "download_port" value to update settings\
        "string",\
        "string"\
    ],
    "download_port": "string", // Current user download port
    "locales": { // Possible "locale" value to update settings
        "string": "string",
        "string": "string"
    },
    "locale": "string", // Current user locale
    "streaming_qualities": [ // Possible "streaming_quality" value to update settings\
        "string",\
        "string",\
        "string",\
        "string"\
    ],
    "streaming_quality": "string", // Current user streaming quality
    "mobile_streaming_quality": "string", // Current user streaming quality on mobile devices
    "streaming_languages": { // Possible "streaming_language_preference" value to update settings
        "string": "string",
        "string": "string"
    },
    "streaming_language_preference": "string", // Current user streaming language preference
    "streaming_cast_audio": [ // Possible "streaming_cast_audio_preference" value to update settings\
        "string",\
        "string"\
    ],
    "streaming_cast_audio_preference": "string" // Current user audio preference on Google Cast devices
}
```

```
{
    "meta": {
        "id": int,
        "name": "string",
        "description": "string",
        "topics": int,
        "autorisation_topic": int, // User allowed to make a new topic: 0 or 1
        "autorisation_post": int, // User allowed to post in a topic: 0 or 1
        "autorisation_stick": int, // User allowed to stick a topic: 0 or 1
        "autorisation_moderation": int, // User allowed to use moderation tools: 0 or 1
    },
    "topics": {
        "string": [ // "normal" or "sticky"\
            {\
                "id": int,\
                "title": "string",\
                "author": {\
                    "user_id": int,\
                    "username": "string",\
                    "level": "string"\
                },\
                "posts": int,\
                "views": int,\
                "unread_content": int,\
                "last_post": {\
                    "id": int,\
                    "user_id": int,\
                    "user_name": "string",\
                    "user_level": "string",\
                    "date": "string"\
                }\
            },\
            {\
                "id": int,\
                "title": "string",\
                "author_user_id": int,\
                "author_user_name": "string",\
                "posts": int,\
                "views": int,\
                "unread_content": int,\
                "last_post": {\
                    "id": int,\
                    "user_id": int,\
                    "user_name": "string",\
                    "user_level": "string",\
                    "date": "string"\
                }\
            }\
        ]
    }
}
```

## Example calls

Here are some example calls, using [cURL](http://curl.haxx.se/):

#### Getting user informations:

Show/hide example

```
curl -X GET \
     -H "Authorization: Bearer your_api_token" \
     "https://api.real-debrid.com/rest/1.0/user"
```

```
HTTP/1.1 200 OK
Content-Type: application/json
etag: fd6e5a758cf66fe4e92bc2bc7061d9f32dc542af
date: Fri, 12 Jul 2013 12:12:12 GMT

{
    "id": 42,
    "username": "administrator",
    "email": "support@real-debrid.com",
    "points": 12347428,
    "avatar": "https:\/\/s.real-debrid.com\/images\/avatars\/42424242424.png",
    "type": "premium",
    "premium": 666666,
    "expiration": "2032-06-06T04:42:42.000Z"
}
```

## Authentication

Calls that require authentication expect an HTTP header _Authorization_ bearing a token, using the following format:

```
Authorization: Bearer your_api_token
```

If you can not send an _Authorization_ HTTP header you can also send your token as a parameter in REST API URLs, the parameter is called _auth_token_:

```
/rest/1.0/method?auth_token=your_api_token
```

This token can either be your [private API token](https://real-debrid.com/apitoken), or a token obtained using OAuth2's three-legged authentication.

**Warning:** Never **ever** use your private API token for public applications, it is insecure and gives access to all methods.

## Authentication for applications

First, you must create an app in your control panel.

Once you have created an app, you are provided a **client_id** and **client_secret** that you will use for the authentication process.

## Opensource Apps

You can use this client ID on opensource apps if you don't need custom scopes or name:

```
X245A4XAIBGVM
```

This app is allowed on following scopes: unrestrict, torrents, downloads, user

This client ID can have stricter limits than service limits due to poorly designed apps using it.

### Which authentication process should you use?

- If your application is a website: [three-legged OAuth2](https://api.real-debrid.com/#three_legged).
- If your application is a mobile app: [OAuth2 for devices](https://api.real-debrid.com/#device_auth).
- If your application is an opensource app or a script: [OAuth2 for opensource apps](https://api.real-debrid.com/#device_auth_no_secret).

The Base URL of the OAuth2 API is:

```
https://api.real-debrid.com/oauth/v2/
```

### Workflow for websites or client applications

This authentication process uses three-legged OAuth2.

The following URLs are used in this process:

- **authorize** endpoint: _/auth_
- **token** endpoint: _/token_

_Note: if your application is not a website, you will have to make the user do these steps in a web view (e.g. UIWebView on iOS, WebView on Android…)._

#### Full workflow

1. Your application redirects the user to Online.net's **authorize** endpoint, with the following query string parameters:
   - `client_id`: your app's client_id
   - `redirect_uri`: one of your application's redirect URLs (must be [url encoded](http://www.w3schools.com/tags/ref_urlencode.asp))
   - `response_type`: use the value "code"
   - `state`: an arbitrary string that will be returned to your application, to help you check against CSRF

##### Example URL for authorization:

```
https://api.real-debrid.com/oauth/v2/auth?client_id=ABCDEFGHIJKLM&redirect_uri=https%3A%2F%2Fexample.com&response_type=code&state=iloverd
```

2. The user chooses to authorize your application.

3. The user gets redirected to the URL you specified using the parameter _redirect_uri_, with the following query string parameters:
   - `code`: the code that you will use to get a token
   - `state`: the same value that you sent earlier
4. Using the value of _code_, your application makes a direct POST request (not in the user's browser) to the **token** endpoint, with the following parameters:
   - `client_id`
   - `client_secret`
   - `code`: the value that you received earlier
   - `redirect_uri`: one of your application's redirect URLs
   - `grant_type`: use the value "authorization_code"

##### Example cURL call to obtain an access token:

```
curl -X POST "https://api.real-debrid.com/oauth/v2/token" -d "client_id=ABCDEFGHIJKLM&client_secret=abcdefghsecret0123456789&code=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&redirect_uri=https://your-app.tld/realdebrid_api&grant_type=authorization_code"
```

5. If everything is correct, the access token is returned as a JSON object with the following properties:
   - `access_token`
   - `expires_in`: token validity period, in seconds
   - `token_type`: "Bearer"
   - `refresh_token`: token that only expires when your application rights are revoked by user
6. Your application stores the access token and uses it for the user's subsequent visits.

Your application must also stores the refresh token that will be used to get new access tokens once their validity period is expired.

### Workflow for mobile apps

This authentication process uses a variant of OAuth2, tailored for mobile devices.

The following URLs are used in this process:

- **device** endpoint: _/device/code_
- **token** endpoint: _/token_

_Note: you may have to make the user do some steps in a web view (e.g. UIWebView on iOS, WebView on Android…) if you want to do all these steps from the mobile app._

#### Full workflow

1. Your application makes a direct request to the **device** endpoint, with the query string parameter _client_id_, and obtains a JSON object with authentication data that will be used for the rest of the process.

##### Example URL to obtain authentication data:

```
https://api.real-debrid.com/oauth/v2/device/code?client_id=ABCDEFGHIJKLM
```

##### Example authentication data:

```
{
    "device_code": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    "user_code": "ABCDEF0123456",
    "interval": 5,
    "expires_in": 1800,
    "verification_url": "https:\/\/real-debrid.com\/device"
}
```

2. Your application asks the user to go to the **verification** endpoint (provided by _verification_url_) and to type the code provided by _user_code_.

3. Using the value of _device_code_, every 5 seconds your application starts making direct POST requests to the **token** endpoint, with the following parameters:
   - `client_id`
   - `client_secret`
   - `code`: the value of `device_code`
   - `grant_type`: use the value "http://oauth.net/grant\_type/device/1.0""

##### Example cURL call to obtain an access token:

```
curl -X POST "https://api.real-debrid.com/oauth/v2/token" -d "client_id=ABCDEFGHIJKLM&client_secret=abcdefghsecret0123456789&code=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&grant_type=http://oauth.net/grant_type/device/1.0"
```

Your application will receive an error message until the user has entered the code and authorized the application.

4. The user enters the code, and then logs in if they aren't logged in yet.

5. The user chooses to authorize your application, and can then close the browser window.

6. Your application's call to the **token** endpoint now returns the access token as a JSON object with the following properties:
   - `access_token`
   - `expires_in`: token validity period, in seconds
   - `token_type`: "Bearer"
   - `refresh_token`: token that only expires when your application rights are revoked by user
7. Your application stores the access token and uses it for the user's subsequent visits.

Your application must also stores the refresh token that will be used to get new access tokens once their validity period is expired.

### Workflow for opensource apps

This authentication process is similar to OAuth2 for mobile devices, with the difference that opensource apps or scripts can not be shipped with a **client_secret** (since it's meant to remain secret).

The principle here is to get a new set of client_id and client_secret that are bound to the user. You may reuse these credentials by using [OAuth2 for mobile devices](https://api.real-debrid.com/#device_auth).

**Warning:** You should not redistribute the credentials. Usage with another account will display the UID of the user who obtained the credentials. E.g. instead of displaying "The most fabulous app" it will display "The most fabulous app (UID: 000)".

The following URLs are used in this process:

- **device** endpoint: _/device/code_
- **credentials** endpoint: _/device/credentials_
- **token** endpoint: _/token_

#### Full workflow

1. Your application makes a direct request to the **device** endpoint, with the query string parameters _client_id_ and _new_credentials_ =yes, and obtains a JSON object with authentication data that will be used for the rest of the process.

##### Example URL to obtain authentication data:

```
https://api.real-debrid.com/oauth/v2/device/code?client_id=ABCDEFGHIJKLM&new_credentials=yes
```

##### Example authentication data:

```
{
    "device_code": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    "user_code": "ABCDEF0123456",
    "interval": 5,
    "expires_in": 1800,
    "verification_url": "https:\/\/real-debrid.com\/device"
}
```

2. Your application asks the user to go to the **verification** endpoint (provided by _verification_url_) and to type the code provided by _user_code_.

3. Using the value of _device_code_, every 5 seconds your application starts making direct requests to the **credentials** endpoint, with the following query string parameters:
   - `client_id`
   - `code`: the value of `device_code`

Your application will receive an error message until the user has entered the code and authorized the application.

4. The user enters the code, and then logs in if they aren't logged in yet.

5. The user chooses to authorize your application, and can then close the browser window.

6. Your application's call to the **credentials** endpoint now returns a JSON object with the following properties:
   - `client_id`: a new client_id that is bound to the user
   - `client_secret`

Your application stores these values and will use them for later requests.

7. Using the value of _device_code_, your application makes a direct POST request to the **token** endpoint, with the following parameters:
   - `client_id`: the value of `client_id` provided by the call to the **credentials** endpoint
   - `client_secret`: the value of `client_secret` provided by the call to the **credentials** endpoint
   - `code`: the value of `device_code`
   - `grant_type`: use the value "http://oauth.net/grant\_type/device/1.0"

The answer will be a JSON object with the following properties:

- `access_token`
- `expires_in`: token validity period, in seconds
- `token_type`: "Bearer"
- `refresh_token`: token that only expires when your application rights are revoked by user

##### Example cURL call to obtain an access token:

```
curl -X POST "https://api.real-debrid.com/oauth/v2/token" -d "client_id=ABCDEFGHIJKLM&client_secret=abcdefghsecret0123456789&code=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&grant_type=http://oauth.net/grant_type/device/1.0"
```

8. Your application stores the access token and uses it for the user's subsequent visits.

Your application must also stores the refresh token that will be used to get new access tokens once their validity period is expired.

### Workflow for old apps

**Warning:** This workflow requires a special authorization on your client_id from the webmaster.

The following URLs are used in this process:

- **token** endpoint: _/token_

#### Full workflow

1. Your application makes a direct POST request to the **token** endpoint, with the following parameters:
   - `client_id`
   - `username`: User login
   - `password`: User password
   - `grant_type`: use the value "password"

---

#### Testing Two-Factor Process

For testing purposes only, you can force the server to give you the two factor error by sending:

- `force_twofactor`: true

This will return the two factor validation URL:

- `verification_url`: The URL you should redirect the user to.
- `twofactor_code`
- `error`: "twofactor_auth_needed"
- `error_code`: 11

#### Workflow if you use a WebView / Popup

Open a WebView / Popup with the value of _verification_url_

Using the value of _twofactor_code_, your application makes a direct POST request (not in the user's browser) to the **token** endpoint, with the following parameters:

- `client_id`
- `code`: the value that you received earlier
- `grant_type`: use the value "twofactor"

##### Example cURL call to obtain an access token:

```
curl -X POST "https://api.real-debrid.com/oauth/v2/token" -d "client_id=ABCDEFGHIJKLM&code=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&grant_type=twofactor"
```

You will get a 403 HTTP code until the user inputs the correct security code on _verification_url_.

#### Workflow if you want to handle the security code validation process

The SMS or email is not sent until you make a request to the **token** endpoint, with the following parameters:

- `client_id`
- `code`: the value that you received earlier
- `grant_type`: use the value "twofactor"
- `send`: true

On success, you will get a 204 HTTP code, if the limit is reached then it will be a 403 HTTP code.

To validate the security code the user gives you, make a request to the **token** endpoint, with the following parameters:

- `client_id`
- `code`: the value that you received earlier
- `grant_type`: use the value "twofactor"
- `response`: use the value the user inputs

On error, you will get a 400 HTTP code, if the number of attempts is reached then you will get a 403 HTTP code.

---

On success, the answer will be a JSON object with the following properties:

- `access_token`
- `expires_in`: token validity period, in seconds
- `token_type`: "Bearer"
- `refresh_token`

**Important:** You must **NOT** save any login details, only keep _refresh_token_ as the « password ».

##### Example cURL call to obtain an access token:

```
curl -X POST "https://api.real-debrid.com/oauth/v2/token" -d "client_id=ABCDEFGHIJKLM&username=abcdefghsecret0123456789&password=abcdefghsecret0123456789&grant_type=password"
```

### Get a new access token from a refresh token

The following URLs are used in this process:

- **token** endpoint: _/token_

#### Full workflow

1. Using the value of _refresh_token_ your application saved earlier, your application makes a direct POST request to the **token** endpoint, with the following parameters:
   - `client_id`
   - `client_secret`
   - `code`: the value of `refresh_token`
   - `grant_type`: use the value "http://oauth.net/grant\_type/device/1.0"

The answer will be a JSON object with the following properties:

- `access_token`
- `expires_in`: token validity period, in seconds
- `token_type`: "Bearer"
- `refresh_token`

##### Example cURL call to obtain an access token:

```
curl -X POST "https://api.real-debrid.com/oauth/v2/token" -d "client_id=ABCDEFGHIJKLM&client_secret=abcdefghsecret0123456789&code=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&grant_type=http://oauth.net/grant_type/device/1.0"
```

## List of numeric error codes

In addition to the HTTP error code, errors come with a message ( _error_ parameter) and a numeric code ( _error_code_ parameter). The error message is meant to be human-readable, while the numeric codes should be used by your application.

| -1 | Internal error |
| 1 | Missing parameter |
| 2 | Bad parameter value |
| 3 | Unknown method |
| 4 | Method not allowed |
| 5 | Slow down |
| 6 | Ressource unreachable |
| 7 | Resource not found |
| 8 | Bad token |
| 9 | Permission denied |
| 10 | Two-Factor authentication needed |
| 11 | Two-Factor authentication pending |
| 12 | Invalid login |
| 13 | Invalid password |
| 14 | Account locked |
| 15 | Account not activated |
| 16 | Unsupported hoster |
| 17 | Hoster in maintenance |
| 18 | Hoster limit reached |
| 19 | Hoster temporarily unavailable |
| 20 | Hoster not available for free users |
| 21 | Too many active downloads |
| 22 | IP Address not allowed |
| 23 | Traffic exhausted |
| 24 | File unavailable |
| 25 | Service unavailable |
| 26 | Upload too big |
| 27 | Upload error |
| 28 | File not allowed |
| 29 | Torrent too big |
| 30 | Torrent file invalid |
| 31 | Action already done |
| 32 | Image resolution error |
| 33 | Torrent already active |
| 34 | Too many requests |
| 35 | Infringing file |
| 36 | Fair Usage Limit |
| 37 | Disabled endpoint |

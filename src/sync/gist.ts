import { db } from '@/db/index'
import { encrypt, decrypt } from './crypto'
import { v4 as uuidv4 } from 'uuid'

const GIST_DESCRIPTION = 'Recruiter Automation - Encrypted Backup'
const GIST_FILENAME = 'recruiter-data.enc'
const META_FILENAME = 'sync-meta.json'

interface SyncMeta {
  lockedByDevice: string | null
  deviceName: string
  lockedAt: number | null
  lastSyncAt: number
  schemaVersion: number
}

function getDeviceId(): string {
  let id = localStorage.getItem('ra-device-id')
  if (!id) {
    id = uuidv4()
    localStorage.setItem('ra-device-id', id)
  }
  return id
}

function getDeviceName(): string {
  return localStorage.getItem('ra-device-name') || `Device-${getDeviceId().slice(0, 6)}`
}

export function setDeviceName(name: string) {
  localStorage.setItem('ra-device-name', name)
}

export function getStoredToken(): string | null {
  return localStorage.getItem('ra-github-token')
}

export function setStoredToken(token: string) {
  localStorage.setItem('ra-github-token', token)
}

export function clearStoredToken() {
  localStorage.removeItem('ra-github-token')
}

export function getStoredGistId(): string | null {
  return localStorage.getItem('ra-gist-id')
}

function setStoredGistId(id: string) {
  localStorage.setItem('ra-gist-id', id)
}

async function githubRequest(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers as Record<string, string>,
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function validateToken(token: string): Promise<boolean> {
  try {
    await githubRequest('/user', token)
    return true
  } catch {
    return false
  }
}

async function findExistingGist(token: string): Promise<string | null> {
  try {
    const gists = await githubRequest('/gists?per_page=100', token)
    const found = gists.find((g: any) =>
      g.description === GIST_DESCRIPTION && g.files[GIST_FILENAME]
    )
    return found?.id || null
  } catch {
    return null
  }
}

export async function pushToGist(password: string, token: string): Promise<void> {
  const jobProfiles = await db.jobProfiles.toArray()
  const candidates = await db.candidates.toArray()
  const matchResults = await db.matchResults.toArray()

  const data = JSON.stringify({ jobProfiles, candidates, matchResults, exportedAt: Date.now() })
  const encrypted = await encrypt(data, password)

  const meta: SyncMeta = {
    lockedByDevice: getDeviceId(),
    deviceName: getDeviceName(),
    lockedAt: Date.now(),
    lastSyncAt: Date.now(),
    schemaVersion: 1,
  }

  let gistId = getStoredGistId()

  if (!gistId) {
    gistId = await findExistingGist(token)
  }

  const files = {
    [GIST_FILENAME]: { content: encrypted },
    [META_FILENAME]: { content: JSON.stringify(meta, null, 2) },
  }

  if (gistId) {
    await githubRequest(`/gists/${gistId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ description: GIST_DESCRIPTION, files }),
    })
  } else {
    const result = await githubRequest('/gists', token, {
      method: 'POST',
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files,
      }),
    })
    gistId = result.id
  }

  setStoredGistId(gistId!)
}

export async function pullFromGist(password: string, token: string): Promise<void> {
  let gistId = getStoredGistId()
  if (!gistId) {
    gistId = await findExistingGist(token)
    if (!gistId) throw new Error('No backup found')
    setStoredGistId(gistId)
  }

  const gist = await githubRequest(`/gists/${gistId}`, token)
  const encryptedContent = gist.files[GIST_FILENAME]?.content

  if (!encryptedContent) throw new Error('Backup file not found in gist')

  const decrypted = await decrypt(encryptedContent, password)
  const data = JSON.parse(decrypted)

  await db.transaction('rw', [db.jobProfiles, db.candidates, db.matchResults], async () => {
    await db.jobProfiles.clear()
    await db.candidates.clear()
    await db.matchResults.clear()

    if (data.jobProfiles?.length) await db.jobProfiles.bulkAdd(data.jobProfiles)
    if (data.candidates?.length) await db.candidates.bulkAdd(data.candidates)
    if (data.matchResults?.length) await db.matchResults.bulkAdd(data.matchResults)
  })
}

export async function checkLock(token: string): Promise<SyncMeta | null> {
  let gistId = getStoredGistId()
  if (!gistId) {
    gistId = await findExistingGist(token)
    if (!gistId) return null
    setStoredGistId(gistId)
  }

  try {
    const gist = await githubRequest(`/gists/${gistId}`, token)
    const metaContent = gist.files[META_FILENAME]?.content
    if (!metaContent) return null
    return JSON.parse(metaContent)
  } catch {
    return null
  }
}

export function isLockExpired(meta: SyncMeta): boolean {
  if (!meta.lockedAt) return true
  const LOCK_EXPIRY_MS = 48 * 60 * 60 * 1000
  return Date.now() - meta.lockedAt > LOCK_EXPIRY_MS
}

export function isMyLock(meta: SyncMeta): boolean {
  return meta.lockedByDevice === getDeviceId()
}

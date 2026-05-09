import { db } from '@/db/index'
import { encrypt, decrypt } from './crypto'

export async function exportBackup(password: string): Promise<void> {
  const jobProfiles = await db.jobProfiles.toArray()
  const candidates = await db.candidates.toArray()
  const matchResults = await db.matchResults.toArray()

  const data = JSON.stringify({
    jobProfiles,
    candidates,
    matchResults,
    exportedAt: Date.now(),
    version: 1,
  })

  const encrypted = await encrypt(data, password)

  const blob = new Blob([encrypted], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `recruiter-backup-${new Date().toISOString().slice(0, 10)}.enc`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File, password: string): Promise<void> {
  const text = await file.text()
  const decrypted = await decrypt(text, password)
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

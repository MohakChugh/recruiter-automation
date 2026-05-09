import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './index'
import type { JobProfile, Candidate, MatchResult } from './schema'
import { v4 as uuidv4 } from 'uuid'

export function useJobProfiles() {
  const profiles = useLiveQuery(() =>
    db.jobProfiles.orderBy('createdAt').reverse().toArray()
  )
  return profiles ?? []
}

export function useJobProfile(id: string | undefined) {
  return useLiveQuery(
    () => id ? db.jobProfiles.get(id) : undefined,
    [id]
  )
}

export function useCandidatesForJob(jobId: string | undefined) {
  return useLiveQuery(
    () => jobId
      ? db.matchResults
          .where('jobId')
          .equals(jobId)
          .sortBy('finalScore')
          .then(results => results.reverse())
      : [],
    [jobId]
  ) ?? []
}

export function useCandidate(id: string | undefined) {
  return useLiveQuery(
    () => id ? db.candidates.get(id) : undefined,
    [id]
  )
}

export function useMatchResult(jobId: string | undefined, candidateId: string | undefined) {
  return useLiveQuery(
    () => (jobId && candidateId)
      ? db.matchResults.where('[jobId+candidateId]').equals([jobId, candidateId]).first()
      : undefined,
    [jobId, candidateId]
  )
}

export function useProcessingJob(jobId: string | undefined) {
  return useLiveQuery(
    () => jobId ? db.processingJobs.where('jobId').equals(jobId).first() : undefined,
    [jobId]
  )
}

export function useCandidateCount() {
  return useLiveQuery(() => db.candidates.count()) ?? 0
}

export async function createJobProfile(data: Omit<JobProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = uuidv4()
  await db.jobProfiles.add({
    ...data,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
  return id
}

export async function deleteJobProfile(id: string): Promise<void> {
  await db.transaction('rw', [db.jobProfiles, db.matchResults, db.processingJobs], async () => {
    await db.matchResults.where('jobId').equals(id).delete()
    await db.processingJobs.where('jobId').equals(id).delete()
    await db.jobProfiles.delete(id)
  })
}

export async function getMatchResultsWithCandidates(jobId: string) {
  const results = await db.matchResults
    .where('jobId')
    .equals(jobId)
    .toArray()

  const candidateIds = results.map(r => r.candidateId)
  const candidates = await db.candidates.bulkGet(candidateIds)

  return results
    .map((result, i) => ({ result, candidate: candidates[i] }))
    .filter((item): item is { result: MatchResult; candidate: Candidate } =>
      item.candidate !== undefined
    )
    .sort((a, b) => b.result.finalScore - a.result.finalScore)
}

export async function deleteCandidates(candidateIds: string[], jobId: string) {
  await db.transaction('rw', [db.matchResults, db.candidates], async () => {
    for (const id of candidateIds) {
      await db.matchResults.where('[jobId+candidateId]').equals([jobId, id]).delete()
    }
    for (const id of candidateIds) {
      const otherRefs = await db.matchResults.where('candidateId').equals(id).count()
      if (otherRefs === 0) await db.candidates.delete(id)
    }
  })
}

export async function truncateJobCandidates(jobId: string) {
  await db.transaction('rw', [db.matchResults], async () => {
    await db.matchResults.where('jobId').equals(jobId).delete()
  })
}

export async function findDuplicateCandidate(
  email: string | null,
  fullName: string,
  phone: string | null
): Promise<string | null> {
  if (email) {
    const existing = await db.candidates.where('email').equals(email).first()
    if (existing) return existing.id
  }
  if (fullName && fullName !== 'Unknown' && phone) {
    const existing = await db.candidates
      .where('fullName').equals(fullName)
      .filter(c => c.phone === phone)
      .first()
    if (existing) return existing.id
  }
  return null
}

export async function updateCandidateSalary(
  candidateId: string,
  salaryExpectation: number | null,
  salaryCurrency: string | null
) {
  await db.candidates.update(candidateId, { salaryExpectation, salaryCurrency })
}

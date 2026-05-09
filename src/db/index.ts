import Dexie, { type Table } from 'dexie'
import type { JobProfile, Candidate, MatchResult, SyncState, ProcessingJob } from './schema'

export class RecruiterDB extends Dexie {
  jobProfiles!: Table<JobProfile>
  candidates!: Table<Candidate>
  matchResults!: Table<MatchResult>
  syncState!: Table<SyncState>
  processingJobs!: Table<ProcessingJob>

  constructor() {
    super('RecruiterAutomation')
    this.version(1).stores({
      jobProfiles: 'id, title, createdAt',
      candidates: 'id, email, fullName, parsingStatus, createdAt, *skills.name',
      matchResults: 'id, jobId, candidateId, finalScore, scoringStatus, [jobId+candidateId]',
      syncState: 'id',
      processingJobs: 'id, jobId, status'
    })
  }
}

export const db = new RecruiterDB()

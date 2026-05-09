export interface JobProfile {
  id: string
  title: string
  location: string
  locationCoords: { lat: number; lng: number } | null
  jdText: string
  mustHaveSkills: string[]
  niceToHaveSkills: string[]
  minYearsExperience: number
  maxYearsExperience: number | null
  seniority: string
  createdAt: number
  updatedAt: number
}

export interface Candidate {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  location: string | null
  locationCoords: { lat: number; lng: number } | null
  yearsExperience: number | null
  skills: { name: string; confidence: number }[]
  titlesHistory: string[]
  industries: string[]
  education: string
  rawResumeText: string
  embedding: number[] | null
  extractionMethod: 'llm' | 'regex_fallback'
  parsingStatus: 'pending' | 'processing' | 'complete' | 'partial' | 'failed'
  sourceFileName: string
  createdAt: number
}

export interface MatchResult {
  id: string
  jobId: string
  candidateId: string
  tier1Score: number
  tier2Score: number | null
  finalScore: number
  locationDistanceKm: number | null
  skillOverlap: { matched: string[]; missing: string[] }
  explanationShort: string
  explanationDeep: string | null
  relocationLikelihood: 'high' | 'medium' | 'low' | null
  scoringStatus: 'pending' | 'tier1_complete' | 'tier2_complete'
}

export interface SyncState {
  id: string
  githubToken: string | null
  gistId: string | null
  deviceId: string
  deviceName: string
  lastSyncAt: number | null
  encryptionSalt: string | null
}

export interface ProcessingJob {
  id: string
  jobId: string
  totalFiles: number
  processedFiles: number
  status: 'uploading' | 'parsing' | 'extracting' | 'scoring' | 'complete' | 'error'
  startedAt: number
  completedAt: number | null
  errors: { fileName: string; error: string }[]
}

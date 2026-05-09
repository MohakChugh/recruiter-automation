import { db } from '../db/index'
import type { Candidate, JobProfile } from '../db/schema'
import { computeTier1Score } from './scoring'
import { detectRedFlags } from './red-flags'
import { findDuplicateCandidate } from '../db/hooks'
import { v4 as uuidv4 } from 'uuid'

export interface ProcessingState {
  status: 'idle' | 'parsing' | 'extracting' | 'geocoding' | 'scoring' | 'tier2' | 'complete'
  totalFiles: number
  parsedFiles: number
  extractedFiles: number
  geocodedFiles: number
  scoredFiles: number
  errors: { fileName: string; error: string }[]
  tier1Ready: boolean
}

type StateListener = (state: ProcessingState) => void

export class ProcessingOrchestrator {
  private state: ProcessingState = {
    status: 'idle',
    totalFiles: 0,
    parsedFiles: 0,
    extractedFiles: 0,
    geocodedFiles: 0,
    scoredFiles: 0,
    errors: [],
    tier1Ready: false
  }

  private listeners: StateListener[] = []
  private parseWorker: Worker | null = null
  private geoWorker: Worker | null = null
  private extractWorker: Worker | null = null

  subscribe(listener: StateListener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state }))
  }

  getState() {
    return { ...this.state }
  }

  async processResumes(files: File[], jobId: string) {
    this.state = {
      status: 'parsing',
      totalFiles: files.length,
      parsedFiles: 0,
      extractedFiles: 0,
      geocodedFiles: 0,
      scoredFiles: 0,
      errors: [],
      tier1Ready: false
    }
    this.notify()

    await db.processingJobs.put({
      id: uuidv4(),
      jobId,
      totalFiles: files.length,
      processedFiles: 0,
      status: 'parsing',
      startedAt: Date.now(),
      completedAt: null,
      errors: []
    })

    this.parseWorker = new Worker(
      new URL('./parse.worker.ts', import.meta.url),
      { type: 'module' }
    )
    this.geoWorker = new Worker(
      new URL('./geo.worker.ts', import.meta.url),
      { type: 'module' }
    )
    this.extractWorker = new Worker(
      new URL('./extract.worker.ts', import.meta.url),
      { type: 'module' }
    )

    const candidateIds: Map<string, string> = new Map()
    let llmAvailable = false
    let embeddingAvailable = false

    try {
      const { isLLMReady } = await import('./llm-engine')
      llmAvailable = isLLMReady()
    } catch { /* LLM not loaded */ }

    try {
      const { isEmbeddingReady } = await import('./embedding')
      embeddingAvailable = isEmbeddingReady()
    } catch { /* Embedding not loaded */ }

    this.extractWorker.onmessage = (event) => {
      const { id, data, method } = event.data
      const candidateId = candidateIds.get(id)
      if (!candidateId) return

      this.handleExtraction(candidateId, data, method, jobId)
    }

    this.geoWorker.onmessage = async (event) => {
      const { id, coords } = event.data
      if (coords) {
        await db.candidates.update(id, { locationCoords: coords })
      }
      this.state.geocodedFiles++
      this.notify()
      await this.checkTier1Ready(jobId)
    }

    this.parseWorker.onmessage = async (event) => {
      const { fileId, fileName, text, success, error } = event.data

      if (!success) {
        this.state.errors.push({ fileName, error: error || 'Parse failed' })
        this.state.parsedFiles++
        this.state.extractedFiles++
        this.state.geocodedFiles++
        this.notify()
        return
      }

      this.state.parsedFiles++
      this.state.status = 'extracting'
      this.notify()

      const candidateId = uuidv4()
      candidateIds.set(fileId, candidateId)

      await db.candidates.add({
        id: candidateId,
        fullName: 'Processing...',
        email: null,
        phone: null,
        location: null,
        locationCoords: null,
        yearsExperience: null,
        skills: [],
        titlesHistory: [],
        industries: [],
        education: '',
        rawResumeText: text,
        embedding: null,
        extractionMethod: 'regex_fallback',
        parsingStatus: 'processing',
        sourceFileName: fileName,
        salaryExpectation: null,
        salaryCurrency: null,
        redFlags: null,
        createdAt: Date.now()
      })

      this.extractWorker?.postMessage({
        type: 'extract',
        id: fileId,
        fileName,
        text
      })
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileId = uuidv4()
      const fileType = file.name.endsWith('.pdf') ? 'pdf' :
                       file.name.endsWith('.docx') ? 'docx' : 'doc'

      const arrayBuffer = await file.arrayBuffer()

      this.parseWorker.postMessage({
        type: 'parse',
        fileId,
        fileName: file.name,
        fileData: arrayBuffer,
        fileType
      }, [arrayBuffer])
    }
  }

  private async handleExtraction(candidateId: string, data: any, method: 'llm' | 'regex_fallback', jobId: string) {
    const existingId = await findDuplicateCandidate(data.email, data.fullName, data.phone)

    let finalCandidateId = candidateId
    if (existingId && existingId !== candidateId) {
      finalCandidateId = existingId
      await db.candidates.delete(candidateId)
      const existing = await db.candidates.get(existingId)
      if (existing) {
        const mergedSkills = [...existing.skills]
        for (const skill of data.skills) {
          if (!mergedSkills.some(s => s.name === skill.name)) {
            mergedSkills.push(skill)
          }
        }
        await db.candidates.update(existingId, {
          skills: mergedSkills,
          yearsExperience: Math.max(existing.yearsExperience || 0, data.yearsExperience || 0) || null,
          titlesHistory: [...new Set([...existing.titlesHistory, ...data.titlesHistory])],
          industries: [...new Set([...existing.industries, ...data.industries])],
          parsingStatus: 'complete'
        })
      }
    } else {
      await db.candidates.update(candidateId, {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        yearsExperience: data.yearsExperience,
        skills: data.skills,
        titlesHistory: data.titlesHistory,
        industries: data.industries,
        education: data.education,
        extractionMethod: method,
        parsingStatus: 'complete',
        embedding: null,
        salaryExpectation: data.salaryExpectation || null,
        salaryCurrency: data.salaryCurrency || null,
        redFlags: null
      })
    }

    const updatedCandidate = await db.candidates.get(finalCandidateId)
    if (updatedCandidate) {
      const flags = detectRedFlags(updatedCandidate)
      if (flags.length > 0) {
        await db.candidates.update(finalCandidateId, { redFlags: flags })
      }
    }

    this.state.extractedFiles++
    this.notify()

    if (data.location) {
      this.geoWorker?.postMessage({
        type: 'geocode',
        id: finalCandidateId,
        location: data.location
      })
    } else {
      this.state.geocodedFiles++
      this.notify()
    }

    await this.checkTier1Ready(jobId)
  }

  private async checkTier1Ready(jobId: string) {
    const BATCH_SIZE = 50

    if (this.state.tier1Ready) {
      // Continue scoring new candidates as they arrive
      if (this.state.extractedFiles > this.state.scoredFiles) {
        await this.runTier1Scoring(jobId)
      }
      return
    }

    if (this.state.extractedFiles >= BATCH_SIZE ||
        (this.state.extractedFiles >= this.state.totalFiles && this.state.extractedFiles > 0)) {
      this.state.tier1Ready = true
      this.state.status = 'scoring'
      this.notify()

      await this.runTier1Scoring(jobId)
    }
  }

  private async runTier1Scoring(jobId: string) {
    const job = await db.jobProfiles.get(jobId)
    if (!job) return

    // Compute job embedding if available
    let jobEmbedding: number[] | null = null
    try {
      const { isEmbeddingReady, embed } = await import('./embedding')
      if (isEmbeddingReady()) {
        jobEmbedding = await embed(job.jdText.slice(0, 1000))
      }
    } catch { /* Skip */ }

    const candidates = await db.candidates
      .where('parsingStatus')
      .equals('complete')
      .toArray()

    for (const candidate of candidates) {
      const existing = await db.matchResults
        .where('[jobId+candidateId]')
        .equals([jobId, candidate.id])
        .first()

      if (existing) continue

      const result = computeTier1Score(candidate, job, jobEmbedding)
      await db.matchResults.add(result)
      this.state.scoredFiles++
      this.notify()
    }

    // Check if all processing is complete
    const allDone = this.state.parsedFiles >= this.state.totalFiles &&
      this.state.extractedFiles >= this.state.totalFiles - this.state.errors.length

    if (allDone) {
      // Run Tier 2 on top candidates
      await this.runTier2Scoring(jobId)
      this.state.status = 'complete'
      this.notify()
      this.cleanup()
    }
  }

  private async runTier2Scoring(jobId: string) {
    let llmAvailable = false
    try {
      const { isLLMReady } = await import('./llm-engine')
      llmAvailable = isLLMReady()
    } catch { /* No LLM */ }

    if (!llmAvailable) return

    this.state.status = 'tier2'
    this.notify()

    const job = await db.jobProfiles.get(jobId)
    if (!job) return

    const topResults = await db.matchResults
      .where('jobId')
      .equals(jobId)
      .toArray()

    const sorted = topResults.sort((a, b) => b.tier1Score - a.tier1Score).slice(0, 30)

    const { generateTier2Analysis } = await import('./llm-extract')

    for (const result of sorted) {
      const candidate = await db.candidates.get(result.candidateId)
      if (!candidate) continue

      try {
        const analysis = await generateTier2Analysis(
          job.jdText,
          job.location,
          {
            name: candidate.fullName,
            location: candidate.location,
            distanceKm: result.locationDistanceKm,
            yearsExp: candidate.yearsExperience,
            skills: candidate.skills.map(s => s.name),
            titles: candidate.titlesHistory,
            industries: candidate.industries
          }
        )

        if (analysis) {
          const finalScore = Math.round(result.tier1Score * 0.5 + analysis.score * 0.5)
          await db.matchResults.update(result.id, {
            tier2Score: analysis.score,
            finalScore,
            explanationDeep: analysis.explanation,
            relocationLikelihood: analysis.relocation,
            scoringStatus: 'tier2_complete'
          })
        }
      } catch { /* Skip this candidate's tier2 */ }
    }
  }

  cleanup() {
    this.parseWorker?.terminate()
    this.geoWorker?.terminate()
    this.extractWorker?.terminate()
    this.parseWorker = null
    this.geoWorker = null
    this.extractWorker = null
  }
}

export const orchestrator = new ProcessingOrchestrator()

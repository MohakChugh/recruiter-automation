import { db } from '../db/index'
import type { Candidate, JobProfile } from '../db/schema'
import { computeTier1Score } from './scoring'
import { v4 as uuidv4 } from 'uuid'

export interface ProcessingState {
  status: 'idle' | 'parsing' | 'extracting' | 'geocoding' | 'scoring' | 'complete'
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

    // Create processing job record
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

    // Initialize workers
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

    const parsedTexts: Map<string, { text: string; fileName: string }> = new Map()
    const candidateIds: Map<string, string> = new Map() // fileId -> candidateId

    // Set up extract worker handler
    this.extractWorker.onmessage = async (event) => {
      const { id, data, method } = event.data
      const candidateId = candidateIds.get(id)
      if (!candidateId) return

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
        parsingStatus: 'complete'
      })

      this.state.extractedFiles++
      this.notify()

      // Send for geocoding if location found
      if (data.location) {
        this.geoWorker?.postMessage({
          type: 'geocode',
          id: candidateId,
          location: data.location
        })
      } else {
        this.state.geocodedFiles++
        this.notify()
      }

      // Check if we have enough for Tier 1
      await this.checkTier1Ready(jobId)
    }

    // Set up geo worker handler
    this.geoWorker.onmessage = async (event) => {
      const { id, coords } = event.data
      if (coords) {
        await db.candidates.update(id, { locationCoords: coords })
      }
      this.state.geocodedFiles++
      this.notify()
      await this.checkTier1Ready(jobId)
    }

    // Set up parse worker handler
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

      // Create candidate record
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
        createdAt: Date.now()
      })

      parsedTexts.set(fileId, { text, fileName })

      // Send to extraction worker
      this.extractWorker?.postMessage({
        type: 'extract',
        id: fileId,
        fileName,
        text
      })
    }

    // Start parsing all files
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

  private async checkTier1Ready(jobId: string) {
    const BATCH_SIZE = 50

    if (this.state.tier1Ready) return
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

      const result = computeTier1Score(candidate, job, null)
      await db.matchResults.add(result)
      this.state.scoredFiles++
      this.notify()
    }

    if (this.state.parsedFiles >= this.state.totalFiles &&
        this.state.extractedFiles >= this.state.totalFiles - this.state.errors.length) {
      this.state.status = 'complete'
      this.notify()
      this.cleanup()
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

import type { Candidate, JobProfile, MatchResult } from '../db/schema'
import { v4 as uuidv4 } from 'uuid'

export function computeTier1Score(
  candidate: Candidate,
  job: JobProfile,
  jobEmbedding: number[] | null
): MatchResult {
  const semanticScore = jobEmbedding && candidate.embedding
    ? cosineSimilarity(candidate.embedding, jobEmbedding)
    : 0

  const skillScore = computeSkillScore(candidate.skills.map(s => s.name), job.mustHaveSkills, job.niceToHaveSkills)
  const experienceScore = computeExperienceScore(candidate.yearsExperience, job.minYearsExperience, job.maxYearsExperience)
  const locationScore = computeLocationScore(candidate.locationCoords, job.locationCoords)
  const locationDistanceKm = computeDistance(candidate.locationCoords, job.locationCoords)

  const niceToHaveScore = computeNiceToHaveScore(candidate.skills.map(s => s.name), job.niceToHaveSkills)

  const tier1Score = Math.round(
    semanticScore * 35 +
    skillScore * 30 +
    experienceScore * 15 +
    locationScore * 10 +
    niceToHaveScore * 10
  )

  const { matched, missing } = computeSkillOverlap(candidate.skills.map(s => s.name), job.mustHaveSkills)

  const explanationShort = generateShortExplanation(
    tier1Score, matched, missing, locationDistanceKm, candidate.yearsExperience, job
  )

  return {
    id: uuidv4(),
    jobId: job.id,
    candidateId: candidate.id,
    tier1Score,
    tier2Score: null,
    finalScore: tier1Score,
    locationDistanceKm,
    skillOverlap: { matched, missing },
    explanationShort,
    explanationDeep: null,
    relocationLikelihood: null,
    scoringStatus: 'tier1_complete'
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : (dotProduct / denom + 1) / 2 // normalize to 0-1
}

function computeSkillScore(candidateSkills: string[], mustHave: string[], niceToHave: string[]): number {
  if (mustHave.length === 0) return 0.5
  const candidateSet = new Set(candidateSkills.map(s => s.toLowerCase()))
  const matched = mustHave.filter(s => candidateSet.has(s.toLowerCase()))
  return matched.length / mustHave.length
}

function computeNiceToHaveScore(candidateSkills: string[], niceToHave: string[]): number {
  if (niceToHave.length === 0) return 0.5
  const candidateSet = new Set(candidateSkills.map(s => s.toLowerCase()))
  const matched = niceToHave.filter(s => candidateSet.has(s.toLowerCase()))
  return matched.length / niceToHave.length
}

function computeExperienceScore(
  candidateYears: number | null,
  minYears: number,
  maxYears: number | null
): number {
  if (candidateYears === null) return 0.5

  if (candidateYears >= minYears && (maxYears === null || candidateYears <= maxYears)) {
    return 1.0
  }

  if (candidateYears < minYears) {
    const diff = minYears - candidateYears
    if (diff <= 2) return 0.6
    return 0.2
  }

  if (maxYears !== null && candidateYears > maxYears) {
    const diff = candidateYears - maxYears
    if (diff <= 3) return 0.8
    return 0.5
  }

  return 0.5
}

function computeLocationScore(
  candidateCoords: { lat: number; lng: number } | null,
  jobCoords: { lat: number; lng: number } | null
): number {
  const distance = computeDistance(candidateCoords, jobCoords)
  if (distance === null) return 0.5
  if (distance === 0) return 1.0
  if (distance < 25) return 0.9
  if (distance < 100) return 0.7
  if (distance < 500) return 0.4
  return 0.1
}

function computeDistance(
  a: { lat: number; lng: number } | null,
  b: { lat: number; lng: number } | null
): number | null {
  if (!a || !b) return null
  if (a.lat === 0 && a.lng === 0) return null // "remote"

  const R = 6371 // Earth radius in km
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLon = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180

  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))

  return Math.round(R * c)
}

function computeSkillOverlap(candidateSkills: string[], mustHave: string[]) {
  const candidateSet = new Set(candidateSkills.map(s => s.toLowerCase()))
  const matched = mustHave.filter(s => candidateSet.has(s.toLowerCase()))
  const missing = mustHave.filter(s => !candidateSet.has(s.toLowerCase()))
  return { matched, missing }
}

function generateShortExplanation(
  score: number,
  matched: string[],
  missing: string[],
  distanceKm: number | null,
  yearsExp: number | null,
  job: JobProfile
): string {
  const parts: string[] = []

  if (matched.length > 0) {
    parts.push(`${matched.length}/${matched.length + missing.length} required skills`)
  }

  if (yearsExp !== null) {
    parts.push(`${yearsExp}yr exp`)
  }

  if (distanceKm !== null && distanceKm > 0) {
    parts.push(`${distanceKm}km away`)
  } else if (distanceKm === 0) {
    parts.push('same location')
  }

  if (missing.length > 0 && missing.length <= 3) {
    parts.push(`missing: ${missing.join(', ')}`)
  }

  return parts.join(' · ') || `Score: ${score}/100`
}

export { computeDistance, cosineSimilarity }

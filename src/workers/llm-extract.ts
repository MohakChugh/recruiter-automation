import { generateCompletion, isLLMReady } from './llm-engine'

const EXTRACTION_SYSTEM_PROMPT = `You are a resume data extraction assistant. Extract structured information from resumes. Always respond with valid JSON only, no markdown or explanation.`

const EXTRACTION_USER_PROMPT = (text: string) => `Extract the following from this resume text as JSON:
{
  "fullName": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null (city, state/country)",
  "yearsExperience": "number or null",
  "skills": [{"name": "string", "confidence": 0.0-1.0}],
  "titlesHistory": ["string"],
  "industries": ["string"],
  "education": "string summary"
}

Resume text:
${text.slice(0, 3000)}
`

export interface LLMExtractedData {
  fullName: string
  email: string | null
  phone: string | null
  location: string | null
  yearsExperience: number | null
  skills: { name: string; confidence: number }[]
  titlesHistory: string[]
  industries: string[]
  education: string
}

export async function extractWithLLM(resumeText: string): Promise<LLMExtractedData | null> {
  if (!isLLMReady()) return null

  try {
    const response = await generateCompletion(
      EXTRACTION_SYSTEM_PROMPT,
      EXTRACTION_USER_PROMPT(resumeText),
      1024
    )

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    return {
      fullName: parsed.fullName || 'Unknown',
      email: parsed.email || null,
      phone: parsed.phone || null,
      location: parsed.location || null,
      yearsExperience: typeof parsed.yearsExperience === 'number' ? parsed.yearsExperience : null,
      skills: Array.isArray(parsed.skills) ? parsed.skills.map((s: any) => ({
        name: String(s.name || s).toLowerCase(),
        confidence: typeof s.confidence === 'number' ? s.confidence : 0.7
      })) : [],
      titlesHistory: Array.isArray(parsed.titlesHistory) ? parsed.titlesHistory : [],
      industries: Array.isArray(parsed.industries) ? parsed.industries : [],
      education: parsed.education || 'Not specified'
    }
  } catch {
    return null
  }
}

const TIER2_SYSTEM_PROMPT = `You are a recruitment analyst. Analyze candidate fit for a job role. Be concise and specific.`

export async function generateTier2Analysis(
  jdText: string,
  jobLocation: string,
  candidate: {
    name: string
    location: string | null
    distanceKm: number | null
    yearsExp: number | null
    skills: string[]
    titles: string[]
    industries: string[]
  }
): Promise<{ explanation: string; score: number; relocation: 'high' | 'medium' | 'low' } | null> {
  if (!isLLMReady()) return null

  const prompt = `Job Description: ${jdText.slice(0, 1500)}
Job Location: ${jobLocation}

Candidate:
- Name: ${candidate.name}
- Location: ${candidate.location || 'Unknown'} (${candidate.distanceKm ? candidate.distanceKm + 'km from job' : 'distance unknown'})
- Experience: ${candidate.yearsExp || 'Unknown'} years
- Skills: ${candidate.skills.join(', ')}
- Past Titles: ${candidate.titles.join(', ')}
- Industries: ${candidate.industries.join(', ')}

Respond in JSON only:
{
  "explanation": "1-2 sentence analysis of fit",
  "score": 0-100,
  "relocation": "high|medium|low"
}`

  try {
    const response = await generateCompletion(TIER2_SYSTEM_PROMPT, prompt, 256)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    return {
      explanation: parsed.explanation || '',
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      relocation: ['high', 'medium', 'low'].includes(parsed.relocation) ? parsed.relocation : 'medium'
    }
  } catch {
    return null
  }
}

interface ExtractRequest {
  type: 'extract'
  id: string
  fileName: string
  text: string
}

interface ExtractResponse {
  type: 'extracted'
  id: string
  data: ExtractedData
  method: 'llm' | 'regex_fallback'
}

interface ExtractedData {
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

self.onmessage = async (event: MessageEvent<ExtractRequest>) => {
  const { id, text } = event.data

  // For MVP: use regex extraction. LLM integration added in Phase 2.
  const data = extractWithRegex(text)

  const response: ExtractResponse = {
    type: 'extracted',
    id,
    data,
    method: 'regex_fallback'
  }
  self.postMessage(response)
}

function extractWithRegex(text: string): ExtractedData {
  return {
    fullName: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    location: extractLocation(text),
    yearsExperience: extractYearsExperience(text),
    skills: extractSkills(text),
    titlesHistory: extractTitles(text),
    industries: extractIndustries(text),
    education: extractEducation(text)
  }
}

function extractEmail(text: string): string | null {
  const match = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i)
  return match ? match[0].toLowerCase() : null
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
  return match ? match[0] : null
}

function extractName(text: string): string {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  // First non-empty line is often the name
  const firstLine = lines[0]?.trim() || 'Unknown'
  // Clean up: take only first 50 chars, remove common prefixes
  const cleaned = firstLine.replace(/^(resume|cv|curriculum vitae)\s*[-:]\s*/i, '').slice(0, 50)
  return cleaned || 'Unknown'
}

function extractLocation(text: string): string | null {
  const locationPatterns = [
    /(?:location|address|city|based in|residing)\s*[:]\s*([^\n,]+)/i,
    /(?:bangalore|bengaluru|mumbai|delhi|hyderabad|chennai|pune|kolkata|gurgaon|gurugram|noida|san francisco|new york|london|singapore|seattle|austin|toronto|remote)/i,
  ]

  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match) return match[1] || match[0]
  }

  return null
}

function extractYearsExperience(text: string): number | null {
  // Look for explicit mentions
  const explicit = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i)
  if (explicit) return parseInt(explicit[1])

  // Try to calculate from date ranges
  const years = text.match(/\b(20\d{2}|19\d{2})\b/g)
  if (years && years.length >= 2) {
    const dates = years.map(Number).sort()
    const span = dates[dates.length - 1] - dates[0]
    if (span > 0 && span < 50) return span
  }

  return null
}

function extractSkills(text: string): { name: string; confidence: number }[] {
  const skillKeywords = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    'react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'spring', 'fastapi',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
    'html', 'css', 'sass', 'tailwind', 'graphql', 'rest', 'api',
    'git', 'linux', 'agile', 'scrum', 'jira',
    'machine learning', 'deep learning', 'nlp', 'computer vision', 'tensorflow', 'pytorch',
    'data science', 'data engineering', 'etl', 'spark', 'hadoop', 'kafka',
    'microservices', 'system design', 'distributed systems',
    'product management', 'project management', 'leadership', 'communication',
    'figma', 'sketch', 'adobe', 'ui/ux', 'user research',
    'salesforce', 'sap', 'tableau', 'power bi',
    'blockchain', 'web3', 'solidity',
    'ios', 'android', 'react native', 'flutter',
    'devops', 'sre', 'monitoring', 'observability',
    'security', 'penetration testing', 'compliance',
    'fintech', 'healthtech', 'edtech', 'ecommerce', 'saas',
  ]

  const textLower = text.toLowerCase()
  const found: { name: string; confidence: number }[] = []

  for (const skill of skillKeywords) {
    if (textLower.includes(skill)) {
      // Higher confidence if mentioned multiple times or in skills section
      const count = (textLower.match(new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
      const inSkillsSection = /skills?[\s:]/i.test(text) && textLower.indexOf(skill) > textLower.search(/skills?[\s:]/i)
      const confidence = Math.min(0.5 + count * 0.15 + (inSkillsSection ? 0.2 : 0), 1.0)
      found.push({ name: skill, confidence: parseFloat(confidence.toFixed(2)) })
    }
  }

  return found.sort((a, b) => b.confidence - a.confidence)
}

function extractTitles(text: string): string[] {
  const titlePatterns = [
    /(?:senior|junior|lead|principal|staff|chief)?\s*(?:software|frontend|backend|fullstack|full-stack|data|ml|devops|cloud|product|project|ux|ui)\s*(?:engineer|developer|architect|manager|designer|scientist|analyst)/gi,
    /(?:cto|ceo|cfo|vp|director|head)\s*(?:of\s+\w+)?/gi,
    /(?:intern|trainee|associate|consultant|specialist|coordinator)/gi,
  ]

  const titles = new Set<string>()
  for (const pattern of titlePatterns) {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(m => titles.add(m.trim()))
    }
  }

  return Array.from(titles).slice(0, 10)
}

function extractIndustries(text: string): string[] {
  const industryKeywords = [
    'fintech', 'finance', 'banking', 'insurance',
    'healthcare', 'healthtech', 'pharma',
    'ecommerce', 'retail', 'marketplace',
    'edtech', 'education',
    'saas', 'enterprise', 'b2b', 'b2c',
    'gaming', 'media', 'entertainment',
    'telecom', 'automotive', 'manufacturing',
    'real estate', 'proptech',
    'travel', 'hospitality', 'logistics',
    'government', 'defense', 'aerospace',
    'energy', 'cleantech', 'sustainability',
    'social media', 'advertising', 'martech',
  ]

  const textLower = text.toLowerCase()
  return industryKeywords.filter(industry => textLower.includes(industry))
}

function extractEducation(text: string): string {
  const eduPatterns = [
    /(?:b\.?tech|b\.?e|b\.?sc|m\.?tech|m\.?s|m\.?sc|mba|ph\.?d|bachelor|master|doctorate)[\s\S]{0,100}/gi,
    /(?:iit|nit|bits|iiit|university|college|institute)[\s\S]{0,80}/gi,
  ]

  const matches: string[] = []
  for (const pattern of eduPatterns) {
    const found = text.match(pattern)
    if (found) matches.push(...found.map(m => m.trim().slice(0, 100)))
  }

  return matches.slice(0, 3).join('; ') || 'Not specified'
}

export {}

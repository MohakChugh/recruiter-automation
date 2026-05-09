import type { Candidate, RedFlag } from '../db/schema'

export function detectRedFlags(candidate: Candidate): RedFlag[] {
  const flags: RedFlag[] = []

  const titles = candidate.titlesHistory
  const yearsExp = candidate.yearsExperience || 0

  if (titles.length >= 4 && yearsExp <= 4) {
    flags.push({
      type: 'job_hopping',
      severity: 'high',
      description: `${titles.length} roles in ${yearsExp} years, frequent job changes`
    })
  } else if (titles.length >= 3 && yearsExp <= 3) {
    flags.push({
      type: 'job_hopping',
      severity: 'high',
      description: `${titles.length} roles in ${yearsExp} years, very short tenures`
    })
  } else if (titles.length >= 4 && yearsExp <= 8) {
    flags.push({
      type: 'job_hopping',
      severity: 'medium',
      description: `${titles.length} roles in ${yearsExp} years, below average tenure`
    })
  }

  const avgTenure = yearsExp > 0 && titles.length > 0 ? yearsExp / titles.length : null
  if (avgTenure !== null && avgTenure < 1.2 && titles.length >= 2) {
    flags.push({
      type: 'short_tenure',
      severity: avgTenure < 0.8 ? 'high' : 'medium',
      description: `Average tenure of ${avgTenure.toFixed(1)} years per role`
    })
  }

  const dateGaps = detectDateGaps(candidate.rawResumeText)
  if (dateGaps.length > 0) {
    for (const gap of dateGaps) {
      flags.push({
        type: 'gap',
        severity: gap.months > 12 ? 'high' : gap.months > 6 ? 'medium' : 'low',
        description: `${gap.months} month employment gap (${gap.from}-${gap.to})`
      })
    }
  }

  const uniqueFlags = flags.filter((flag, index, self) =>
    index === self.findIndex(f => f.type === flag.type && f.severity === flag.severity)
  )

  return uniqueFlags
}

interface DateGap {
  from: string
  to: string
  months: number
}

function detectDateGaps(text: string): DateGap[] {
  const yearPattern = /\b(20\d{2}|19\d{2})\s*[-to]+\s*(20\d{2}|19\d{2}|present|current)\b/gi
  const matches: { start: number; end: number }[] = []
  let match: RegExpExecArray | null

  while ((match = yearPattern.exec(text)) !== null) {
    const start = parseInt(match[1])
    const endStr = match[2].toLowerCase()
    const end = (endStr === 'present' || endStr === 'current') ? new Date().getFullYear() : parseInt(endStr)
    if (start > 1990 && end >= start && end <= new Date().getFullYear() + 1) {
      matches.push({ start, end })
    }
  }

  if (matches.length < 2) return []

  matches.sort((a, b) => a.start - b.start)

  const gaps: DateGap[] = []
  for (let i = 0; i < matches.length - 1; i++) {
    const gapMonths = (matches[i + 1].start - matches[i].end) * 12
    if (gapMonths >= 6) {
      gaps.push({
        from: String(matches[i].end),
        to: String(matches[i + 1].start),
        months: gapMonths
      })
    }
  }

  return gaps.slice(0, 3)
}

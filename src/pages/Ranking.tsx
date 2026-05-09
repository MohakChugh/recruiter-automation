import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, MessageSquare, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useJobProfile } from '@/db/hooks'
import { getMatchResultsWithCandidates } from '@/db/hooks'
import type { Candidate, MatchResult } from '@/db/schema'

export function Ranking() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const job = useJobProfile(jobId)
  const [results, setResults] = useState<{ result: MatchResult; candidate: Candidate }[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!jobId) return
    let cancelled = false

    const load = async () => {
      const data = await getMatchResultsWithCandidates(jobId)
      if (!cancelled) {
        setResults(data)
        setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 3000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [jobId])

  const filtered = results.filter(({ candidate }) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      candidate.fullName.toLowerCase().includes(q) ||
      candidate.skills.some(s => s.name.includes(q)) ||
      (candidate.location || '').toLowerCase().includes(q)
    )
  })

  const exportCSV = () => {
    const headers = ['Rank', 'Name', 'Score', 'Email', 'Location', 'Experience', 'Skills', 'Explanation']
    const rows = filtered.map(({ result, candidate }, i) => [
      i + 1,
      candidate.fullName,
      result.finalScore,
      candidate.email || '',
      candidate.location || '',
      candidate.yearsExperience || '',
      candidate.skills.map(s => s.name).join('; '),
      result.explanationShort
    ])

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ranking-${job?.title || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!job) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/jobs/${jobId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Candidate Ranking</h1>
          <p className="text-muted-foreground">{job.title} · {filtered.length} candidates</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" asChild>
            <Link to={`/jobs/${jobId}/chat`}>
              <MessageSquare className="h-4 w-4" />
              Chat
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name, skill, or location..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading results...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No candidates found. Upload resumes to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ result, candidate }, index) => (
            <Link key={result.id} to={`/jobs/${jobId}/candidates/${candidate.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex-shrink-0 w-6 sm:w-8 text-center">
                      <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                    </div>

                    <div className="flex-shrink-0 w-10 sm:w-14">
                      <div className={`text-lg font-bold ${
                        result.finalScore >= 70 ? 'text-emerald-600' :
                        result.finalScore >= 40 ? 'text-amber-600' : 'text-red-500'
                      }`}>
                        {result.finalScore}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{candidate.fullName}</span>
                        {candidate.yearsExperience && (
                          <span className="text-xs text-muted-foreground">{candidate.yearsExperience}yr</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {result.explanationShort}
                      </div>
                    </div>

                    <div className="flex-shrink-0 hidden md:flex flex-wrap gap-1 max-w-[200px]">
                      {result.skillOverlap.matched.slice(0, 3).map(skill => (
                        <Badge key={skill} variant="success" className="text-xs">{skill}</Badge>
                      ))}
                      {result.skillOverlap.missing.slice(0, 2).map(skill => (
                        <Badge key={skill} variant="outline" className="text-xs line-through opacity-50">{skill}</Badge>
                      ))}
                    </div>

                    <div className="flex-shrink-0 text-right hidden sm:block">
                      <div className="text-xs text-muted-foreground">
                        {candidate.location || 'Unknown'}
                      </div>
                      {result.locationDistanceKm !== null && (
                        <div className="text-xs text-muted-foreground">
                          {result.locationDistanceKm}km
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

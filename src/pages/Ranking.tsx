import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, MessageSquare, Search, Trash2, Plus, RefreshCw, Flag, CheckSquare, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useJobProfile } from '@/db/hooks'
import { getMatchResultsWithCandidates, deleteCandidates, truncateJobCandidates } from '@/db/hooks'
import type { Candidate, MatchResult } from '@/db/schema'

export function Ranking() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const job = useJobProfile(jobId)
  const [results, setResults] = useState<{ result: MatchResult; candidate: Candidate }[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  const allFilteredIds = filtered.map(({ candidate }) => candidate.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allFilteredIds))
    }
  }

  const toggleSelect = (candidateId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(candidateId)) {
        next.delete(candidateId)
      } else {
        next.add(candidateId)
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (!jobId) return
    const count = selectedIds.size
    const confirmed = window.confirm(`Delete ${count} selected candidate(s) from this job? This cannot be undone.`)
    if (!confirmed) return
    await deleteCandidates(Array.from(selectedIds), jobId)
    setSelectedIds(new Set())
  }

  const handleTruncateAndReload = async () => {
    if (!jobId) return
    const confirmed = window.confirm(
      'This will remove ALL candidates from this job and redirect you to upload new ones. This cannot be undone. Continue?'
    )
    if (!confirmed) return
    await truncateJobCandidates(jobId)
    navigate(`/jobs/${jobId}/upload`)
  }

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
          <Button variant="outline" size="sm" asChild>
            <Link to={`/jobs/${jobId}/upload`}>
              <Plus className="h-4 w-4" />
              Add More
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="destructive" size="sm" onClick={handleTruncateAndReload}>
            <RefreshCw className="h-4 w-4" />
            Truncate & Reload
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
          {/* Select All header row */}
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            <div
              className="flex-shrink-0 cursor-pointer p-1"
              onClick={toggleSelectAll}
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              {allSelected ? 'Deselect All' : 'Select All'}
            </span>
          </div>

          {filtered.map(({ result, candidate }, index) => (
            <div key={result.id} className="flex items-center gap-0">
              {/* Checkbox */}
              <div
                className="flex-shrink-0 cursor-pointer p-2 z-10"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleSelect(candidate.id)
                }}
              >
                {selectedIds.has(candidate.id) ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Candidate card */}
              <Link className="flex-1 min-w-0" to={`/jobs/${jobId}/candidates/${candidate.id}`}>
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
                          {/* Red flag badges */}
                          {candidate.redFlags && candidate.redFlags.length > 0 && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                              candidate.redFlags.some(f => f.severity === 'high')
                                ? 'text-red-500'
                                : 'text-amber-500'
                            }`}>
                              <Flag className="h-3 w-3" />
                              {candidate.redFlags.length}
                            </span>
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
            </div>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-3 shadow-lg">
          <div className="mx-auto max-w-screen-2xl flex items-center justify-between px-4">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Deselect All
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4" /> Delete Selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

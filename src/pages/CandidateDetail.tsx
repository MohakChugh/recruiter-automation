import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCandidate, useMatchResult } from '@/db/hooks'

export function CandidateDetail() {
  const { jobId, candidateId } = useParams<{ jobId: string; candidateId: string }>()
  const navigate = useNavigate()
  const candidate = useCandidate(candidateId)
  const match = useMatchResult(jobId, candidateId)

  if (!candidate) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{candidate.fullName}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            {candidate.email && (
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{candidate.email}</span>
            )}
            {candidate.phone && (
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{candidate.phone}</span>
            )}
            {candidate.location && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{candidate.location}</span>
            )}
          </div>
        </div>
        {match && (
          <div className={`text-3xl font-bold ${
            match.finalScore >= 70 ? 'text-emerald-600' :
            match.finalScore >= 40 ? 'text-amber-600' : 'text-red-500'
          }`}>
            {match.finalScore}
          </div>
        )}
      </div>

      {match && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{match.explanationShort}</p>
            {match.explanationDeep && (
              <p className="text-sm text-muted-foreground italic">{match.explanationDeep}</p>
            )}

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{match.tier1Score}</div>
                <div className="text-xs text-muted-foreground">Tier 1 Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{match.tier2Score ?? '—'}</div>
                <div className="text-xs text-muted-foreground">Tier 2 Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{match.locationDistanceKm ?? '—'}</div>
                <div className="text-xs text-muted-foreground">Distance (km)</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Skills Match</p>
              <div className="flex flex-wrap gap-1.5">
                {match.skillOverlap.matched.map(s => (
                  <Badge key={s} variant="success">{s}</Badge>
                ))}
                {match.skillOverlap.missing.map(s => (
                  <Badge key={s} variant="destructive">{s}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {candidate.yearsExperience && (
              <p className="text-sm font-medium">{candidate.yearsExperience} years</p>
            )}
            {candidate.titlesHistory.length > 0 ? (
              <ul className="text-sm space-y-1">
                {candidate.titlesHistory.map((title, i) => (
                  <li key={i} className="text-muted-foreground">{title}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No titles extracted</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{candidate.education || 'Not specified'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.map(skill => (
              <Badge key={skill.name} variant="secondary">
                {skill.name}
                <span className="ml-1 opacity-60">{Math.round(skill.confidence * 100)}%</span>
              </Badge>
            ))}
            {candidate.skills.length === 0 && (
              <span className="text-sm text-muted-foreground">No skills detected</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Industries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {candidate.industries.map(ind => (
              <Badge key={ind} variant="outline">{ind}</Badge>
            ))}
            {candidate.industries.length === 0 && (
              <span className="text-sm text-muted-foreground">None detected</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw Resume Text</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap max-h-96 overflow-y-auto bg-muted p-4 rounded-md">
            {candidate.rawResumeText || 'No text available'}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

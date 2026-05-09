import { useParams, Link, useNavigate } from 'react-router-dom'
import { Upload, BarChart3, MessageSquare, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useJobProfile, deleteJobProfile } from '@/db/hooks'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/index'

export function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const job = useJobProfile(jobId)

  const candidateCount = useLiveQuery(
    () => jobId ? db.matchResults.where('jobId').equals(jobId).count() : 0,
    [jobId]
  ) ?? 0

  if (!job) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading job profile...</p>
      </div>
    )
  }

  const handleDelete = async () => {
    if (window.confirm('Delete this job profile? This will also remove all associated match results.')) {
      await deleteJobProfile(job.id)
      navigate('/')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="text-muted-foreground">{job.location} · {job.seniority} · {job.minYearsExperience}+ years</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to={`/jobs/${job.id}/upload`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <CardTitle className="text-base">Upload Resumes</CardTitle>
              <CardDescription>Upload PDF or DOCX files</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to={`/jobs/${job.id}/ranking`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
              <CardTitle className="text-base">View Ranking</CardTitle>
              <CardDescription>{candidateCount} candidates scored</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to={`/jobs/${job.id}/chat`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <CardTitle className="text-base">Chat</CardTitle>
              <CardDescription>Ask questions about candidates</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Must-have Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {job.mustHaveSkills.map(skill => (
                <Badge key={skill}>{skill}</Badge>
              ))}
              {job.mustHaveSkills.length === 0 && (
                <span className="text-sm text-muted-foreground">None specified</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nice-to-have Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {job.niceToHaveSkills.map(skill => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
              {job.niceToHaveSkills.length === 0 && (
                <span className="text-sm text-muted-foreground">None specified</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{job.jdText}</p>
        </CardContent>
      </Card>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Plus, Briefcase, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useJobProfiles, useCandidateCount } from '@/db/hooks'

export function Dashboard() {
  const jobProfiles = useJobProfiles()
  const candidateCount = useCandidateCount()

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage job profiles and track candidates
          </p>
        </div>
        <Button asChild>
          <Link to="/jobs/new">
            <Plus className="h-4 w-4" />
            New Job Profile
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobProfiles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidateCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobProfiles.length > 0
                ? new Date(jobProfiles[0]?.createdAt).toLocaleDateString()
                : '—'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {jobProfiles.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-6 sm:p-12 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <CardTitle className="text-xl mb-2">No job profiles yet</CardTitle>
          <CardDescription className="mb-6">
            Create your first job profile to start ranking candidates
          </CardDescription>
          <Button asChild>
            <Link to="/jobs/new">
              <Plus className="h-4 w-4" />
              Create Job Profile
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {jobProfiles.map(job => (
            <Link key={job.id} to={`/jobs/${job.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <CardDescription>{job.location} · {job.seniority}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {job.mustHaveSkills.slice(0, 5).map(skill => (
                      <span key={skill} className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs">
                        {skill}
                      </span>
                    ))}
                    {job.mustHaveSkills.length > 5 && (
                      <span className="inline-flex items-center text-xs text-muted-foreground">
                        +{job.mustHaveSkills.length - 5} more
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {job.minYearsExperience}+ years · Created {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

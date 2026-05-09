import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle2, ArrowLeft, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useJobProfile } from '@/db/hooks'
import { useProcessingStore } from '@/store/processing'
import { orchestrator } from '@/workers/orchestrator'

export function Upload() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const job = useJobProfile(jobId)
  const processing = useProcessingStore()
  const [dragActive, setDragActive] = useState(false)

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    if (!jobId) return

    const files = Array.from(fileList).filter(f =>
      f.name.endsWith('.pdf') || f.name.endsWith('.docx') || f.name.endsWith('.doc')
    )

    if (files.length === 0) return

    useProcessingStore.getState().updateState({
      status: 'parsing',
      totalFiles: files.length,
      currentJobId: jobId,
      parsedFiles: 0,
      extractedFiles: 0,
      geocodedFiles: 0,
      scoredFiles: 0,
      errors: [],
      tier1Ready: false
    })

    orchestrator.subscribe((state) => {
      useProcessingStore.getState().updateState({
        status: state.status,
        parsedFiles: state.parsedFiles,
        extractedFiles: state.extractedFiles,
        geocodedFiles: state.geocodedFiles,
        scoredFiles: state.scoredFiles,
        errors: state.errors,
        tier1Ready: state.tier1Ready
      })
    })

    await orchestrator.processResumes(files, jobId)
  }, [jobId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const progressPercent = processing.totalFiles > 0
    ? Math.round((processing.extractedFiles / processing.totalFiles) * 100)
    : 0

  if (!job) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/jobs/${jobId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upload Resumes</h1>
          <p className="text-muted-foreground">{job.title}</p>
        </div>
      </div>

      {processing.status === 'idle' ? (
        <Card>
          <CardContent className="p-8">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={e => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <UploadIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium mb-2">
                Drop resume files here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Supports PDF and DOCX files (up to 1,000 files)
              </p>
              <label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <Button variant="outline" asChild>
                  <span className="cursor-pointer">Browse Files</span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {processing.status === 'complete' ? (
                  <><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Processing Complete</>
                ) : (
                  <><FileText className="h-5 w-5 animate-pulse" /> Processing Resumes...</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progressPercent} />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Parsed:</span>{' '}
                  <span className="font-medium">{processing.parsedFiles}/{processing.totalFiles}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Extracted:</span>{' '}
                  <span className="font-medium">{processing.extractedFiles}/{processing.totalFiles}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Geocoded:</span>{' '}
                  <span className="font-medium">{processing.geocodedFiles}/{processing.totalFiles}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Scored:</span>{' '}
                  <span className="font-medium">{processing.scoredFiles}</span>
                </div>
              </div>

              {processing.errors.length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <div className="flex items-center gap-2 text-sm text-destructive mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{processing.errors.length} file(s) failed</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {processing.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err.fileName}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {processing.tier1Ready && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium">Initial results ready!</span>
                </div>
                <Button size="sm" asChild>
                  <Link to={`/jobs/${jobId}/ranking`}>
                    <BarChart3 className="h-4 w-4" />
                    View Ranking
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

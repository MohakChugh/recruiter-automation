import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useSystemHealth } from '@/store/health'
import { Circle, Download, Upload, Cloud, Key, HardDrive } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Settings() {
  const health = useSystemHealth()
  const [llmProgress, setLlmProgress] = useState<{ text: string; progress: number } | null>(null)
  const [llmLoading, setLlmLoading] = useState(false)
  const [embeddingProgress, setEmbeddingProgress] = useState<{ text: string; progress: number } | null>(null)
  const [embeddingLoading, setEmbeddingLoading] = useState(false)

  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [syncing, setSyncing] = useState(false)

  const [backupPassword, setBackupPassword] = useState('')
  const [backupStatus, setBackupStatus] = useState('')

  const handleDownloadLLM = async () => {
    setLlmLoading(true)
    try {
      const { initializeLLM } = await import('@/store/health')
      await initializeLLM((info) => setLlmProgress(info))
      setLlmProgress(null)
    } catch (e) {
      setLlmProgress({ text: 'Failed to load model', progress: 0 })
    } finally {
      setLlmLoading(false)
    }
  }

  const handleDownloadEmbedding = async () => {
    setEmbeddingLoading(true)
    try {
      const { initializeEmbedding } = await import('@/store/health')
      await initializeEmbedding((info) => setEmbeddingProgress(info))
      setEmbeddingProgress(null)
    } catch (e) {
      setEmbeddingProgress({ text: 'Failed to load model', progress: 0 })
    } finally {
      setEmbeddingLoading(false)
    }
  }

  const handlePush = async () => {
    if (!token || !password) {
      setSyncStatus('Token and password required')
      return
    }
    setSyncing(true)
    setSyncStatus('Pushing...')
    try {
      const { pushToGist, setStoredToken } = await import('@/sync/gist')
      const { validateToken } = await import('@/sync/gist')
      const valid = await validateToken(token)
      if (!valid) {
        setSyncStatus('Invalid GitHub token')
        setSyncing(false)
        return
      }
      setStoredToken(token)
      await pushToGist(password, token)
      setSyncStatus('Backup pushed successfully!')
    } catch (e) {
      setSyncStatus(`Push failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  const handlePull = async () => {
    if (!token || !password) {
      setSyncStatus('Token and password required')
      return
    }
    setSyncing(true)
    setSyncStatus('Pulling...')
    try {
      const { pullFromGist, setStoredToken } = await import('@/sync/gist')
      setStoredToken(token)
      await pullFromGist(password, token)
      setSyncStatus('Data restored successfully! Refresh to see changes.')
    } catch (e) {
      setSyncStatus(`Pull failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleExportBackup = async () => {
    if (!backupPassword) {
      setBackupStatus('Password required')
      return
    }
    try {
      const { exportBackup } = await import('@/sync/backup')
      await exportBackup(backupPassword)
      setBackupStatus('Backup downloaded!')
    } catch (e) {
      setBackupStatus(`Export failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !backupPassword) {
      setBackupStatus('Select a file and enter your password')
      return
    }
    try {
      const { importBackup } = await import('@/sync/backup')
      await importBackup(file, backupPassword)
      setBackupStatus('Data restored! Refresh to see changes.')
    } catch {
      setBackupStatus('Import failed. Wrong password or corrupted file.')
    }
  }

  const items = [
    { label: 'WebGPU', available: health.webgpuAvailable, detail: 'GPU acceleration for AI models', unavailableText: 'Not Supported' },
    { label: 'LLM Model', available: health.llmLoaded, detail: 'Phi-3.5 Mini for deep analysis', unavailableText: 'Not Loaded' },
    { label: 'Embedding Model', available: health.embeddingLoaded, detail: 'GTE-small for similarity', unavailableText: 'Not Loaded' },
    { label: 'Geocoding', available: health.geocodingOnline, detail: 'Nominatim location service', unavailableText: 'Offline' },
    { label: 'Database', available: health.dbHealthy, detail: 'IndexedDB local storage', unavailableText: 'Error' },
    { label: 'Cloud Sync', available: health.syncAvailable, detail: 'GitHub Gist backup', unavailableText: 'Not Configured' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">System health and configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Health</CardTitle>
          <CardDescription>Status of all components</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map(item => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Circle className={cn(
                  "h-2.5 w-2.5 fill-current",
                  item.available ? "text-emerald-500" : "text-amber-500"
                )} />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
              <Badge variant={item.available ? "success" : "warning"}>
                {item.available ? 'Ready' : item.unavailableText}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            AI Model
          </CardTitle>
          <CardDescription>
            Download Phi-3.5 Mini (~2.2GB) for intelligent resume analysis and chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {health.llmLoaded ? (
            <div className="flex items-center gap-2">
              <Badge variant="success">Model Loaded</Badge>
              <span className="text-sm text-muted-foreground">Ready for deep analysis</span>
            </div>
          ) : (
            <>
              {llmProgress && (
                <div className="space-y-2">
                  <Progress value={llmProgress.progress * 100} />
                  <p className="text-xs text-muted-foreground">{llmProgress.text}</p>
                </div>
              )}
              <Button onClick={handleDownloadLLM} disabled={llmLoading || !health.webgpuAvailable}>
                {llmLoading ? 'Downloading...' : 'Download Model'}
              </Button>
              {!health.webgpuAvailable && (
                <p className="text-xs text-destructive">WebGPU not available. Use Chrome or Edge for AI features.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Embedding Model
          </CardTitle>
          <CardDescription>
            Download GTE-small (~33MB) for semantic matching between resumes and job descriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {health.embeddingLoaded ? (
            <div className="flex items-center gap-2">
              <Badge variant="success">Model Loaded</Badge>
              <span className="text-sm text-muted-foreground">Ready for semantic scoring</span>
            </div>
          ) : (
            <>
              {embeddingProgress && (
                <div className="space-y-2">
                  <Progress value={embeddingProgress.progress * 100} />
                  <p className="text-xs text-muted-foreground">{embeddingProgress.text}</p>
                </div>
              )}
              <Button onClick={handleDownloadEmbedding} disabled={embeddingLoading}>
                {embeddingLoading ? 'Downloading...' : 'Download Embedding Model'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Cloud Sync
          </CardTitle>
          <CardDescription>
            End-to-end encrypted backup via GitHub Gist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gh-token">GitHub Personal Access Token (gist scope)</Label>
            <Input
              id="gh-token"
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            />
            <p className="text-xs text-muted-foreground">
              Create at GitHub Settings → Developer settings → Personal access tokens → Tokens (classic) with "gist" scope only
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sync-password">Encryption Password</Label>
            <Input
              id="sync-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Strong password for encryption"
            />
            <p className="text-xs text-muted-foreground">
              This password encrypts your data. If forgotten, data cannot be recovered.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePush} disabled={syncing} variant="outline" size="sm">
              <Upload className="h-4 w-4" /> Push Backup
            </Button>
            <Button onClick={handlePull} disabled={syncing} variant="outline" size="sm">
              <Download className="h-4 w-4" /> Pull & Restore
            </Button>
          </div>
          {syncStatus && <p className="text-sm text-muted-foreground">{syncStatus}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Local Backup
          </CardTitle>
          <CardDescription>Export/import encrypted backup file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-pw">Backup Password</Label>
            <Input
              id="backup-pw"
              type="password"
              value={backupPassword}
              onChange={e => setBackupPassword(e.target.value)}
              placeholder="Password for file encryption"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportBackup} variant="outline" size="sm">
              <Download className="h-4 w-4" /> Export
            </Button>
            <label>
              <input type="file" accept=".enc" className="hidden" onChange={handleImportBackup} />
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer"><Upload className="h-4 w-4" /> Import</span>
              </Button>
            </label>
          </div>
          {backupStatus && <p className="text-sm text-muted-foreground">{backupStatus}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Recruiter Automation v1.0.0</p>
          <p>All processing happens locally in your browser. No data leaves your machine unencrypted.</p>
          <p>Models are downloaded once and cached for offline use.</p>
        </CardContent>
      </Card>
    </div>
  )
}

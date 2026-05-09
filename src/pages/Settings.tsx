import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSystemHealth } from '@/store/health'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Settings() {
  const health = useSystemHealth()

  const items = [
    { label: 'WebGPU', available: health.webgpuAvailable, detail: 'GPU acceleration for AI models' },
    { label: 'LLM Model', available: health.llmLoaded, detail: 'Phi-3 Mini for deep analysis' },
    { label: 'Embedding Model', available: health.embeddingLoaded, detail: 'GTE-small for similarity' },
    { label: 'Geocoding', available: health.geocodingOnline, detail: 'Nominatim location service' },
    { label: 'Database', available: health.dbHealthy, detail: 'IndexedDB local storage' },
    { label: 'Cloud Sync', available: health.syncAvailable, detail: 'GitHub Gist backup' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
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
                {item.available ? 'Ready' : 'Unavailable'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cloud Sync</CardTitle>
          <CardDescription>Encrypted backup via GitHub Gist (coming soon)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            GitHub Gist sync with end-to-end encryption will be available in a future update.
            For now, your data is stored locally in the browser.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Recruiter Automation v1.0.0</p>
          <p>All processing happens locally in your browser. No data leaves your machine.</p>
          <p>Models are downloaded once and cached for offline use.</p>
        </CardContent>
      </Card>
    </div>
  )
}

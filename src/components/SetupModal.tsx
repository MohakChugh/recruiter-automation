import { useState, useEffect } from 'react'
import { Sparkles, Download, CheckCircle2, Brain, Cpu, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface StepState {
  status: 'pending' | 'loading' | 'complete' | 'error'
  progress?: number
  text?: string
}

export function SetupModal() {
  const [visible, setVisible] = useState(false)
  const [webgpu, setWebgpu] = useState<'checking' | 'supported' | 'unsupported'>('checking')
  const [llm, setLlm] = useState<StepState>({ status: 'pending' })
  const [embedding, setEmbedding] = useState<StepState>({ status: 'pending' })

  useEffect(() => {
    const done = localStorage.getItem('ra-setup-complete')
    if (done === 'true') {
      setVisible(false)
      return
    }
    setVisible(true)
    checkWebGPU()
  }, [])

  const checkWebGPU = async () => {
    if (!('gpu' in navigator)) {
      setWebgpu('unsupported')
      return
    }
    try {
      const adapter = await (navigator as any).gpu.requestAdapter()
      setWebgpu(adapter ? 'supported' : 'unsupported')
    } catch {
      setWebgpu('unsupported')
    }
  }

  const downloadLLM = async () => {
    setLlm({ status: 'loading', progress: 0, text: 'Preparing download...' })
    try {
      const { initializeLLM } = await import('@/store/health')
      await initializeLLM((info) => {
        setLlm({ status: 'loading', progress: info.progress * 100, text: info.text })
      })
      setLlm({ status: 'complete', text: 'Phi-3.5 Mini loaded and cached' })
    } catch (e) {
      setLlm({ status: 'error', text: e instanceof Error ? e.message : 'Download failed' })
    }
  }

  const downloadEmbedding = async () => {
    setEmbedding({ status: 'loading', progress: 0, text: 'Preparing download...' })
    try {
      const { initializeEmbedding } = await import('@/store/health')
      await initializeEmbedding((info) => {
        setEmbedding({ status: 'loading', progress: info.progress * 100, text: info.text })
      })
      setEmbedding({ status: 'complete', text: 'GTE-small loaded and cached' })
    } catch (e) {
      setEmbedding({ status: 'error', text: e instanceof Error ? e.message : 'Download failed' })
    }
  }

  const downloadAll = async () => {
    if (llm.status !== 'complete') await downloadLLM()
    if (embedding.status !== 'complete') await downloadEmbedding()
  }

  const dismiss = () => {
    localStorage.setItem('ra-setup-complete', 'true')
    setVisible(false)
  }

  if (!visible) return null

  const allReady = llm.status === 'complete' && embedding.status === 'complete'
  const isLoading = llm.status === 'loading' || embedding.status === 'loading'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-background rounded-2xl shadow-2xl border overflow-hidden">
        <div className="p-8 pb-6 text-center border-b bg-muted/30">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome to Recruiter</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Download AI models to enable intelligent resume analysis. Models are cached locally for offline use.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-background border flex items-center justify-center">
              <Cpu className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">WebGPU</p>
              <p className="text-xs text-muted-foreground">GPU acceleration for AI</p>
            </div>
            {webgpu === 'checking' && <Badge variant="secondary">Checking...</Badge>}
            {webgpu === 'supported' && <Badge variant="success">Supported</Badge>}
            {webgpu === 'unsupported' && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                CPU Only
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-background border flex items-center justify-center">
                <Brain className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">LLM Model</p>
                  {llm.status === 'complete' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {llm.text || 'Phi-3.5 Mini — deep analysis & chat (~2.2 GB)'}
                </p>
              </div>
              {llm.status === 'pending' && <Badge variant="secondary">Required</Badge>}
              {llm.status === 'complete' && <Badge variant="success">Ready</Badge>}
              {llm.status === 'error' && <Badge variant="destructive">Failed</Badge>}
              {llm.status === 'loading' && (
                <Badge variant="secondary">{Math.round(llm.progress || 0)}%</Badge>
              )}
            </div>
            {llm.status === 'loading' && (
              <Progress value={llm.progress} className="h-1.5" />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-background border flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Embedding Model</p>
                  {embedding.status === 'complete' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {embedding.text || 'GTE-small — semantic resume matching (~33 MB)'}
                </p>
              </div>
              {embedding.status === 'pending' && <Badge variant="secondary">Required</Badge>}
              {embedding.status === 'complete' && <Badge variant="success">Ready</Badge>}
              {embedding.status === 'error' && <Badge variant="destructive">Failed</Badge>}
              {embedding.status === 'loading' && (
                <Badge variant="secondary">{Math.round(embedding.progress || 0)}%</Badge>
              )}
            </div>
            {embedding.status === 'loading' && (
              <Progress value={embedding.progress} className="h-1.5" />
            )}
          </div>

          {webgpu === 'unsupported' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                WebGPU is not available. AI models will run on CPU (significantly slower). For best performance, use Chrome or Edge with hardware acceleration enabled.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 pt-2 space-y-3 border-t bg-muted/20">
          {!allReady ? (
            <>
              <Button
                onClick={downloadAll}
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                <Download className="h-4 w-4" />
                {isLoading ? 'Downloading...' : 'Download All Models'}
              </Button>
              <Button
                onClick={dismiss}
                variant="ghost"
                className="w-full text-muted-foreground"
                size="sm"
                disabled={isLoading}
              >
                Skip for now — use rule-based scoring only
              </Button>
            </>
          ) : (
            <Button onClick={dismiss} className="w-full" size="lg">
              <CheckCircle2 className="h-4 w-4" />
              All Set — Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

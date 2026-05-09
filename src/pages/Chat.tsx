import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useJobProfile } from '@/db/hooks'
import { db } from '@/db/index'
let _llmEngine: typeof import('@/workers/llm-engine') | null = null
async function getLLMEngine() {
  if (!_llmEngine) _llmEngine = await import('@/workers/llm-engine')
  return _llmEngine
}
function isLLMReady() {
  return _llmEngine?.isLLMReady() ?? false
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function Chat() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const job = useJobProfile(jobId)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const handleSend = async () => {
    if (!input.trim() || !jobId) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    setStreamingText('')

    try {
      if (isLLMReady()) {
        // Build context from candidates
        const matchResults = await db.matchResults.where('jobId').equals(jobId).toArray()
        const candidateIds = matchResults.map(r => r.candidateId)
        const candidates = await db.candidates.bulkGet(candidateIds)
        const paired = matchResults
          .map((result, i) => ({ result, candidate: candidates[i]! }))
          .filter(p => p.candidate)
          .sort((a, b) => b.result.finalScore - a.result.finalScore)

        const context = paired.slice(0, 20).map(p =>
          `- ${p.candidate.fullName}: Score ${p.result.finalScore}, ${p.candidate.yearsExperience || '?'}yr exp, skills: ${p.candidate.skills.slice(0, 5).map(s => s.name).join(', ')}, location: ${p.candidate.location || 'Unknown'}`
        ).join('\n')

        const systemPrompt = `You are a recruitment assistant. Answer questions about candidates for this job. Be concise and specific. Here are the top candidates:\n${context}`

        let finalText = ''
        const llm = await getLLMEngine()
        await llm.streamCompletion(systemPrompt, userMessage, (text) => {
          finalText = text
          setStreamingText(text)
        }, 512)

        setMessages(prev => [...prev, { role: 'assistant', content: finalText }])
        setStreamingText('')
      } else {
        const response = await processQuery(userMessage, jobId)
        setMessages(prev => [...prev, { role: 'assistant', content: response }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your query.' }])
      setStreamingText('')
    } finally {
      setLoading(false)
    }
  }

  if (!job) return null

  const suggestions = [
    'Who are the top 5 candidates?',
    'Which candidates have React experience?',
    'Show candidates near the job location',
    'Who has the most experience?',
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/jobs/${jobId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-bold">Chat</h1>
          <p className="text-sm text-muted-foreground">{job.title}</p>
        </div>
        <Badge variant={isLLMReady() ? "default" : "secondary"} className="text-xs">
          {isLLMReady() ? 'AI Mode' : 'Structured Mode'}
        </Badge>
      </div>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-6">Ask questions about your candidates</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map(s => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    onClick={() => { setInput(s) }}
                    className="text-xs"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <Card className={`max-w-[90%] sm:max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </CardContent>
              </Card>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && !streamingText && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <Card>
                <CardContent className="p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.2s]" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {streamingText && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <Card>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{streamingText}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-4 border-t">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about candidates..."
          disabled={loading}
        />
        <Button onClick={handleSend} disabled={!input.trim() || loading} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

async function processQuery(query: string, jobId: string): Promise<string> {
  const queryLower = query.toLowerCase()

  const matchResults = await db.matchResults
    .where('jobId')
    .equals(jobId)
    .toArray()

  if (matchResults.length === 0) {
    return 'No candidates have been scored for this job yet. Please upload and process resumes first.'
  }

  const candidateIds = matchResults.map(r => r.candidateId)
  const candidates = await db.candidates.bulkGet(candidateIds)

  const paired = matchResults
    .map((result, i) => ({ result, candidate: candidates[i]! }))
    .filter(p => p.candidate)
    .sort((a, b) => b.result.finalScore - a.result.finalScore)

  const topMatch = queryLower.match(/top\s*(\d+)/)
  if (topMatch || queryLower.includes('best') || queryLower.includes('top candidates')) {
    const n = topMatch ? parseInt(topMatch[1]) : 5
    const top = paired.slice(0, n)
    const lines = top.map((p, i) =>
      `${i + 1}. **${p.candidate.fullName}** — Score: ${p.result.finalScore}/100\n   ${p.result.explanationShort}`
    )
    return `Top ${n} candidates:\n\n${lines.join('\n\n')}`
  }

  const skillTerms = ['react', 'node', 'python', 'java', 'typescript', 'aws', 'docker', 'kubernetes', 'golang', 'rust', 'angular', 'vue', 'django', 'flask', 'spring', 'sql', 'mongodb', 'graphql', 'machine learning', 'data science']
  const matchedSkill = skillTerms.find(s => queryLower.includes(s))
  if (matchedSkill) {
    const withSkill = paired.filter(p =>
      p.candidate.skills.some(s => s.name.toLowerCase().includes(matchedSkill))
    )
    if (withSkill.length === 0) {
      return `No candidates found with "${matchedSkill}" in their skills.`
    }
    const lines = withSkill.slice(0, 10).map((p, i) =>
      `${i + 1}. **${p.candidate.fullName}** — Score: ${p.result.finalScore}, ${p.candidate.yearsExperience || '?'}yr exp`
    )
    return `${withSkill.length} candidate(s) with "${matchedSkill}":\n\n${lines.join('\n')}`
  }

  if (queryLower.includes('location') || queryLower.includes('near') || queryLower.includes('close')) {
    const nearby = paired.filter(p =>
      p.result.locationDistanceKm !== null && p.result.locationDistanceKm < 100
    )
    if (nearby.length === 0) {
      return 'No candidates found within 100km of the job location.'
    }
    const lines = nearby.slice(0, 10).map((p, i) =>
      `${i + 1}. **${p.candidate.fullName}** — ${p.result.locationDistanceKm}km away, Score: ${p.result.finalScore}`
    )
    return `${nearby.length} candidate(s) near the job location:\n\n${lines.join('\n')}`
  }

  if (queryLower.includes('experience') || queryLower.includes('senior') || queryLower.includes('years')) {
    const sorted = [...paired].sort((a, b) => (b.candidate.yearsExperience || 0) - (a.candidate.yearsExperience || 0))
    const lines = sorted.slice(0, 10).map((p, i) =>
      `${i + 1}. **${p.candidate.fullName}** — ${p.candidate.yearsExperience || '?'} years, Score: ${p.result.finalScore}`
    )
    return `Candidates by experience:\n\n${lines.join('\n')}`
  }

  const avgScore = Math.round(paired.reduce((sum, p) => sum + p.result.finalScore, 0) / paired.length)
  const top3 = paired.slice(0, 3).map(p => p.candidate.fullName).join(', ')
  return `I have ${paired.length} candidates for this role.\n\nAverage score: ${avgScore}/100\nTop 3: ${top3}\n\nTry asking about specific skills, locations, or "top 5 candidates".`
}

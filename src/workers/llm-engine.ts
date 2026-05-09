import { CreateMLCEngine, MLCEngine } from '@mlc-ai/web-llm'

let engine: MLCEngine | null = null
let loading = false
let loadError: string | null = null

type ProgressCallback = (progress: { text: string; progress: number }) => void

export async function initLLM(onProgress?: ProgressCallback): Promise<MLCEngine> {
  if (engine) return engine
  if (loading) {
    while (loading) await new Promise(r => setTimeout(r, 100))
    if (engine) return engine
    throw new Error(loadError || 'LLM failed to load')
  }

  loading = true
  loadError = null

  try {
    engine = await CreateMLCEngine('Phi-3.5-mini-instruct-q4f16_1-MLC', {
      initProgressCallback: (report) => {
        onProgress?.({ text: report.text, progress: report.progress })
      }
    })
    loading = false
    return engine
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Unknown error loading LLM'
    loading = false
    throw e
  }
}

export function isLLMReady(): boolean {
  return engine !== null
}

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 512
): Promise<string> {
  if (!engine) throw new Error('LLM not initialized')

  const reply = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  })

  return reply.choices[0]?.message?.content || ''
}

export async function streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  maxTokens: number = 512
): Promise<string> {
  if (!engine) throw new Error('LLM not initialized')

  let fullText = ''
  const chunks = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
    stream: true,
  })

  for await (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta?.content || ''
    fullText += delta
    onChunk(fullText)
  }

  return fullText
}

export function disposeLLM() {
  if (engine) {
    engine = null
  }
}

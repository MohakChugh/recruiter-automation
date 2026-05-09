let pipeline: any = null
let loading = false

export async function initEmbedding(onProgress?: (info: { text: string; progress: number }) => void): Promise<void> {
  if (pipeline) return
  if (loading) {
    while (loading) await new Promise(r => setTimeout(r, 100))
    if (pipeline) return
    throw new Error('Embedding model failed to load')
  }

  loading = true
  try {
    const { pipeline: createPipeline, env } = await import('@xenova/transformers')
    env.allowLocalModels = false
    env.useBrowserCache = true

    pipeline = await createPipeline('feature-extraction', 'Xenova/gte-small', {
      progress_callback: (data: any) => {
        if (data.status === 'progress' && onProgress) {
          onProgress({ text: `Loading embedding model: ${data.file}`, progress: data.progress / 100 })
        }
      }
    })
    loading = false
  } catch (e) {
    loading = false
    throw e
  }
}

export function isEmbeddingReady(): boolean {
  return pipeline !== null
}

export async function embed(text: string): Promise<number[]> {
  if (!pipeline) throw new Error('Embedding model not initialized')
  const output = await pipeline(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!pipeline) throw new Error('Embedding model not initialized')
  const results: number[][] = []
  for (const text of texts) {
    const output = await pipeline(text, { pooling: 'mean', normalize: true })
    results.push(Array.from(output.data as Float32Array))
  }
  return results
}

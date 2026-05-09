import { create } from 'zustand'

interface HealthState {
  webgpuAvailable: boolean
  llmLoaded: boolean
  embeddingLoaded: boolean
  geocodingOnline: boolean
  dbHealthy: boolean
  syncAvailable: boolean
  allGreen: boolean
  anyRed: boolean
  setHealth: (key: keyof Omit<HealthState, 'allGreen' | 'anyRed' | 'setHealth' | 'checkHealth'>, value: boolean) => void
  checkHealth: () => Promise<void>
}

export const useSystemHealth = create<HealthState>((set, get) => ({
  webgpuAvailable: false,
  llmLoaded: false,
  embeddingLoaded: false,
  geocodingOnline: true,
  dbHealthy: true,
  syncAvailable: false,
  allGreen: false,
  anyRed: false,

  setHealth: (key, value) => {
    set(state => {
      const newState = { ...state, [key]: value }
      const checks = [newState.webgpuAvailable, newState.dbHealthy, newState.geocodingOnline]
      return {
        ...newState,
        allGreen: checks.every(Boolean) && newState.llmLoaded && newState.embeddingLoaded,
        anyRed: !newState.dbHealthy
      }
    })
  },

  checkHealth: async () => {
    const webgpu = 'gpu' in navigator

    let dbHealthy = true
    try {
      const { db } = await import('@/db/index')
      await db.jobProfiles.count()
    } catch {
      dbHealthy = false
    }

    let geocodingOnline = true
    try {
      const resp = await fetch('https://nominatim.openstreetmap.org/status', {
        signal: AbortSignal.timeout(5000)
      })
      geocodingOnline = resp.ok
    } catch {
      geocodingOnline = false
    }

    set(state => ({
      ...state,
      webgpuAvailable: webgpu,
      dbHealthy,
      geocodingOnline,
      allGreen: webgpu && dbHealthy && geocodingOnline && state.llmLoaded && state.embeddingLoaded,
      anyRed: !dbHealthy
    }))
  }
}))

export async function initializeLLM(onProgress?: (info: { text: string; progress: number }) => void) {
  try {
    const { initLLM } = await import('@/workers/llm-engine')
    await initLLM(onProgress)
    useSystemHealth.getState().setHealth('llmLoaded', true)
  } catch (e) {
    console.error('LLM init failed:', e)
  }
}

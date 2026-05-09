import { create } from 'zustand'

export interface ProcessingState {
  status: 'idle' | 'parsing' | 'extracting' | 'geocoding' | 'scoring' | 'tier2' | 'complete'
  totalFiles: number
  parsedFiles: number
  extractedFiles: number
  geocodedFiles: number
  scoredFiles: number
  errors: { fileName: string; error: string }[]
  tier1Ready: boolean
  currentJobId: string | null
}

interface ProcessingStore extends ProcessingState {
  updateState: (state: Partial<ProcessingState>) => void
  reset: () => void
}

const initialState: ProcessingState = {
  status: 'idle',
  totalFiles: 0,
  parsedFiles: 0,
  extractedFiles: 0,
  geocodedFiles: 0,
  scoredFiles: 0,
  errors: [],
  tier1Ready: false,
  currentJobId: null
}

export const useProcessingStore = create<ProcessingStore>((set) => ({
  ...initialState,
  updateState: (state) => set(prev => ({ ...prev, ...state })),
  reset: () => set(initialState)
}))

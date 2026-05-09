import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

interface ParseRequest {
  type: 'parse'
  fileId: string
  fileName: string
  fileData: ArrayBuffer
  fileType: 'pdf' | 'docx' | 'doc'
}

interface ParseResponse {
  type: 'parsed'
  fileId: string
  fileName: string
  text: string
  success: boolean
  error?: string
}

self.onmessage = async (event: MessageEvent<ParseRequest>) => {
  const { fileId, fileName, fileData, fileType } = event.data

  try {
    let text = ''

    if (fileType === 'pdf') {
      text = await extractPdf(fileData)
    } else if (fileType === 'docx' || fileType === 'doc') {
      text = await extractDocx(fileData)
    }

    if (!text.trim()) {
      throw new Error('No text extracted — file may be scanned/image-based')
    }

    const response: ParseResponse = {
      type: 'parsed',
      fileId,
      fileName,
      text: text.trim(),
      success: true
    }
    self.postMessage(response)
  } catch (error) {
    const response: ParseResponse = {
      type: 'parsed',
      fileId,
      fileName,
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parse error'
    }
    self.postMessage(response)
  }
}

async function extractPdf(data: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
    pages.push(pageText)
  }

  return pages.join('\n\n')
}

async function extractDocx(data: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: data })
  return result.value
}

export {}

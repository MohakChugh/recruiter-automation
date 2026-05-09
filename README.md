# Recruiter Automation

AI-powered resume ranking and candidate analysis tool that runs entirely in your browser.

## Features

- Upload PDF/DOCX resumes in bulk (up to 1,000 files)
- Automatic skill extraction, location detection, and experience calculation
- Two-tier scoring: fast rule-based ranking + deep AI reasoning
- Interactive chat for querying candidates with natural language
- Zero cost: no backend, no API keys, no subscriptions
- PWA: installable, works offline after first load
- Privacy first: all data stays in your browser (IndexedDB)

## Tech Stack

- Vite + React 18 + TypeScript
- shadcn/ui + Tailwind CSS
- Dexie.js (IndexedDB)
- Web Workers for parallel processing
- pdf.js + mammoth.js for document parsing
- PWA with Workbox

## Getting Started

```bash
npm install
npm run dev
```

## Deployment

Deployed automatically to GitHub Pages via Actions on push to `main`.

Live at: https://mohakchugh.github.io/recruiter-automation/

## License

MIT

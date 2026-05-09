# Recruiter Automation: Design Specification

## 1. Product Overview

### What It Is

A fully client-side Progressive Web App that enables a single recruiter to upload a job description and a batch of resumes (up to 1,000), extract structured candidate data, rank candidates by fit using a two-tier AI scoring system, and interactively explore candidates via natural language chat.

### Target User

A single recruiter (agency or startup hiring manager) working from one machine at a time, juggling multiple open roles, receiving hundreds to thousands of resumes per role.

### Core Constraints

- **Zero cost forever:** No paid services, no credit card required anywhere.
- **Single user, single device active at a time:** Data lives in browser (IndexedDB) with encrypted cross-device sync via GitHub Gist.
- **Fully client-side processing:** No backend server. All parsing, scoring, and LLM inference happen in the browser.
- **Graceful degradation:** Every component has a reliable fallback. Core flow never breaks.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Main Thread (React UI)                       │
│   Vite + React 18 + TypeScript + shadcn/ui + Tailwind            │
│   Zustand state · Dexie.js (IndexedDB) · Router · PWA shell      │
│   Progressive result rendering · Status indicators                │
└──────────────┬──────────────────────────────────────┬───────────┘
               │ postMessage                           │ postMessage
┌──────────────▼──────────────────┐   ┌───────────────▼───────────┐
│   Orchestrator Worker            │   │   Chat/Inference Worker    │
│   Manages processing queue       │   │   Phi-3 Mini (WebGPU)     │
│   Coordinates parallel pipeline  │   │   Interactive chat         │
│   Writes results to IndexedDB    │   │   On-demand deep analysis  │
│   Error handling + fallback logic│   │   Fallback: structured     │
└──┬────────┬────────┬────────────┘   │   query on IndexedDB       │
   │        │        │                 └───────────────────────────┘
   ▼        ▼        ▼
┌──────┐ ┌────────┐ ┌──────────────┐
│Parse │ │Geo     │ │Embed+Extract │
│Worker│ │Worker  │ │Worker        │
│pdf.js│ │Nominatim│ │GTE-small ONNX│
│mammoth│ │(primary)│ │Phi-3 (LLM   │
│      │ │Static DB│ │ extraction)  │
│      │ │(fallback)│ │Regex fallback│
└──────┘ └────────┘ └──────────────┘
```

### Key Architectural Decisions

1. **Two LLM contexts with GPU sharing:** The Orchestrator Worker uses Phi-3 for batch resume extraction. The Chat Worker uses Phi-3 for interactive queries. GPU contention is managed by pausing batch extraction when the user initiates chat, resuming when idle.

2. **IndexedDB as single source of truth:** All workers write to IndexedDB via Dexie.js. The UI subscribes to live queries. No in-memory-only candidate data.

3. **Service Worker (PWA):** Caches the app shell, ONNX model files, and Phi-3 weights in Cache Storage after first download. Subsequent loads are instant and offline-capable.

4. **Parallel pipeline:** Text extraction (CPU-bound), geocoding (I/O-bound), LLM extraction (GPU-bound), and embedding (GPU-bound, batched) run concurrently on different resource types.

---

## 3. Data Model

### JobProfile

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| title | string | Job title |
| location | string | Job location text |
| location_coords | { lat, lng } or null | Geocoded coordinates |
| jd_text | string | Full job description |
| must_have_skills | string[] | Required skills (normalized slugs) |
| nice_to_have_skills | string[] | Optional skills |
| min_years_experience | number | Minimum years required |
| max_years_experience | number or null | Maximum years (optional) |
| seniority | string | Level (junior/mid/senior/lead/principal) |
| created_at | timestamp | Creation time |

### Candidate

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| full_name | string | Extracted name |
| email | string or null | Extracted email |
| phone | string or null | Extracted phone |
| location | string or null | Extracted location text |
| location_coords | { lat, lng } or null | Geocoded coordinates |
| years_experience | number or null | Calculated from date ranges |
| skills | { name: string, confidence: number }[] | Extracted skills with confidence |
| titles_history | string[] | Past job titles |
| industries | string[] | Industry domains worked in |
| education | string | Education summary |
| raw_resume_text | string | Full extracted text |
| embedding | Float32Array (384 dims) | GTE-small vector |
| extraction_method | "llm" or "regex_fallback" | How data was extracted |
| parsing_status | "complete" or "partial" or "failed" | Extraction outcome |
| source_file_name | string | Original filename |
| created_at | timestamp | When processed |

### MatchResult

| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| job_id | string | FK to JobProfile |
| candidate_id | string | FK to Candidate |
| tier1_score | number (0-100) | Embedding + rules score |
| tier2_score | number or null (0-100) | LLM-derived deep score |
| final_score | number (0-100) | Weighted combination |
| location_distance_km | number or null | Haversine distance |
| skill_overlap | { matched: string[], missing: string[] } | Skill comparison |
| explanation_short | string | Template-based explanation |
| explanation_deep | string or null | LLM-generated reasoning |
| relocation_likelihood | "high" or "medium" or "low" or null | LLM-inferred willingness |
| scoring_status | "tier1_complete" or "tier2_complete" | Processing stage |

### SyncMetadata (stored in GitHub Gist)

| Field | Type | Description |
|-------|------|-------------|
| locked_by_device | string or null | Device ID holding lock |
| device_name | string | Human-readable device name |
| locked_at | timestamp or null | When lock was acquired |
| last_sync_at | timestamp | Last successful sync |
| schema_version | number | For migration support |
| lock_expiry_hours | number | Auto-release threshold (default: 48) |

---

## 4. Processing Pipeline

### Phase 1: Text Extraction (Parse Worker)

**Primary:** pdf.js for PDFs, mammoth.js for DOCX.

**Fallback:** If a specific file fails to parse (corrupted, password-protected, scanned image), attempt raw byte extraction as plaintext. If that also fails, mark as `parsing_status: "failed"` and flag for manual review.

**Output:** Raw text string per resume, written to a processing queue.

### Phase 2: Parallel Processing (3 concurrent workers)

#### LLM Extraction Worker

**Primary:** Feed raw text to Phi-3 Mini (Q4 quantized, ~2.2GB) with structured prompt:

```
Extract the following from this resume as JSON:
- full_name, email, phone, location
- skills (array with confidence 0-1)
- titles_history (array of past job titles)
- industries (array of domains)
- education (summary string)
- years_experience (number, calculated from earliest to latest date)
```

**Fallback (triggered if WebGPU unavailable, model fails to load, or OOM):**
- Regex extraction: email (`/[\w.+-]+@[\w-]+\.[\w.-]+/`), phone, name (first line heuristic)
- Skill detection: keyword matching against a bundled skill taxonomy (~2,000 common tech/business skills)
- Date parsing: regex for date patterns, calculate span
- Marks `extraction_method: "regex_fallback"`

#### Geocoding Worker

**Primary:** Nominatim API (free, no key, no card). Rate-limited to 1 request/second.

**Fallback (triggered if network unavailable or Nominatim returns error):**
- Bundled static city dataset (~10,000 cities worldwide, ~600KB JSON)
- Fuzzy string matching (Levenshtein distance) to find closest city name
- Returns coordinates from static dataset

**Output:** `{ lat, lng }` coordinates stored on Candidate record.

#### Embedding Worker

**Primary:** GTE-small (33MB) via ONNX Runtime Web (WebGPU acceleration).

**Fallback (triggered if ONNX model fails to load):**
- TF-IDF vectorization computed client-side on extracted text
- Cosine similarity still works, just lower semantic quality

**Output:** 384-dimensional Float32Array stored on Candidate record.

### Phase 3: Tier 1 Scoring

Triggered after each batch of 50 candidates has embeddings + geocoding complete.

**Score computation:**

```
tier1_score = weighted_sum(
  cosine_similarity(candidate.embedding, job_jd_embedding) * 0.35,
  skill_jaccard(candidate.skills, job.must_have_skills) * 0.30,
  experience_band_fit(candidate.years_exp, job.min, job.max) * 0.15,
  location_proximity_score(distance_km) * 0.10,
  nice_to_have_overlap(candidate.skills, job.nice_to_have) * 0.10
)
```

**Location proximity scoring:**
- 0 km: 1.0
- < 25 km: 0.9
- < 100 km: 0.7
- < 500 km: 0.4
- > 500 km: 0.1
- Same country but far: 0.2

**Experience band scoring:**
- Within range: 1.0
- 1-2 years below min: 0.6
- 3+ years below min: 0.2
- 1-3 years above max: 0.8
- 5+ years above max: 0.5 (overqualified risk)

**Output:** Ranked list visible to user. `explanation_short` is template-generated from score components.

### Phase 4: Tier 2 Deep Reasoning

Runs on top 30-50 candidates by tier1_score. Uses Phi-3 Mini (same model, Chat Worker or shared with Orchestrator during background phase).

**Prompt structure:**

```
Job Description: {jd_text}
Job Location: {job_location}

Candidate Profile:
- Name: {name}
- Location: {location} ({distance_km} km from job)
- Experience: {years} years
- Skills: {skills}
- Job History: {titles_history}
- Industries: {industries}

Analyze this candidate's fit. Provide:
1. A 1-2 sentence explanation of fit or misfit
2. Relocation likelihood (high/medium/low) with reasoning
3. A refined match score 0-100 considering tenure patterns, career trajectory, and cultural fit signals
```

**Fallback (if LLM unavailable):**
- Template-based explanation: "{X}% skill match, {Y}km from office, {Z} years experience in {industry}"
- Relocation likelihood: null (not computed)
- tier2_score: null (tier1_score used as final)

**Final score computation:**
```
final_score = tier1_score * 0.5 + tier2_score * 0.5
```

If tier2_score is null, `final_score = tier1_score`.

---

## 5. Chat System

### Architecture

The Chat Worker holds a persistent Phi-3 Mini context. When the user types a query:

1. **Intent detection:** Classify the query as one of:
   - **Filter query** ("show me candidates with React in Bangalore") → translate to structured IndexedDB query, return results
   - **Summarization query** ("summarize candidate X for this role") → load candidate + job into LLM context, generate summary
   - **Comparison query** ("compare top 3 candidates") → load multiple candidates, generate comparative analysis
   - **Freeform** ("what concerns do you have about candidate X?") → full LLM inference with candidate context

2. **Context injection:** For LLM queries, inject relevant candidate data and job description into the prompt. Keep context window manageable by only including relevant candidates (not all 1,000).

3. **Streaming response:** Tokens stream to the UI as generated for responsive feel.

### Fallback (Chat without LLM)

If Phi-3 is unavailable:
- Parse user query for keywords (skill names, locations, operators like "top 5", "with", "without")
- Execute as structured query on IndexedDB (filter + sort)
- Return results as formatted text without natural language generation
- Display: "AI chat unavailable. Showing filtered results for: [parsed query]"

---

## 6. Cross-Device Sync via GitHub Gist

### Encryption

- **Algorithm:** AES-256-GCM via Web Crypto API
- **Key derivation:** PBKDF2 (user password → 256-bit key, 100,000 iterations, random salt)
- **Envelope:** Salt (16 bytes) + IV (12 bytes) + ciphertext + auth tag, base64-encoded
- **Password never stored:** Only used to derive key at encryption/decryption time. Forgetting password = unrecoverable data (correct tradeoff).

### Sync Flow

**Push (save to Gist):**
1. Export all IndexedDB tables as JSON
2. Derive key from user password
3. Encrypt JSON blob with AES-256-GCM
4. Update GitHub Gist via API (using GitHub OAuth token stored in localStorage)
5. Update SyncMetadata (locked_by, timestamp)

**Pull (restore from Gist):**
1. Fetch Gist content via GitHub API
2. Prompt user for password
3. Derive key, decrypt payload
4. Parse JSON, populate IndexedDB tables
5. Claim device lock in SyncMetadata

### Device Lock Protocol

1. On app start, check SyncMetadata from Gist
2. If `locked_by_device` is null or `locked_at` > 48 hours ago: lock is available
3. Claim lock: set `locked_by_device` to this device's UUID (generated on first use, stored in localStorage), update `locked_at`
4. If locked by another device within 48h: display warning with device name and timestamp
   - User can "Take Over" (pull latest, claim lock) or cancel
5. On explicit logout/disconnect: push final state, clear `locked_by_device`
6. Auto-push on significant changes (every 50 new candidates processed, or on page unload)

### GitHub OAuth

- Use GitHub's device flow (no client secret needed, no backend)
- User authorizes the app → receives token → token stored encrypted in localStorage
- Gist scope only (`gist` permission)
- No card required, no third-party auth service

---

## 7. Fallback Matrix (Complete)

| Component | Primary | Fallback | Trigger | User Signal |
|-----------|---------|----------|---------|-------------|
| Resume parsing (PDF) | pdf.js | Raw byte extraction → flag for review | Parse throws error | Yellow indicator on specific file |
| Resume parsing (DOCX) | mammoth.js | Attempt as plaintext | Parse throws error | Yellow indicator on specific file |
| LLM extraction | Phi-3 Mini WebGPU | Regex/rule-based extraction | WebGPU unavailable, model load fail, OOM | Yellow: "Running in fast-parse mode" |
| WebGPU runtime | WebGPU (Chrome/Edge) | WASM CPU fallback (same model, 10x slower) | WebGPU feature detection fails | Yellow: "AI running on CPU (slower)" |
| Geocoding | Nominatim API | Static city dataset (10K cities, fuzzy match) | Network error, 429, timeout after 5s | Yellow: "Using offline location data" |
| Embedding model | GTE-small via ONNX WebGPU | TF-IDF cosine similarity | ONNX load failure | Yellow: "Using keyword matching" |
| Tier 2 reasoning | Phi-3 generates explanations | Template strings from structured data | LLM unavailable or user opts out | Shows template explanation, no deep insights |
| Chat | Phi-3 interactive inference | Structured query engine (keyword parsing → IndexedDB filter/sort) | LLM unavailable | "Filtered results for: [query]" |
| GitHub Gist sync | GitHub API + AES-256-GCM | Manual JSON export/import button | Network error, auth failure | "Sync unavailable. Use manual backup." |
| IndexedDB | Primary data store | Detect corruption on startup, offer export of recoverable data | Storage quota, corruption detected | Error modal with recovery options |

### Health Check on App Load

```
1. Feature-detect WebGPU → set gpu_available flag
2. Attempt Phi-3 model load (from Cache Storage) → set llm_available flag
3. Attempt GTE-small model load → set embedding_available flag
4. Ping Nominatim (single test request) → set geocoding_online flag
5. Open IndexedDB → set db_healthy flag
6. Check GitHub token validity → set sync_available flag
```

Display composite status in header:
- All green: "Full AI Analysis Active"
- Some yellow: "Partial AI Mode — [components degraded]"
- All fallbacks: "Offline Mode — Basic ranking available"

---

## 8. UI Design

### Design Language

- **Aesthetic:** Apple-like minimal. Content-first, invisible chrome.
- **Library:** shadcn/ui components + Tailwind CSS utility classes
- **Typography:** Inter or system font stack, generous whitespace
- **Color:** Neutral base (zinc/slate), single accent color for scores/actions
- **Motion:** Subtle transitions (150-200ms), no gratuitous animation
- **Density:** Comfortable spacing for a tool used all day

### Pages

#### Dashboard (/)

Landing page showing all job profiles as cards.

- Job title, location, candidate count, last activity timestamp
- Score distribution mini-chart (sparkline) per job
- "New Job" button (prominent)
- System health indicators in header

#### Create/Edit Job (/jobs/new, /jobs/:id/edit)

Form for job profile input.

- Rich textarea for JD (with character count)
- Skill tag input with autocomplete from known taxonomy
- Location field with geocode preview ("Bangalore, India — 12.97°N, 77.59°E")
- Experience range slider (min/max)
- Seniority dropdown

#### Upload (/jobs/:id/upload)

Resume batch upload interface.

- Drag-and-drop zone (accepts ZIP, PDF, DOCX)
- If ZIP: extract and list individual files
- File list with per-file status: queued → parsing → extracting → complete/failed
- Overall progress: "Processing 347/1,000 — Tier 1 results ready for 50 candidates"
- Notification: "First results ready! View ranking →"
- Processing continues in background if user navigates away

#### Ranking (/jobs/:id/ranking)

Main analysis view.

- Table columns: Rank, Name, Final Score, Location (+ distance), Experience, Key Skills, Explanation, Status
- Score displayed as filled bar (0-100) with color coding (green >70, yellow 40-70, red <40)
- Tier 2 status per row: spinner while processing, checkmark when deep analysis complete
- Filter sidebar: min score slider, location radius, must-have skills checkboxes, experience range
- Sort: by final_score (default), by distance, by experience, by skill match
- Bulk actions: select candidates → export CSV, export detailed report
- Row click → opens Candidate Detail

#### Candidate Detail (/jobs/:id/candidates/:candidateId)

Deep view of a single candidate's profile and fit analysis.

- Header: name, contact info, location with map pin
- Skills: badge grid (green = matched to JD, gray = unmatched, orange = nice-to-have)
- Experience timeline: visual representation of career history
- Fit analysis panel:
  - Tier 1: score breakdown (skill %, location, experience, semantic)
  - Tier 2 (if available): LLM explanation, relocation likelihood badge, career trajectory notes
- Raw resume text (collapsible)
- "Ask about this candidate" → opens chat with context pre-loaded

#### Chat (/jobs/:id/chat)

Side panel or full page for natural language queries.

- Input box at bottom (like messaging apps)
- Suggested queries: "Top 5 with React in Bangalore", "Who has BFSI experience?", "Compare top 3"
- Streaming responses with typing indicator
- Results can include inline candidate cards (clickable)
- Context indicator: "Chatting about: [Job Title] — [N] candidates"
- Fallback mode indicator if LLM unavailable

#### Settings (/settings)

App configuration and health.

- **AI Models:** Download status, size, version. "Download Phi-3 Mini (2.2GB)" / "Downloaded, ready"
- **Operating Mode:** Auto (use best available) or Force Fallback (for testing/low-resource machines)
- **GitHub Sync:**
  - Connect GitHub account (OAuth device flow)
  - Set encryption password
  - Sync status: last synced, device lock status
  - Manual push/pull buttons
  - "Disconnect" to release lock and clear token
- **Manual Backup:** Export all data as encrypted JSON / Import from file
- **System Health:** Detailed status of each component with fallback indicators

---

## 9. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Vite + React 18 + TypeScript | SPA build and runtime |
| UI Components | shadcn/ui + Radix primitives | Accessible, customizable components |
| Styling | Tailwind CSS | Utility-first styling |
| State Management | Zustand | Simple reactive state for UI |
| Data Layer | Dexie.js (IndexedDB wrapper) | Typed, reactive, handles large datasets |
| LLM Inference | WebLLM (MLC) — Phi-3 Mini Q4 | Resume extraction + chat + Tier 2 |
| Embeddings | Transformers.js + GTE-small | ONNX Runtime Web, 384-dim vectors |
| PDF Parsing | pdf.js (pdfjs-dist) | Client-side PDF text extraction |
| DOCX Parsing | mammoth.js | Client-side DOCX to text |
| Geocoding (primary) | Nominatim API | Free, no key, no card |
| Geocoding (fallback) | Bundled city dataset (~600KB) | Offline fuzzy location matching |
| Encryption | Web Crypto API (AES-256-GCM + PBKDF2) | E2E encrypted sync |
| Sync Storage | GitHub Gist API | Free cloud persistence |
| Auth (sync only) | GitHub OAuth Device Flow | No backend needed, gist scope |
| PWA | vite-plugin-pwa + Workbox | Offline support, installable |
| Hosting | GitHub Pages | Free, no card, forever |
| CI/CD | GitHub Actions | Auto-deploy on push to main |
| Routing | React Router v6 | Client-side SPA routing |
| Icons | Lucide React | Clean, consistent icon set |

---

## 10. Processing Timeline (User Experience)

For a batch of 1,000 resumes:

| Time | What Happens | What User Sees |
|------|-------------|----------------|
| 0:00 | Upload begins | Progress bar: "Extracting files..." |
| 0:05 | Text extraction starts (Parse Worker) | "Parsing resumes: 12/1000" |
| 0:30 | First resumes enter LLM extraction | "Extracting data: 5/1000" |
| 2:00 | ~50 candidates fully processed | "Initial results ready! View ranking →" notification |
| 2:00-5:00 | Tier 1 scoring on first 50 | Ranked table appears with scores |
| 5:00 | Tier 2 begins on top 30 from first batch | Spinner indicators on top rows |
| 5:00-90:00 | Background: remaining 950 resumes process | Progress updates in header |
| 10:00 | Tier 2 complete for first batch top 30 | Deep explanations appear, rows update |
| ~90:00-150:00 | All 1,000 parsed and scored | "Processing complete" notification |
| Ongoing | Tier 2 runs on overall top 50 | Final deep insights populate |

Total time estimate: 1.5-2.5 hours for full 1,000 resume batch. User has actionable results within 2-5 minutes.

---

## 11. Deployment and Infrastructure

### Hosting: GitHub Pages

- Static SPA deployed from `dist/` directory
- GitHub Actions workflow: on push to `main` → build → deploy to `gh-pages` branch
- Custom domain support (optional, free with GitHub Pages)
- HTTPS included

### Model Distribution

- Phi-3 Mini Q4 (~2.2GB): downloaded on first use from HuggingFace CDN (free), cached in browser Cache Storage
- GTE-small (~33MB): bundled with app or lazy-loaded from HuggingFace CDN
- Static city dataset (~600KB): bundled in app

### Cost: $0

| Service | Free Tier Used | Limit | Impact |
|---------|---------------|-------|--------|
| GitHub Pages | Static hosting | 1GB site, 100GB bandwidth/month | More than sufficient |
| GitHub Actions | CI/CD | 2,000 min/month | Minimal usage |
| GitHub Gist | Sync storage | Unlimited private gists | Encrypted candidate data |
| GitHub OAuth | Device flow auth | No limits | Free |
| HuggingFace CDN | Model download | No limits for public models | One-time download per user |
| Nominatim | Geocoding | 1 req/sec, no key | Background processing is fine |

No credit card required for any of these services.

---

## 12. Security Considerations

- **Data at rest (local):** IndexedDB is per-origin, not encrypted by default. Acceptable for single-user local tool. If device is compromised, all local data is accessible (same as any desktop app).
- **Data in transit (sync):** E2E encrypted with user password before leaving the browser. GitHub sees only ciphertext. Even a leaked Gist reveals nothing without the password.
- **GitHub token:** Stored in localStorage, scoped to `gist` only. Cannot access repos, issues, or other data. Can be revoked from GitHub settings at any time.
- **No PII leaves the browser unencrypted:** Candidate data (names, emails, phones) only exists in IndexedDB and in the encrypted Gist payload.
- **Model downloads:** From HuggingFace public CDN over HTTPS. No auth tokens needed, no data sent upstream.
- **Nominatim queries:** Send location strings (city names) for geocoding. No candidate PII (names, emails) is sent.

---

## 13. Known Limitations and Mitigations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| WebGPU browser support | Safari partial, Firefox behind flag | WASM CPU fallback. Target Chrome/Edge users primarily. |
| 2.2GB model download on first use | 2-5 min wait on first launch | Clear progress UI, only download when user explicitly enables AI features |
| IndexedDB storage limits | Browser may evict under pressure | Prompt user to sync to Gist regularly; PWA "persistent storage" API request |
| Nominatim rate limit (1 req/sec) | 1,000 candidates = 17 min geocoding | Runs in background, falls back to static DB if too slow |
| Scanned/image PDFs | pdf.js returns empty text | Detect empty extraction, flag file, suggest re-upload as text-based PDF |
| Password forgotten for sync | Data in Gist is unrecoverable | Clear warning at password setup. Suggest user store password in a password manager. |
| Multi-column/creative resume layouts | Lower extraction accuracy | LLM extraction handles most edge cases; regex fallback for worst cases |
| 8GB RAM machines | May OOM with model + large dataset | Detect available memory; offer "lite mode" (smaller model or no model) |

---

## 14. Future Considerations (Out of Scope for MVP)

These are explicitly NOT built in v1 but the architecture does not preclude them:

- Multi-user / team shared access (would need a real backend)
- ATS integrations (Greenhouse, Lever API)
- Automated email outreach
- Larger/better models (7B+) as WebGPU improves
- Resume source tracking (which job board, referral, etc.)
- Interview scheduling suggestions
- Candidate relationship management (notes, tags, stages)

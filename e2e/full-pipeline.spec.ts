import { test, expect, type Page } from '@playwright/test'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const RESUME_DIR = path.join(__dirname, 'test-resumes')

interface CandidateProfile {
  name: string
  email: string
  phone: string
  location: string
  title: string
  yearsExp: number
  skills: string[]
  education: string
  industry: string
  summary: string
}

const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rahul', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rohan', 'Meera',
  'James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley', 'William', 'Amanda',
  'Chen', 'Yuki', 'Ahmed', 'Maria', 'Hans', 'Fatima', 'Igor', 'Aisha', 'Koji', 'Olga',
  'Raj', 'Divya', 'Sanjay', 'Pooja', 'Arun', 'Neha', 'Kiran', 'Swati', 'Manoj', 'Ritu',
  'Alex', 'Taylor', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Blake', 'Cameron',
  'Suresh', 'Lakshmi', 'Venkat', 'Deepa', 'Ganesh', 'Padma', 'Mohan', 'Radha', 'Vijay', 'Sarala',
  'Oliver', 'Sophia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Isabella', 'Lucas', 'Mia',
  'Carlos', 'Ana', 'Pedro', 'Lucia', 'Diego', 'Valentina', 'Miguel', 'Camila', 'Andres', 'Sofia',
  'Ravi', 'Nisha', 'Amit', 'Reena', 'Siddharth', 'Anjali', 'Varun', 'Shruti', 'Nikhil', 'Aparna',
  'John', 'Lisa', 'Thomas', 'Jennifer', 'Daniel', 'Michelle', 'Steven', 'Laura', 'Kevin', 'Rachel'
]

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Nair', 'Iyer', 'Desai', 'Mehta',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
  'Wang', 'Tanaka', 'Hassan', 'Garcia', 'Mueller', 'Ali', 'Petrov', 'Khan', 'Sato', 'Popova',
  'Mishra', 'Verma', 'Joshi', 'Bhat', 'Rao', 'Pillai', 'Menon', 'Kulkarni', 'Banerjee', 'Das',
  'Lee', 'Kim', 'Park', 'Chen', 'Liu', 'Huang', 'Zhang', 'Wu', 'Yang', 'Li',
  'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Robinson', 'Clark', 'Lewis',
  'Fernandez', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Hernandez', 'Perez', 'Sanchez', 'Ramirez', 'Torres',
  'Agarwal', 'Chatterjee', 'Mukherjee', 'Sen', 'Roy', 'Dey', 'Bose', 'Ghosh', 'Saha', 'Chakraborty',
  'O\'Brien', 'Murphy', 'Walsh', 'Byrne', 'Ryan', 'O\'Connor', 'Kennedy', 'Lynch', 'Murray', 'Sullivan',
  'Nakamura', 'Yamamoto', 'Suzuki', 'Watanabe', 'Ito', 'Takahashi', 'Kobayashi', 'Yoshida', 'Saito', 'Kato'
]

const LOCATIONS = [
  'Bangalore, India', 'Mumbai, India', 'Delhi, India', 'Hyderabad, India', 'Pune, India',
  'Chennai, India', 'Kolkata, India', 'Gurgaon, India', 'Noida, India', 'Ahmedabad, India',
  'San Francisco, USA', 'New York, USA', 'Seattle, USA', 'Austin, USA', 'Boston, USA',
  'London, UK', 'Berlin, Germany', 'Singapore', 'Dubai, UAE', 'Toronto, Canada',
  'Sydney, Australia', 'Tokyo, Japan', 'Amsterdam, Netherlands', 'Stockholm, Sweden', 'Remote'
]

const SKILL_POOLS = {
  backend: ['node.js', 'python', 'java', 'golang', 'rust', 'c++', 'c#', 'ruby', 'php', 'scala', 'elixir', 'kotlin'],
  frontend: ['react', 'angular', 'vue', 'next.js', 'typescript', 'javascript', 'html', 'css', 'tailwind', 'svelte'],
  devops: ['aws', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'linux', 'ansible', 'prometheus', 'grafana'],
  data: ['python', 'sql', 'spark', 'hadoop', 'kafka', 'airflow', 'dbt', 'snowflake', 'bigquery', 'tableau'],
  ml: ['tensorflow', 'pytorch', 'scikit-learn', 'nlp', 'computer vision', 'deep learning', 'mlops', 'huggingface'],
  mobile: ['react native', 'flutter', 'swift', 'kotlin', 'ios', 'android', 'firebase', 'expo'],
  database: ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'neo4j'],
  security: ['penetration testing', 'owasp', 'compliance', 'encryption', 'identity management', 'soc2'],
  product: ['product management', 'agile', 'scrum', 'jira', 'roadmapping', 'user research', 'analytics'],
  design: ['figma', 'sketch', 'adobe xd', 'ui/ux', 'user research', 'design systems', 'prototyping'],
}

const TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Principal Engineer',
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer',
  'Data Engineer', 'Data Scientist', 'ML Engineer', 'AI Researcher',
  'Product Manager', 'Engineering Manager', 'Tech Lead', 'Architect',
  'Mobile Developer', 'iOS Developer', 'Android Developer', 'Cloud Engineer',
  'Security Engineer', 'QA Engineer', 'SRE', 'Platform Engineer',
  'UI/UX Designer', 'Design Lead', 'Solutions Architect', 'CTO',
  'Junior Developer', 'Intern', 'Associate Engineer', 'Consultant',
]

const EDUCATION_OPTIONS = [
  'B.Tech Computer Science, IIT Bombay',
  'M.S. Computer Science, Stanford University',
  'B.E. Electronics, BITS Pilani',
  'MBA, IIM Ahmedabad',
  'Ph.D. Machine Learning, MIT',
  'B.Sc. Mathematics, Delhi University',
  'M.Tech AI, IISc Bangalore',
  'B.A. Design, NID Ahmedabad',
  'B.S. Computer Science, UC Berkeley',
  'M.S. Data Science, Georgia Tech',
  'B.Tech IT, NIT Trichy',
  'Self-taught developer',
  'Bootcamp Graduate, Lambda School',
  'B.Sc. Physics, Cambridge University',
  'M.S. Software Engineering, Carnegie Mellon',
  'B.E. Computer Engineering, Pune University',
  'MBA Technology Management, ISB Hyderabad',
  'B.Tech Mechanical (career switch), IIT Delhi',
  'M.A. Economics (career switch), LSE',
  'Diploma in Full Stack Development',
]

const INDUSTRIES = [
  'fintech', 'healthtech', 'edtech', 'ecommerce', 'saas',
  'gaming', 'social media', 'automotive', 'logistics', 'real estate',
  'telecom', 'media', 'insurance', 'travel', 'food delivery',
  'enterprise', 'cybersecurity', 'blockchain', 'iot', 'robotics',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickMultiple<T>(arr: T[], min: number, max: number): T[] {
  const count = min + Math.floor(Math.random() * (max - min + 1))
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function generateProfile(index: number): CandidateProfile {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
  const lastName = LAST_NAMES[(index * 7 + 3) % LAST_NAMES.length]
  const name = `${firstName} ${lastName}`
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace("'", '')}${index}@${pickRandom(['gmail.com', 'outlook.com', 'yahoo.com', 'company.io', 'work.org'])}`
  const phone = `+91 ${9000000000 + Math.floor(Math.random() * 999999999)}`
  const location = LOCATIONS[index % LOCATIONS.length]
  const yearsExp = Math.floor(Math.random() * 20) + 1
  const title = TITLES[index % TITLES.length]

  const primaryPool = Object.keys(SKILL_POOLS)[index % Object.keys(SKILL_POOLS).length] as keyof typeof SKILL_POOLS
  const secondaryPool = Object.keys(SKILL_POOLS)[(index + 3) % Object.keys(SKILL_POOLS).length] as keyof typeof SKILL_POOLS
  const skills = [
    ...pickMultiple(SKILL_POOLS[primaryPool], 3, 6),
    ...pickMultiple(SKILL_POOLS[secondaryPool], 1, 3),
    ...pickMultiple(SKILL_POOLS.database, 1, 2),
  ]
  const uniqueSkills = [...new Set(skills)]

  const education = EDUCATION_OPTIONS[index % EDUCATION_OPTIONS.length]
  const industry = INDUSTRIES[index % INDUSTRIES.length]

  const summary = `${title} with ${yearsExp} years of experience in ${industry}. ` +
    `Proficient in ${uniqueSkills.slice(0, 4).join(', ')}. ` +
    `Based in ${location}. ${education}. ` +
    `Previously worked at ${pickRandom(['Google', 'Amazon', 'Microsoft', 'Flipkart', 'Infosys', 'TCS', 'Wipro', 'Zoho', 'Freshworks', 'Razorpay', 'PhonePe', 'Swiggy', 'Ola', 'CRED', 'Stripe', 'Meta', 'Netflix', 'Uber', 'Airbnb', 'startup'])}.`

  return { name, email, phone, location, title, yearsExp, skills: uniqueSkills, education, industry, summary }
}

function formatResumeText(profile: CandidateProfile): string {
  const sections = [
    profile.name,
    `${profile.email} | ${profile.phone}`,
    `Location: ${profile.location}`,
    '',
    'SUMMARY',
    profile.summary,
    '',
    'EXPERIENCE',
    `${profile.title} | ${profile.yearsExp} years`,
    `Industry: ${profile.industry}`,
    `Worked on various projects involving ${profile.skills.slice(0, 5).join(', ')}.`,
    `Delivered scalable solutions and led cross-functional teams.`,
    '',
    'SKILLS',
    profile.skills.join(', '),
    '',
    'EDUCATION',
    profile.education,
    '',
    `Total Experience: ${profile.yearsExp} years`,
  ]
  return sections.join('\n')
}

async function generatePDF(profile: CandidateProfile): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([612, 792])

  let y = 750
  const lineHeight = 16
  const margin = 50

  const drawText = (text: string, options?: { bold?: boolean; size?: number }) => {
    const size = options?.size || 11
    const f = options?.bold ? boldFont : font
    page.drawText(text.slice(0, 80), { x: margin, y, font: f, size })
    y -= lineHeight
  }

  drawText(profile.name, { bold: true, size: 18 })
  y -= 4
  drawText(`${profile.email} | ${profile.phone}`)
  drawText(`Location: ${profile.location}`)
  y -= 10

  drawText('PROFESSIONAL SUMMARY', { bold: true, size: 13 })
  y -= 2
  const summaryLines = profile.summary.match(/.{1,75}/g) || [profile.summary]
  summaryLines.forEach(line => drawText(line))
  y -= 10

  drawText('EXPERIENCE', { bold: true, size: 13 })
  y -= 2
  drawText(`${profile.title} | ${profile.yearsExp} years of experience`)
  drawText(`Industry: ${profile.industry}`)
  drawText(`Key achievements in ${profile.skills.slice(0, 3).join(', ')}`)
  y -= 10

  drawText('SKILLS', { bold: true, size: 13 })
  y -= 2
  const skillLines = profile.skills.join(', ').match(/.{1,75}/g) || [profile.skills.join(', ')]
  skillLines.forEach(line => drawText(line))
  y -= 10

  drawText('EDUCATION', { bold: true, size: 13 })
  y -= 2
  drawText(profile.education)

  return doc.save()
}

async function skipSetup(page: Page) {
  await page.goto('./')
  await page.evaluate(() => localStorage.setItem('ra-setup-complete', 'true'))
  await page.goto('./')
}

test.describe('Full Pipeline — 100 Resumes, 3 Jobs', () => {
  test.setTimeout(300000)

  test.beforeAll(async () => {
    if (!fs.existsSync(RESUME_DIR)) {
      fs.mkdirSync(RESUME_DIR, { recursive: true })
    }

    console.log('Generating 100 PDF resumes...')
    for (let i = 0; i < 100; i++) {
      const profile = generateProfile(i)
      const pdfBytes = await generatePDF(profile)
      const fileName = `resume_${String(i + 1).padStart(3, '0')}_${profile.name.replace(/[^a-zA-Z]/g, '_')}.pdf`
      fs.writeFileSync(path.join(RESUME_DIR, fileName), pdfBytes)
    }
    console.log('100 PDFs generated.')
  })

  test.afterAll(() => {
    if (fs.existsSync(RESUME_DIR)) {
      fs.rmSync(RESUME_DIR, { recursive: true })
    }
  })

  test('create 3 job profiles and upload 100 resumes', async ({ page }) => {
    await skipSetup(page)

    // Job 1: Senior Backend Engineer — Bangalore, Node/Python/AWS
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Senior Backend Engineer')
    await page.fill('#location', 'Bangalore, India')
    await page.locator('textarea').fill(
      'We are hiring a Senior Backend Engineer to build scalable microservices. ' +
      'Must have strong experience with Node.js, Python, and AWS. ' +
      'Experience with Docker, Kubernetes, and CI/CD pipelines is required. ' +
      'Working knowledge of PostgreSQL and Redis. ' +
      'Fintech domain experience preferred. 5+ years required.'
    )
    const mustHave1 = page.locator('input[placeholder*="react, node"]')
    for (const skill of ['node.js', 'python', 'aws', 'docker', 'postgresql']) {
      await mustHave1.fill(skill)
      await mustHave1.press('Enter')
    }
    const niceToHave1 = page.locator('input[placeholder*="graphql, docker"]')
    for (const skill of ['kubernetes', 'redis', 'kafka']) {
      await niceToHave1.fill(skill)
      await niceToHave1.press('Enter')
    }
    await page.fill('#minYears', '5')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()
    await expect(page.getByRole('heading', { name: 'Senior Backend Engineer' })).toBeVisible()
    const job1Url = page.url()

    // Go back and create Job 2
    await page.goto('./')
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'ML Engineer')
    await page.fill('#location', 'San Francisco, USA')
    await page.locator('textarea').fill(
      'Looking for an ML Engineer to build production machine learning systems. ' +
      'Must have experience with PyTorch or TensorFlow, MLOps, and Python. ' +
      'Experience deploying models at scale using Kubernetes. ' +
      'NLP or Computer Vision specialization preferred. ' +
      'PhD or MS in ML/AI preferred. 3+ years industry experience.'
    )
    const mustHave2 = page.locator('input[placeholder*="react, node"]')
    for (const skill of ['python', 'pytorch', 'tensorflow', 'mlops']) {
      await mustHave2.fill(skill)
      await mustHave2.press('Enter')
    }
    const niceToHave2 = page.locator('input[placeholder*="graphql, docker"]')
    for (const skill of ['nlp', 'computer vision', 'kubernetes', 'huggingface']) {
      await niceToHave2.fill(skill)
      await niceToHave2.press('Enter')
    }
    await page.fill('#minYears', '3')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()
    await expect(page.getByRole('heading', { name: 'ML Engineer' })).toBeVisible()

    // Go back and create Job 3
    await page.goto('./')
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Frontend Developer')
    await page.fill('#location', 'Remote')
    await page.locator('textarea').fill(
      'Seeking a Frontend Developer to build beautiful, responsive web applications. ' +
      'Must be expert in React, TypeScript, and modern CSS (Tailwind). ' +
      'Experience with Next.js and state management (Redux/Zustand). ' +
      'Strong eye for design and UX. ' +
      'Experience with testing (Jest, Playwright). 2+ years.'
    )
    const mustHave3 = page.locator('input[placeholder*="react, node"]')
    for (const skill of ['react', 'typescript', 'tailwind', 'next.js']) {
      await mustHave3.fill(skill)
      await mustHave3.press('Enter')
    }
    const niceToHave3 = page.locator('input[placeholder*="graphql, docker"]')
    for (const skill of ['figma', 'testing', 'graphql']) {
      await niceToHave3.fill(skill)
      await niceToHave3.press('Enter')
    }
    await page.fill('#minYears', '2')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()
    await expect(page.getByRole('heading', { name: 'Frontend Developer' })).toBeVisible()

    // Now upload 100 resumes to Job 1
    await page.goto(job1Url)
    await page.getByText('Upload Resumes').click()
    await expect(page.getByText('Drop resume files here')).toBeVisible()

    // Upload files via the file input
    const files = fs.readdirSync(RESUME_DIR).map(f => path.join(RESUME_DIR, f))
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(files)

    // Wait for processing to begin
    await expect(page.getByText(/Parsed:/)).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: 'e2e/screenshots/10-upload-started.png', fullPage: true })

    // Stay on upload page and wait for Scored count to appear and grow
    // The orchestrator runs scoring after extraction, so we wait for scored > 0
    await page.waitForFunction(() => {
      const text = document.body.innerText
      const scoredMatch = text.match(/Scored:\s*(\d+)/)
      return scoredMatch && parseInt(scoredMatch[1]) > 0
    }, { timeout: 180000 })

    // Wait a bit more for more scoring to complete
    await page.waitForTimeout(10000)
    await page.screenshot({ path: 'e2e/screenshots/10-upload-processing.png', fullPage: true })

    // Now navigate to ranking via URL
    const currentUrl = page.url()
    const rankingUrl = currentUrl.replace('/upload', '/ranking')
    await page.goto(rankingUrl)

    // Ranking page polls every 3 seconds, wait for it to load
    await page.waitForFunction(() => {
      const text = document.body.innerText
      return !text.includes('No candidates found') && !text.includes('Loading results')
    }, { timeout: 30000 })

    await page.waitForTimeout(2000)

    // Count candidate links on ranking page
    const candidateLinks = page.locator('a[href*="/candidates/"]')
    const count = await candidateLinks.count()
    console.log(`Candidates ranked: ${count}`)
    expect(count).toBeGreaterThan(0)

    // Take screenshot of ranking
    await page.screenshot({ path: 'e2e/screenshots/11-ranking-with-candidates.png' })

    // Click first candidate row to see detail
    const firstCandidate = page.locator('a[href*="/candidates/"]').first()
    if (await firstCandidate.isVisible()) {
      await firstCandidate.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'e2e/screenshots/12-candidate-detail.png', fullPage: true })
    }

    // Navigate to chat via URL (avoid ambiguous link)
    const chatUrl = page.url().replace(/\/candidates\/.*/, '/chat')
    await page.goto(chatUrl)
    await page.waitForTimeout(1000)

    await expect(page.getByText('Ask questions about your candidates')).toBeVisible()

    // Ask a question
    await page.locator('input[placeholder*="Ask about"]').fill('Who are the top 5 candidates?')
    await page.locator('input[placeholder*="Ask about"]').press('Enter')

    // Wait for response
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'e2e/screenshots/13-chat-response.png', fullPage: true })

    // Verify chat responded
    const messages = page.locator('[class*="max-w-"]')
    const msgCount = await messages.count()
    expect(msgCount).toBeGreaterThanOrEqual(2) // user + assistant

    console.log('Full pipeline test complete!')
  })
})

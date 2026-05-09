import { test, expect, type Page } from '@playwright/test'

async function skipSetup(page: Page) {
  await page.goto('./')
  await page.evaluate(() => localStorage.setItem('ra-setup-complete', 'true'))
  await page.goto('./')
}

test.describe('Visual verification', () => {
  test('setup modal on first visit', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByText('Welcome to Recruiter')).toBeVisible()
    await expect(page.getByText('Download All Models')).toBeVisible()
    await expect(page.getByText('LLM Model')).toBeVisible()
    await expect(page.getByText('Embedding Model')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/00-setup-modal.png', fullPage: true })
  })

  test('dashboard page', async ({ page }) => {
    await skipSetup(page)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/01-dashboard.png', fullPage: true })
  })

  test('create job page', async ({ page }) => {
    await skipSetup(page)
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await expect(page.getByRole('heading', { name: 'Create Job Profile' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/02-create-job.png', fullPage: true })
  })

  test('job detail page', async ({ page }) => {
    await skipSetup(page)
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Senior Backend Engineer')
    await page.fill('#location', 'Bangalore, India')
    await page.locator('textarea').fill('We need a senior backend engineer with strong Node.js, Python, and AWS experience. Must have 5+ years building scalable distributed systems.')
    const mustHaveInput = page.locator('input[placeholder*="react, node"]')
    await mustHaveInput.fill('node.js')
    await mustHaveInput.press('Enter')
    await mustHaveInput.fill('python')
    await mustHaveInput.press('Enter')
    await mustHaveInput.fill('aws')
    await mustHaveInput.press('Enter')
    await page.fill('#minYears', '5')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()
    await expect(page.getByRole('heading', { name: 'Senior Backend Engineer' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/03-job-detail.png', fullPage: true })
  })

  test('upload page', async ({ page }) => {
    await skipSetup(page)
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Upload Test Role')
    await page.fill('#location', 'Mumbai')
    await page.locator('textarea').fill('Test description for upload page.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()
    await page.getByText('Upload Resumes').click()
    await expect(page.getByText('Drop resume files here')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/04-upload.png', fullPage: true })
  })

  test('ranking page empty state', async ({ page }) => {
    await skipSetup(page)
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Ranking Test')
    await page.fill('#location', 'Delhi')
    await page.locator('textarea').fill('Test description.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()
    await page.getByText('View Ranking').click()
    await expect(page.getByText('No candidates found')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/05-ranking-empty.png', fullPage: true })
  })

  test('chat page', async ({ page }) => {
    await skipSetup(page)
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Chat Test')
    await page.fill('#location', 'Chennai')
    await page.locator('textarea').fill('Looking for React developers.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()
    await page.getByText('Ask questions about candidates').click()
    await expect(page.getByText('Ask questions about your candidates')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/06-chat.png', fullPage: true })
  })

  test('settings page', async ({ page }) => {
    await skipSetup(page)
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/07-settings.png', fullPage: true })
  })
})

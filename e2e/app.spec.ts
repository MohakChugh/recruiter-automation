import { test, expect } from '@playwright/test'

test.describe('Recruiter Automation E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.setItem('ra-setup-complete', 'true'))
    await page.goto('./')
  })

  test('homepage loads with dashboard', async ({ page }) => {
    await expect(page).toHaveTitle('Recruiter Automation')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New Job Profile' })).toBeVisible()
  })

  test('shows empty state when no jobs exist', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByText('No job profiles yet')).toBeVisible()
    await expect(page.getByText('Create your first job profile')).toBeVisible()
  })

  test('navigates to create job page', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await expect(page.getByRole('heading', { name: 'Create Job Profile' })).toBeVisible()
    await expect(page.locator('#title')).toBeVisible()
    await expect(page.locator('#location')).toBeVisible()
  })

  test('creates a job profile', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('link', { name: 'New Job Profile' }).click()

    await page.fill('#title', 'Senior Backend Engineer')
    await page.fill('#location', 'Bangalore, India')
    await page.locator('textarea').fill('We are looking for a senior backend engineer with experience in Node.js, Python, and AWS.')

    const mustHaveInput = page.locator('input[placeholder*="react, node"]')
    await mustHaveInput.fill('node.js')
    await mustHaveInput.press('Enter')
    await mustHaveInput.fill('python')
    await mustHaveInput.press('Enter')
    await mustHaveInput.fill('aws')
    await mustHaveInput.press('Enter')

    await expect(page.getByText('node.js').first()).toBeVisible()
    await expect(page.getByText('python').first()).toBeVisible()
    await expect(page.getByText('aws').first()).toBeVisible()

    await page.fill('#minYears', '5')

    await page.getByRole('button', { name: 'Create Job Profile' }).click()

    await expect(page.getByRole('heading', { name: 'Senior Backend Engineer' })).toBeVisible()
    await expect(page.getByText('Upload Resumes')).toBeVisible()
    await expect(page.getByText('View Ranking')).toBeVisible()
    await expect(page.getByText('Chat')).toBeVisible({ timeout: 10000 })
  })

  test('job detail shows correct information', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Frontend Developer')
    await page.fill('#location', 'Remote')
    await page.locator('textarea').fill('React and TypeScript developer needed.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()

    await expect(page.getByRole('heading', { name: 'Frontend Developer' })).toBeVisible()
    await expect(page.getByText('Remote')).toBeVisible()
  })

  test('upload page shows drag and drop zone', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Test Role')
    await page.fill('#location', 'Mumbai')
    await page.locator('textarea').fill('Test job description.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()

    await page.getByText('Upload Resumes').click()
    await expect(page.getByText('Drop resume files here')).toBeVisible()
    await expect(page.getByText('Supports PDF and DOCX')).toBeVisible()
  })

  test('ranking page shows empty state', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Ranking Test')
    await page.fill('#location', 'Delhi')
    await page.locator('textarea').fill('Test description.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()

    await page.getByText('View Ranking').click()
    await expect(page.getByText('No candidates found')).toBeVisible()
  })

  test('chat page loads with suggestions', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Chat Test')
    await page.fill('#location', 'Chennai')
    await page.locator('textarea').fill('Test description.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()

    await page.getByText('Ask questions about candidates').click()
    await expect(page.getByText('Ask questions about your candidates')).toBeVisible()
    await expect(page.getByText('Who are the top 5 candidates?')).toBeVisible()
  })

  test('settings page shows system health', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByText('WebGPU', { exact: true })).toBeVisible()
    await expect(page.getByText('Database', { exact: true })).toBeVisible()
    await expect(page.getByText('Geocoding', { exact: true })).toBeVisible()
  })

  test('navigation works between pages', async ({ page }) => {
    await page.goto('./')

    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('can delete a job profile', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Delete Me')
    await page.fill('#location', 'Pune')
    await page.locator('textarea').fill('This will be deleted.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()

    page.on('dialog', dialog => dialog.accept())

    await page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click()

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})

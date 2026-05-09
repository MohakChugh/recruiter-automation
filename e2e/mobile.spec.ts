import { test, expect, type Page } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 } })

async function skipSetup(page: Page) {
  await page.goto('./')
  await page.evaluate(() => localStorage.setItem('ra-setup-complete', 'true'))
  await page.goto('./')
}

test.describe('Mobile responsive verification', () => {
  test('setup modal on mobile', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByText('Welcome to Recruiter')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/mobile-00-setup.png' })
  })

  test('dashboard on mobile', async ({ page }) => {
    await skipSetup(page)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/mobile-01-dashboard.png' })
  })

  test('create job on mobile', async ({ page }) => {
    await skipSetup(page)
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await expect(page.getByRole('heading', { name: 'Create Job Profile' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/mobile-02-create-job.png' })
  })

  test('job detail on mobile', async ({ page }) => {
    await skipSetup(page)
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Backend Engineer')
    await page.fill('#location', 'Bangalore')
    await page.locator('textarea').fill('Node.js and Python developer needed.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()
    await expect(page.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/mobile-03-job-detail.png' })
  })

  test('upload on mobile', async ({ page }) => {
    await skipSetup(page)
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Mobile Upload Test')
    await page.fill('#location', 'Remote')
    await page.locator('textarea').fill('Test.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()
    await page.getByText('Upload Resumes').click()
    await page.screenshot({ path: 'e2e/screenshots/mobile-04-upload.png' })
  })

  test('chat on mobile', async ({ page }) => {
    await skipSetup(page)
    await page.getByRole('link', { name: 'New Job Profile' }).click()
    await page.fill('#title', 'Chat Mobile')
    await page.fill('#location', 'Delhi')
    await page.locator('textarea').fill('Test.')
    await page.getByRole('button', { name: 'Create Job Profile' }).click()
    await page.getByText('Ask questions about candidates').click()
    await page.screenshot({ path: 'e2e/screenshots/mobile-05-chat.png' })
  })

  test('settings on mobile', async ({ page }) => {
    await skipSetup(page)
    await page.goto('./settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/mobile-06-settings.png' })
  })
})

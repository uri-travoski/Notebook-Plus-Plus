import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT || 3939)
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Use the built production server (no Nuxt dev-lock, fast, matches Docker).
    // Run `npm run build` before `npm run test:e2e`.
    command: 'node --env-file=.env .output/server/index.mjs',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: String(PORT), NITRO_PORT: String(PORT) },
  },
})

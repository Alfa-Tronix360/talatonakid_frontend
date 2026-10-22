import { defineConfig } from '@playwright/test'

// Usa o Microsoft Edge já instalado no Windows (sem descarregar browsers).
// Para Chrome: PW_CHANNEL=chrome npm run e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: process.env.PW_CHANNEL || 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})

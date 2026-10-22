import { expect, test } from '@playwright/test'

// Fumo contra o backend REAL, sem qualquer autenticação: só verifica a ligação
// (proxy do Vite → Render) e que a app protege as rotas.
test.describe('Backend real (sem login)', () => {
  test.setTimeout(90_000) // o Render pode demorar a acordar

  test('proxy /api chega ao backend e /health responde', async ({ request }) => {
    const r = await request.get('/api/health', { timeout: 80_000 })
    expect(r.status()).toBe(200)
    expect(await r.json()).toEqual({ estado: 'ok' })
  })

  test('rotas protegidas rejeitam pedidos sem token', async ({ request }) => {
    for (const p of ['/api/auth/me', '/api/alunos', '/api/painel', '/api/cobrancas']) {
      const r = await request.get(p, { timeout: 80_000 })
      expect(r.status(), p).toBe(401)
    }
  })

  test('página de login real carrega e rota protegida redirecciona', async ({ page }) => {
    await page.goto('/painel')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })
})

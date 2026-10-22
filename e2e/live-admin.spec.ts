import { expect, test } from '@playwright/test'

// Fumo contra o backend REAL com as credenciais reais de admin, para validar
// que cada página carrega dados verdadeiros sem erros de consola ou de rede.
// Não corre em CI: só manual, com `npm run e2e -- live-admin`.
const EMAIL = 'admin@clacs.ao'
const SENHA = 'senha12345'

const ROTAS = [
  '/painel', '/alertas', '/assistente',
  '/alunos', '/encarregados', '/matriculas', '/turmas', '/academico',
  '/cobrancas', '/pagamentos', '/refeitorio', '/catalogo',
  '/avaliacoes', '/pautas', '/assiduidade', '/ocorrencias', '/registo-diario',
  '/regras', '/mensagens',
  '/primavera', '/importacao', '/relatorios', '/utilizadores',
  '/definicoes', '/auditoria', '/conta',
]

test('sessão real admin@clacs.ao percorre todas as rotas sem erros', async ({ page }) => {
  test.setTimeout(10 * 60_000)
  const problemas: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') problemas.push(`[console] ${page.url()}: ${m.text()}`) })
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 500) problemas.push(`[5xx] ${r.status()} ${r.url()}`)
  })

  await page.goto('/login')
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Palavra-passe').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/painel$/, { timeout: 60_000 })

  for (const rota of ROTAS) {
    await page.goto(rota)
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const erroPagina = await page.getByText('Não foi possível mostrar esta página.').count()
    if (erroPagina > 0) problemas.push(`[página] ${rota}: ecrã de erro visível`)
    console.log(`verificado ${rota}`)
  }

  expect(problemas, problemas.join('\n')).toEqual([])
})

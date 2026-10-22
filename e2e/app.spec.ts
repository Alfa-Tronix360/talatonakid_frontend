import { expect, test } from '@playwright/test'
import { USERS, irPara, login, mockApi } from './mock-api'

// Todas as rotas de gestão (iguais ao menu lateral).
const ROTAS: [string, string][] = [
  ['/painel', 'Painel da Direcção'], ['/alertas', 'Alertas'], ['/assistente', 'Assistente'],
  ['/alunos', 'Alunos'], ['/encarregados', 'Encarregados de educação'], ['/matriculas', 'Matrículas'], ['/turmas', 'Turmas'], ['/academico', 'Estrutura académica'],
  ['/cobrancas', 'Propinas e cobranças'], ['/pagamentos', 'Pagamentos'], ['/refeitorio', 'Refeitório e serviços'], ['/catalogo', 'Serviços e preços'],
  ['/avaliacoes', 'Avaliações e notas'], ['/pautas', 'Pautas'], ['/assiduidade', 'Assiduidade'], ['/ocorrencias', 'Ocorrências'], ['/registo-diario', 'Registo diário'],
  ['/regras', 'Comunicação e regras'], ['/mensagens', 'Mensagens e comunicados'],
  ['/primavera', 'Integração Primavera'], ['/importacao', 'Importação de dados'], ['/relatorios', 'Relatórios'], ['/utilizadores', 'Utilizadores'],
  ['/definicoes', 'Definições da escola'], ['/auditoria', 'Auditoria'], ['/conta', 'A minha conta'],
]

test.describe('Autenticação', () => {
  test('rotas protegidas redireccionam para o login', async ({ page }) => {
    await mockApi(page)
    await page.goto('/painel')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Iniciar sessão' })).toBeVisible()
  })

  test('credenciais inválidas mostram erro e não entram', async ({ page }) => {
    await mockApi(page)
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('ninguem@teste.local')
    await page.getByLabel('Palavra-passe').fill('errada-123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toContainText('Credenciais inválidas')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('mostra a mensagem real do servidor em vez de texto genérico', async ({ page }) => {
    await mockApi(page)
    await page.route('**/api/auth/login', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"Conta bloqueada por tentativas"}' }))
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(USERS.admin.email)
    await page.getByLabel('Palavra-passe').fill(USERS.admin.senha)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toContainText('Conta bloqueada por tentativas')
  })

  test('login 200 sem token explica o problema', async ({ page }) => {
    await mockApi(page)
    await page.route('**/api/auth/login', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"utilizador":{"id":1}}' }))
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(USERS.admin.email)
    await page.getByLabel('Palavra-passe').fill(USERS.admin.senha)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toContainText('sem token (campos: utilizador)')
  })

  test('login 200 mas /auth/me falha: mostra o motivo e não fica preso', async ({ page }) => {
    await mockApi(page)
    await page.route('**/api/auth/me', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"erro interno simulado"}' }))
    await login(page)
    await expect(page.getByRole('alert')).toContainText('não foi possível carregar o perfil (500)')
    await expect(page).toHaveURL(/\/login$/)
    expect(await page.evaluate(() => localStorage.getItem('clacs.token'))).toBeNull()
  })

  test('aceita token noutro campo da resposta', async ({ page }) => {
    await mockApi(page)
    await page.route('**/api/auth/login', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: `{"token":"tok-${USERS.admin.email}"}` }))
    await page.route('**/api/auth/me', async (r) => {
      // o mock principal só conhece tokens emitidos por ele; aqui respondemos directamente
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, nome: 'Admin de Teste', perfis: ['direccao'] }) })
    })
    await login(page)
    await expect(page).toHaveURL(/\/painel$/)
  })

  test('401 num endpoint secundário NÃO termina a sessão', async ({ page }) => {
    await mockApi(page)
    await page.route('**/api/relatorios/cobranca-turma**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"Sem permissão"}' }))
    await page.route('**/api/indicadores', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"Sem permissão"}' }))
    await login(page)
    await expect(page.getByRole('heading', { name: 'Painel da Direcção' })).toBeVisible()
    await expect(page.getByText('1 530 000 Kz')).toBeVisible()
    await expect(page).toHaveURL(/\/painel$/)
    expect(await page.evaluate(() => localStorage.getItem('clacs.token'))).not.toBeNull()
  })

  test('token inválido (401 também no /auth/me) termina a sessão com aviso', async ({ page }) => {
    await mockApi(page)
    await login(page)
    await expect(page.getByRole('heading', { name: 'Painel da Direcção' })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await page.route('**/api/**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"Token expirado"}' }))
    // o clique dispara pedidos que dão 401 e a sessão fecha logo: não esperar pela estabilidade do link
    const linkAlunos = await irPara(page, '/alunos')
    await linkAlunos.dispatchEvent('click')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('alert')).toContainText('sessão expirou')
  })

  test('painel abre mesmo com pedidos secundários a falhar por rede/CORS/500', async ({ page }) => {
    await mockApi(page)
    await page.route('**/api/relatorios/cobranca-turma**', (r) => r.abort('failed'))
    await page.route('**/api/indicadores', (r) => r.fulfill({ status: 500, body: 'Internal Server Error' }))
    await page.route('**/api/alertas**', (r) => r.abort('failed'))
    await login(page)
    await expect(page).toHaveURL(/\/painel$/)
    await expect(page.getByRole('heading', { name: 'Painel da Direcção' })).toBeVisible()
    await expect(page.getByText('1 530 000 Kz')).toBeVisible()
    await expect(page.locator('a.nl.active')).toHaveText('Painel')
  })

  test('painel abre quando o /painel também falha (mostra aviso, não ecrã vazio)', async ({ page }) => {
    await mockApi(page)
    await page.route('**/api/painel', (r) => r.abort('failed'))
    await login(page)
    await expect(page.getByRole('heading', { name: 'Painel da Direcção' })).toBeVisible()
    // cada secção que depende de /painel (KPIs, gráfico, tabela) falha de forma independente e honesta
    await expect(page.getByText(/Não foi possível carregar os dados/).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Tentar de novo' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Terminar sessão' })).toBeVisible()
  })

  test('o corpo do login vai como texto (compatível com extensões que interceptam o fetch)', async ({ page }) => {
    await mockApi(page)
    await page.addInitScript(() => {
      const orig = window.fetch.bind(window)
      ;(window as any).__corpos = []
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        // simula uma extensão que tenta clonar os argumentos por postMessage
        window.postMessage({ url: String(input), body: init?.body }, '*')
        ;(window as any).__corpos.push(typeof init?.body)
        return orig(input, init)
      }
    })
    await login(page)
    await expect(page).toHaveURL(/\/painel$/)
    const tipos: string[] = await page.evaluate(() => (window as any).__corpos)
    expect(tipos).toContain('string')
    expect(tipos).not.toContain('object')
  })

  test('login válido abre o painel e guarda o token', async ({ page }) => {
    const { calls } = await mockApi(page)
    await login(page)
    await expect(page).toHaveURL(/\/painel$/)
    await expect(page.getByRole('heading', { name: 'Painel da Direcção' })).toBeVisible()
    await expect(page.getByText('1 530 000 Kz')).toBeVisible()
    await expect(page.getByText('Administrador').first()).toBeVisible()
    const l = calls.find((c) => c.path === '/auth/login')!
    expect(l.body).toMatchObject({ username: USERS.admin.email })
    expect(await page.evaluate(() => localStorage.getItem('clacs.token'))).toBe(`tok-${USERS.admin.email}`)
  })

  test('e-mail é normalizado (espaços e maiúsculas) antes de ir ao servidor', async ({ page }) => {
    const { calls } = await mockApi(page)
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('  Admin@Teste.LOCAL ')
    await page.getByLabel('Palavra-passe').fill(USERS.admin.senha)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/painel$/)
    expect(calls.find((c) => c.path === '/auth/login')!.body.username).toBe('admin@teste.local')
  })

  test('verificação em dois passos pede o código', async ({ page }) => {
    const { calls } = await mockApi(page)
    await login(page, 'dois')
    await expect(page).toHaveURL(/\/painel$/)
    const tentativas = calls.filter((c) => c.path === '/auth/login')
    expect(tentativas).toHaveLength(2)
    expect(tentativas[1].body.codigo).toBe('123456')
  })

  test('terminar sessão limpa o token e volta ao login', async ({ page }) => {
    await mockApi(page)
    await login(page)
    await page.getByRole('button', { name: 'Terminar sessão' }).click()
    await expect(page).toHaveURL(/\/login$/)
    expect(await page.evaluate(() => localStorage.getItem('clacs.token'))).toBeNull()
  })

  test('sessão sobrevive a recarregar a página', async ({ page }) => {
    await mockApi(page)
    await login(page)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Painel da Direcção' })).toBeVisible()
  })
})

test.describe('Navegação por todos os módulos', () => {
  test('cada ecrã carrega sem erros de consola nem falhas', async ({ page }) => {
    test.setTimeout(90_000)
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(`pageerror ${e.message}`))
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push(m.text()) })
    await mockApi(page)
    await login(page)
    await expect(page.getByRole('heading', { name: 'Painel da Direcção' })).toBeVisible()
    for (const [rota, titulo] of ROTAS) {
      await (await irPara(page, rota)).click()
      await expect(page).toHaveURL(new RegExp(`${rota}$`))
      await expect(page.getByRole('heading', { level: 2, name: titulo }), `ecrã ${rota}`).toBeVisible()
      await expect(page.getByText('Algo correu mal')).toHaveCount(0)
    }
    expect(erros).toEqual([])
  })

  test('menu lateral marca a página activa', async ({ page }) => {
    await mockApi(page)
    await login(page)
    await (await irPara(page, '/turmas')).click()
    await expect(page.locator('a.nl.active')).toHaveText('Turmas')
  })
})

test.describe('Fluxos de negócio', () => {
  test('criar aluno envia o corpo certo e abre a ficha', async ({ page }) => {
    const { calls } = await mockApi(page)
    await login(page)
    await (await irPara(page, '/alunos')).click()
    await expect(page.getByRole('row', { name: /Ana Cota/ })).toBeVisible()
    await page.getByRole('button', { name: 'Novo aluno' }).click()
    const dlg = page.getByRole('dialog', { name: 'Novo aluno' })
    await dlg.getByLabel(/Nome completo/).fill('Zeferino Teste')
    await dlg.getByLabel('Data de nascimento').fill('2015-05-20')
    await dlg.getByLabel('Sexo').selectOption('M')
    await dlg.getByRole('button', { name: 'Guardar aluno' }).click()
    const post = calls.find((c) => c.method === 'POST' && c.path === '/alunos')!
    expect(post.body).toMatchObject({ nome_completo: 'Zeferino Teste', data_nascimento: '2015-05-20', sexo: 'M', parentesco: 'mae', nacionalidade: 'Angolana' })
    await expect(page).toHaveURL(/\/alunos\/99$/)
  })

  test('nome do aluno é obrigatório (validação do formulário)', async ({ page }) => {
    const { calls } = await mockApi(page)
    await login(page)
    await (await irPara(page, '/alunos')).click()
    await page.getByRole('button', { name: 'Novo aluno' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar aluno' }).click()
    expect(calls.some((c) => c.method === 'POST' && c.path === '/alunos')).toBe(false)
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('visão 360° mostra financeiro e pedagógico', async ({ page }) => {
    await mockApi(page)
    await login(page)
    await (await irPara(page, '/alunos')).click()
    await page.getByRole('row', { name: /Ana Cota/ }).click()
    await expect(page).toHaveURL(/\/alunos\/1$/)
    await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pedagógico' })).toBeVisible()
    await page.getByRole('tab', { name: 'Encarregados' }).click()
    await expect(page.getByRole('cell', { name: 'EE de Ana' })).toBeVisible()
  })

  test('cobranças: filtro "Em dívida" chama a API com estado=divida', async ({ page }) => {
    const { calls } = await mockApi(page)
    await login(page)
    await (await irPara(page, '/cobrancas')).click()
    await expect(page.getByText('8 registos')).toBeVisible()
    await page.getByLabel('Estado').selectOption('divida')
    await expect(page.getByText('2 registos')).toBeVisible()
    expect(calls.some((c) => c.path === '/cobrancas' && c.query.get('estado') === 'divida')).toBe(true)
    await expect(page.getByText('90 000 Kz').first()).toBeVisible()
  })

  test('cobranças: atalho do painel abre a lista já filtrada', async ({ page }) => {
    await mockApi(page)
    await login(page)
    await page.locator('.kpi.clk', { hasText: 'Em atraso' }).click()
    await expect(page).toHaveURL(/\/cobrancas\?estado=divida/)
    await expect(page.getByLabel('Estado')).toHaveValue('divida')
  })

  test('cobranças: exportar descarrega o ficheiro', async ({ page }) => {
    await mockApi(page)
    await login(page)
    await (await irPara(page, '/cobrancas')).click()
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV' }).click()])
    expect(dl.suggestedFilename()).toBe('mapa.csv')
  })

  test('pagamentos: registar liquida as cobranças seleccionadas', async ({ page }) => {
    const { calls } = await mockApi(page)
    await login(page)
    await (await irPara(page, '/pagamentos')).click()
    await page.getByRole('button', { name: 'Registar pagamento' }).first().click()
    const dlg = page.getByRole('dialog', { name: 'Registar pagamento' })
    await dlg.getByLabel(/Encarregado/).selectOption({ label: 'EE de Carla' })
    await dlg.getByRole('row', { name: /Propina/ }).getByRole('checkbox').check()
    await dlg.getByLabel(/Método/).selectOption({ label: 'Numerário' })
    await dlg.getByRole('button', { name: 'Registar pagamento' }).click()
    const p = calls.find((c) => c.method === 'POST' && c.path === '/pagamentos')!
    expect(p.body).toMatchObject({ metodo_id: 1, encarregado_id: 3, cobranca_ids: [3], valor: '45000', estado: 'confirmado' })
  })

  test('assistente mostra pergunta e resposta', async ({ page }) => {
    await mockApi(page)
    await page.route('**/api/assistente', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ resposta: '2 aluno(s) em dívida.' }) }))
    await login(page)
    await (await irPara(page, '/assistente')).click()
    await page.getByLabel('Pergunta').fill('Quantos alunos estão em dívida?')
    await page.getByRole('button', { name: 'Perguntar' }).click()
    await expect(page.getByText('Quantos alunos estão em dívida?')).toBeVisible()
    await expect(page.getByText('2 aluno(s) em dívida.')).toBeVisible()
  })

  test('tema escuro alterna e persiste', async ({ page }) => {
    await mockApi(page)
    await login(page)
    await page.getByRole('button', { name: 'Alternar tema' }).click()
    const t = await page.evaluate(() => document.documentElement.dataset.theme)
    expect(['dark', 'light']).toContain(t)
    await page.reload()
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(t)
  })

  test('erro de API aparece sem rebentar a página', async ({ page }) => {
    await mockApi(page)
    await page.route('**/api/turmas', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"falha simulada"}' }))
    await login(page)
    await (await irPara(page, '/turmas')).click()
    await expect(page.getByText('Não foi possível carregar os dados.')).toBeVisible()
    await expect(page.getByText('falha simulada')).toBeVisible()
  })
})

test.describe('Portal do encarregado', () => {
  test('encarregado entra no portal e não acede à gestão', async ({ page }) => {
    await mockApi(page)
    await login(page, 'enc')
    await expect(page).toHaveURL(/\/portal$/)
    await expect(page.getByRole('heading', { name: 'Olá, Maria' })).toBeVisible()
    await expect(page.getByText('Carla Neto')).toBeVisible()
    await expect(page.locator('a.nl[href="/alunos"]')).toHaveCount(0)
    await page.goto('/alunos')
    await expect(page).toHaveURL(/\/portal$/)
  })

  test('portal: cobranças em dívida e geração de referência', async ({ page }) => {
    await mockApi(page)
    const bodies: unknown[] = []
    await page.route('**/api/portal/pagamentos/referencia', (r) => { bodies.push(r.request().postDataJSON()); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ entidade: '11223', referencia: '999 888 777', valor: 45000 }) }) })
    await login(page, 'enc')
    await page.locator('a.nl[href="/portal/cobrancas"]').click()
    await page.getByRole('row', { name: /Propina/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Gerar referência Multicaixa' }).click()
    await expect(page.getByRole('dialog', { name: 'Referência de pagamento' })).toContainText('999 888 777')
    expect(bodies).toEqual([{ cobranca_ids: [3] }])
  })

  test('utilizador de gestão não entra no portal', async ({ page }) => {
    await mockApi(page)
    await login(page)
    await page.goto('/portal')
    await expect(page).toHaveURL(/\/painel$/)
  })
})

test.describe('Responsivo', () => {
  test.use({ viewport: { width: 375, height: 812 } })
  test('menu abre e fecha no telemóvel e a página não tem scroll horizontal', async ({ page }) => {
    await mockApi(page)
    await login(page)
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeVisible()
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await (await irPara(page, '/alunos')).click()
    await expect(page).toHaveURL(/\/alunos$/)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

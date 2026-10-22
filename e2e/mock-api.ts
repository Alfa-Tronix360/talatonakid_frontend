import type { Page, Route } from '@playwright/test'

/** Credenciais FICTÍCIAS que só existem neste mock (nunca vão ao backend real). */
export const USERS = {
  admin: { email: 'admin@teste.local', senha: 'senha-e2e-1', perfis: ['admin'], nome: 'Administrador' },
  dois: { email: 'dois@teste.local', senha: 'senha-e2e-2', perfis: ['direccao'], nome: 'Utilizador 2FA', codigo: '123456' },
  enc: { email: 'enc@teste.local', senha: 'senha-e2e-3', perfis: ['encarregado'], nome: 'Maria Encarregada' },
} as const

const turmas = ['5.ª A', '6.ª B', '7.ª A', '7.ª B', '8.ª A'].map((d, i) => ({
  id: i + 1, designacao: d, classe: `Classe ${i + 5}`, sala: `Sala ${i + 1}`, periodo_dia: i < 3 ? 'manha' : 'tarde', capacidade: 30, alunos: 4 + i,
}))
const nomes = ['Ana Cota', 'Bento Lima', 'Carla Neto', 'Diogo Pires', 'Eva Santos', 'Fábio Gomes', 'Graça Luís', 'Hélder Dias']

export type Captured = { method: string; path: string; query: URLSearchParams; body: any }

export async function mockApi(page: Page) {
  const calls: Captured[] = []
  const alunos = nomes.map((n, i) => ({
    id: i + 1, nome_completo: n, numero_processo: `P${100 + i}`, turma: turmas[i % 5].designacao,
    encarregado: `EE de ${n.split(' ')[0]}`, estado: 'activo',
  }))
  const cobr = alunos.map((a) => {
    const ov = a.id % 3 === 0
    return {
      id: a.id, aluno_id: a.id, aluno: a.nome_completo, turma: a.turma, encarregado: a.encarregado, encarregado_id: a.id, servico: 'Propina',
      competencia: '2026-10-01', vencimento: '2026-10-10', valor_total: 45000, valor_pago: ov ? 0 : 45000, estado: ov ? 'divida' : 'pago',
    }
  })
  const tokens = new Map<string, (typeof USERS)[keyof typeof USERS]>()

  const json = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })

  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = req.method()
    let body: any = undefined
    const raw = req.postData()
    if (raw) {
      const ct = req.headers()['content-type'] || ''
      if (ct.includes('json')) body = JSON.parse(raw)
      else if (ct.includes('urlencoded')) body = Object.fromEntries(new URLSearchParams(raw))
      else body = raw
    }
    calls.push({ method, path, query: url.searchParams, body })

    if (method === 'POST' && path === '/auth/login') {
      const u = Object.values(USERS).find((x) => x.email === body.username && x.senha === body.password)
      if (!u) return json(route, { detail: 'Credenciais inválidas' }, 401)
      if ('codigo' in u && body.codigo !== u.codigo) return json(route, { detail: 'Código de verificação em dois passos obrigatório' }, 401)
      const token = `tok-${u.email}`
      tokens.set(token, u)
      return json(route, { access_token: token, token_type: 'bearer' })
    }

    const auth = (req.headers().authorization || '').replace('Bearer ', '')
    const user = tokens.get(auth)
    if (!user) return json(route, { detail: 'Not authenticated' }, 401)

    if (path === '/auth/me') {
      // mesma forma que o backend real devolve
      return json(route, {
        id: 1, nome: user.nome, email: user.email, telefone: null, funcionario_id: null, encarregado_id: user.perfis[0] === 'encarregado' ? 5 : null,
        doisfa_activo: false, activo: true, ultimo_login: '2026-10-18T21:43:16.210636+00:00', criado_em: '2026-10-18T20:19:21.461049+00:00',
        perfis: user.perfis, estabelecimento: { id: 1, nome: 'Colégio Cota Lionel' }, permissoes: ['painel:ver', 'cadastro:ver', 'propinas:ver', 'utilizadores:ver'],
      })
    }

    if (user.perfis[0] === 'encarregado') {
      if (path === '/portal/eu') return json(route, { encarregado: { nome_completo: user.nome }, educandos: [{ id: 1, nome_completo: 'Ana Cota', turma: '5.ª A', em_divida: 0 }, { id: 3, nome_completo: 'Carla Neto', turma: '7.ª A', em_divida: 45000 }] })
      if (path === '/portal/cobrancas') return json(route, cobr.filter((c) => c.aluno_id === 3))
      if (path.startsWith('/portal/educandos/')) return json(route, { nome_completo: 'Carla Neto', financeiro: { propina: 'Em dívida' } })
      return json(route, [])
    }

    if (method === 'GET') {
      if (path === '/painel') {
        const porTurma = turmas.map((t, i) => {
          const facturado = 100000 + i * 20000
          const em_atraso = 10000 + i * 5000
          return { turma_id: t.id, turma: t.designacao, alunos: t.alunos, facturado, recebido: facturado - em_atraso, em_atraso, taxa_cobranca: Math.round(((facturado - em_atraso) / facturado) * 1000) / 10 }
        })
        const facturadoTotal = porTurma.reduce((s, t) => s + t.facturado, 0)
        const emAtrasoTotal = porTurma.reduce((s, t) => s + t.em_atraso, 0)
        return json(route, {
          data: '2026-10-19', ano_lectivo: '2026/2027',
          kpis: {
            recebido_mes: 1530000, em_atraso: emAtrasoTotal, alunos_em_incumprimento: 3, taxa_cobranca: 85,
            alunos: 20, facturado: facturadoTotal, recebido: facturadoTotal - emAtrasoTotal,
          },
          por_turma: porTurma,
        })
      }
      if (path === '/alertas') return json(route, [{ id: 1, gravidade: 'moderada', mensagem: 'Carla Neto tem 2 meses seguidos com atraso.', estado: 'nova' }])
      if (path === '/relatorios/cobranca-turma') return json(route, turmas.map((t, i) => ({ turma: t.designacao, valor_pago: 70 - i * 8, valor_total: 100 })))
      if (path === '/turmas') return json(route, turmas)
      if (path === '/alunos') return json(route, alunos)
      if (path === '/alunos/1') return json(route, { ...alunos[0], sexo: 'F', encarregados: [{ encarregado_id: 1, nome_completo: 'EE de Ana', parentesco: 'mae', principal: true }] })
      if (path === '/alunos/1/360') return json(route, { aluno: alunos[0], financeiro: { propina: 'Pago' }, pedagogico: { media: 14.5, faltas: 3 } })
      if (path === '/cobrancas') {
        const est = url.searchParams.get('estado')
        const enc = url.searchParams.get('encarregado_id')
        return json(route, cobr.filter((c) => (!est || c.estado === est) && (!enc || String(c.encarregado_id) === enc)))
      }
      if (path === '/servicos') return json(route, [{ id: 1, nome: 'Propina' }])
      if (path === '/encarregados') return json(route, alunos.map((a) => ({ id: a.id, nome_completo: a.encarregado, telefone: '+244 923 000 00' + a.id })))
      if (path === '/metodos-pagamento') return json(route, [{ id: 1, nome: 'Numerário', tipo: 'numerario' }])
      if (path === '/anos-lectivos') return json(route, [{ id: 1, designacao: '2026/2027', data_inicio: '2026-09-01', data_fim: '2027-07-15', activo: true }])
      if (path === '/anos-lectivos/1/periodos') return json(route, [{ id: 1, designacao: '1.º trimestre' }])
      if (path === '/cobrancas/exportar') return route.fulfill({ status: 200, contentType: 'text/csv', headers: { 'content-disposition': 'attachment; filename="mapa.csv"', 'access-control-expose-headers': 'Content-Disposition' }, body: 'aluno,valor\nAna,45000\n' })
      return json(route, [])
    }
    if (method === 'POST' && path === '/alunos') {
      const novo = { id: 99, nome_completo: body.nome_completo, estado: 'activo', turma: '5.ª A' }
      alunos.push(novo as any)
      return json(route, novo, 201)
    }
    if (method === 'POST' && path === '/pagamentos') return json(route, { id: 7, ...body }, 201)
    return json(route, { ok: true }, 200)
  })

  return { calls, alunos }
}

export async function login(page: Page, who: keyof typeof USERS = 'admin') {
  const u = USERS[who]
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(u.email)
  await page.getByLabel('Palavra-passe').fill(u.senha)
  if ('codigo' in u) {
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.getByLabel(/Código de verificação/).fill(u.codigo)
  }
  await page.getByRole('button', { name: 'Entrar' }).click()
}

/** O menu lateral é um acordeão: abre o grupo certo (se preciso) e devolve o link. */
export async function irPara(page: Page, href: string) {
  const link = page.locator(`a.nl[href="${href}"]`)
  const aparece = (timeout: number) => link.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false)
  // dá tempo à navegação pós-login (que não é esperada por `login()`) e ao grupo já correcto renderizar
  if (await aparece(3000)) return link
  for (const btn of await page.locator('button.nav-g-btn').all()) {
    await btn.click()
    if (await aparece(300)) break
  }
  return link
}

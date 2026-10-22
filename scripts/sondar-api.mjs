// Sonda os endpoints GET da API e guarda amostras reais em docs/api-amostras.json.
// Serve para afinar os nomes dos campos usados pelo frontend.
//
// Uso (PowerShell):
//   $env:CLACS_EMAIL="o.seu@email"; $env:CLACS_SENHA="a-sua-senha"; npm run sondar
// Opcional: $env:CLACS_API="https://clacs-school-backend.onrender.com/api"; $env:CLACS_CODIGO="123456" (2FA)
//
// As credenciais só são lidas do ambiente — nunca ficam gravadas em ficheiros.
import { mkdir, writeFile } from 'node:fs/promises'

const API = (process.env.CLACS_API || 'https://clacs-school-backend.onrender.com/api').replace(/\/$/, '')
const email = process.env.CLACS_EMAIL
const senha = process.env.CLACS_SENHA
if (!email || !senha) {
  console.error('Defina CLACS_EMAIL e CLACS_SENHA no ambiente.')
  process.exit(1)
}

const cortar = (v, n = 2) => {
  if (Array.isArray(v)) return v.slice(0, n).map((x) => cortar(x, n))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cortar(x, n)]))
  return v
}

const body = new URLSearchParams({ username: email, password: senha })
if (process.env.CLACS_CODIGO) body.set('codigo', process.env.CLACS_CODIGO)
const lr = await fetch(`${API}/auth/login`, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
const login = await lr.json().catch(() => ({}))
if (!lr.ok || !login.access_token) {
  console.error('Login falhou:', lr.status, JSON.stringify(login).slice(0, 300))
  process.exit(1)
}
const H = { Authorization: `Bearer ${login.access_token}`, Accept: 'application/json' }
const out = { _login_chaves: Object.keys(login) }

const get = async (path) => {
  try {
    const r = await fetch(API + path, { headers: H })
    const t = await r.text()
    let j; try { j = JSON.parse(t) } catch { j = t.slice(0, 200) }
    out[path] = { status: r.status, amostra: cortar(j) }
    console.log(r.status, path)
    return j
  } catch (e) {
    out[path] = { erro: String(e) }
    console.log('ERR', path)
  }
}

const simples = ['/auth/me', '/perfis', '/utilizadores', '/estabelecimento', '/parametros', '/anos-lectivos', '/niveis', '/classes', '/salas', '/disciplinas',
  '/funcionarios', '/turmas', '/alunos?limit=3', '/encarregados', '/matriculas', '/servicos', '/precos', '/planos-pagamento', '/multas', '/descontos',
  '/metodos-pagamento', '/cobrancas', '/cobrancas/devedores', '/pagamentos', '/refeitorio', '/refeitorio/adesoes', '/refeitorio/tipos', '/refeitorio/ementas',
  '/refeitorio/registos', '/modelos-mensagem', '/regras', '/mensagens?limit=3', '/comunicados', '/tipos-avaliacao', '/tipos-ocorrencia', '/ocorrencias',
  '/painel', '/indicadores', '/indicadores/catalogo', '/alertas', '/relatorios/agendados', '/relatorios/devedores?formato=json', '/relatorios/cobranca-turma?formato=json',
  '/agendador', '/auditoria?limit=3', '/primavera', '/primavera/divergencias', '/primavera/documentos', '/importacao/modelos', '/importacao/lotes']
for (const p of simples) await get(p)

// Endpoints que dependem de ids
const anos = await get('/anos-lectivos')
const ano = (Array.isArray(anos) ? anos : []).find((a) => a.activo || a.activa || a.estado === 'activo') || (Array.isArray(anos) ? anos[0] : undefined)
if (ano) { await get(`/anos-lectivos/${ano.id}/periodos`); await get(`/anos-lectivos/${ano.id}/resultados`) }
const turmas = await get('/turmas')
const turma = Array.isArray(turmas) ? turmas[0] : undefined
if (turma) { await get(`/turmas/${turma.id}/atribuicoes`); await get(`/registo-diario?turma_id=${turma.id}`) }
const alunos = await get('/alunos?limit=1')
const aluno = Array.isArray(alunos) ? alunos[0] : alunos?.items?.[0]
if (aluno) { await get(`/alunos/${aluno.id}`); await get(`/alunos/${aluno.id}/360`) }
const mats = await get('/matriculas')
const mat = Array.isArray(mats) ? mats[0] : undefined
if (mat) { await get(`/matriculas/${mat.id}/historico`); await get(`/matriculas/${mat.id}/descontos`) }
await get('/portal/eu'); await get('/portal/cobrancas'); await get('/portal/pagamentos'); await get('/portal/mensagens')

await mkdir('docs', { recursive: true })
await writeFile('docs/api-amostras.json', JSON.stringify(out, null, 2), 'utf8')
console.log('\nGuardado em docs/api-amostras.json (máx. 2 itens por lista).')

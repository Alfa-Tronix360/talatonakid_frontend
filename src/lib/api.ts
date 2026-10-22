const BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api').replace(/\/$/, '')
export const API_BASE = BASE
const TOKEN_KEY = 'clacs.token'

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (t: string) => {
    try { localStorage.setItem(TOKEN_KEY, t) } catch { /* sem storage */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* sem storage */ }
  },
}

export class ApiError extends Error {
  status: number
  detail: unknown
  /** Valor do cabeçalho X-2FA (o backend usa-o para pedir o código de dois passos). */
  twofa: string | null
  constructor(status: number, message: string, detail?: unknown, twofa: string | null = null) {
    super(message)
    this.status = status
    this.detail = detail
    this.twofa = twofa
  }
}

export type Params = Record<string, string | number | boolean | null | undefined>

function qs(params?: Params) {
  if (!params) return ''
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    u.append(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ''
}

function messageFrom(status: number, body: any): string {
  const d = body?.detail ?? body?.message ?? body?.erro
  if (typeof d === 'string') return d
  if (Array.isArray(d)) {
    return d
      .map((e) => {
        const campo = Array.isArray(e?.loc) ? e.loc.filter((x: unknown) => x !== 'body').join('.') : ''
        return campo ? `${campo}: ${e?.msg ?? ''}` : (e?.msg ?? '')
      })
      .filter(Boolean)
      .join(' · ')
  }
  if (d && typeof d === 'object') return JSON.stringify(d)
  if (status === 0) return 'Sem ligação ao servidor. Verifique a internet.'
  if (status === 401) return 'Sessão expirada ou credenciais inválidas.'
  if (status === 403) return 'Não tem permissão para esta operação.'
  if (status === 404) return 'Recurso não encontrado.'
  if (status >= 500) return 'Erro no servidor. Tente novamente dentro de instantes.'
  return `Pedido falhou (${status}).`
}

type RawOpts = { params?: Params; body?: BodyInit | null; headers?: Record<string, string>; auth?: boolean }

/** Um 401 num endpoint qualquer pode ser só falta de permissão: confirma no /auth/me antes de fechar a sessão. */
async function tokenInvalido(token: string) {
  try {
    const r = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    return r.status === 401
  } catch {
    return false
  }
}

async function raw(method: string, path: string, opts: RawOpts = {}) {
  const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers || {}) }
  const t = tokenStore.get()
  if (t && opts.auth !== false) headers.Authorization = `Bearer ${t}`
  let res: Response
  try {
    res = await fetch(BASE + path + qs(opts.params), { method, headers, body: opts.body ?? undefined })
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e)
    throw new ApiError(0, `${messageFrom(0, null)} [${method} ${BASE}${path} → ${motivo}]`)
  }
  if (!res.ok) {
    let body: any = null
    try { body = await res.clone().json() } catch { /* corpo não-JSON */ }
    if (res.status === 401 && opts.auth !== false && t && (await tokenInvalido(t))) {
      tokenStore.clear()
      try { sessionStorage.setItem('clacs.expirada', '1') } catch { /* sem storage */ }
      window.dispatchEvent(new Event('clacs:unauthorized'))
    }
    throw new ApiError(res.status, messageFrom(res.status, body), body?.detail ?? body, res.headers.get('x-2fa'))
  }
  return res
}

async function json<T>(method: string, path: string, opts?: RawOpts): Promise<T> {
  const res = await raw(method, path, opts)
  if (res.status === 204) return undefined as T
  const txt = await res.text()
  if (!txt) return undefined as T
  try { return JSON.parse(txt) as T } catch { return txt as unknown as T }
}

const jsonBody = (body: unknown) => ({
  body: body === undefined ? undefined : JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
})

export const api = {
  get: <T = any>(path: string, params?: Params) => json<T>('GET', path, { params }),
  post: <T = any>(path: string, body?: unknown, params?: Params) => json<T>('POST', path, { params, ...jsonBody(body) }),
  put: <T = any>(path: string, body?: unknown, params?: Params) => json<T>('PUT', path, { params, ...jsonBody(body) }),
  patch: <T = any>(path: string, body?: unknown, params?: Params) => json<T>('PATCH', path, { params, ...jsonBody(body) }),
  del: <T = any>(path: string, params?: Params) => json<T>('DELETE', path, { params }),
  form: <T = any>(path: string, data: FormData, params?: Params) => json<T>('POST', path, { params, body: data }),
  login: <T = any>(data: { username: string; password: string; codigo?: string }) => {
    const b = new URLSearchParams()
    b.set('username', data.username)
    b.set('password', data.password)
    if (data.codigo) b.set('codigo', data.codigo)
    return json<T>('POST', '/auth/login', {
      // String simples (não URLSearchParams): extensões/ambientes que intercalam o fetch via postMessage não clonam URLSearchParams.
      body: b.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: false,
    })
  },
  /** Obtém um ficheiro autenticado como Blob. Aceita caminho relativo ou URL que comece por /api. */
  async blob(pathOrUrl: string) {
    const p = pathOrUrl.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api(?=\/)/, '')
    const res = await raw('GET', p, { headers: { Accept: '*/*' } })
    return res.blob()
  },
  /** Descarrega um ficheiro autenticado (PDF, Excel, CSV...) e abre/guarda no browser. */
  async download(path: string, params?: Params, filename?: string, open = false) {
    const res = await raw('GET', path, { params, headers: { Accept: '*/*' } })
    const blob = await res.blob()
    const cd = res.headers.get('content-disposition') || ''
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)
    const name = filename || (m ? decodeURIComponent(m[1]) : path.split('/').pop() || 'ficheiro')
    const url = URL.createObjectURL(blob)
    if (open && blob.type === 'application/pdf') {
      window.open(url, '_blank', 'noopener')
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Ocorreu um erro inesperado.')

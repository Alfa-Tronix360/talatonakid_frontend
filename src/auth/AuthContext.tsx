import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError, tokenStore } from '@/lib/api'
import { perfisOf, type Row } from '@/lib/data'

type LoginResult = { ok: true } | { ok: false; needCode?: boolean; message: string }

type Ctx = {
  user: Row | null
  loading: boolean
  perfis: string[]
  isPortal: boolean
  login: (email: string, senha: string, codigo?: string) => Promise<LoginResult>
  logout: () => void
  reload: () => Promise<void>
}

const AuthCtx = createContext<Ctx>(null as unknown as Ctx)
export const useAuth = () => useContext(AuthCtx)

const NEEDS_CODE = /c[óo]digo|2fa|dois passos|duas etapas|verifica[çc][ãa]o|autenticador|otp|totp/i

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<Row | null>(null)
  const [loading, setLoading] = useState(!!tokenStore.get())

  const reload = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); setLoading(false); return }
    try {
      setUser(await api.get<Row>('/auth/me'))
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    const h = () => { setUser(null); qc.clear() }
    window.addEventListener('clacs:unauthorized', h)
    return () => window.removeEventListener('clacs:unauthorized', h)
  }, [qc])

  const login = useCallback<Ctx['login']>(async (email, senha, codigo) => {
    let r: Row | undefined
    try {
      r = await api.login<Row>({ username: email.trim().toLowerCase(), password: senha, codigo: codigo?.trim() || undefined })
    } catch (e) {
      const err = e as ApiError
      const txt = (err.message || '') + JSON.stringify(err.detail ?? '')
      const pede2fa = !!err.twofa && !/^(0|false|no|nao|não)$/i.test(err.twofa)
      if ([400, 401, 403, 422, 428].includes(err.status) && (pede2fa || NEEDS_CODE.test(txt))) {
        return { ok: false, needCode: true, message: err.message || 'Introduza o código de verificação.' }
      }
      // Mostra a mensagem real do servidor; só usa texto próprio quando não vem nenhuma.
      return { ok: false, message: err.message || 'Não foi possível iniciar sessão.' }
    }

    const token = r?.access_token ?? r?.token ?? r?.accessToken ?? r?.jwt ?? r?.data?.access_token
    if (!token) {
      if (NEEDS_CODE.test(JSON.stringify(r || {})) || r?.requer_2fa || r?.dois_factores) {
        return { ok: false, needCode: true, message: 'Introduza o código da aplicação autenticadora.' }
      }
      return { ok: false, message: `O servidor respondeu sem token (campos: ${Object.keys(r || {}).join(', ') || 'nenhum'}).` }
    }

    tokenStore.set(String(token))
    qc.clear()
    try {
      setUser(await api.get<Row>('/auth/me'))
      setLoading(false)
      return { ok: true }
    } catch (e) {
      tokenStore.clear()
      setUser(null)
      setLoading(false)
      const err = e as ApiError
      return { ok: false, message: `Sessão iniciada, mas não foi possível carregar o perfil (${err.status || 'sem ligação'}): ${err.message}` }
    }
  }, [qc])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    qc.clear()
  }, [qc])

  const value = useMemo<Ctx>(() => {
    const perfis = perfisOf(user)
    const staff = perfis.some((p) => p !== 'encarregado')
    const isPortal = !!user && (perfis.includes('encarregado') || (!staff && !!(user.encarregado_id ?? user.encarregado)))
    return { user, loading, perfis, isPortal: isPortal && !staff, login, logout, reload }
  }, [user, loading, login, logout, reload])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

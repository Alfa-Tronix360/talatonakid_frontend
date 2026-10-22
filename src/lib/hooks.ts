import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { useToast } from '@/components/Toast'
import { api, errMsg, type Params } from './api'
import { asList, type Row } from './data'

/** GET com cache. `path` null desactiva o pedido. */
export function useGet<T = any>(path: string | null, params?: Params, opts?: Partial<UseQueryOptions<T>> & { keep?: boolean }) {
  const { keep, ...rest } = opts || {}
  const clean: Params = {}
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== null && v !== '') clean[k] = v
  return useQuery<T>({
    queryKey: [path, clean],
    queryFn: () => api.get<T>(path as string, clean),
    enabled: path !== null && (rest.enabled ?? true),
    placeholderData: keep ? (keepPreviousData as any) : undefined,
    ...(rest as any),
  })
}

/** GET que devolve sempre uma lista. */
export function useList<T = Row>(path: string | null, params?: Params, opts?: Partial<UseQueryOptions<any>> & { keep?: boolean }) {
  const q = useGet<any>(path, params, opts)
  return { ...q, rows: asList<T>(q.data) }
}

type ActOpts<R, V> = {
  /** Prefixos de caminhos GET a recarregar depois do sucesso. */
  invalidate?: string[]
  ok?: string | ((r: R, v: V) => string)
  onDone?: (r: R, v: V) => void
  silent?: boolean
}

/** Mutação com toast de sucesso/erro e invalidação de cache. */
export function useAct<V = void, R = any>(fn: (v: V) => Promise<R>, o: ActOpts<R, V> = {}) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation<R, Error, V>({
    mutationFn: fn,
    onSuccess: (r, v) => {
      if (o.invalidate?.length) {
        qc.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey[0]
            return typeof k === 'string' && o.invalidate!.some((p) => k.startsWith(p))
          },
        })
      }
      if (!o.silent) {
        const m = typeof o.ok === 'function' ? o.ok(r, v) : o.ok
        toast.ok(m || 'Operação concluída.')
      }
      o.onDone?.(r, v)
    },
    onError: (e) => toast.error(errMsg(e)),
  })
}

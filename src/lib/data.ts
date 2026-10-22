/** Utilitários tolerantes para ler respostas da API sem depender de um único formato. */

export type Row = Record<string, any>

export function asList<T = Row>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const o = data as Row
    for (const k of ['items', 'dados', 'data', 'results', 'resultados', 'registos', 'lista']) {
      if (Array.isArray(o[k])) return o[k] as T[]
    }
  }
  return []
}

export function totalOf(data: unknown): number | undefined {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Row
    for (const k of ['total', 'count', 'total_registos']) if (typeof o[k] === 'number') return o[k]
  }
  return undefined
}

/** Lê o primeiro caminho (com pontos) que tenha valor. */
export function pick(row: unknown, ...paths: string[]): any {
  if (row === null || row === undefined) return undefined
  for (const p of paths) {
    let cur: any = row
    for (const seg of p.split('.')) {
      if (cur === null || cur === undefined) { cur = undefined; break }
      cur = cur[seg]
    }
    if (cur !== undefined && cur !== null && cur !== '') return cur
  }
  return undefined
}

export const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export const idOf = (r: Row) => pick(r, 'id', 'uid', 'codigo')

/** Texto legível para uma chave técnica: data_inicio -> Data inicio. */
export function humanize(key: string) {
  const s = key.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Designação legível de uma entidade (turma, classe, serviço...). */
export function nameOf(r: unknown): string {
  if (r === null || r === undefined) return ''
  if (typeof r === 'string' || typeof r === 'number') return String(r)
  return String(pick(r, 'designacao', 'nome_completo', 'nome', 'titulo', 'descricao', 'codigo', 'email', 'id') ?? '')
}

export function perfisOf(user: Row | null | undefined): string[] {
  const p = user?.perfis ?? user?.perfil ?? user?.roles ?? []
  const arr = Array.isArray(p) ? p : [p]
  return arr
    .map((x) => (typeof x === 'string' ? x : String(pick(x, 'codigo', 'nome', 'perfil') ?? '')))
    .map((s) => s.toLowerCase())
    .filter(Boolean)
}

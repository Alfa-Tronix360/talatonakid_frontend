import { useEffect, useState, type ReactNode } from 'react'
import { nameOf, pick, humanize, type Row } from '@/lib/data'
import { Kz, dataPT } from '@/lib/format'
import { Btn, Empty, ErrorBox, Estado, Loading } from './ui'

export type Col<T = Row> = {
  h: string
  /** Um ou mais caminhos possíveis para o valor (primeiro que existir). */
  k?: string | string[]
  render?: (r: T, i: number) => ReactNode
  money?: boolean
  date?: boolean
  estado?: boolean
  right?: boolean
  nowrap?: boolean
}

function cell<T extends Row>(c: Col<T>, r: T, i: number): ReactNode {
  if (c.render) return c.render(r, i)
  const keys = Array.isArray(c.k) ? c.k : c.k ? [c.k] : []
  const v = pick(r, ...keys)
  if (v === undefined) return <span className="mu">—</span>
  if (c.money) return Kz(v)
  if (c.date) return dataPT(v)
  if (c.estado) return <Estado v={v} />
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  if (typeof v === 'object') return Array.isArray(v) ? v.map(nameOf).join(', ') : nameOf(v)
  return String(v)
}

/** Colunas deduzidas dos dados quando não se especificam (útil em listas genéricas). */
export function autoCols(rows: Row[], max = 8): Col[] {
  const keys: string[] = []
  for (const r of rows.slice(0, 20)) {
    for (const [k, v] of Object.entries(r)) {
      if (!keys.includes(k) && (v === null || typeof v !== 'object' || Array.isArray(v))) keys.push(k)
    }
  }
  return keys.slice(0, max).map((k) => ({
    h: humanize(k),
    k,
    money: /valor|total|montante|preco|saldo/i.test(k),
    date: /^data|_data|vencimento|competencia|criad|inicio|fim/i.test(k),
    estado: /^estado$|situacao/i.test(k),
  }))
}

type Props<T extends Row> = {
  rows: T[]
  cols?: Col<T>[]
  onRow?: (r: T) => void
  rowKey?: (r: T, i: number) => string | number
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  empty?: ReactNode
  pageSize?: number
  /** Selecção por caixa de verificação. */
  selected?: (string | number)[]
  onSelect?: (ids: (string | number)[]) => void
  foot?: ReactNode
}

export function Table<T extends Row = Row>({
  rows, cols, onRow, rowKey, loading, error, onRetry, empty, pageSize = 25, selected, onSelect, foot,
}: Props<T>) {
  const [page, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [rows.length])

  if (loading && !rows.length) return <div className="tw"><Loading /></div>
  if (error) return <div className="tw"><ErrorBox error={error} retry={onRetry} /></div>

  const columns = cols && cols.length ? cols : autoCols(rows)
  const pages = pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1
  const cur = Math.min(page, pages - 1)
  const view = pageSize > 0 ? rows.slice(cur * pageSize, cur * pageSize + pageSize) : rows
  const key = (r: T, i: number) => (rowKey ? rowKey(r, i) : (r.id ?? i))
  const ids = view.map((r, i) => key(r, cur * pageSize + i))
  const allSel = !!selected && ids.length > 0 && ids.every((id) => selected.includes(id))

  return (
    <div className="tw">
      {!rows.length ? (
        <Empty>{empty ?? 'Nenhum registo encontrado.'}</Empty>
      ) : (
        <div className="tw-s">
          <table>
            <thead>
              <tr>
                {onSelect && (
                  <th className="chk">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos"
                      checked={allSel}
                      onChange={(e) => onSelect(e.target.checked ? [...new Set([...(selected || []), ...ids])] : (selected || []).filter((x) => !ids.includes(x)))}
                    />
                  </th>
                )}
                {columns.map((c) => <th key={c.h} className={c.right ? 'r' : ''}>{c.h}</th>)}
              </tr>
            </thead>
            <tbody>
              {view.map((r, i) => {
                const k = key(r, cur * pageSize + i)
                return (
                  <tr
                    key={k}
                    className={onRow ? 'clk' : ''}
                    tabIndex={onRow ? 0 : undefined}
                    onClick={onRow ? () => onRow(r) : undefined}
                    onKeyDown={onRow ? (e) => { if (e.key === 'Enter') onRow(r) } : undefined}
                  >
                    {onSelect && (
                      <td className="chk" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="Seleccionar linha"
                          checked={!!selected?.includes(k)}
                          onChange={(e) => onSelect(e.target.checked ? [...(selected || []), k] : (selected || []).filter((x) => x !== k))}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.h} className={`${c.right ? 'r' : ''} ${c.nowrap === false ? 'wrap' : ''}`}>{cell(c, r, i)}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {(pages > 1 || foot) && (
        <div className="tw-f">
          <span className="mu">{foot ?? `${rows.length} registos`}</span>
          {pages > 1 && (
            <span className="pager">
              <Btn variant="ghost" size="sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Anterior</Btn>
              <span>{cur + 1} / {pages}</span>
              <Btn variant="ghost" size="sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Seguinte</Btn>
            </span>
          )}
        </div>
      )}
      {import.meta.env.DEV && rows.length > 0 && (
        <details className="raw dev">
          <summary>Dados da API (1.º registo) · só em desenvolvimento</summary>
          <pre>{JSON.stringify(rows[0], null, 2)}</pre>
        </details>
      )}
    </div>
  )
}

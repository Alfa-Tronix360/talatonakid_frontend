import { humanize, type Row } from '@/lib/data'
import { Table, autoCols } from './Table'
import { Card, Empty, KV } from './ui'

/**
 * Mostra qualquer objecto devolvido pela API: valores simples agrupados num cartão,
 * objectos como chave/valor e listas como tabelas. Serve de base para a visão 360°
 * e para o portal enquanto o formato exacto das respostas é afinado.
 */
export function AutoSections({ data, skip = [], titles = {} }: { data: Row | null | undefined; skip?: string[]; titles?: Record<string, string> }) {
  if (!data || typeof data !== 'object') return <Empty>Sem dados.</Empty>
  const entries = Object.entries(data).filter(([k]) => !skip.includes(k))
  const scalars = Object.fromEntries(entries.filter(([, v]) => v === null || typeof v !== 'object'))
  const blocks = entries.filter(([, v]) => v && typeof v === 'object')
  return (
    <div className="stack">
      {Object.keys(scalars).length > 0 && (
        <Card title={titles._ ?? 'Resumo'}><KV data={scalars} /></Card>
      )}
      <div className="grid g2">
        {blocks
          .filter(([, v]) => !Array.isArray(v))
          .map(([k, v]) => (
            <Card key={k} title={titles[k] ?? humanize(k)}><KV data={v as Row} /></Card>
          ))}
      </div>
      {blocks
        .filter(([, v]) => Array.isArray(v))
        .map(([k, v]) => {
          const rows = (v as unknown[]).filter((x) => x && typeof x === 'object') as Row[]
          return (
            <Card key={k} title={titles[k] ?? humanize(k)} pad={false}>
              {rows.length ? <Table rows={rows} cols={autoCols(rows)} pageSize={10} /> : <Empty>Sem registos.</Empty>}
            </Card>
          )
        })}
    </div>
  )
}

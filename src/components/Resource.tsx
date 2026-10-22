import { useMemo, useState, type ReactNode } from 'react'
import { api, type Params } from '@/lib/api'
import type { Row } from '@/lib/data'
import { useAct, useList } from '@/lib/hooks'
import { FormDialog, type FieldDef } from './FormDialog'
import { Table, type Col } from './Table'
import { Btn, SearchBox } from './ui'

type Props = {
  /** Título da secção (mostrado acima da tabela). */
  title?: string
  path: string
  params?: Params
  cols: Col[]
  createFields?: FieldDef[]
  createLabel?: string
  createTitle?: string
  /** Valores iniciais do formulário de criação. */
  createInitial?: Row
  createMethod?: 'post' | 'put'
  beforeCreate?: (p: Row) => Row
  /** Corre depois de criar com sucesso (ex.: despachar algo que o registo acabou de pôr em fila). */
  afterCreate?: (r: Row) => void | Promise<void>
  editFields?: FieldDef[]
  editPath?: (r: Row) => string
  editMethod?: 'patch' | 'put'
  editLabel?: string
  invalidate?: string[]
  rowActions?: (r: Row) => ReactNode
  onRow?: (r: Row) => void
  toolbar?: ReactNode
  search?: boolean
  filter?: (r: Row) => boolean
  empty?: ReactNode
  pageSize?: number
  hint?: ReactNode
}

/** Lista + criação + edição de um recurso simples da API. */
export function Resource({
  title, path, params, cols, createFields, createLabel = 'Novo', createTitle, createInitial, createMethod = 'post', beforeCreate, afterCreate,
  editFields, editPath, editMethod = 'patch', editLabel = 'Editar', invalidate, rowActions, onRow, toolbar, search, filter, empty, pageSize, hint,
}: Props) {
  const q = useList(path, params)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [term, setTerm] = useState('')
  const inv = invalidate ?? [path]

  const criar = useAct(
    async (p: Row) => {
      const r = await api[createMethod](path, beforeCreate ? beforeCreate(p) : p)
      await afterCreate?.(r)
      return r
    },
    { invalidate: inv, ok: 'Registo criado.' },
  )
  const editar = useAct((v: { r: Row; p: Row }) => api[editMethod](editPath!(v.r), v.p), { invalidate: inv, ok: 'Alterações guardadas.' })

  const rows = useMemo(() => {
    let l = q.rows
    if (filter) l = l.filter(filter)
    if (term) {
      const t = term.toLowerCase()
      l = l.filter((r) => JSON.stringify(Object.values(r)).toLowerCase().includes(t))
    }
    return l
  }, [q.rows, filter, term])

  const columns: Col[] = [...cols]
  if ((editFields && editPath) || rowActions) {
    columns.push({
      h: '',
      render: (r) => (
        <span className="row-a" onClick={(e) => e.stopPropagation()}>
          {rowActions?.(r)}
          {editFields && editPath && <Btn variant="link" onClick={() => setEditing(r)}>{editLabel}</Btn>}
        </span>
      ),
    })
  }

  return (
    <section style={{ marginBottom: 20 }}>
      {(title || createFields || toolbar || search) && (
        <div className="toolbar">
          {title && <h3 style={{ marginRight: 'auto' }}>{title}</h3>}
          {search && <SearchBox value={term} onChange={setTerm} placeholder="Filtrar…" />}
          {toolbar}
          {createFields && <Btn onClick={() => setCreating(true)}>{createLabel}</Btn>}
        </div>
      )}
      {hint && <p className="note" style={{ margin: '0 0 10px' }}>{hint}</p>}
      <Table rows={rows} cols={columns} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} onRow={onRow} empty={empty} pageSize={pageSize} />
      {creating && createFields && (
        <FormDialog
          title={createTitle ?? createLabel}
          fields={createFields}
          initial={createInitial}
          onClose={() => setCreating(false)}
          onSubmit={(p) => criar.mutateAsync(p)}
        />
      )}
      {editing && editFields && (
        <FormDialog
          title={editLabel}
          fields={editFields}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(p) => editar.mutateAsync({ r: editing, p })}
        />
      )}
    </section>
  )
}

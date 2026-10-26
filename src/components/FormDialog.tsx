import { useState, type FormEvent, type ReactNode } from 'react'
import type { Params } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { useList } from '@/lib/hooks'
import { Btn } from './ui'
import { Modal } from './Modal'

export type Opt = { value: string | number; label: string }
export type Source = {
  path: string
  params?: Params
  value?: string
  label?: string | string[]
  filter?: (r: Row) => boolean
  /** Etiqueta composta, p.ex. (r) => `${r.nome} — ${r.turma}` */
  text?: (r: Row) => string
}

export type FieldDef = {
  name: string
  label: string
  type?: 'text' | 'number' | 'date' | 'email' | 'password' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'multi' | 'time' | 'file'
  required?: boolean
  placeholder?: string
  options?: Opt[] | Source
  /** Texto da opção vazia num select opcional. */
  empty?: string
  hint?: string
  wide?: boolean
  step?: string
  min?: number
  max?: number
  accept?: string
  /** Ficheiro: aceita vários (o valor passa a ser uma lista de File). */
  multiple?: boolean
  default?: any
  showIf?: (v: Row) => boolean
  /** Mantém o valor como texto (decimais enviados como string). */
  asString?: boolean
}

export function useOptions(src: Opt[] | Source | undefined): { opts: Opt[]; loading: boolean } {
  const isSrc = !!src && !Array.isArray(src)
  const s = isSrc ? (src as Source) : undefined
  const q = useList(s ? s.path : null, s?.params)
  if (!src) return { opts: [], loading: false }
  if (Array.isArray(src)) return { opts: src, loading: false }
  const lab = (r: Row) =>
    src.text ? src.text(r)
      : String(pick(r, ...(src.label ? (Array.isArray(src.label) ? src.label : [src.label]) : ['designacao', 'nome_completo', 'nome', 'descricao', 'codigo', 'titulo'])) ?? r.id)
  const opts = q.rows
    .filter((r) => (src.filter ? src.filter(r) : true))
    .map((r) => ({ value: r[src.value || 'id'], label: lab(r) }))
  return { opts, loading: q.isLoading }
}

function SelectInput({ f, value, onChange }: { f: FieldDef; value: any; onChange: (v: any) => void }) {
  const { opts, loading } = useOptions(f.options)
  return (
    <select
      required={f.required}
      value={value ?? ''}
      onChange={(e) => {
        const o = opts.find((x) => String(x.value) === e.target.value)
        onChange(o ? o.value : '')
      }}
    >
      <option value="">{loading ? 'A carregar…' : f.empty ?? (f.required ? 'Seleccione…' : '— Nenhum —')}</option>
      {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function MultiInput({ f, value, onChange }: { f: FieldDef; value: any[]; onChange: (v: any[]) => void }) {
  const { opts, loading } = useOptions(f.options)
  const cur = value || []
  return (
    <div className="multi">
      {loading && <span className="mu">A carregar…</span>}
      {opts.map((o) => (
        <label key={o.value} className="chip">
          <input
            type="checkbox"
            checked={cur.includes(o.value)}
            onChange={(e) => onChange(e.target.checked ? [...cur, o.value] : cur.filter((x) => x !== o.value))}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
}

export function initialValues(fields: FieldDef[], initial?: Row): Row {
  const v: Row = {}
  for (const f of fields) {
    const given = initial ? initial[f.name] : undefined
    if (given !== undefined && given !== null) v[f.name] = f.type === 'date' ? String(given).slice(0, 10) : given
    else if (f.default !== undefined) v[f.name] = f.default
    else v[f.name] = f.type === 'checkbox' ? false : f.type === 'multi' ? [] : ''
  }
  return v
}

/** Converte os valores do formulário no corpo JSON (omite vazios). */
export function toPayload(fields: FieldDef[], values: Row): Row {
  const out: Row = {}
  for (const f of fields) {
    if (f.showIf && !f.showIf(values)) continue
    const v = values[f.name]
    if (f.type === 'file') continue
    if (f.type === 'checkbox') { out[f.name] = !!v; continue }
    if (f.type === 'multi') { out[f.name] = v || []; continue }
    if (v === '' || v === undefined || v === null) continue
    if (f.type === 'number') out[f.name] = f.asString ? String(v) : Number(v)
    else if (f.type === 'select') out[f.name] = typeof v === 'string' && f.asString ? v : v
    else out[f.name] = typeof v === 'string' ? v.trim() : v
  }
  return out
}

export function FormFields({ fields, values, set }: { fields: FieldDef[]; values: Row; set: (name: string, v: any) => void }) {
  return (
    <div className="fgrid">
      {fields.map((f) => {
        if (f.showIf && !f.showIf(values)) return null
        const v = values[f.name]
        const t = f.type || 'text'
        const common = { required: f.required, placeholder: f.placeholder }
        let input: ReactNode
        if (t === 'textarea') input = <textarea rows={3} {...common} value={v ?? ''} onChange={(e) => set(f.name, e.target.value)} />
        else if (t === 'select') input = <SelectInput f={f} value={v} onChange={(x) => set(f.name, x)} />
        else if (t === 'multi') input = <MultiInput f={f} value={v} onChange={(x) => set(f.name, x)} />
        else if (t === 'checkbox')
          input = (
            <span className="inline-chk">
              <input type="checkbox" checked={!!v} onChange={(e) => set(f.name, e.target.checked)} />
              <span>{f.hint || 'Sim'}</span>
            </span>
          )
        else if (t === 'file')
          input = <input type="file" accept={f.accept} required={f.required} multiple={f.multiple}
            onChange={(e) => set(f.name, f.multiple ? [...(e.target.files ?? [])] : e.target.files?.[0] ?? null)} />
        else
          input = (
            <input
              type={t}
              {...common}
              step={t === 'number' ? f.step ?? 'any' : undefined}
              min={f.min}
              max={f.max}
              autoComplete={t === 'password' ? 'new-password' : 'off'}
              value={v ?? ''}
              onChange={(e) => set(f.name, e.target.value)}
            />
          )
        return (
          <div key={f.name} className={`fld ${f.wide || t === 'textarea' || t === 'multi' ? 'wide' : ''}`}>
            <label>
              <span>{f.label}{f.required && <em aria-hidden> *</em>}</span>
              {t !== 'multi' ? input : null}
            </label>
            {t === 'multi' && input}
            {f.hint && t !== 'checkbox' && <small>{f.hint}</small>}
          </div>
        )
      })}
    </div>
  )
}

type Props = {
  title: string
  fields: FieldDef[]
  initial?: Row
  submitLabel?: string
  onSubmit: (payload: Row, raw: Row) => Promise<unknown> | void
  onClose: () => void
  size?: 'sm' | 'md' | 'lg'
  intro?: ReactNode
}

export function FormDialog({ title, fields, initial, submitLabel = 'Guardar', onSubmit, onClose, size = 'md', intro }: Props) {
  const [values, setValues] = useState<Row>(() => initialValues(fields, initial))
  const [busy, setBusy] = useState(false)
  const set = (n: string, v: any) => setValues((s) => ({ ...s, [n]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit(toPayload(fields, values), values)
      onClose()
    } catch {
      /* o erro já foi mostrado pelo toast; mantém o formulário aberto */
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose} size={size}>
      <form onSubmit={submit}>
        {intro && <div className="intro">{intro}</div>}
        <FormFields fields={fields} values={values} set={set} />
        <div className="form-f">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" busy={busy}>{submitLabel}</Btn>
        </div>
      </form>
    </Modal>
  )
}

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { humanize, type Row } from '@/lib/data'
import { Kz, dataPT, label, toneOf, type Tone } from '@/lib/format'

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spin" style={{ width: size, height: size }} role="progressbar" aria-label="A carregar" />
}

export function Btn({
  variant = 'primary', size, busy, children, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'link'; size?: 'sm'; busy?: boolean }) {
  return (
    <button
      type="button"
      {...p}
      disabled={p.disabled || busy}
      className={`btn ${variant === 'primary' ? '' : variant} ${size || ''} ${p.className || ''}`}
    >
      {busy && <Spinner size={14} />}
      {children}
    </button>
  )
}

export function Tag({ tone, children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`tag t-${tone || 'n'}`}>{children}</span>
}

/** Tag de estado com cor e texto derivados do valor ("pago", "divida", ...). */
export function Estado({ v, text }: { v: unknown; text?: string }) {
  if (v === undefined || v === null || v === '') return <>—</>
  return <Tag tone={toneOf(v)}>{text ?? label(v)}</Tag>
}

export function Card({ title, actions, children, className = '', pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`card ${pad ? '' : 'nopad'} ${className}`}>
      {(title || actions) && (
        <header className="card-h">
          {title && <h3>{title}</h3>}
          {actions && <div className="card-a">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Kpi({ label: l, value, tone, hint, onClick }: { label: string; value: ReactNode; tone?: 'good' | 'bad' | 'warn'; hint?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span>{l}</span>
      <b>{value}</b>
      {hint && <small>{hint}</small>}
    </>
  )
  return onClick ? (
    <button type="button" className={`card kpi ${tone || ''} clk`} onClick={onClick}>{inner}</button>
  ) : (
    <div className={`card kpi ${tone || ''}`}>{inner}</div>
  )
}

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  useEffect(() => { document.title = `${title} · CLACS Escola` }, [title])
  return (
    <div className="page-h">
      <div>
        <h2>{title}</h2>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {actions && <div className="page-a">{actions}</div>}
    </div>
  )
}

export function Loading({ text = 'A carregar…' }: { text?: string }) {
  return (
    <div className="state"><Spinner /> <span>{text}</span></div>
  )
}

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error || 'Erro')
  return (
    <div className="state err" role="alert">
      <b>Não foi possível carregar os dados.</b>
      <span>{msg}</span>
      {retry && <Btn variant="ghost" size="sm" onClick={retry}>Tentar de novo</Btn>}
    </div>
  )
}

export function Empty({ children = 'Sem registos.' }: { children?: ReactNode }) {
  return <div className="state empty">{children}</div>
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([k, l]) => (
        <button key={k} role="tab" type="button" aria-selected={value === k} className={`tab ${value === k ? 'on' : ''}`} onClick={() => onChange(k)}>
          {l}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label: l, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="sw">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={l} />
      <i />
    </label>
  )
}

/** Barra de filtros: encapsula o espaçamento e quebra de linha. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>
}

export function Select({
  value, onChange, options, placeholder, label: l, className,
}: {
  value: string | number | undefined; onChange: (v: string) => void; options: { value: string | number; label: string }[]
  placeholder?: string; label: string; className?: string
}) {
  return (
    <select aria-label={l} className={className} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Procurar…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])
  useEffect(() => {
    const t = setTimeout(() => local !== value && onChange(local), 300)
    return () => clearTimeout(t)
  }, [local]) // eslint-disable-line react-hooks/exhaustive-deps
  return <input type="search" className="search" value={local} placeholder={placeholder} aria-label={placeholder} onChange={(e) => setLocal(e.target.value)} />
}

/** Valor genérico → texto legível (para chaves/valores devolvidos pela API). */
export function fmtValue(k: string, v: unknown): ReactNode {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  if (typeof v === 'number') return /valor|total|montante|divida|receb|preco|saldo|multa|desconto/i.test(k) ? Kz(v) : v.toLocaleString('pt-PT')
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) return dataPT(v, v.length > 10)
    if (/estado|situacao|status/i.test(k)) return <Estado v={v} />
    return v
  }
  if (Array.isArray(v)) return v.length ? `${v.length} item(s)` : '—'
  return JSON.stringify(v)
}

/** Lista chave/valor para qualquer objecto devolvido pela API. */
export function KV({ data, skip = [] }: { data: Row; skip?: string[] }) {
  const entries = Object.entries(data || {}).filter(([k, v]) => !skip.includes(k) && (typeof v !== 'object' || v === null || Array.isArray(v)))
  const nested = Object.entries(data || {}).filter(([k, v]) => !skip.includes(k) && v && typeof v === 'object' && !Array.isArray(v))
  return (
    <div className="kv-wrap">
      <dl className="kv">
        {entries.map(([k, v]) => (
          <div key={k}><dt>{humanize(k)}</dt><dd>{fmtValue(k, v)}</dd></div>
        ))}
      </dl>
      {nested.map(([k, v]) => (
        <div key={k} className="kv-sub">
          <h4>{humanize(k)}</h4>
          <KV data={v as Row} />
        </div>
      ))}
    </div>
  )
}

export function Field({ label: l, children, hint, wide }: { label: string; children: ReactNode; hint?: string; wide?: boolean }) {
  return (
    <label className={`fld ${wide ? 'wide' : ''}`}>
      <span>{l}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="prog" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${v}%` }} />
    </div>
  )
}

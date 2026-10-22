import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Btn, KV } from './ui'
import type { Row } from '@/lib/data'

export function Modal({
  title, onClose, children, footer, size = 'md',
}: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('input:not([type=hidden]),select,textarea,button.btn')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')]
        if (!f.length) return
        const a = f[0], z = f[f.length - 1]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('noscroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('noscroll')
      prev?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="modal-h">
          <h3>{title}</h3>
          <button type="button" className="x" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="modal-b">{children}</div>
        {footer && <footer className="modal-f">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

/* ---------- Confirmação imperativa: const ok = await confirm('Anular?') ---------- */
type ConfirmOpts = { title?: string; text: ReactNode; yes?: string; danger?: boolean }
const ConfirmCtx = createContext<(o: ConfirmOpts | string) => Promise<boolean>>(async () => false)
export const useConfirm = () => useContext(ConfirmCtx)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const confirm = useCallback(
    (o: ConfirmOpts | string) => new Promise<boolean>((resolve) => setSt({ ...(typeof o === 'string' ? { text: o } : o), resolve })),
    [],
  )
  const done = (v: boolean) => { st?.resolve(v); setSt(null) }
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {st && (
        <Modal
          size="sm"
          title={st.title || 'Confirmar'}
          onClose={() => done(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => done(false)}>Cancelar</Btn>
              <Btn variant={st.danger ? 'danger' : 'primary'} onClick={() => done(true)}>{st.yes || 'Confirmar'}</Btn>
            </>
          }
        >
          <p style={{ margin: 0 }}>{st.text}</p>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  )
}

/** Mostra o resultado de uma operação (gerar cobranças, sincronizar, simular fecho...). */
export function ResultDialog({ title, data, onClose }: { title: string; data: unknown; onClose: () => void }) {
  const isObj = data && typeof data === 'object' && !Array.isArray(data)
  return (
    <Modal title={title} onClose={onClose} size="lg" footer={<Btn onClick={onClose}>Fechar</Btn>}>
      {isObj ? <KV data={data as Row} /> : <p style={{ margin: 0 }}>{typeof data === 'string' ? data : 'Operação concluída.'}</p>}
      {data !== undefined && data !== null && typeof data === 'object' && (
        <details className="raw">
          <summary>Resposta completa</summary>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </details>
      )}
    </Modal>
  )
}

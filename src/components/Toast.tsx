import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Kind = 'ok' | 'er' | 'n'
type Item = { id: number; text: string; kind: Kind }
type Ctx = { ok: (t: string) => void; error: (t: string) => void; info: (t: string) => void }

const ToastCtx = createContext<Ctx>({ ok() {}, error() {}, info() {} })
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const seq = useRef(0)

  const push = useCallback((text: string, kind: Kind) => {
    const id = ++seq.current
    setItems((l) => [...l.slice(-3), { id, text, kind }])
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), kind === 'er' ? 6000 : 3200)
  }, [])

  const ctx = useMemo<Ctx>(
    () => ({ ok: (t) => push(t, 'ok'), error: (t) => push(t, 'er'), info: (t) => push(t, 'n') }),
    [push],
  )

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`toast-i ${i.kind}`}>
            {i.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

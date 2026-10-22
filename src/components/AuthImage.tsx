import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/** Imagem que precisa do token de sessão (fotografias guardadas em /ficheiros). */
export function AuthImage({ src, alt, fallback }: { src?: string | null; alt: string; fallback: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let alive = true
    let obj: string | undefined
    setUrl(undefined)
    if (!src) return
    if (/^data:/.test(src)) { setUrl(src); return }
    api.blob(src)
      .then((b) => { if (alive) { obj = URL.createObjectURL(b); setUrl(obj) } })
      .catch(() => { /* mantém o fallback */ })
    return () => { alive = false; if (obj) URL.revokeObjectURL(obj) }
  }, [src])
  return url ? <img src={url} alt={alt} /> : <>{fallback}</>
}

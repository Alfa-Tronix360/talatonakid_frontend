import { useState } from 'react'
import { Card, PageHead, Switch } from '@/components/ui'
import { api } from '@/lib/api'
import { CANAIS } from '@/lib/academic'
import { useAct } from '@/lib/hooks'

export default function Preferencias() {
  const [estado, setEstado] = useState<Record<string, boolean>>({})
  const m = useAct((v: { canal: string; activo: boolean }) => api.put('/portal/preferencias', v), { ok: 'Preferência guardada.' })
  return (
    <>
      <PageHead title="Preferências" sub="Escolha por onde quer receber lembretes de propinas e avisos do colégio." />
      <Card>
        {CANAIS.map((c) => (
          <div className="rule" key={c.value}>
            <div><b>{c.label}</b><br /><span className="mu" style={{ fontSize: 13 }}>Receber avisos por {c.label}</span></div>
            <Switch label={`Receber por ${c.label}`} checked={estado[c.value] ?? true} onChange={(v) => { setEstado((s) => ({ ...s, [c.value]: v })); m.mutate({ canal: c.value, activo: v }) }} />
          </div>
        ))}
      </Card>
    </>
  )
}

import { useState } from 'react'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Resource } from '@/components/Resource'
import { Btn, Estado, PageHead } from '@/components/ui'
import { api } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { CANAIS } from '@/lib/academic'
import { useAct } from '@/lib/hooks'

const fields: FieldDef[] = [
  { name: 'nome_completo', label: 'Nome completo', required: true, wide: true },
  { name: 'telefone', label: 'Telefone', type: 'tel' },
  { name: 'whatsapp', label: 'WhatsApp', type: 'tel', hint: 'Se for diferente do telefone' },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'nif', label: 'NIF', hint: 'Segue para o Primavera na emissão de facturas' },
  { name: 'bi_numero', label: 'BI' },
  { name: 'profissao', label: 'Profissão' },
  { name: 'morada', label: 'Morada', wide: true },
]

export default function Encarregados() {
  const [prefs, setPrefs] = useState<Row | null>(null)
  const [conta, setConta] = useState<Row | null>(null)
  const pref = useAct((v: { id: number; canal: string; activo: boolean }) => api.put(`/encarregados/${v.id}/preferencias`, { canal: v.canal, activo: v.activo }), { ok: 'Preferência guardada.', invalidate: ['/encarregados'] })
  const criarConta = useAct((v: { id: number; p: Row }) => api.post(`/encarregados/${v.id}/conta`, v.p), { ok: 'Conta do portal criada.', invalidate: ['/encarregados'] })

  return (
    <>
      <PageHead title="Encarregados de educação" sub="Contactos, NIF para facturação e acesso ao portal. Vários educandos permitem aplicar desconto de irmãos." />
      <Resource
        path="/encarregados"
        search
        createFields={fields}
        createLabel="Novo encarregado"
        editFields={[...fields, { name: 'activo', label: 'Estado', type: 'checkbox', hint: 'Encarregado activo', default: true }]}
        editPath={(r) => `/encarregados/${r.id}`}
        cols={[
          { h: 'Nome', k: ['nome_completo', 'nome'] },
          { h: 'Telefone', k: ['telefone', 'whatsapp'] },
          { h: 'E-mail', k: 'email' },
          { h: 'NIF', k: 'nif' },
          { h: 'Educandos', render: (r) => { const e = pick(r, 'educandos', 'alunos'); return Array.isArray(e) ? e.map((a: Row) => a.nome_completo ?? a.nome ?? a).join(', ') || '—' : (pick(r, 'num_educandos', 'total_educandos') ?? '—') } },
          { h: 'Estado', render: (r) => <Estado v={pick(r, 'activo') === false ? 'inactivo' : 'activo'} /> },
        ]}
        rowActions={(r) => (
          <>
            <Btn variant="link" onClick={() => setPrefs(r)}>Contactos</Btn>
            <Btn variant="link" onClick={() => setConta(r)}>Conta do portal</Btn>
          </>
        )}
      />
      {prefs && (
        <FormDialog
          title={`Canais de contacto — ${pick(prefs, 'nome_completo', 'nome')}`}
          size="sm"
          submitLabel="Guardar"
          fields={CANAIS.map((c) => ({ name: c.value, label: c.label, type: 'checkbox' as const, hint: `Receber por ${c.label}`, default: true }))}
          onClose={() => setPrefs(null)}
          onSubmit={async (_, raw) => { for (const c of CANAIS) await pref.mutateAsync({ id: prefs.id, canal: c.value, activo: !!raw[c.value] }) }}
        />
      )}
      {conta && (
        <FormDialog
          title={`Criar conta do portal — ${pick(conta, 'nome_completo', 'nome')}`}
          size="sm"
          intro="O encarregado usa este e-mail e palavra-passe para entrar no portal e consultar propinas, notas e recibos."
          submitLabel="Criar conta"
          fields={[
            { name: 'email', label: 'E-mail de acesso', type: 'email', required: true, default: conta.email, wide: true },
            { name: 'senha', label: 'Palavra-passe inicial', type: 'password', required: true, wide: true, hint: 'Mínimo de 8 caracteres' },
          ]}
          onClose={() => setConta(null)}
          onSubmit={(p) => criarConta.mutateAsync({ id: conta.id, p })}
        />
      )}
    </>
  )
}

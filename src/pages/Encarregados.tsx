import { useState } from 'react'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Resource } from '@/components/Resource'
import { Link } from 'react-router'
import { Btn, Estado, PageHead, Tag } from '@/components/ui'
import { api } from '@/lib/api'
import { asList, num, pick, type Row } from '@/lib/data'
import { Kz } from '@/lib/format'
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

/** Linha expandida: educandos (com ligação à ficha) e o resumo das contas do encarregado. */
function DetalheEncarregado({ r }: { r: Row }) {
  const educandos = asList(pick(r, 'educandos'))
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <div>
        <b>Educandos</b>
        {educandos.length ? (
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {educandos.map((a: Row) => <li key={a.id}><Link to={`/alunos/${a.id}`}>{a.nome ?? a.nome_completo}</Link></li>)}
          </ul>
        ) : <p className="mu" style={{ margin: '6px 0 0' }}>Sem educandos ligados.</p>}
      </div>
      <div>
        <b>Contas</b>
        <p style={{ margin: '6px 0 0' }}>
          Pago: <b>{Kz(pick(r, 'total_pago'))}</b> · Em dívida: <b>{Kz(pick(r, 'total_em_divida'))}</b>
          {num(pick(r, 'cobrancas_em_atraso')) > 0 ? <> · {pick(r, 'cobrancas_em_atraso')} cobrança(s) em atraso</> : null}
        </p>
        <p style={{ margin: '6px 0 0' }}>
          {[pick(r, 'email'), pick(r, 'nif') && `NIF ${pick(r, 'nif')}`, pick(r, 'profissao')].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  )
}

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
        hint="Clique num encarregado para ver os educandos e a situação das contas."
        deletePath={(r) => `/encarregados/${r.id}`}
        expand={(r) => <DetalheEncarregado r={r} />}
        cols={[
          { h: 'Nome', k: ['nome_completo', 'nome'] },
          { h: 'Telefone', k: ['telefone', 'whatsapp'] },
          { h: 'N.º de filhos', right: true, render: (r) => pick(r, 'num_educandos') ?? asList(pick(r, 'educandos')).length },
          { h: 'Pago', right: true, render: (r) => Kz(pick(r, 'total_pago')) },
          {
            h: 'Em dívida', right: true,
            render: (r) => (num(pick(r, 'total_em_divida')) > 0
              ? <span style={{ color: 'var(--er)', fontWeight: 600 }}>{Kz(pick(r, 'total_em_divida'))}</span> : '—'),
          },
          { h: 'Em atraso', right: true, render: (r) => (num(pick(r, 'cobrancas_em_atraso')) > 0 ? <Tag tone="er">{pick(r, 'cobrancas_em_atraso')} cobrança(s)</Tag> : '—') },
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

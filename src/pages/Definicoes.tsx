import { useState } from 'react'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Resource } from '@/components/Resource'
import { Btn, Card, KV, Loading, PageHead, Tabs } from '@/components/ui'
import { api } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { useAct, useGet } from '@/lib/hooks'

const escolaFields: FieldDef[] = [
  { name: 'nome', label: 'Nome do colégio', wide: true },
  { name: 'nif', label: 'NIF' },
  { name: 'telefone', label: 'Telefone', type: 'tel' },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'morada', label: 'Morada', wide: true },
  { name: 'logotipo_url', label: 'Endereço do logótipo', wide: true },
]

function Escola() {
  const q = useGet<Row>('/estabelecimento')
  const [edit, setEdit] = useState(false)
  const guardar = useAct((p: Row) => api.patch('/estabelecimento', p), { invalidate: ['/estabelecimento'], ok: 'Dados do colégio guardados.' })
  if (q.isLoading) return <Loading />
  return (
    <Card title="Dados do colégio" actions={<Btn variant="ghost" onClick={() => setEdit(true)}>Editar</Btn>}>
      {q.data ? <KV data={q.data} skip={['id']} /> : <span className="mu">Sem dados.</span>}
      {edit && <FormDialog title="Dados do colégio" fields={escolaFields} initial={q.data} onClose={() => setEdit(false)} onSubmit={(p) => guardar.mutateAsync(p)} />}
    </Card>
  )
}

function Parametros() {
  const [edit, setEdit] = useState<Row | null>(null)
  const def = useAct((v: { chave: string; p: Row }) => api.put(`/parametros/${encodeURIComponent(v.chave)}`, v.p), { invalidate: ['/parametros'], ok: 'Parâmetro guardado.' })
  const show = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v))
  return (
    <>
      <Resource
        path="/parametros"
        hint="Parâmetros de funcionamento (dia de vencimento, nota mínima, faltas máximas…). Valores podem ser texto, número, verdadeiro/falso ou JSON."
        cols={[
          { h: 'Chave', k: 'chave' },
          { h: 'Valor', render: (r) => <code>{show(pick(r, 'valor'))}</code> },
          { h: 'Descrição', k: 'descricao', nowrap: false },
        ]}
        rowActions={(r) => <Btn variant="link" onClick={() => setEdit(r)}>Alterar</Btn>}
      />
      {edit && (
        <FormDialog
          title={`Parâmetro: ${edit.chave}`} size="sm" onClose={() => setEdit(null)} initial={{ valor: show(edit.valor), descricao: edit.descricao }}
          fields={[{ name: 'valor', label: 'Valor', required: true, wide: true }, { name: 'descricao', label: 'Descrição', wide: true }]}
          onSubmit={(p) => {
            let valor: unknown = p.valor
            try { valor = JSON.parse(String(p.valor)) } catch { /* mantém como texto */ }
            return def.mutateAsync({ chave: String(edit.chave), p: { valor, descricao: p.descricao } })
          }}
        />
      )}
    </>
  )
}

export default function Definicoes() {
  const [tab, setTab] = useState<'escola' | 'parametros'>('escola')
  return (
    <>
      <PageHead title="Definições da escola" sub="Identificação do colégio e parâmetros de funcionamento." />
      <Tabs value={tab} onChange={setTab} tabs={[['escola', 'Colégio'], ['parametros', 'Parâmetros']]} />
      {tab === 'escola' ? <Escola /> : <Parametros />}
    </>
  )
}

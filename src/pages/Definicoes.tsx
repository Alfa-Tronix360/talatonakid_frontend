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

const CONHECIDOS = [
  { value: 'capacidade_turma', label: 'capacidade_turma — alunos por turma por omissão (7)' },
  { value: 'nota_maxima', label: 'nota_maxima — escala das notas (10 ou 20)' },
  { value: 'nota_minima', label: 'nota_minima — média para positiva/aprovação (metade da máxima)' },
  { value: 'faltas_maximas', label: 'faltas_maximas — faltas a partir das quais o aluno reprova' },
  { value: 'dia_vencimento', label: 'dia_vencimento — dia do mês em que a propina vence' },
  { value: 'desconto_irmaos_automatico', label: 'desconto_irmaos_automatico — true/false' },
]

function Parametros() {
  const [edit, setEdit] = useState<Row | null>(null)
  const [novo, setNovo] = useState(false)
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
        toolbar={<Btn onClick={() => setNovo(true)}>Novo parâmetro</Btn>}
      />
      {novo && (
        <FormDialog
          title="Novo parâmetro" size="sm" onClose={() => setNovo(false)}
          fields={[
            { name: 'chave', label: 'Parâmetro', type: 'select', options: CONHECIDOS, required: true, wide: true },
            { name: 'valor', label: 'Valor', required: true, wide: true, placeholder: 'Ex.: 7' },
            { name: 'descricao', label: 'Descrição', wide: true },
          ]}
          onSubmit={(p) => {
            let valor: unknown = p.valor
            try { valor = JSON.parse(String(p.valor)) } catch { /* mantém como texto */ }
            return def.mutateAsync({ chave: String(p.chave), p: { valor, descricao: p.descricao } })
          }}
        />
      )}
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

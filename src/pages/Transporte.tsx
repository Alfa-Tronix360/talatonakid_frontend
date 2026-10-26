import { useState, type FormEvent } from 'react'
import { FormDialog, FormFields, toPayload, type FieldDef } from '@/components/FormDialog'
import { Modal, useConfirm } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Estado, Loading, PageHead, Select, Tabs, Tag, Toolbar } from '@/components/ui'
import { api } from '@/lib/api'
import { alunoOptions, servicoOptions } from '@/lib/academic'
import { asList, type Row } from '@/lib/data'
import { useAct, useList } from '@/lib/hooks'
import { SinalNEE } from './Alunos'

type Tab = 'rotas' | 'viaturas' | 'inscricoes'
const SENTIDOS = [{ value: 'ida_volta', label: 'Ida e volta' }, { value: 'ida', label: 'Só ida' }, { value: 'volta', label: 'Só volta' }]
const nomeSentido = (s: unknown) => SENTIDOS.find((x) => x.value === s)?.label ?? String(s ?? '')
const hora = (h: unknown) => (h ? String(h).slice(0, 5) : '—')

const viaturaFields: FieldDef[] = [
  { name: 'matricula', label: 'Matrícula', required: true, placeholder: 'LD-45-12-AB' },
  { name: 'descricao', label: 'Marca e modelo', placeholder: 'Toyota Hiace' },
  { name: 'lugares', label: 'Lugares', type: 'number', required: true, min: 1 },
  { name: 'motorista', label: 'Motorista' },
  { name: 'telefone_motorista', label: 'Telefone do motorista', type: 'tel' },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]
const rotaFields: FieldDef[] = [
  { name: 'nome', label: 'Nome da rota', required: true, placeholder: 'Rota Talatona', wide: true },
  { name: 'viatura_id', label: 'Viatura', type: 'select', options: { path: '/transporte/viaturas', label: ['matricula'], text: (v) => `${v.matricula}${v.descricao ? ` — ${v.descricao}` : ''} (${v.lugares} lugares)` } },
  { name: 'servico_id', label: 'Serviço cobrado', type: 'select', options: { ...servicoOptions, filter: (s) => s.categoria === 'transporte' }, hint: 'Em branco na criação: o serviço de transporte da escola' },
  { name: 'hora_ida', label: 'Hora de partida (ida)', type: 'time' },
  { name: 'hora_volta', label: 'Hora de partida (volta)', type: 'time' },
  { name: 'descricao', label: 'Descrição', type: 'textarea' },
]
const paragemFields: FieldDef[] = [
  { name: 'nome', label: 'Paragem', required: true, wide: true },
  { name: 'ordem', label: 'Ordem', type: 'number', required: true, min: 1 },
  { name: 'referencia', label: 'Ponto de referência' },
  { name: 'hora_ida', label: 'Hora (ida)', type: 'time' },
  { name: 'hora_volta', label: 'Hora (volta)', type: 'time' },
]

function Passageiros({ rota, onClose }: { rota: Row; onClose: () => void }) {
  const q = useList(`/transporte/rotas/${rota.id}/alunos`)
  return (
    <Modal title={`Passageiros — ${rota.nome}`} size="lg" onClose={onClose}>
      {q.isLoading ? <Loading /> : (
        <Table rows={q.rows} pageSize={0} empty="Ninguém inscrito nesta rota."
          cols={[
            { h: 'Paragem', render: (p) => p.paragem ?? '—' },
            { h: 'Aluno', render: (p) => <>{p.aluno} <SinalNEE r={p} /></>, nowrap: false },
            { h: 'Turma', k: 'turma' },
            { h: 'Sentido', render: (p) => nomeSentido(p.sentido) },
            { h: 'Encarregado', k: 'encarregado' },
            { h: 'Telefone', k: 'telefone' },
          ]} />
      )}
    </Modal>
  )
}

function Rotas() {
  const [pass, setPass] = useState<Row | null>(null)
  const [paragem, setParagem] = useState<Row | null>(null)
  const criarParagem = useAct((v: { rota: Row; p: Row }) => api.post(`/transporte/rotas/${v.rota.id}/paragens`, v.p), { invalidate: ['/transporte'], ok: 'Paragem acrescentada.' })
  const apagarParagem = useAct((id: number) => api.del(`/transporte/paragens/${id}`), { invalidate: ['/transporte'], ok: 'Paragem apagada.' })
  return (
    <>
      <Resource
        path="/transporte/rotas" createLabel="Nova rota" createFields={rotaFields} crud="/transporte/rotas"
        hint="Clique numa rota para ver as paragens."
        invalidate={['/transporte']}
        expand={(r) => (
          <div>
            <Table rows={asList(r.paragens)} pageSize={0} empty="Sem paragens."
              cols={[
                { h: 'Ordem', k: 'ordem' }, { h: 'Paragem', k: 'nome' }, { h: 'Referência', k: 'referencia' },
                { h: 'Ida', render: (p) => hora(p.hora_ida) }, { h: 'Volta', render: (p) => hora(p.hora_volta) },
                { h: '', render: (p) => <Btn variant="link" onClick={() => apagarParagem.mutate(p.id)}>Apagar</Btn> },
              ]} />
            <Btn variant="ghost" size="sm" onClick={() => setParagem(r)}>Acrescentar paragem</Btn>
          </div>
        )}
        cols={[
          { h: 'Rota', k: 'nome' },
          { h: 'Viatura', render: (r) => r.viatura ?? '—' },
          { h: 'Motorista', render: (r) => (r.motorista ? `${r.motorista}${r.telefone_motorista ? ` · ${r.telefone_motorista}` : ''}` : '—') },
          { h: 'Partida', render: (r) => `${hora(r.hora_ida)} / ${hora(r.hora_volta)}` },
          { h: 'Paragens', right: true, render: (r) => asList(r.paragens).length },
          {
            h: 'Lotação', render: (r) => (r.lugares == null ? `${r.inscritos} inscritos`
              : <>{r.inscritos}/{r.lugares} <Tag tone={r.lugares_livres === 0 ? 'er' : 'n'}>{r.lugares_livres === 0 ? 'Cheia' : `${r.lugares_livres} livres`}</Tag></>),
          },
        ]}
        rowActions={(r) => <Btn variant="link" onClick={() => setPass(r)}>Passageiros</Btn>}
      />
      {pass && <Passageiros rota={pass} onClose={() => setPass(null)} />}
      {paragem && (
        <FormDialog title={`Nova paragem — ${paragem.nome}`} size="sm" fields={paragemFields}
          initial={{ ordem: asList(paragem.paragens).length + 1 }}
          onClose={() => setParagem(null)} onSubmit={(p) => criarParagem.mutateAsync({ rota: paragem, p })} />
      )}
    </>
  )
}

function Inscricoes() {
  const confirm = useConfirm()
  const [rota, setRota] = useState('')
  const [nova, setNova] = useState(false)
  const rotas = useList('/transporte/rotas')
  const alunos = useList('/alunos', { limit: 500 })
  const q = useList('/transporte/inscricoes', { rota_id: rota, estado: 'activa' })
  const inv = ['/transporte', '/refeitorio', '/cobrancas']
  const inscrever = useAct((p: Row) => api.post('/transporte/inscricoes', p), { invalidate: inv, ok: 'Aluno inscrito no transporte.' })
  const mudar = useAct((v: { id: number; estado: string }) => api.patch(`/transporte/inscricoes/${v.id}`, { estado: v.estado }), { invalidate: inv, ok: 'Inscrição actualizada.' })
  const nomeAluno = (id: number) => alunos.rows.find((a) => a.id === id)?.nome_completo ?? `Aluno ${id}`
  const rotaDe = (id: number) => rotas.rows.find((r) => r.id === id)
  const paragensDe = (id: unknown) => asList(rotaDe(Number(id))?.paragens)

  return (
    <>
      <Toolbar>
        <Select label="Rota" value={rota} onChange={setRota} placeholder="Todas as rotas" options={rotas.rows.map((r) => ({ value: r.id, label: String(r.nome) }))} />
        <span className="grow" />
        <Btn onClick={() => setNova(true)}>Inscrever aluno</Btn>
      </Toolbar>
      <Table rows={q.rows} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} empty="Sem alunos inscritos."
        cols={[
          { h: 'Aluno', render: (i) => nomeAluno(i.aluno_id) },
          { h: 'Rota', render: (i) => rotaDe(i.rota_id)?.nome ?? '—' },
          { h: 'Paragem', render: (i) => paragensDe(i.rota_id).find((p: Row) => p.id === i.paragem_id)?.nome ?? '—' },
          { h: 'Sentido', render: (i) => nomeSentido(i.sentido) },
          { h: 'Cobrado', render: (i) => (i.adesao_id ? 'Sim' : 'Não') },
          { h: 'Estado', render: (i) => <Estado v={i.estado} /> },
          {
            h: '', render: (i) => (
              <span className="row-a">
                <Btn variant="link" onClick={() => mudar.mutate({ id: i.id, estado: 'suspensa' })}>Suspender</Btn>
                <Btn variant="link" onClick={async () => {
                  if (await confirm({ title: 'Cancelar inscrição', text: 'O aluno deixa de usar o transporte e de ser cobrado.', danger: true, yes: 'Cancelar inscrição' })) mudar.mutate({ id: i.id, estado: 'cancelada' })
                }}>Cancelar</Btn>
              </span>
            ),
          },
        ]} />
      {nova && <NovaInscricao rotas={rotas.rows} onClose={() => setNova(false)} onSubmit={(p) => inscrever.mutateAsync(p)} />}
    </>
  )
}

/** Formulário de inscrição: a lista de paragens depende da rota escolhida. */
function NovaInscricao({ rotas, onClose, onSubmit }: { rotas: Row[]; onClose: () => void; onSubmit: (p: Row) => Promise<unknown> }) {
  const [v, setV] = useState<Row>({ sentido: 'ida_volta', cobrar: true })
  const [busy, setBusy] = useState(false)
  const paragens = asList(rotas.find((r) => String(r.id) === String(v.rota_id))?.paragens)
  const fields: FieldDef[] = [
    { name: 'aluno_id', label: 'Aluno', type: 'select', options: alunoOptions, required: true, wide: true },
    { name: 'rota_id', label: 'Rota', type: 'select', required: true, options: rotas.map((r) => ({ value: r.id, label: `${r.nome}${r.lugares_livres === 0 ? ' (cheia)' : ''}` })) },
    { name: 'sentido', label: 'Sentido', type: 'select', options: SENTIDOS, required: true },
    { name: 'paragem_id', label: 'Paragem', type: 'select', showIf: (x) => !!x.rota_id, empty: '— Sem paragem definida —',
      options: paragens.map((p: Row) => ({ value: p.id, label: `${p.ordem}. ${p.nome}${p.hora_ida ? ` (${hora(p.hora_ida)})` : ''}` })) },
    { name: 'cobrar', label: 'Cobrança', type: 'checkbox', hint: 'Cobrar o serviço de transporte da rota (entra nas propinas mensais)' },
  ]
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try { await onSubmit(toPayload(fields, v)); onClose() } catch { /* o erro já apareceu no aviso */ } finally { setBusy(false) }
  }
  return (
    <Modal title="Inscrever aluno no transporte" onClose={onClose}>
      <form onSubmit={submit}>
        <FormFields fields={fields} values={v} set={(n, x) => setV((s) => ({ ...s, [n]: x, ...(n === 'rota_id' ? { paragem_id: '' } : {}) }))} />
        <div className="form-f">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" busy={busy}>Inscrever</Btn>
        </div>
      </form>
    </Modal>
  )
}

export default function Transporte() {
  const [tab, setTab] = useState<Tab>('rotas')
  return (
    <>
      <PageHead title="Transporte escolar" sub="Rotas, paragens e viaturas; inscrição dos alunos com lotação e cobrança automática." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[['rotas', 'Rotas'], ['inscricoes', 'Alunos inscritos'], ['viaturas', 'Viaturas']]} />
      {tab === 'rotas' && <Rotas />}
      {tab === 'inscricoes' && <Inscricoes />}
      {tab === 'viaturas' && (
        <Resource path="/transporte/viaturas" crud="/transporte/viaturas" createLabel="Nova viatura" createFields={viaturaFields}
          deleteName={(v) => `a viatura ${v.matricula}`}
          cols={[
            { h: 'Matrícula', k: 'matricula' }, { h: 'Viatura', k: 'descricao' }, { h: 'Lugares', right: true, k: 'lugares' },
            { h: 'Motorista', k: 'motorista' }, { h: 'Telefone', k: 'telefone_motorista' },
            { h: 'Estado', render: (v) => <Estado v={v.activo === false ? 'inactivo' : 'activo'} /> },
          ]} />
      )}
    </>
  )
}

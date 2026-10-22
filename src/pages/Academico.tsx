import { useState } from 'react'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Modal, ResultDialog, useConfirm } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Estado, Loading, PageHead, Select, Tabs } from '@/components/ui'
import { api } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { disciplinaOptions, isActivo, useAnoActivo } from '@/lib/academic'
import { dataPT, label } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'

type Tab = 'anos' | 'niveis' | 'classes' | 'disciplinas' | 'salas' | 'funcionarios'

/* ------------ Ano lectivo ------------ */
function Periodos({ ano, onClose }: { ano: Row; onClose: () => void }) {
  const q = useList(`/anos-lectivos/${ano.id}/periodos`)
  const [novo, setNovo] = useState(false)
  const criar = useAct((p: Row) => api.post(`/anos-lectivos/${ano.id}/periodos`, p), { invalidate: [`/anos-lectivos/${ano.id}`], ok: 'Período criado.' })
  return (
    <Modal title={`Períodos de avaliação — ${pick(ano, 'designacao')}`} size="lg" onClose={onClose} footer={<><Btn variant="ghost" onClick={() => setNovo(true)}>Novo período</Btn><Btn onClick={onClose}>Fechar</Btn></>}>
      {q.isLoading ? <Loading /> : (
        <Table rows={q.rows} pageSize={0} cols={[
          { h: 'Ordem', k: 'ordem' }, { h: 'Período', k: ['designacao', 'nome'] },
          { h: 'Início', render: (r) => dataPT(pick(r, 'data_inicio')) }, { h: 'Fim', render: (r) => dataPT(pick(r, 'data_fim')) },
        ]} />
      )}
      {novo && (
        <FormDialog title="Novo período" size="sm" onClose={() => setNovo(false)} onSubmit={(p) => criar.mutateAsync(p)} fields={[
          { name: 'designacao', label: 'Designação', required: true, placeholder: '1.º trimestre', wide: true },
          { name: 'ordem', label: 'Ordem', type: 'number', required: true, default: (q.rows.length || 0) + 1 },
          { name: 'data_inicio', label: 'Início', type: 'date', required: true },
          { name: 'data_fim', label: 'Fim', type: 'date', required: true },
        ]} />
      )}
    </Modal>
  )
}

function Resultados({ ano, onClose }: { ano: Row; onClose: () => void }) {
  const q = useList(`/anos-lectivos/${ano.id}/resultados`)
  return (
    <Modal title={`Resultados finais — ${pick(ano, 'designacao')}`} size="xl" onClose={onClose}>
      {q.isLoading ? <Loading /> : <Table rows={q.rows} error={q.error} empty="Ainda não há resultados gravados. Feche o ano para os calcular." />}
    </Modal>
  )
}

function Transitar({ novo, anos, onClose }: { novo: Row; anos: Row[]; onClose: () => void }) {
  const [de, setDe] = useState('')
  const [copiar, setCopiar] = useState(true)
  const [map, setMap] = useState<Record<string, string>>({})
  const [rep, setRep] = useState<Record<string, string>>({})
  const [res, setRes] = useState<unknown>()
  const antigas = useList(de ? '/turmas' : null, { ano_id: de })
  const novas = useList('/turmas', { ano_id: novo.id })
  const opts = novas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))
  const run = useAct((p: Row) => api.post(`/anos-lectivos/${novo.id}/transitar`, p), { invalidate: ['/matriculas', '/alunos', '/turmas'], ok: 'Transição concluída.', onDone: setRes })
  const pares = (m: Record<string, string>) => Object.entries(m).filter(([, v]) => v).map(([k, v]) => ({ de: Number(k), para: Number(v) }))

  if (res !== undefined) return <ResultDialog title="Resultado da transição" data={res} onClose={onClose} />
  return (
    <Modal
      title={`Transitar alunos para ${pick(novo, 'designacao')}`}
      size="lg"
      onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn busy={run.isPending} disabled={!de || !pares(map).length} onClick={() => run.mutate({ de_ano_id: Number(de), turmas: pares(map), repetentes: pares(rep), copiar_servicos: copiar })}>Transitar</Btn></>}
    >
      <p className="sub" style={{ marginTop: 0 }}>Escolha o ano de origem e, para cada turma, a turma de destino. Os repetentes ficam na turma indicada na segunda coluna.</p>
      <div className="toolbar">
        <Select label="Ano de origem" value={de} onChange={setDe} placeholder="Ano de origem" options={anos.filter((a) => a.id !== novo.id).map((a) => ({ value: a.id, label: String(pick(a, 'designacao')) }))} />
        <label className="inline-chk"><input type="checkbox" checked={copiar} onChange={(e) => setCopiar(e.target.checked)} /> <span>Copiar serviços (propina, refeitório…)</span></label>
      </div>
      {de && (antigas.isLoading ? <Loading /> : (
        <Table rows={antigas.rows} pageSize={0} empty="O ano de origem não tem turmas." cols={[
          { h: 'Turma de origem', k: 'designacao' },
          { h: 'Passa para', render: (r) => <Select label="Destino" value={map[r.id]} onChange={(v) => setMap((m) => ({ ...m, [r.id]: v }))} placeholder="— Não transitar —" options={opts} /> },
          { h: 'Repetentes ficam em', render: (r) => <Select label="Repetentes" value={rep[r.id]} onChange={(v) => setRep((m) => ({ ...m, [r.id]: v }))} placeholder="— Ninguém —" options={opts} /> },
        ]} />
      ))}
    </Modal>
  )
}

function Anos() {
  const confirm = useConfirm()
  const { anos } = useAnoActivo()
  const [dlg, setDlg] = useState<{ k: 'per' | 'res' | 'trans' | 'fecho'; a: Row } | null>(null)
  const [fecho, setFecho] = useState<unknown>()
  const activar = useAct((id: number) => api.post(`/anos-lectivos/${id}/activar`), { invalidate: ['/anos-lectivos', '/turmas', '/matriculas'], ok: 'Ano lectivo activado.' })
  const simular = useAct((v: { id: number; simular: boolean }) => api.post(`/anos-lectivos/${v.id}/fechar`, undefined, { simular: v.simular }), {
    invalidate: ['/anos-lectivos'], silent: true, onDone: (r, v) => setFecho({ ...r, _simulacao: v.simular }),
  })

  return (
    <>
      <Resource
        path="/anos-lectivos"
        createLabel="Novo ano lectivo"
        createFields={[
          { name: 'designacao', label: 'Designação', required: true, placeholder: '2027/2028' },
          { name: 'data_inicio', label: 'Início', type: 'date', required: true },
          { name: 'data_fim', label: 'Fim', type: 'date', required: true },
          { name: 'criar_trimestres', label: 'Períodos', type: 'checkbox', hint: 'Criar os 3 trimestres automaticamente', default: true },
        ]}
        hint="Fechar o ano calcula a média final e a situação de cada aluno. Use primeiro «Simular» para ver o resultado sem gravar."
        cols={[
          { h: 'Ano lectivo', k: ['designacao', 'nome'] },
          { h: 'Início', render: (r) => dataPT(pick(r, 'data_inicio')) },
          { h: 'Fim', render: (r) => dataPT(pick(r, 'data_fim')) },
          { h: 'Estado', render: (r) => <Estado v={isActivo(r) ? 'activo' : pick(r, 'estado') ?? 'encerrado'} text={isActivo(r) ? 'Activo' : label(pick(r, 'estado') ?? 'encerrado')} /> },
        ]}
        rowActions={(a) => (
          <>
            {!isActivo(a) && <Btn variant="link" onClick={() => activar.mutate(a.id)}>Activar</Btn>}
            <Btn variant="link" onClick={() => setDlg({ k: 'per', a })}>Períodos</Btn>
            <Btn variant="link" onClick={() => simular.mutate({ id: a.id, simular: true })}>Simular fecho</Btn>
            <Btn variant="link" onClick={async () => { if (await confirm({ title: 'Fechar ano lectivo', text: `Gravar as médias finais e a situação dos alunos de ${pick(a, 'designacao')}?`, yes: 'Fechar ano' })) simular.mutate({ id: a.id, simular: false }) }}>Fechar ano</Btn>
            <Btn variant="link" onClick={() => setDlg({ k: 'res', a })}>Resultados</Btn>
            <Btn variant="link" onClick={() => setDlg({ k: 'trans', a })}>Transitar para este ano</Btn>
          </>
        )}
      />
      {dlg?.k === 'per' && <Periodos ano={dlg.a} onClose={() => setDlg(null)} />}
      {dlg?.k === 'res' && <Resultados ano={dlg.a} onClose={() => setDlg(null)} />}
      {dlg?.k === 'trans' && <Transitar novo={dlg.a} anos={anos} onClose={() => setDlg(null)} />}
      {fecho !== undefined && <ResultDialog title={(fecho as Row)?._simulacao ? 'Simulação do fecho do ano (nada foi gravado)' : 'Ano fechado'} data={fecho} onClose={() => setFecho(undefined)} />}
    </>
  )
}

/* ------------ Classes ------------ */
function Plano({ c, onClose }: { c: Row; onClose: () => void }) {
  const q = useList(`/classes/${c.id}/disciplinas`)
  const [novo, setNovo] = useState(false)
  const assoc = useAct((p: Row) => api.post(`/classes/${c.id}/disciplinas`, p), { invalidate: [`/classes/${c.id}`], ok: 'Disciplina associada.' })
  return (
    <Modal title={`Plano curricular — ${pick(c, 'designacao')}`} size="lg" onClose={onClose} footer={<><Btn variant="ghost" onClick={() => setNovo(true)}>Associar disciplina</Btn><Btn onClick={onClose}>Fechar</Btn></>}>
      {q.isLoading ? <Loading /> : <Table rows={q.rows} pageSize={0} empty="Sem disciplinas no plano." cols={[{ h: 'Disciplina', k: ['disciplina', 'disciplina.nome', 'nome'] }, { h: 'Sigla', k: ['sigla', 'disciplina.sigla'] }, { h: 'Carga horária', k: 'carga_horaria' }]} />}
      {novo && <FormDialog title="Associar disciplina" size="sm" onClose={() => setNovo(false)} onSubmit={(p) => assoc.mutateAsync(p)} fields={[
        { name: 'disciplina_id', label: 'Disciplina', type: 'select', options: disciplinaOptions, required: true, wide: true },
        { name: 'carga_horaria', label: 'Carga horária semanal', type: 'number' },
      ]} />}
    </Modal>
  )
}

const funcionarioFields: FieldDef[] = [
  { name: 'nome_completo', label: 'Nome completo', required: true, wide: true },
  { name: 'cargo', label: 'Cargo', type: 'select', required: true, default: 'professor', options: ['professor', 'coordenador', 'director', 'secretaria', 'financeiro', 'outro'].map((v) => ({ value: v, label: label(v) })) },
  { name: 'nif', label: 'NIF' },
  { name: 'telefone', label: 'Telefone', type: 'tel' },
  { name: 'email', label: 'E-mail', type: 'email' },
]

export default function Academico() {
  const [tab, setTab] = useState<Tab>('anos')
  const [plano, setPlano] = useState<Row | null>(null)
  return (
    <>
      <PageHead title="Estrutura académica" sub="Anos lectivos, níveis, classes, disciplinas, salas e funcionários." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[['anos', 'Anos lectivos'], ['niveis', 'Níveis'], ['classes', 'Classes'], ['disciplinas', 'Disciplinas'], ['salas', 'Salas'], ['funcionarios', 'Funcionários']]} />

      {tab === 'anos' && <Anos />}
      {tab === 'niveis' && (
        <Resource path="/niveis" createLabel="Novo nível" createFields={[{ name: 'nome', label: 'Nome', required: true, placeholder: 'Ensino Primário' }, { name: 'ordem', label: 'Ordem', type: 'number', default: 0 }]}
          cols={[{ h: 'Ordem', k: 'ordem' }, { h: 'Nível', k: ['nome', 'designacao'] }]} />
      )}
      {tab === 'classes' && (
        <>
          <Resource path="/classes" createLabel="Nova classe" pageSize={30}
            createFields={[
              { name: 'nivel_id', label: 'Nível', type: 'select', options: { path: '/niveis', label: ['nome'] }, required: true },
              { name: 'designacao', label: 'Designação', required: true, placeholder: '7.ª classe' },
              { name: 'ordem', label: 'Ordem', type: 'number', required: true },
            ]}
            cols={[{ h: 'Ordem', k: 'ordem' }, { h: 'Classe', k: ['designacao', 'nome'] }, { h: 'Nível', k: ['nivel', 'nivel_nome', 'nivel.nome'] }]}
            rowActions={(r) => <Btn variant="link" onClick={() => setPlano(r)}>Plano curricular</Btn>} />
          {plano && <Plano c={plano} onClose={() => setPlano(null)} />}
        </>
      )}
      {tab === 'disciplinas' && (
        <Resource path="/disciplinas" search createLabel="Nova disciplina" createFields={[{ name: 'nome', label: 'Nome', required: true }, { name: 'sigla', label: 'Sigla' }]}
          cols={[{ h: 'Disciplina', k: ['nome', 'designacao'] }, { h: 'Sigla', k: 'sigla' }]} />
      )}
      {tab === 'salas' && (
        <Resource path="/salas" createLabel="Nova sala" createFields={[{ name: 'designacao', label: 'Designação', required: true }, { name: 'capacidade', label: 'Capacidade', type: 'number' }]}
          cols={[{ h: 'Sala', k: ['designacao', 'nome'] }, { h: 'Capacidade', k: 'capacidade' }]} />
      )}
      {tab === 'funcionarios' && (
        <Resource path="/funcionarios" search createLabel="Novo funcionário" createFields={funcionarioFields}
          editFields={[...funcionarioFields, { name: 'activo', label: 'Estado', type: 'checkbox', hint: 'Funcionário activo', default: true }]} editPath={(r) => `/funcionarios/${r.id}`}
          cols={[{ h: 'Nome', k: ['nome_completo', 'nome'] }, { h: 'Cargo', render: (r) => label(pick(r, 'cargo')) }, { h: 'Telefone', k: 'telefone' }, { h: 'E-mail', k: 'email' }, { h: 'Estado', render: (r) => <Estado v={pick(r, 'activo') === false ? 'inactivo' : 'activo'} /> }]} />
      )}
    </>
  )
}

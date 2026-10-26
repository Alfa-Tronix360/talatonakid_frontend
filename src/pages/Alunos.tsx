import { useState } from 'react'
import { useNavigate } from 'react-router'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Table, type Col } from '@/components/Table'
import { Btn, Estado, PageHead, SearchBox, Select, Tag, Toolbar } from '@/components/ui'
import { api } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { PARENTESCOS, classeOptions, encarregadoOptions, turmaOptions } from '@/lib/academic'
import { fmtNota } from '@/lib/format'

const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => ({ value: g, label: g }))

/** Sinal bem visível para alunos com necessidades especiais (lista, ficha, pedagógico, transporte). */
export const SinalNEE = ({ r }: { r: Row }) =>
  r.necessidade_especial ? <span title={String(r.necessidades_especiais ?? 'Necessidade especial')}><Tag tone="er">⚠ Necessidade especial</Tag></span> : null

/** Colunas da lista de alunos: N.º, nome (com o sinal), turma, encarregado, médias de cada trimestre e estado. */
export function colunasAlunos(rows: Row[]): Col[] {
  const periodos: Row[] = rows.find((r) => Array.isArray(r.avaliacoes) && r.avaliacoes.length)?.avaliacoes ?? []
  return [
    { h: 'N.º', k: ['numero_processo', 'numero', 'id'] },
    { h: 'Nome', render: (r) => <>{pick(r, 'nome_completo', 'nome')} <SinalNEE r={r} /></>, nowrap: false },
    { h: 'Turma', k: ['turma', 'turma_designacao', 'turma.designacao', 'turma_actual.designacao'] },
    { h: 'Encarregado', k: ['encarregado', 'encarregado_nome', 'encarregado.nome_completo', 'encarregado_principal'] },
    ...periodos.map((p, i): Col => ({
      h: String(p.periodo).replace(' Trimestre', ' T.'),
      right: true,
      render: (r) => fmtNota(r.avaliacoes?.[i]?.media),
    })),
    { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado')} /> },
  ]
}
import { useAct, useGet, useList } from '@/lib/hooks'

export const alunoFields = (novo: boolean): FieldDef[] => [
  { name: 'nome_completo', label: 'Nome completo', required: true, wide: true },
  { name: 'numero_processo', label: 'N.º de processo' },
  { name: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
  { name: 'sexo', label: 'Sexo', type: 'select', options: [{ value: 'F', label: 'Feminino' }, { value: 'M', label: 'Masculino' }] },
  { name: 'nacionalidade', label: 'Nacionalidade', default: novo ? 'Angolana' : undefined },
  { name: 'bi_numero', label: 'BI / Cédula' },
  { name: 'morada', label: 'Morada', wide: true },
  { name: 'escola_anterior', label: 'Escola anterior' },
  // saúde escolar
  { name: 'necessidades_especiais', label: 'Necessidades especiais', wide: true, hint: 'Preenchido: o aluno aparece sinalizado em todas as listas' },
  { name: 'alergias', label: 'Alergias', wide: true },
  { name: 'grupo_sanguineo', label: 'Grupo sanguíneo', type: 'select', options: GRUPOS_SANGUINEOS },
  { name: 'condicoes_saude', label: 'Condições de saúde', placeholder: 'Ex.: asma, diabetes' },
  { name: 'medicacao', label: 'Medicação', wide: true },
  { name: 'contacto_emergencia', label: 'Contacto de emergência', placeholder: 'Nome e parentesco' },
  { name: 'telefone_emergencia', label: 'Telefone de emergência', type: 'tel' },
  ...(novo
    ? ([
        { name: 'encarregado_id', label: 'Encarregado', type: 'select', options: encarregadoOptions, hint: 'Registe primeiro o encarregado, se for novo.' },
        { name: 'parentesco', label: 'Parentesco', type: 'select', options: PARENTESCOS, default: 'mae' },
        { name: 'classe_id', label: 'Classe (matricula na 1.ª turma com vaga)', type: 'select', options: classeOptions, showIf: (v) => !v.turma_id },
        { name: 'turma_id', label: 'Ou uma turma em concreto', type: 'select', options: turmaOptions, showIf: (v) => !v.classe_id },
      ] as FieldDef[])
    : ([
        {
          name: 'estado', label: 'Estado', type: 'select',
          options: [{ value: 'activo', label: 'Activo' }, { value: 'transferido', label: 'Transferido' }, { value: 'desistente', label: 'Desistente' }, { value: 'concluido', label: 'Concluído' }],
        },
      ] as FieldDef[])),
]

export default function Alunos() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [turma, setTurma] = useState('')
  const [estado, setEstado] = useState('')
  const [novo, setNovo] = useState(false)
  const turmas = useList('/turmas')
  const lista = useGet<any>('/alunos', { q, turma_id: turma, estado, limit: 500, offset: 0 }, { keep: true })
  const rows = Array.isArray(lista.data) ? lista.data : (lista.data?.items ?? lista.data?.dados ?? [])

  const criar = useAct((p: Record<string, unknown>) => api.post('/alunos', p), {
    invalidate: ['/alunos', '/matriculas', '/painel'],
    ok: 'Aluno registado.',
    onDone: (r) => r?.id && nav(`/alunos/${r.id}`),
  })

  return (
    <>
      <PageHead
        title="Alunos"
        sub="Cadastro de alunos. Clique num aluno para ver a visão 360°."
        actions={<Btn onClick={() => setNovo(true)}>Novo aluno</Btn>}
      />
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Procurar por nome ou processo" />
        <Select label="Turma" value={turma} onChange={setTurma} placeholder="Todas as turmas"
          options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao', 'nome')) }))} />
        <Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos os estados"
          options={[{ value: 'activo', label: 'Activos' }, { value: 'transferido', label: 'Transferidos' }, { value: 'desistente', label: 'Desistentes' }, { value: 'concluido', label: 'Concluídos' }]} />
      </Toolbar>
      <Table
        rows={rows}
        loading={lista.isLoading}
        error={lista.error}
        onRetry={() => lista.refetch()}
        onRow={(r) => nav(`/alunos/${r.id}`)}
        cols={colunasAlunos(rows)}
      />
      {novo && (
        <FormDialog
          title="Novo aluno"
          size="lg"
          fields={alunoFields(true)}
          submitLabel="Guardar aluno"
          onClose={() => setNovo(false)}
          onSubmit={(p) => criar.mutateAsync(p)}
        />
      )}
    </>
  )
}

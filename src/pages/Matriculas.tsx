import { useState } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { Modal, useConfirm } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Estado, Loading, PageHead, Select } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { alunoOptions, turmaOptions, useAnoActivo } from '@/lib/academic'
import { dataPT, label } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'
import { useToast } from '@/components/Toast'

function Historico({ m, onClose }: { m: Row; onClose: () => void }) {
  const h = useList(`/matriculas/${m.id}/historico`)
  const d = useList(`/matriculas/${m.id}/descontos`)
  return (
    <Modal title={`Matrícula — ${pick(m, 'aluno', 'aluno_nome', 'aluno.nome_completo')}`} size="lg" onClose={onClose}>
      <h4 style={{ margin: '0 0 8px' }}>Histórico</h4>
      {h.isLoading ? <Loading /> : <Table rows={h.rows} pageSize={8} />}
      <h4 style={{ margin: '18px 0 8px' }}>Descontos aplicados</h4>
      {d.isLoading ? <Loading /> : <Table rows={d.rows} pageSize={8} empty="Sem descontos nesta matrícula." />}
    </Modal>
  )
}

export default function Matriculas() {
  const toast = useToast()
  const confirm = useConfirm()
  const { ano, anos } = useAnoActivo()
  const [anoSel, setAnoSel] = useState('')
  const [turma, setTurma] = useState('')
  const turmas = useList('/turmas')
  const [dlg, setDlg] = useState<{ k: 'turma' | 'desc' | 'hist'; m: Row } | null>(null)

  const anoId = anoSel || (ano?.id ? String(ano.id) : '')
  const inv = ['/matriculas', '/alunos', '/turmas']
  const mudar = useAct((v: { id: number; p: Row }) => api.post(`/matriculas/${v.id}/turma`, v.p), { invalidate: inv, ok: 'Turma alterada.' })
  const anular = useAct((id: number) => api.post(`/matriculas/${id}/anular`), { invalidate: inv, ok: 'Matrícula anulada.' })
  const desconto = useAct((v: { id: number; p: Row }) => api.post(`/matriculas/${v.id}/descontos`, v.p), { invalidate: ['/matriculas'], ok: 'Desconto aplicado.' })

  return (
    <>
      <PageHead title="Matrículas" sub={`Matrículas e renovações${ano ? ` do ano lectivo ${pick(ano, 'designacao', 'nome')}` : ''}.`} />
      <Resource
        path="/matriculas"
        params={{ ano_id: anoId || undefined, turma_id: turma || undefined }}
        search
        toolbar={
          <>
            <Select label="Ano lectivo" value={anoId} onChange={setAnoSel} options={anos.map((a) => ({ value: a.id, label: String(pick(a, 'designacao', 'nome')) }))} />
            <Select label="Turma" value={turma} onChange={setTurma} placeholder="Todas as turmas" options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao', 'nome')) }))} />
          </>
        }
        createLabel="Nova matrícula"
        createFields={[
          { name: 'aluno_id', label: 'Aluno', type: 'select', options: alunoOptions, required: true, wide: true },
          { name: 'turma_id', label: 'Turma', type: 'select', options: turmaOptions, required: true },
          { name: 'tipo', label: 'Tipo', type: 'select', required: true, default: 'renovacao', options: [{ value: 'renovacao', label: 'Renovação' }, { value: 'nova', label: 'Nova matrícula' }, { value: 'transferencia', label: 'Transferência' }] },
          { name: 'observacoes', label: 'Observações', type: 'textarea' },
        ]}
        invalidate={inv}
        hint="Se o aluno já estiver matriculado no ano activo, a matrícula muda-o de turma."
        cols={[
          { h: 'Data', render: (r) => dataPT(pick(r, 'data_matricula', 'data', 'criado_em', 'created_at')) },
          { h: 'Aluno', k: ['aluno', 'aluno_nome', 'aluno.nome_completo', 'nome_completo'] },
          { h: 'Turma', k: ['turma', 'turma_designacao', 'turma.designacao'] },
          { h: 'Tipo', render: (r) => label(pick(r, 'tipo')) },
          { h: 'Ano', k: ['ano', 'ano_lectivo', 'ano.designacao', 'ano_designacao'] },
          { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado')} /> },
        ]}
        rowActions={(m) => (
          <>
            <Btn variant="link" onClick={() => setDlg({ k: 'hist', m })}>Histórico</Btn>
            <Btn variant="link" onClick={() => setDlg({ k: 'turma', m })}>Mudar turma</Btn>
            <Btn variant="link" onClick={() => setDlg({ k: 'desc', m })}>Desconto</Btn>
            <Btn variant="link" onClick={() => api.download(`/matriculas/${m.id}/declaracao.pdf`, undefined, undefined, true).catch((e) => toast.error(errMsg(e)))}>Declaração</Btn>
            <Btn variant="link" onClick={async () => { if (await confirm({ title: 'Anular matrícula', text: 'O aluno deixa de estar matriculado neste ano. Continuar?', danger: true, yes: 'Anular' })) anular.mutate(m.id) }}>Anular</Btn>
          </>
        )}
      />
      {dlg?.k === 'hist' && <Historico m={dlg.m} onClose={() => setDlg(null)} />}
      {dlg?.k === 'turma' && (
        <FormDialog
          title="Mudar de turma" size="sm" onClose={() => setDlg(null)}
          fields={[
            { name: 'turma_id', label: 'Nova turma', type: 'select', options: turmaOptions, required: true, wide: true },
            { name: 'motivo', label: 'Motivo', type: 'textarea' },
          ]}
          onSubmit={(p) => mudar.mutateAsync({ id: dlg.m.id, p })}
        />
      )}
      {dlg?.k === 'desc' && (
        <FormDialog
          title="Aplicar desconto" size="sm" onClose={() => setDlg(null)}
          fields={[
            { name: 'desconto_id', label: 'Desconto', type: 'select', options: { path: '/descontos', label: ['designacao', 'nome'] }, required: true, wide: true },
            { name: 'valido_ate', label: 'Válido até', type: 'date' },
          ]}
          onSubmit={(p) => desconto.mutateAsync({ id: dlg.m.id, p })}
        />
      )}
    </>
  )
}


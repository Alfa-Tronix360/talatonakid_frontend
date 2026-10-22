import { useState } from 'react'
import { Modal, ResultDialog } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { useToast } from '@/components/Toast'
import { Btn, Card, KV, Loading, PageHead, Switch } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { dataPT, label } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'

const TIPOS = [
  { value: 'cobranca_turma', label: 'Cobrança por turma' }, { value: 'devedores', label: 'Devedores' },
  { value: 'refeitorio', label: 'Refeitório' }, { value: 'cobrancas', label: 'Mapa de cobranças' },
]

function Execucoes({ r, onClose }: { r: Row; onClose: () => void }) {
  const q = useList(`/relatorios/agendados/${r.id}/execucoes`)
  return (
    <Modal title={`Execuções — ${pick(r, 'nome')}`} size="lg" onClose={onClose}>
      {q.isLoading ? <Loading /> : <Table rows={q.rows} pageSize={10} empty="Ainda não houve execuções." />}
    </Modal>
  )
}

export default function Relatorios() {
  const toast = useToast()
  const [exec, setExec] = useState<Row | null>(null)
  const [res, setRes] = useState<unknown>()
  const agendador = useGet<Row>('/agendador', undefined, { retry: false })
  const baixar = (path: string, formato: string) => api.download(path, { formato }).catch((e) => toast.error(errMsg(e)))
  const toggle = useAct((v: { id: number; activo: boolean }) => api.patch(`/relatorios/agendados/${v.id}`, undefined, { activo: v.activo }), { invalidate: ['/relatorios/agendados'], ok: 'Relatório actualizado.' })
  const correr = useAct((id: number) => api.post(`/relatorios/agendados/${id}/executar`), { invalidate: ['/relatorios/agendados'], silent: true, onDone: (r) => setRes(r ?? 'Relatório gerado e enviado.') })

  return (
    <>
      <PageHead title="Relatórios" sub="Descarregue mapas na hora ou agende o envio periódico por e-mail à Direcção." />
      <div className="grid g2" style={{ marginBottom: 16 }}>
        {[['Devedores', '/relatorios/devedores', 'Quem tem cobranças vencidas por pagar.'], ['Cobrança por turma', '/relatorios/cobranca-turma', 'Percentagem cobrada em cada turma.']].map(([t, p, d]) => (
          <Card key={p} title={t}>
            <p className="mu" style={{ marginTop: 0 }}>{d}</p>
            <div className="row-a">
              <Btn variant="ghost" onClick={() => baixar(p, 'xlsx')}>Excel</Btn>
              <Btn variant="ghost" onClick={() => baixar(p, 'csv')}>CSV</Btn>
              <Btn variant="ghost" onClick={() => baixar(p, 'pdf')}>PDF</Btn>
            </div>
          </Card>
        ))}
      </div>

      <Resource
        title="Relatórios agendados" path="/relatorios/agendados" createLabel="Agendar relatório"
        hint="A frequência usa cron: «0 7 * * 1» = todas as segundas às 7h; «0 8 1 * *» = dia 1 de cada mês às 8h."
        beforeCreate={(p) => ({ ...p, destinatarios: String(p.destinatarios || '').split(/[,;\s]+/).filter(Boolean) })}
        createFields={[
          { name: 'nome', label: 'Nome', required: true, wide: true },
          { name: 'tipo', label: 'Relatório', type: 'select', required: true, options: TIPOS, default: 'devedores' },
          { name: 'formato', label: 'Formato', type: 'select', default: 'xlsx', options: [{ value: 'xlsx', label: 'Excel' }, { value: 'pdf', label: 'PDF' }, { value: 'csv', label: 'CSV' }] },
          { name: 'agenda_cron', label: 'Frequência (cron)', required: true, default: '0 7 * * 1' },
          { name: 'destinatarios', label: 'Destinatários (e-mails separados por vírgula)', required: true, wide: true },
        ]}
        cols={[
          { h: 'Nome', k: 'nome' }, { h: 'Relatório', render: (r) => TIPOS.find((t) => t.value === pick(r, 'tipo'))?.label ?? label(pick(r, 'tipo')) },
          { h: 'Formato', render: (r) => String(pick(r, 'formato') ?? '').toUpperCase() }, { h: 'Frequência', k: 'agenda_cron' },
          { h: 'Última execução', render: (r) => dataPT(pick(r, 'ultima_execucao', 'ultima_execucao_em'), true) },
          { h: 'Activo', render: (r) => <Switch label="Activo" checked={pick(r, 'activo') !== false} onChange={(v) => toggle.mutate({ id: r.id, activo: v })} /> },
        ]}
        rowActions={(r) => (
          <>
            <Btn variant="link" onClick={() => correr.mutate(r.id)}>Executar agora</Btn>
            <Btn variant="link" onClick={() => setExec(r)}>Histórico</Btn>
          </>
        )}
      />

      <Card title="Estado do agendador">
        {agendador.isLoading ? <Loading /> : agendador.data ? <KV data={agendador.data} /> : <span className="mu">Indisponível.</span>}
      </Card>
      {exec && <Execucoes r={exec} onClose={() => setExec(null)} />}
      {res !== undefined && <ResultDialog title="Relatório" data={res} onClose={() => setRes(undefined)} />}
    </>
  )
}

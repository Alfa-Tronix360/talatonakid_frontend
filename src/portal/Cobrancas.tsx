import { useMemo, useState } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { Modal } from '@/components/Modal'
import { Table } from '@/components/Table'
import { Btn, Estado, KV, PageHead, Select, Toolbar } from '@/components/ui'
import { api } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { Kz, dataPT, mesAno } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'
import { emDivida, estadoCobranca } from '@/pages/Cobrancas'

export default function PortalCobrancas() {
  const [estado, setEstado] = useState('')
  const [sel, setSel] = useState<(string | number)[]>([])
  const [ref, setRef] = useState<Row | null>(null)
  const [comp, setComp] = useState(false)
  const q = useList('/portal/cobrancas', { estado })

  const rows = q.rows
  const total = useMemo(() => rows.filter((r) => sel.includes(r.id)).reduce((s, r) => s + emDivida(r), 0), [rows, sel])
  const gerar = useAct((ids: number[]) => api.post<Row>('/portal/pagamentos/referencia', { cobranca_ids: ids }), { silent: true, invalidate: ['/portal/pagamentos'], onDone: (r) => setRef(r ?? {}) })
  const enviar = useAct((v: { ref?: string; f: File }) => {
    const d = new FormData()
    d.append('cobranca_ids', sel.join(','))
    if (v.ref) d.append('referencia', v.ref)
    d.append('ficheiro', v.f)
    return api.form('/portal/pagamentos/comprovativo', d)
  }, { invalidate: ['/portal/cobrancas', '/portal/pagamentos'], ok: 'Comprovativo enviado. Será confirmado pela secretaria.', onDone: () => setSel([]) })

  return (
    <>
      <PageHead title="Cobranças e pagamento" sub="Seleccione o que quer pagar e gere uma referência Multicaixa ou envie o comprovativo da transferência." />
      <Toolbar>
        <Select label="Estado" value={estado} onChange={setEstado} placeholder="Todas" options={[{ value: 'divida', label: 'Em dívida' }, { value: 'pago', label: 'Pagas' }]} />
        <span className="grow" />
        {sel.length > 0 && <span>Seleccionado: <b>{Kz(total)}</b></span>}
        <Btn disabled={!sel.length} busy={gerar.isPending} onClick={() => gerar.mutate(sel.map(Number))}>Gerar referência Multicaixa</Btn>
        <Btn variant="ghost" disabled={!sel.length} onClick={() => setComp(true)}>Enviar comprovativo</Btn>
      </Toolbar>
      <Table
        rows={rows} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}
        selected={sel} onSelect={setSel} empty="Não há cobranças para mostrar."
        cols={[
          { h: 'Educando', k: ['aluno', 'aluno_nome', 'aluno.nome_completo'] },
          { h: 'Serviço', k: ['servico', 'servico_nome', 'servico.nome'] },
          { h: 'Competência', render: (r) => mesAno(pick(r, 'competencia')) },
          { h: 'Vencimento', render: (r) => dataPT(pick(r, 'vencimento', 'data_vencimento')) },
          { h: 'Em dívida', right: true, render: (r) => (emDivida(r) ? Kz(emDivida(r)) : '—') },
          { h: 'Estado', render: (r) => <Estado v={estadoCobranca(r)} /> },
        ]}
      />
      {ref && (
        <Modal title="Referência de pagamento" onClose={() => setRef(null)} footer={<Btn onClick={() => setRef(null)}>Fechar</Btn>}>
          <p style={{ marginTop: 0 }}>Pague num ATM, no Multicaixa Express ou em qualquer agente com os dados abaixo. O pagamento é confirmado automaticamente.</p>
          <KV data={ref} />
        </Modal>
      )}
      {comp && (
        <FormDialog title="Enviar comprovativo" size="sm" onClose={() => setComp(false)} intro={`${sel.length} cobrança(s) seleccionada(s) · ${Kz(total)}`}
          fields={[
            { name: 'ref', label: 'N.º da transferência / depósito', wide: true },
            { name: 'ficheiro', label: 'Comprovativo (PDF ou imagem)', type: 'file', required: true, accept: 'application/pdf,image/*', wide: true },
          ]}
          onSubmit={(_, raw) => enviar.mutateAsync({ ref: raw.ref, f: raw.ficheiro })} />
      )}
    </>
  )
}

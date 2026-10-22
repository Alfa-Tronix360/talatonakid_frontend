import { Table } from '@/components/Table'
import { useToast } from '@/components/Toast'
import { Btn, Estado, PageHead } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { pick } from '@/lib/data'
import { Kz, dataPT } from '@/lib/format'
import { useList } from '@/lib/hooks'

export default function PortalPagamentos() {
  const toast = useToast()
  const q = useList('/portal/pagamentos')
  return (
    <>
      <PageHead title="Pagamentos e recibos" sub="Histórico de pagamentos e estado de cada um." />
      <Table rows={q.rows} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} empty="Ainda não fez pagamentos." cols={[
        { h: 'Data', render: (r) => dataPT(pick(r, 'data_pagamento', 'data', 'criado_em')) },
        { h: 'Método', k: ['metodo', 'metodo_nome', 'metodo.nome'] },
        { h: 'Referência', k: 'referencia' },
        { h: 'Valor', right: true, render: (r) => Kz(pick(r, 'valor', 'valor_total')) },
        { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado') ?? 'confirmado'} /> },
        { h: '', render: (r) => (String(pick(r, 'estado') ?? 'confirmado') === 'confirmado'
          ? <Btn variant="link" onClick={() => api.download(`/portal/pagamentos/${r.id}/recibo.pdf`, undefined, undefined, true).catch((e) => toast.error(errMsg(e)))}>Recibo</Btn> : null) },
      ]} />
    </>
  )
}

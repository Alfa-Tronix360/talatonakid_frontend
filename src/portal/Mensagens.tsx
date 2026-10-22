import { Card, Empty, Estado, Loading, PageHead, Btn } from '@/components/ui'
import { api } from '@/lib/api'
import { pick } from '@/lib/data'
import { dataPT } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'

export default function PortalMensagens() {
  const q = useList('/portal/mensagens')
  const lida = useAct((id: number) => api.post(`/portal/mensagens/${id}/lida`), { invalidate: ['/portal/mensagens'], silent: true })
  return (
    <>
      <PageHead title="Mensagens" sub="Mensagens e comunicados enviados pelo colégio." />
      {q.isLoading ? <Loading /> : !q.rows.length ? <Card><Empty>Sem mensagens.</Empty></Card> : (
        <div className="stack">
          {q.rows.map((m, i) => {
            const nao = !pick(m, 'lida', 'lida_em')
            return (
              <Card key={m.id ?? i} title={<>{String(pick(m, 'assunto', 'titulo') ?? 'Mensagem')} {nao && <Estado v="nova" text="Nova" />}</>}
                actions={nao && m.id ? <Btn size="sm" variant="ghost" onClick={() => lida.mutate(m.id)}>Marcar como lida</Btn> : undefined}>
                <div className="mu" style={{ fontSize: 13, marginBottom: 6 }}>{dataPT(pick(m, 'enviada_em', 'criado_em', 'data', 'created_at'), true)}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{String(pick(m, 'corpo', 'texto', 'mensagem') ?? '')}</div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

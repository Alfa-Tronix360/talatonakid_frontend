import { useState } from 'react'
import { AutoSections } from '@/components/Auto'
import { FormDialog } from '@/components/FormDialog'
import { ResultDialog } from '@/components/Modal'
import { Table } from '@/components/Table'
import { Btn, Card, Estado, Kpi, Loading, PageHead, Tabs } from '@/components/ui'
import { api } from '@/lib/api'
import { humanize, pick, type Row } from '@/lib/data'
import { dataPT } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'
import { fmtValue } from '@/components/ui'

type Tab = 'divergencias' | 'documentos' | 'config'

export default function Primavera() {
  const [tab, setTab] = useState<Tab>('divergencias')
  const [estado, setEstado] = useState('pendente')
  const [res, setRes] = useState<unknown>()
  const [cfg, setCfg] = useState(false)
  const st = useGet<Row>('/primavera')
  const div = useList('/primavera/divergencias', { estado })
  const docs = useList(tab === 'documentos' ? '/primavera/documentos' : null)
  const inv = ['/primavera', '/alertas', '/painel']
  const sync = useAct(() => api.post('/primavera/sincronizar'), { invalidate: inv, silent: true, onDone: (r) => setRes(r ?? 'Sincronização concluída.') })
  const resolver = useAct((v: { id: number; accao: string }) => api.post(`/primavera/divergencias/${v.id}/${v.accao}`), { invalidate: inv, ok: (_, v) => (v.accao === 'resolver' ? 'Divergência resolvida.' : 'Divergência ignorada.') })
  const config = useAct((p: Row) => api.put('/primavera/config', p), { invalidate: ['/primavera'], ok: 'Configuração guardada.' })

  const s = st.data || {}
  const kpis = Object.entries(s).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v))

  return (
    <>
      <PageHead
        title="Integração Primavera"
        sub="O Primavera mantém a facturação legal e a ligação à AGT. Este ecrã mostra o estado da sincronização e as divergências a resolver."
        actions={<Btn busy={sync.isPending} onClick={() => sync.mutate()}>Sincronizar agora</Btn>}
      />
      {st.isLoading ? <Loading /> : (
        <div className="grid" style={{ marginBottom: 16 }}>
          {kpis.map(([k, v]) => (
            <Kpi key={k} label={humanize(k)} value={/ultima|sincroniza.*em|data/i.test(k) && v ? dataPT(v as string, true) : fmtValue(k, v)}
              tone={/diverg/i.test(k) && Number(v) > 0 ? 'bad' : undefined} />
          ))}
        </div>
      )}
      <p className="note" style={{ margin: '0 0 12px' }}>Enquanto a integração estiver inactiva a sincronização é simulada. A API real do Primavera deve ser validada (versão e credenciais) antes de a activar.</p>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[['divergencias', 'Divergências'], ['documentos', 'Documentos sincronizados'], ['config', 'Configuração']]} />

      {tab === 'divergencias' && (
        <>
          <div className="toolbar">
            {['pendente', 'resolvida', 'ignorada'].map((e) => <Btn key={e} variant={estado === e ? 'primary' : 'ghost'} size="sm" onClick={() => setEstado(e)}>{e === 'pendente' ? 'Por resolver' : e === 'resolvida' ? 'Resolvidas' : 'Ignoradas'}</Btn>)}
          </div>
          <Table rows={div.rows} loading={div.isLoading} error={div.error} empty="Sem divergências neste estado." cols={[
            { h: 'Item', k: ['item', 'entidade', 'documento', 'tipo'] },
            { h: 'Problema', k: ['problema', 'descricao', 'detalhe', 'mensagem'], nowrap: false },
            { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado')} /> },
            { h: '', render: (r) => String(pick(r, 'estado') ?? 'pendente') === 'pendente' && (
              <span className="row-a">
                <Btn size="sm" variant="ghost" onClick={() => resolver.mutate({ id: r.id, accao: 'resolver' })}>{pick(r, 'accao_sugerida') ?? 'Resolver'}</Btn>
                <Btn size="sm" variant="link" onClick={() => resolver.mutate({ id: r.id, accao: 'ignorar' })}>Ignorar</Btn>
              </span>
            ) },
          ]} />
        </>
      )}
      {tab === 'documentos' && <Table rows={docs.rows} loading={docs.isLoading} error={docs.error} empty="Ainda não há documentos sincronizados." />}
      {tab === 'config' && (
        <Card title="Configuração da ligação" actions={<Btn variant="ghost" onClick={() => setCfg(true)}>Editar</Btn>}>
          <AutoSections data={pick(s, 'config') ?? {}} />
        </Card>
      )}
      {cfg && (
        <FormDialog title="Configurar integração Primavera" onClose={() => setCfg(false)} onSubmit={(p) => config.mutateAsync(p)}
          initial={{ ...(s as Row), ...(pick(s, 'config') ?? {}) }}
          fields={[
            { name: 'versao', label: 'Versão do Primavera', placeholder: 'v10' },
            { name: 'url_base', label: 'URL base da API', wide: true },
            { name: 'credenciais_ref', label: 'Referência das credenciais', wide: true, hint: 'Nome da variável/segredo no servidor — nunca a palavra-passe.' },
            { name: 'activo', label: 'Estado', type: 'checkbox', hint: 'Integração activa (sincronização real)' },
          ]} />
      )}
      {res !== undefined && <ResultDialog title="Sincronização" data={res} onClose={() => setRes(undefined)} />}
    </>
  )
}

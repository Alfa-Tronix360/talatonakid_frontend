import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AutoSections } from '@/components/Auto'
import { Table, autoCols } from '@/components/Table'
import { useToast } from '@/components/Toast'
import { Btn, Card, ErrorBox, Loading, PageHead, Select, Tabs } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { useAnoActivo } from '@/lib/academic'
import { asList, nameOf, pick, type Row } from '@/lib/data'
import { useGet } from '@/lib/hooks'

export default function Educando() {
  const { id } = useParams()
  const toast = useToast()
  const [tab, setTab] = useState<'geral' | 'notas'>('geral')
  const [periodo, setPeriodo] = useState('')
  const { periodos } = useAnoActivo()
  const q = useGet<Row>(`/portal/educandos/${id}`)
  const notas = useGet<any>(tab === 'notas' ? `/portal/educandos/${id}/notas` : null)

  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const nome = String(pick(q.data, 'nome_completo', 'nome', 'aluno.nome_completo') ?? 'Educando')
  const lista = asList(notas.data)
  const pdf = (path: string, params?: Record<string, string>) => api.download(path, params, undefined, true).catch((e) => toast.error(errMsg(e)))

  return (
    <>
      <PageHead title={nome} sub={<Link to="/portal">← Resumo</Link>}
        actions={<Btn variant="ghost" onClick={() => pdf(`/portal/educandos/${id}/extracto.pdf`)}>Extracto (PDF)</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[['geral', 'Situação'], ['notas', 'Notas e boletim']]} />
      {tab === 'geral' && <AutoSections data={q.data} skip={['id', 'aluno_id']} />}
      {tab === 'notas' && (
        <div className="stack">
          <Card title="Boletim de avaliação">
            <div className="toolbar" style={{ margin: 0 }}>
              {periodos.length ? (
                <Select label="Período" value={periodo} onChange={setPeriodo} placeholder="Escolha o período" options={periodos.map((p) => ({ value: p.id, label: nameOf(p) }))} />
              ) : (
                <input type="number" min={1} placeholder="N.º do período" aria-label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
              )}
              <Btn disabled={!periodo} onClick={() => pdf(`/portal/educandos/${id}/boletim.pdf`, { periodo_id: periodo })}>Abrir boletim (PDF)</Btn>
            </div>
          </Card>
          <Card title="Notas lançadas" pad={false}>
            {notas.isLoading ? <Loading /> : <Table rows={lista} cols={autoCols(lista)} error={notas.error} empty="Ainda não há notas lançadas." />}
          </Card>
        </div>
      )}
    </>
  )
}

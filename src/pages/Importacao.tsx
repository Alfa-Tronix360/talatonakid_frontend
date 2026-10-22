import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { Table } from '@/components/Table'
import { Btn, Card, Estado, Field, Loading, PageHead, Select } from '@/components/ui'
import { api } from '@/lib/api'
import { asList, humanize, pick, type Row } from '@/lib/data'
import { dataPT, sizeOf } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'

const ENTIDADES = [
  { value: 'aluno', label: 'Alunos' },
  { value: 'encarregado', label: 'Encarregados' },
  { value: 'cobranca', label: 'Cobranças' },
  { value: 'pagamento', label: 'Pagamentos' },
]

function Erros({ lote, onClose }: { lote: Row; onClose: () => void }) {
  const q = useList(`/importacao/lotes/${lote.id}/erros`)
  return (
    <Modal title={`Erros do lote #${lote.id}`} size="lg" onClose={onClose}>
      {q.isLoading ? <Loading /> : <Table rows={q.rows} pageSize={15} empty="Este lote não tem erros." />}
    </Modal>
  )
}

export default function Importacao() {
  const [entidade, setEntidade] = useState('aluno')
  const [ficheiro, setFicheiro] = useState<File | null>(null)
  const [origem, setOrigem] = useState('software anterior')
  const [erros, setErros] = useState<Row | null>(null)
  const [res, setRes] = useState<Row | null>(null)
  const modelos = useGet<any>('/importacao/modelos')
  const lotes = useList('/importacao/lotes')
  const importar = useAct(() => {
    const d = new FormData()
    d.append('ficheiro', ficheiro as File)
    d.append('origem', origem)
    return api.form(`/importacao/${entidade}`, d)
  }, { invalidate: ['/importacao', '/alunos', '/encarregados', '/cobrancas', '/pagamentos'], ok: 'Ficheiro importado.', onDone: (r) => { setRes(r); setFicheiro(null) } })

  const colunas = (() => {
    const m = modelos.data
    const v = m && typeof m === 'object' ? (m[entidade] ?? m[`${entidade}s`] ?? asList(m).find((x) => pick(x, 'entidade') === entidade)) : undefined
    const cols = Array.isArray(v) ? v : pick(v, 'colunas', 'campos')
    return Array.isArray(cols) ? cols.map((c) => (typeof c === 'string' ? c : String(pick(c, 'nome', 'coluna') ?? ''))) : []
  })()

  return (
    <>
      <PageHead title="Importação de dados" sub="Migre alunos, encarregados, cobranças e pagamentos do software anterior a partir de ficheiros Excel ou CSV." />
      <div className="two">
        <Card title="Novo ficheiro">
          <div className="fgrid">
            <Field label="O que vai importar"><Select label="Entidade" value={entidade} onChange={setEntidade} options={ENTIDADES} /></Field>
            <Field label="Origem dos dados"><input value={origem} onChange={(e) => setOrigem(e.target.value)} /></Field>
            <Field label="Ficheiro (.xlsx ou .csv)" wide>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)} />
              {ficheiro && <small>{ficheiro.name} · {sizeOf(ficheiro.size)}</small>}
            </Field>
          </div>
          {colunas.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <b style={{ fontSize: 13 }}>Colunas esperadas</b>
              <div className="multi" style={{ marginTop: 6 }}>{colunas.map((c) => <span key={c} className="chip"><span>{c}</span></span>)}</div>
            </div>
          )}
          <div className="form-f"><Btn disabled={!ficheiro} busy={importar.isPending} onClick={() => importar.mutate()}>Importar</Btn></div>
          {res && (
            <div className="intro" style={{ marginTop: 14 }}>
              Resultado: {Object.entries(res).filter(([, v]) => typeof v !== 'object').map(([k, v]) => `${humanize(k)}: ${String(v)}`).join(' · ')}
            </div>
          )}
        </Card>
        <Card title="Antes de importar">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>Importe primeiro <b>encarregados</b> e <b>alunos</b>; só depois cobranças e pagamentos.</li>
            <li>A primeira linha deve ter os nomes das colunas indicadas ao lado.</li>
            <li>Linhas inválidas não bloqueiam as restantes: ficam registadas como erros no lote.</li>
          </ul>
        </Card>
      </div>
      <h3 style={{ margin: '20px 0 8px' }}>Lotes importados</h3>
      <Table rows={lotes.rows} loading={lotes.isLoading} error={lotes.error} empty="Ainda não foram feitas importações." cols={[
        { h: 'Lote', k: 'id' },
        { h: 'Data', render: (r) => dataPT(pick(r, 'criado_em', 'data', 'created_at'), true) },
        { h: 'Entidade', render: (r) => ENTIDADES.find((e) => e.value === pick(r, 'entidade'))?.label ?? pick(r, 'entidade') },
        { h: 'Ficheiro', k: ['ficheiro', 'nome_ficheiro'] },
        { h: 'Origem', k: 'origem' },
        { h: 'Linhas', k: ['total', 'linhas', 'total_linhas'] },
        { h: 'Importadas', k: ['importadas', 'sucesso', 'ok'] },
        { h: 'Erros', k: ['erros', 'total_erros'] },
        { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado')} /> },
        { h: '', render: (r) => <Btn variant="link" onClick={() => setErros(r)}>Ver erros</Btn> },
      ]} />
      {erros && <Erros lote={erros} onClose={() => setErros(null)} />}
    </>
  )
}

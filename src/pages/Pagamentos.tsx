import { useMemo, useState, type FormEvent } from 'react'
import { Modal, useConfirm } from '@/components/Modal'
import { FormDialog } from '@/components/FormDialog'
import { Table } from '@/components/Table'
import { useToast } from '@/components/Toast'
import { Btn, Estado, Field, PageHead, Select, Toolbar } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { num, pick, type Row } from '@/lib/data'
import { Kz, dataPT, hojeISO, mesAno } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'
import { emDivida } from './Cobrancas'

function NovoPagamento({ onClose }: { onClose: () => void }) {
  const [enc, setEnc] = useState('')
  const [sel, setSel] = useState<number[]>([])
  const [metodo, setMetodo] = useState('')
  const [data, setData] = useState(hojeISO())
  const [ref, setRef] = useState('')
  const [valor, setValor] = useState('')
  const [pendente, setPendente] = useState(false)
  const encs = useList('/encarregados')
  const metodos = useList('/metodos-pagamento')
  const abertas = useList(enc ? '/cobrancas' : null, { encarregado_id: enc, estado: 'divida' })
  const total = useMemo(() => abertas.rows.filter((r) => sel.includes(r.id)).reduce((s, r) => s + emDivida(r), 0), [abertas.rows, sel])
  const criar = useAct((p: Row) => api.post('/pagamentos', p), { invalidate: ['/pagamentos', '/cobrancas', '/painel', '/alertas'], ok: 'Pagamento registado.', onDone: onClose })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    criar.mutate({
      metodo_id: Number(metodo), valor: valor || String(total), encarregado_id: Number(enc), cobranca_ids: sel,
      data_pagamento: data, referencia: ref || undefined, estado: pendente ? 'pendente' : 'confirmado',
    })
  }

  return (
    <Modal title="Registar pagamento" size="lg" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="fgrid">
          <Field label="Encarregado *" wide>
            <select required value={enc} onChange={(e) => { setEnc(e.target.value); setSel([]) }}>
              <option value="">Seleccione…</option>
              {encs.rows.map((x) => <option key={x.id} value={x.id}>{pick(x, 'nome_completo', 'nome')}</option>)}
            </select>
          </Field>
        </div>
        {enc && (
          <div style={{ margin: '14px 0' }}>
            <b>Cobranças em aberto</b>
            <Table
              rows={abertas.rows}
              loading={abertas.isLoading}
              pageSize={0}
              empty="Este encarregado não tem cobranças em aberto."
              selected={sel}
              onSelect={(ids) => setSel(ids as number[])}
              cols={[
                { h: 'Aluno', k: ['aluno', 'aluno_nome', 'aluno.nome_completo'] },
                { h: 'Serviço', k: ['servico', 'servico_nome', 'servico.nome'] },
                { h: 'Competência', render: (r) => mesAno(pick(r, 'competencia')) },
                { h: 'Em dívida', right: true, render: (r) => Kz(emDivida(r)) },
              ]}
            />
          </div>
        )}
        <div className="fgrid">
          <Field label="Método *">
            <select required value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="">Seleccione…</option>
              {metodos.rows.map((m) => <option key={m.id} value={m.id}>{pick(m, 'nome', 'designacao')}</option>)}
            </select>
          </Field>
          <Field label="Valor (Kz)" hint={total ? `Soma das cobranças seleccionadas: ${Kz(total)}` : 'Em branco = soma das cobranças seleccionadas'}>
            <input type="number" step="any" min="0" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={total ? String(total) : ''} />
          </Field>
          <Field label="Data do pagamento"><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Field>
          <Field label="Referência / N.º da transferência"><input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
          <label className="inline-chk"><input type="checkbox" checked={pendente} onChange={(e) => setPendente(e.target.checked)} /> <span>Deixar pendente (aguarda verificação do comprovativo)</span></label>
        </div>
        <div className="form-f">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" busy={criar.isPending} disabled={!enc || !sel.length || !metodo}>Registar pagamento</Btn>
        </div>
      </form>
    </Modal>
  )
}

export default function Pagamentos() {
  const toast = useToast()
  const confirm = useConfirm()
  const [estado, setEstado] = useState('')
  const [enc, setEnc] = useState('')
  const [desde, setDesde] = useState('')
  const [ate, setAte] = useState('')
  const [novo, setNovo] = useState(false)
  const [comp, setComp] = useState<Row | null>(null)
  const encs = useList('/encarregados')
  const q = useList('/pagamentos', { estado, encarregado_id: enc, desde, ate }, { keep: true })
  const inv = ['/pagamentos', '/cobrancas', '/painel']
  const confirmar = useAct((id: number) => api.post(`/pagamentos/${id}/confirmar`), { invalidate: inv, ok: 'Pagamento confirmado.' })
  const rejeitar = useAct((id: number) => api.post(`/pagamentos/${id}/rejeitar`), { invalidate: inv, ok: 'Pagamento rejeitado; as cobranças voltaram a ficar em dívida.' })
  const anexar = useAct((v: { id: number; f: File }) => { const d = new FormData(); d.append('ficheiro', v.f); return api.form(`/pagamentos/${v.id}/comprovativo`, d) }, { invalidate: ['/pagamentos'], ok: 'Comprovativo anexado.' })

  const total = q.rows.filter((r) => ['confirmado', 'pago'].includes(String(pick(r, 'estado'))) || !pick(r, 'estado')).reduce((s, r) => s + num(pick(r, 'valor', 'valor_total')), 0)

  return (
    <>
      <PageHead title="Pagamentos" sub="Registo de pagamentos, confirmação de comprovativos e recibos." actions={<Btn onClick={() => setNovo(true)}>Registar pagamento</Btn>} />
      <Toolbar>
        <Select label="Encarregado" value={enc} onChange={setEnc} placeholder="Todos os encarregados" options={encs.rows.map((x) => ({ value: x.id, label: String(pick(x, 'nome_completo', 'nome')) }))} />
        <Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos os estados" options={[{ value: 'pendente', label: 'Pendentes' }, { value: 'confirmado', label: 'Confirmados' }, { value: 'rejeitado', label: 'Rejeitados' }]} />
        <label className="mu">De <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label className="mu">Até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <span className="grow" /><span>Total confirmado: <b>{Kz(total)}</b></span>
      </Toolbar>
      <Table
        rows={q.rows}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        cols={[
          { h: 'Data', render: (r) => dataPT(pick(r, 'data_pagamento', 'data', 'criado_em')) },
          { h: 'Recibo', k: ['numero', 'recibo', 'numero_recibo', 'id'] },
          { h: 'Encarregado', k: ['encarregado', 'encarregado_nome', 'encarregado.nome_completo'] },
          { h: 'Método', k: ['metodo', 'metodo_nome', 'metodo.nome'] },
          { h: 'Referência', k: 'referencia' },
          { h: 'Valor', right: true, render: (r) => Kz(pick(r, 'valor', 'valor_total')) },
          { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado') ?? 'confirmado'} /> },
          {
            h: '',
            render: (r) => (
              <span className="row-a">
                {String(pick(r, 'estado')) === 'pendente' && (
                  <>
                    <Btn variant="link" onClick={() => confirmar.mutate(r.id)}>Confirmar</Btn>
                    <Btn variant="link" onClick={async () => { if (await confirm({ title: 'Rejeitar pagamento', text: 'As cobranças ligadas voltam a ficar em dívida.', danger: true, yes: 'Rejeitar' })) rejeitar.mutate(r.id) }}>Rejeitar</Btn>
                  </>
                )}
                <Btn variant="link" onClick={() => setComp(r)}>Comprovativo</Btn>
                <Btn variant="link" onClick={() => api.download(`/pagamentos/${r.id}/recibo.pdf`, undefined, undefined, true).catch((e) => toast.error(errMsg(e)))}>Recibo</Btn>
              </span>
            ),
          },
        ]}
      />
      {novo && <NovoPagamento onClose={() => setNovo(false)} />}
      {comp && (
        <FormDialog title="Anexar comprovativo" size="sm" onClose={() => setComp(null)} fields={[{ name: 'ficheiro', label: 'Ficheiro (PDF ou imagem)', type: 'file', required: true, wide: true, accept: 'application/pdf,image/*' }]}
          onSubmit={(_, raw) => anexar.mutateAsync({ id: comp.id, f: raw.ficheiro })} />
      )}
    </>
  )
}

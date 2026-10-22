import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { FormDialog } from '@/components/FormDialog'
import { ResultDialog, useConfirm } from '@/components/Modal'
import { Table } from '@/components/Table'
import { Btn, Estado, PageHead, SearchBox, Select, Toolbar } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { CANAIS, alunoOptions, servicoOptions } from '@/lib/academic'
import { num, pick, type Row } from '@/lib/data'
import { Kz, dataPT, hojeISO, mesAno } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'
import { useToast } from '@/components/Toast'

/** Valor em dívida de uma cobrança, qualquer que seja o formato devolvido. */
export const emDivida = (r: Row) => {
  const saldo = pick(r, 'saldo', 'valor_em_divida', 'em_divida', 'valor_pendente')
  if (saldo !== undefined) return num(saldo)
  const tot = num(pick(r, 'valor_total', 'valor', 'valor_final', 'valor_base'))
  return Math.max(0, tot - num(pick(r, 'valor_pago', 'pago')))
}
export const estadoCobranca = (r: Row) => {
  const e = String(pick(r, 'estado', 'situacao') ?? '').toLowerCase()
  if (e) return e
  return emDivida(r) > 0 ? 'divida' : 'pago'
}
const diasAtraso = (r: Row) => {
  const d = pick(r, 'dias_atraso', 'atraso_dias')
  if (d !== undefined) return num(d)
  const v = pick(r, 'vencimento', 'data_vencimento')
  if (!v || estadoCobranca(r) === 'pago' || estadoCobranca(r) === 'paga') return 0
  return Math.max(0, Math.floor((Date.now() - new Date(String(v) + 'T00:00:00').getTime()) / 86400000))
}

export default function Cobrancas() {
  const nav = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [sp, setSp] = useSearchParams()
  const [estado, setEstado] = useState(sp.get('estado') || '')
  const [turma, setTurma] = useState('')
  const [servico, setServico] = useState('')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<(string | number)[]>([])
  const [dlg, setDlg] = useState<'avulsa' | 'gerar' | 'lembrete' | null>(null)
  const [res, setRes] = useState<{ t: string; d: unknown } | null>(null)

  const turmas = useList('/turmas')
  const servicos = useList('/servicos')
  const turmaNome = sp.get('turma')
  const turmaId = turma || String(turmas.rows.find((t) => t.designacao === turmaNome)?.id ?? '')
  const params = { estado, turma_id: turmaId, servico_id: servico, q }
  const lista = useList('/cobrancas', params, { keep: true })

  const rows = lista.rows
  const totalDivida = useMemo(() => rows.reduce((s, r) => s + emDivida(r), 0), [rows])
  const inv = ['/cobrancas', '/painel', '/alertas']

  const gerar = useAct((p: Row) => api.post('/cobrancas/gerar', p), { invalidate: inv, silent: true, onDone: (r) => setRes({ t: 'Cobranças geradas', d: r }) })
  const avulsa = useAct((p: Row) => api.post('/cobrancas', p), { invalidate: inv, ok: 'Cobrança criada.' })
  const multas = useAct(() => api.post('/cobrancas/aplicar-multas'), { invalidate: inv, silent: true, onDone: (r) => setRes({ t: 'Multas por atraso aplicadas', d: r ?? 'Concluído.' }) })
  const anular = useAct((id: number) => api.post(`/cobrancas/${id}/anular`), { invalidate: inv, ok: 'Cobrança anulada.' })
  const lembrete = useAct((p: Row) => api.post('/cobrancas/lembretes', p), { invalidate: ['/mensagens'], silent: true, onDone: (r) => setRes({ t: 'Lembretes enviados', d: r ?? 'Concluído.' }) })

  const exportar = async (formato: 'xlsx' | 'csv') => {
    try { await api.download('/cobrancas/exportar', { formato, estado, turma_id: turmaId, servico_id: servico, q }) } catch (e) { toast.error(errMsg(e)) }
  }
  const devedores = rows.filter((r) => emDivida(r) > 0)
  const limpar = () => { setEstado(''); setTurma(''); setServico(''); setQ(''); setSp({}) }

  return (
    <>
      <PageHead
        title="Propinas e cobranças"
        sub="Quem pagou e quem deve, por turma, aluno ou serviço."
        actions={
          <>
            <Btn variant="ghost" onClick={() => setDlg('avulsa')}>Cobrança avulsa</Btn>
            <Btn variant="ghost" onClick={() => setDlg('gerar')}>Gerar cobranças do mês</Btn>
            <Btn variant="ghost" busy={multas.isPending} onClick={async () => { if (await confirm({ title: 'Aplicar multas', text: 'Aplicar as multas configuradas a todas as cobranças em atraso?', yes: 'Aplicar' })) multas.mutate() }}>Aplicar multas</Btn>
          </>
        }
      />
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Procurar aluno" />
        <Select label="Turma" value={turmaId} onChange={(v) => { setTurma(v); setSp({}) }} placeholder="Todas as turmas" options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
        <Select label="Serviço" value={servico} onChange={setServico} placeholder="Todos os serviços" options={servicos.rows.map((s) => ({ value: s.id, label: String(pick(s, 'nome')) }))} />
        <Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos os estados"
          options={[{ value: 'pago', label: 'Pagos' }, { value: 'divida', label: 'Em dívida' }, { value: 'atraso', label: 'Em atraso' }, { value: 'pendente', label: 'Pendentes' }, { value: 'parcial', label: 'Parciais' }]} />
        {(estado || turmaId || servico || q) && <Btn variant="link" onClick={limpar}>Limpar filtros</Btn>}
      </Toolbar>
      <Toolbar>
        <span><b>{rows.length}</b> registos · em dívida nesta lista: <b>{Kz(totalDivida)}</b></span>
        <span className="grow" />
        <Btn variant="ghost" onClick={() => exportar('xlsx')}>Exportar Excel</Btn>
        <Btn variant="ghost" onClick={() => exportar('csv')}>CSV</Btn>
        <Btn disabled={!devedores.length && !sel.length} onClick={() => setDlg('lembrete')}>
          Enviar lembrete {sel.length ? `(${sel.length} seleccionadas)` : 'aos devedores'}
        </Btn>
      </Toolbar>
      <Table
        rows={rows}
        loading={lista.isLoading}
        error={lista.error}
        onRetry={() => lista.refetch()}
        selected={sel}
        onSelect={setSel}
        onRow={(r) => { const a = pick(r, 'aluno_id', 'aluno.id'); if (a) nav(`/alunos/${a}`) }}
        empty="Nenhum registo com estes filtros."
        cols={[
          { h: 'Aluno', k: ['aluno', 'aluno_nome', 'aluno.nome_completo', 'nome_completo'] },
          { h: 'Turma', k: ['turma', 'turma_designacao', 'turma.designacao'] },
          { h: 'Encarregado', k: ['encarregado', 'encarregado_nome', 'encarregado.nome_completo'] },
          { h: 'Serviço', k: ['servico', 'servico_nome', 'servico.nome', 'descricao'] },
          { h: 'Competência', render: (r) => mesAno(pick(r, 'competencia')) },
          { h: 'Vencimento', render: (r) => dataPT(pick(r, 'vencimento', 'data_vencimento')) },
          { h: 'Valor', right: true, render: (r) => Kz(pick(r, 'valor_total', 'valor', 'valor_final', 'valor_base')) },
          { h: 'Em dívida', right: true, render: (r) => (emDivida(r) ? Kz(emDivida(r)) : '—') },
          {
            h: 'Estado',
            render: (r) => {
              const e = estadoCobranca(r)
              const d = diasAtraso(r)
              return <Estado v={e} text={d > 0 && e !== 'pago' && e !== 'paga' ? `Em dívida ${d} d` : undefined} />
            },
          },
          {
            h: '',
            render: (r) => (
              <span onClick={(e) => e.stopPropagation()}>
                {!['anulada', 'anulado', 'pago', 'paga'].includes(estadoCobranca(r)) && (
                  <Btn variant="link" onClick={async () => { if (await confirm({ title: 'Anular cobrança', text: 'Anular esta cobrança?', danger: true, yes: 'Anular' })) anular.mutate(r.id) }}>Anular</Btn>
                )}
              </span>
            ),
          },
        ]}
      />

      {dlg === 'gerar' && (
        <FormDialog title="Gerar cobranças do mês" size="sm" submitLabel="Gerar" onClose={() => setDlg(null)}
          intro="Cria as propinas e serviços de todos os alunos matriculados. É seguro repetir: não duplica cobranças."
          fields={[{ name: 'competencia', label: 'Mês de competência', type: 'date', required: true, default: hojeISO().slice(0, 8) + '01', hint: 'Use o primeiro dia do mês.', wide: true }]}
          onSubmit={(p) => gerar.mutateAsync(p)} />
      )}
      {dlg === 'avulsa' && (
        <FormDialog title="Cobrança avulsa" onClose={() => setDlg(null)}
          intro="Para fardamento, actividades extra ou qualquer valor fora da mensalidade."
          fields={[
            { name: 'aluno_id', label: 'Aluno', type: 'select', options: alunoOptions, required: true, wide: true },
            { name: 'servico_id', label: 'Serviço', type: 'select', options: servicoOptions, required: true },
            { name: 'competencia', label: 'Competência', type: 'date', required: true, default: hojeISO() },
            { name: 'valor_base', label: 'Valor (Kz)', type: 'number', hint: 'Em branco usa o preço do serviço' },
            { name: 'vencimento', label: 'Vencimento', type: 'date' },
            { name: 'descricao', label: 'Descrição', wide: true },
          ]}
          onSubmit={(p) => avulsa.mutateAsync(p)} />
      )}
      {dlg === 'lembrete' && (
        <FormDialog title="Enviar lembrete" size="sm" submitLabel="Enviar"
          intro={sel.length ? `${sel.length} cobrança(s) seleccionada(s).` : `Serão avisados os encarregados dos ${devedores.length} registos em dívida desta lista.`}
          onClose={() => setDlg(null)}
          fields={[{ name: 'canais', label: 'Canais', type: 'multi', options: CANAIS, default: ['whatsapp'] }]}
          onSubmit={(p) => lembrete.mutateAsync(sel.length ? { ...p, cobranca_ids: sel.map(Number) } : { ...p, turma_id: turmaId ? Number(turmaId) : undefined, servico_id: servico ? Number(servico) : undefined, q: q || undefined, cobranca_ids: devedores.map((d) => d.id).filter(Boolean) })} />
      )}
      {res && <ResultDialog title={res.t} data={res.d} onClose={() => setRes(null)} />}
    </>
  )
}

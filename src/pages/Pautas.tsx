import { useMemo, useState } from 'react'
import { useConfirm } from '@/components/Modal'
import { Table, type Col } from '@/components/Table'
import { useToast } from '@/components/Toast'
import { Btn, Estado, Loading, PageHead, Select, Tabs, Toolbar } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { useAnoActivo, useEscala } from '@/lib/academic'
import { fmtNota } from '@/lib/format'
import { asList, humanize, num, pick, type Row } from '@/lib/data'
import { useAct, useGet, useList } from '@/lib/hooks'

/** Achata uma linha de pauta (aluno + médias por disciplina) numa só linha de colunas. */
function flatten(r: Row): Row {
  const out: Row = {}
  for (const [k, v] of Object.entries(r)) {
    if (v === null || typeof v !== 'object') out[k] = v
    else if (Array.isArray(v)) {
      v.forEach((it) => {
        if (it && typeof it === 'object') {
          const nome = pick(it, 'disciplina', 'disciplina.nome', 'sigla', 'nome')
          const val = pick(it, 'media', 'valor', 'nota')
          if (nome !== undefined && val !== undefined) out[String(nome)] = val
        }
      })
    } else if (['medias', 'notas', 'disciplinas'].includes(k)) Object.assign(out, v)
    else out[k] = pick(v, 'nome_completo', 'nome', 'designacao')
  }
  return out
}

/** Pauta final: cada disciplina nos três trimestres, a classificação final, a média e a situação. */
function PautaFinal({ turma }: { turma: string }) {
  const q = useGet<Row>(turma ? '/pautas/final' : null, { turma_id: turma })
  const d = q.data
  if (!turma) return <Table rows={[]} empty="Escolha a turma para ver a pauta final." />
  if (q.isLoading || !d) return <Loading />
  const minima = num(d.nota_minima)
  const nota = (v: unknown) => (v === null || v === undefined ? <span className="mu">—</span>
    : <span style={{ color: num(v) < minima ? 'var(--er)' : undefined, fontWeight: num(v) < minima ? 700 : 400 }}>{fmtNota(v)}</span>)
  const cols: Col[] = [
    { h: 'N.º', render: (_, i) => i + 1 },
    { h: 'Aluno', k: 'aluno' },
    ...asList(d.disciplinas).map((disc: Row, j): Col => ({
      h: String(disc.sigla || disc.nome), right: true,
      render: (r) => {
        const x = r.disciplinas?.[j]
        return <span title={`${disc.nome}: ${asList(x?.trimestres).map((t) => fmtNota(t)).join(' · ')}`}>{nota(x?.final)}</span>
      },
    })),
    ...asList<string>(d.periodos).map((p, i): Col => ({ h: `Média ${p.split(' ')[0]}T`, right: true, render: (r) => nota(r.medias_trimestre?.[i]) })),
    { h: 'Média final', right: true, render: (r) => <b>{nota(r.media_final)}</b> },
    { h: 'Negativas', right: true, k: 'negativas' },
    { h: 'Situação', render: (r) => (r.situacao ? <Estado v={r.situacao === 'aprovado' ? 'pago' : 'divida'} text={r.situacao === 'aprovado' ? 'Aprovado' : 'Reprovado'} /> : '—') },
  ]
  return (
    <>
      <p className="note" style={{ margin: '0 0 10px' }}>
        Classificação final de cada disciplina (passe o rato para ver os trimestres). Escala 0 a {fmtNota(d.nota_maxima)}; abaixo de {fmtNota(d.nota_minima)} a vermelho.
      </p>
      <Table rows={asList(d.linhas)} cols={cols} error={q.error} onRetry={() => q.refetch()} pageSize={40} empty="A turma não tem alunos." />
    </>
  )
}

export default function Pautas() {
  const toast = useToast()
  const confirm = useConfirm()
  const { periodos } = useAnoActivo()
  const { minima } = useEscala()
  const [modo, setModo] = useState<'periodo' | 'final'>('periodo')
  const [turma, setTurma] = useState('')
  const [periodo, setPeriodo] = useState('')
  const turmas = useList('/turmas')
  const ok = !!turma && !!periodo
  const q = useGet<any>(ok ? '/pautas' : null, { turma_id: turma, periodo_id: periodo })
  const fechar = useAct(() => api.post('/pautas/fechar', undefined, { turma_id: turma, periodo_id: periodo }), { invalidate: ['/pautas'], ok: 'Médias do período gravadas.' })

  const rows = useMemo(() => {
    const d = q.data
    const l = Array.isArray(d) ? d : asList(pick(d, 'alunos', 'linhas', 'pauta') ?? d)
    return l.map((r) => flatten(r as Row))
  }, [q.data])

  const cols: Col[] = useMemo(() => {
    const keys: string[] = []
    rows.forEach((r) => Object.keys(r).forEach((k) => { if (!keys.includes(k) && k !== 'id' && !k.endsWith('_id')) keys.push(k) }))
    const first = keys.find((k) => /nome|aluno/i.test(k))
    const ordered = first ? [first, ...keys.filter((k) => k !== first)] : keys
    return ordered.map((k) => ({
      h: humanize(k), k, right: rows.some((r) => typeof r[k] === 'number' || /^\d+([.,]\d+)?$/.test(String(r[k] ?? ''))),
      render: (r: Row) => {
        const v = r[k]
        if (v === undefined || v === null) return <span className="mu">—</span>
        if (typeof v === 'number' || /^\d+([.,]\d+)?$/.test(String(v))) {
          const n = num(v)
          return <span style={{ color: n < minima ? 'var(--er)' : undefined, fontWeight: n < minima ? 700 : 400 }}>{n.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</span>
        }
        return String(v)
      },
    }))
  }, [rows, minima])

  return (
    <>
      <PageHead title="Pautas" sub={`Média por aluno e disciplina em cada período, ou a pauta final com todos os trimestres. Notas abaixo de ${fmtNota(minima)} aparecem a vermelho.`}
        actions={modo === 'periodo' ? (
          <>
            <Btn variant="ghost" disabled={!ok} onClick={() => api.download(`/turmas/${turma}/pauta.pdf`, { periodo_id: periodo }, undefined, true).catch((e) => toast.error(errMsg(e)))}>Pauta (PDF)</Btn>
            <Btn disabled={!ok} busy={fechar.isPending} onClick={async () => { if (await confirm({ title: 'Fechar pauta', text: 'Gravar as médias deste período? Podem ser recalculadas depois.', yes: 'Gravar médias' })) fechar.mutate() }}>Fechar período</Btn>
          </>
        ) : (
          <Btn variant="ghost" disabled={!turma} onClick={() => api.download(`/turmas/${turma}/pauta-final.pdf`, undefined, undefined, true).catch((e) => toast.error(errMsg(e)))}>Pauta final (PDF)</Btn>
        )} />
      <Tabs value={modo} onChange={setModo} tabs={[['periodo', 'Por período'], ['final', 'Pauta final (todos os trimestres)']]} />
      <Toolbar>
        <Select label="Turma" value={turma} onChange={setTurma} placeholder="Escolha a turma" options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
        {modo === 'periodo' && <Select label="Período" value={periodo} onChange={setPeriodo} placeholder="Escolha o período" options={periodos.map((p) => ({ value: p.id, label: String(pick(p, 'designacao')) }))} />}
      </Toolbar>
      {modo === 'final' ? <PautaFinal turma={turma} />
        : !ok ? <Table rows={[]} empty="Escolha a turma e o período para ver a pauta." /> : q.isLoading ? <Loading /> : <Table rows={rows} cols={cols} error={q.error} onRetry={() => q.refetch()} pageSize={40} empty="Sem notas lançadas neste período." />}
    </>
  )
}

import { useMemo, useState } from 'react'
import { useConfirm } from '@/components/Modal'
import { Table, type Col } from '@/components/Table'
import { useToast } from '@/components/Toast'
import { Btn, Loading, PageHead, Select, Toolbar } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { useAnoActivo } from '@/lib/academic'
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

export default function Pautas() {
  const toast = useToast()
  const confirm = useConfirm()
  const { periodos } = useAnoActivo()
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
          return <span style={{ color: n < 10 ? 'var(--er)' : undefined, fontWeight: n < 10 ? 700 : 400 }}>{n.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</span>
        }
        return String(v)
      },
    }))
  }, [rows])

  return (
    <>
      <PageHead title="Pautas" sub="Média por aluno e disciplina em cada período. Notas abaixo de 10 aparecem a vermelho."
        actions={
          <>
            <Btn variant="ghost" disabled={!ok} onClick={() => api.download(`/turmas/${turma}/pauta.pdf`, { periodo_id: periodo }, undefined, true).catch((e) => toast.error(errMsg(e)))}>Pauta (PDF)</Btn>
            <Btn disabled={!ok} busy={fechar.isPending} onClick={async () => { if (await confirm({ title: 'Fechar pauta', text: 'Gravar as médias deste período? Podem ser recalculadas depois.', yes: 'Gravar médias' })) fechar.mutate() }}>Fechar período</Btn>
          </>
        } />
      <Toolbar>
        <Select label="Turma" value={turma} onChange={setTurma} placeholder="Escolha a turma" options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
        <Select label="Período" value={periodo} onChange={setPeriodo} placeholder="Escolha o período" options={periodos.map((p) => ({ value: p.id, label: String(pick(p, 'designacao')) }))} />
      </Toolbar>
      {!ok ? <Table rows={[]} empty="Escolha a turma e o período para ver a pauta." /> : q.isLoading ? <Loading /> : <Table rows={rows} cols={cols} error={q.error} onRetry={() => q.refetch()} pageSize={40} empty="Sem notas lançadas neste período." />}
    </>
  )
}

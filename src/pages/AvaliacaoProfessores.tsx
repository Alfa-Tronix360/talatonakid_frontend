import { useState } from 'react'
import { Table } from '@/components/Table'
import { PageHead, Select, Toolbar } from '@/components/ui'
import { useAnoActivo } from '@/lib/academic'
import { asList, pick, type Row } from '@/lib/data'
import { dataPT, fmtNota } from '@/lib/format'
import { useList } from '@/lib/hooks'

const estrelas = (m: number) => '★'.repeat(Math.round(m)) + '☆'.repeat(5 - Math.round(m))

/** Como os encarregados avaliam os professores (1 a 5). Os comentários são anónimos. */
export default function AvaliacaoProfessores() {
  const { periodos } = useAnoActivo()
  const [periodo, setPeriodo] = useState('')
  const q = useList('/professores/avaliacoes', { periodo_id: periodo })
  return (
    <>
      <PageHead title="Avaliação dos professores" sub="Notas de 1 a 5 dadas pelos encarregados no portal. Os comentários são anónimos. Clique num professor para os ler." />
      <Toolbar>
        <Select label="Trimestre" value={periodo} onChange={setPeriodo} placeholder="Todos os trimestres"
          options={periodos.map((p) => ({ value: p.id, label: String(pick(p, 'designacao')) }))} />
      </Toolbar>
      <Table
        rows={q.rows}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        empty="Ainda nenhum encarregado avaliou os professores."
        expand={(r) => {
          const comentarios = asList(r.comentarios)
          return comentarios.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {comentarios.map((c: Row, i) => (
                <li key={i}><b>{estrelas(c.nota)}</b> «{c.comentario}» <span className="mu">— {c.periodo}, {dataPT(c.criado_em)}</span></li>
              ))}
            </ul>
          ) : <span className="mu">Sem comentários escritos.</span>
        }}
        cols={[
          { h: 'Professor', k: 'professor' },
          { h: 'Avaliações', right: true, k: 'avaliacoes' },
          { h: 'Média', render: (r) => <span title={`${fmtNota(r.media)} de 5`} style={{ color: 'var(--wa)', letterSpacing: 1 }}>{estrelas(Number(r.media))} <b style={{ color: 'var(--tx)' }}>{fmtNota(r.media)}</b></span> },
          {
            h: 'Distribuição (1 → 5)',
            render: (r) => [1, 2, 3, 4, 5].map((n) => `${n}★ ${r.distribuicao?.[String(n)] ?? 0}`).join(' · '),
          },
          { h: 'Comentários', right: true, render: (r) => asList(r.comentarios).length },
        ]}
      />
    </>
  )
}

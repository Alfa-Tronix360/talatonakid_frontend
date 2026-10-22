import { Link } from 'react-router'
import { AutoSections } from '@/components/Auto'
import { Card, Empty, ErrorBox, Estado, Kpi, Loading, PageHead } from '@/components/ui'
import { asList, nameOf, num, pick, type Row } from '@/lib/data'
import { Kz } from '@/lib/format'
import { useGet } from '@/lib/hooks'

export default function Resumo() {
  const q = useGet<Row>('/portal/eu')
  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const d = q.data || {}
  const educandos = asList(pick(d, 'educandos', 'alunos', 'filhos'))
  const enc = pick(d, 'encarregado') ?? d
  const total = educandos.reduce((s, e) => s + num(pick(e, 'em_divida', 'valor_em_divida', 'financeiro.em_divida', 'divida', 'financeiro.divida')), 0)

  return (
    <>
      <PageHead title={`Olá, ${String(pick(enc, 'nome_completo', 'nome') ?? nameOf(enc)).split(' ')[0]}`} sub="Resumo dos seus educandos: propinas, notas e comunicados do colégio." />
      <div className="grid" style={{ marginBottom: 16 }}>
        <Kpi label="Educandos" value={educandos.length} />
        <Kpi label="Total em dívida" value={Kz(total)} tone={total > 0 ? 'bad' : 'good'} onClick={() => undefined} />
      </div>
      {educandos.length ? (
        <div className="grid g2">
          {educandos.map((e: Row, i) => {
            const id = pick(e, 'id', 'aluno_id', 'aluno.id')
            const divida = num(pick(e, 'em_divida', 'valor_em_divida', 'financeiro.em_divida', 'divida', 'financeiro.divida'))
            return (
              <Card key={id ?? i} title={String(pick(e, 'nome_completo', 'nome', 'aluno.nome_completo') ?? 'Educando')}>
                <div className="mu" style={{ marginBottom: 8 }}>{pick(e, 'turma', 'turma.designacao') ? `Turma ${nameOf(pick(e, 'turma', 'turma.designacao'))}` : ''}</div>
                <div className="al"><div>Situação financeira</div><Estado v={divida > 0 ? 'divida' : 'pago'} text={divida > 0 ? `Em dívida: ${Kz(divida)}` : 'Em dia'} /></div>
                {pick(e, 'media', 'media_geral') !== undefined && <div className="al"><div>Média</div><b>{String(pick(e, 'media', 'media_geral'))}</b></div>}
                {id && <div style={{ marginTop: 10 }}><Link className="btn ghost" to={`/portal/educandos/${id}`}>Ver detalhe</Link></div>}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card><Empty>Não encontrámos educandos associados à sua conta.</Empty></Card>
      )}
      {!educandos.length && <div style={{ marginTop: 16 }}><AutoSections data={d} /></div>}
    </>
  )
}

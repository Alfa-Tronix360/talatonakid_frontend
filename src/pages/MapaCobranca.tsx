import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { Btn, Field, Loading, Tag } from '@/components/ui'
import { api } from '@/lib/api'
import type { Row } from '@/lib/data'
import { Kz, primeiroDiaMes } from '@/lib/format'
import { useAct, useGet } from '@/lib/hooks'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const ALERTAS = [
  { dias: 20, label: '20 dias antes (≈ dia 20 do mês anterior)' },
  { dias: 15, label: '15 dias antes (≈ dia 25 do mês anterior)' },
  { dias: 5, label: '5 dias antes' },
  { dias: 0, label: 'No dia do vencimento' },
]

type Config = {
  ano: string | null
  propinas: { servico_id: number; nome: string; precos: { classe_id: number; classe: string; valor: number | null }[]; multa: { tipo: string; valor: number; dias_tolerancia: number; maximo: number | null } | null }[]
  dia_vencimento: number
  plano: { prestacoes: number; mes_inicio: number; dia_vencimento: number; meses: number[] } | null
  alertas_dias: number[]
  pendentes: string[]
  pronto: boolean
}

const n = (v: string) => (v === '' ? null : Number(v))

/** "Gerar" do mapa de cobrança: o admin confirma propina, plano, preços, multa e alertas e gera o mês ou o ano. */
export function MapaCobranca({ onClose, onDone, invalidate }: { onClose: () => void; onDone: (r: Row) => void; invalidate: string[] }) {
  const cfg = useGet<Config>('/cobrancas/configuracao')
  const [servico, setServico] = useState<number | null>(null)
  const [v, setV] = useState<Record<string, string>>({})
  const [precos, setPrecos] = useState<Record<number, string>>({})
  const [alertas, setAlertas] = useState<number[]>([])
  const [todoAno, setTodoAno] = useState(true)
  const [competencia, setCompetencia] = useState(primeiroDiaMes())

  const c = cfg.data
  const propina = c?.propinas.find((p) => p.servico_id === servico) ?? c?.propinas[0]

  // Preenche o formulário com o que já está gravado no backend.
  useEffect(() => {
    if (!c) return
    const p = c.propinas.find((x) => x.servico_id === servico) ?? c.propinas[0]
    setV({
      prestacoes: String(c.plano?.prestacoes ?? 10),
      mes_inicio: String(c.plano?.mes_inicio ?? 9),
      dia_vencimento: String(c.plano?.dia_vencimento ?? c.dia_vencimento ?? 10),
      multa_percentual: p?.multa?.tipo === 'percentual' ? String(p.multa.valor) : '',
      dias_tolerancia: String(p?.multa?.dias_tolerancia ?? 0),
      multa_maximo: p?.multa?.maximo != null ? String(p.multa.maximo) : '',
      valor: '',
    })
    setPrecos(Object.fromEntries((p?.precos ?? []).map((x) => [x.classe_id, x.valor == null ? '' : String(x.valor)])))
    setAlertas(c.alertas_dias.length ? c.alertas_dias : [20, 15, 5, 0])
    if (c.plano) setCompetencia(`${(c.ano ?? '').slice(0, 4) || new Date().getFullYear()}-${String(c.plano.mes_inicio).padStart(2, '0')}-01`)
  }, [c, servico])

  const gerar = useAct((body: Row) => api.post('/cobrancas/gerar', body), { invalidate, silent: true, onDone: (r) => { onDone(r); onClose() } })

  const set = (k: string) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }))

  /** Só vai no pedido o que mudou: quem só pode gerar (secretaria) não precisa de permissão para alterar preços. */
  const corpo = (): Row => {
    const b: Row = { competencia, todo_o_ano: todoAno }
    if (!c || !propina) return b
    if (c.propinas.length > 1) b.servico_id = propina.servico_id
    const plano = c.plano
    if (!plano || n(v.prestacoes) !== plano.prestacoes) b.prestacoes = n(v.prestacoes)
    if (!plano || n(v.mes_inicio) !== plano.mes_inicio) b.mes_inicio = n(v.mes_inicio)
    if (!plano || n(v.dia_vencimento) !== plano.dia_vencimento) b.dia_vencimento = n(v.dia_vencimento)
    if (v.valor !== '') b.valor = n(v.valor)
    else {
      const mudados = propina.precos.filter((p) => precos[p.classe_id] !== '' && n(precos[p.classe_id]) !== p.valor)
      if (mudados.length) b.precos = mudados.map((p) => ({ classe_id: p.classe_id, valor: n(precos[p.classe_id]) }))
    }
    const m = propina.multa
    if (v.multa_percentual !== '' && n(v.multa_percentual) !== (m?.tipo === 'percentual' ? m.valor : null)) b.multa_percentual = n(v.multa_percentual)
    if (m && n(v.dias_tolerancia) !== m.dias_tolerancia) b.dias_tolerancia = n(v.dias_tolerancia)
    if (!m && v.multa_percentual !== '') b.dias_tolerancia = n(v.dias_tolerancia)
    if (v.multa_maximo !== '' && n(v.multa_maximo) !== (m?.maximo ?? null)) b.multa_maximo = n(v.multa_maximo)
    const actuais = [...c.alertas_dias].sort().join(',')
    if (!c.alertas_dias.length || [...alertas].sort().join(',') !== actuais) b.alertas_dias = alertas
    return b
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    gerar.mutate(corpo())
  }

  return (
    <Modal title="Gerar mapa de cobrança" size="lg" onClose={onClose}>
      {cfg.isLoading || !c ? <Loading /> : (
        <form onSubmit={submit}>
          <div className="intro">
            {c.pronto
              ? <>Tudo configurado para <b>{c.ano}</b>. Confirme ou ajuste os valores e gere. É seguro repetir: não duplica cobranças.</>
              : <>Antes de gerar falta: {c.pendentes.map((p) => <Tag key={p} tone="wa">{p}</Tag>)}</>}
          </div>

          {c.propinas.length > 1 && (
            <div className="fgrid">
              <Field label="Propina" wide>
                <select value={propina?.servico_id ?? ''} onChange={(e) => setServico(Number(e.target.value))}>
                  {c.propinas.map((p) => <option key={p.servico_id} value={p.servico_id}>{p.nome}</option>)}
                </select>
              </Field>
            </div>
          )}

          <h4>Período e prestações</h4>
          <div className="fgrid">
            <Field label="Prestações no ano" hint="Ex.: 10 (Setembro a Junho)">
              <input type="number" min={1} max={12} required value={v.prestacoes ?? ''} onChange={set('prestacoes')} />
            </Field>
            <Field label="Mês da 1.ª prestação">
              <select required value={v.mes_inicio ?? ''} onChange={set('mes_inicio')}>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Dia do vencimento" hint="Depois deste dia (e da tolerância) aplica-se a multa">
              <input type="number" min={1} max={28} required value={v.dia_vencimento ?? ''} onChange={set('dia_vencimento')} />
            </Field>
            <Field label="Gerar a partir de">
              <input type="date" required value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
            </Field>
            <label className="fld wide inline-chk">
              <input type="checkbox" checked={todoAno} onChange={(e) => setTodoAno(e.target.checked)} />
              <span>Gerar todas as prestações até ao fim do ano lectivo (senão, só este mês)</span>
            </label>
          </div>

          <h4>Preço da propina</h4>
          <div className="fgrid">
            <Field label="Mesmo preço para todas as classes (Kz)" hint="Em branco: use os preços por classe abaixo" wide>
              <input type="number" min={0} step="any" value={v.valor ?? ''} onChange={set('valor')} placeholder="Ex.: 45000" />
            </Field>
            {v.valor === '' && propina?.precos.map((p) => (
              <Field key={p.classe_id} label={p.classe} hint={p.valor == null ? 'Sem preço' : `Actual: ${Kz(p.valor)}`}>
                <input type="number" min={0} step="any" required value={precos[p.classe_id] ?? ''}
                  onChange={(e) => setPrecos((s) => ({ ...s, [p.classe_id]: e.target.value }))} />
              </Field>
            ))}
          </div>

          <h4>Multa por atraso</h4>
          <div className="fgrid">
            <Field label="Multa (%)" hint="Sobre o valor da propina">
              <input type="number" min={0.01} max={100} step="any" required value={v.multa_percentual ?? ''} onChange={set('multa_percentual')} />
            </Field>
            <Field label="Dias de tolerância" hint="Dias depois do vencimento sem multa">
              <input type="number" min={0} max={90} value={v.dias_tolerancia ?? ''} onChange={set('dias_tolerancia')} />
            </Field>
            <Field label="Multa máxima (Kz)" hint="Opcional">
              <input type="number" min={1} step="any" value={v.multa_maximo ?? ''} onChange={set('multa_maximo')} />
            </Field>
          </div>

          <h4>Lembretes ao encarregado (WhatsApp)</h4>
          <div className="multi">
            {ALERTAS.map((a) => (
              <label key={a.dias} className="chip">
                <input type="checkbox" checked={alertas.includes(a.dias)}
                  onChange={(e) => setAlertas((s) => (e.target.checked ? [...s, a.dias] : s.filter((x) => x !== a.dias)))} />
                <span>{a.label}</span>
              </label>
            ))}
          </div>

          <div className="form-f">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" busy={gerar.isPending}>{todoAno ? 'Gerar o ano' : 'Gerar o mês'}</Btn>
          </div>
        </form>
      )}
    </Modal>
  )
}

/** Resumo legível da resposta do "Gerar". */
export function ResumoGeracao({ r }: { r: Row }) {
  return (
    <div>
      <p style={{ marginTop: 0 }}>
        <b>{r.criadas}</b> cobrança(s) criada(s){r.ja_existentes ? <>, <b>{r.ja_existentes}</b> já existiam</> : null}.
        {r.multas_aplicadas ? <> Multas aplicadas a <b>{r.multas_aplicadas}</b> cobrança(s) em atraso.</> : null}
      </p>
      {r.fora_do_plano && <p className="note">{r.motivo}</p>}
      {Array.isArray(r.meses) && r.meses.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {r.meses.map((m: Row) => <li key={m.competencia}>{String(m.competencia).slice(0, 7)}: {m.criadas} criada(s)</li>)}
        </ul>
      )}
      {r.servicos_sem_preco?.length > 0 && <p className="note">Serviços sem preço (não cobrados): {r.servicos_sem_preco.join(', ')}</p>}
    </div>
  )
}

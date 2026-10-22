import { useState } from 'react'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { ResultDialog } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Btn, Card, Empty, Loading, PageHead, Switch, Tabs } from '@/components/ui'
import { api } from '@/lib/api'
import { CANAIS } from '@/lib/academic'
import { asList, pick, type Row } from '@/lib/data'
import { label } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'

const EVENTOS = [
  { value: 'antes_vencimento', label: 'Antes do vencimento' },
  { value: 'apos_vencimento', label: 'Depois do vencimento' },
  { value: 'divida_acima_dias', label: 'Dívida acima de X dias' },
  { value: 'ocorrencia', label: 'Nova ocorrência' },
  { value: 'nota_baixa', label: 'Nota baixa' },
  { value: 'faltas_excessivas', label: 'Faltas excessivas' },
]

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome da regra', required: true, wide: true, placeholder: 'Ex.: Aviso 5 dias após o vencimento' },
  { name: 'evento', label: 'Momento', type: 'select', required: true, default: 'apos_vencimento', options: EVENTOS },
  { name: 'dias_offset', label: 'Dias', type: 'number', hint: 'Dias antes/depois do evento' },
  { name: 'canais', label: 'Canais', type: 'multi', required: true, options: CANAIS, default: ['whatsapp'] },
  { name: 'destino', label: 'Destinatário', type: 'select', default: 'encarregado', options: [{ value: 'encarregado', label: 'Encarregado' }, { value: 'direccao', label: 'Direcção' }] },
  { name: 'modelo_id', label: 'Modelo de mensagem', type: 'select', options: { path: '/modelos-mensagem', text: (r) => `${r.codigo} (${label(r.canal)})` }, empty: '— Modelo por omissão —' },
]

function ListaRegras() {
  const q = useList('/regras')
  const [novo, setNovo] = useState(false)
  const [res, setRes] = useState<{ t: string; d: unknown } | null>(null)
  const toggle = useAct((v: { id: number; activa: boolean }) => api.patch(`/regras/${v.id}`, { activa: v.activa }), { invalidate: ['/regras'], ok: (_, v) => (v.activa ? 'Regra activada.' : 'Regra desactivada.') })
  const criar = useAct((p: Row) => api.post('/regras', p), { invalidate: ['/regras'], ok: 'Regra criada.' })
  const exec = useAct(() => api.post('/regras/executar'), { invalidate: ['/mensagens'], silent: true, onDone: (r) => setRes({ t: 'Regras avaliadas', d: r ?? 'Concluído.' }) })
  const desp = useAct(() => api.post('/mensagens/despachar'), { invalidate: ['/mensagens'], silent: true, onDone: (r) => setRes({ t: 'Mensagens despachadas', d: r ?? 'Concluído.' }) })

  return (
    <>
      <div className="toolbar">
        <span className="grow" />
        <Btn variant="ghost" busy={exec.isPending} onClick={() => exec.mutate()}>Avaliar regras agora</Btn>
        <Btn variant="ghost" busy={desp.isPending} onClick={() => desp.mutate()}>Enviar mensagens em fila</Btn>
        <Btn onClick={() => setNovo(true)}>Nova regra</Btn>
      </div>
      <Card>
        {q.isLoading ? <Loading /> : !q.rows.length ? <Empty>Ainda não há regras. Crie a primeira para automatizar lembretes e avisos.</Empty> : (
          q.rows.map((r) => {
            const canais = asList<string>(pick(r, 'canais')).map((c) => label(c)).join(' + ') || label(pick(r, 'canal'))
            const evento = EVENTOS.find((e) => e.value === pick(r, 'evento'))?.label ?? label(pick(r, 'evento'))
            const dias = pick(r, 'dias_offset')
            return (
              <div className="rule" key={r.id}>
                <div>
                  <b>{pick(r, 'nome')}</b><br />
                  <span className="mu" style={{ fontSize: 13 }}>{evento}{dias !== undefined ? ` · ${dias} dias` : ''} · Canal: {canais} · Para: {label(pick(r, 'destino') ?? 'encarregado')}</span>
                </div>
                <Switch label={`Activar regra ${pick(r, 'nome')}`} checked={pick(r, 'activa', 'activo') !== false} onChange={(v) => toggle.mutate({ id: r.id, activa: v })} />
              </div>
            )
          })
        )}
      </Card>
      <p className="note">O colégio define as regras sem programação: cada regra liga um momento a um canal. Modelo de mensagem: «Caro encarregado, a propina de {'{aluno}'} vence a {'{data}'}. Valor: {'{valor}'}.»</p>
      {novo && <FormDialog title="Nova regra" onClose={() => setNovo(false)} fields={fields} onSubmit={(p) => criar.mutateAsync(p)} />}
      {res && <ResultDialog title={res.t} data={res.d} onClose={() => setRes(null)} />}
    </>
  )
}

export default function Regras() {
  const [tab, setTab] = useState<'regras' | 'modelos'>('regras')
  return (
    <>
      <PageHead title="Comunicação e regras" sub="Automatize lembretes de propinas e avisos pedagógicos. O colégio define as regras sem programação." />
      <Tabs value={tab} onChange={setTab} tabs={[['regras', 'Regras'], ['modelos', 'Modelos de mensagem']]} />
      {tab === 'regras' ? <ListaRegras /> : (
        <Resource
          path="/modelos-mensagem" createLabel="Novo modelo"
          hint="Variáveis disponíveis: {aluno}, {data}, {valor}, {encarregado}, {turma}."
          createFields={[
            { name: 'codigo', label: 'Código', required: true, placeholder: 'lembrete_propina' },
            { name: 'canal', label: 'Canal', type: 'select', required: true, options: CANAIS, default: 'whatsapp' },
            { name: 'assunto', label: 'Assunto (e-mail)', wide: true },
            { name: 'corpo', label: 'Mensagem', type: 'textarea', required: true },
          ]}
          cols={[{ h: 'Código', k: 'codigo' }, { h: 'Canal', render: (r) => label(pick(r, 'canal')) }, { h: 'Assunto', k: 'assunto' }, { h: 'Mensagem', k: 'corpo', nowrap: false }]}
        />
      )}
    </>
  )
}

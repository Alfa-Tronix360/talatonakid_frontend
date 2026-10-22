import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Table, autoCols } from '@/components/Table'
import { Btn, Card, PageHead } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { asList, pick, type Row } from '@/lib/data'

type Msg = { who: 'u' | 'a'; text: string; rows?: Row[] }

const SUGESTOES = [
  'Quantos alunos da 7.ª estão em dívida?',
  'Qual a turma com mais atraso?',
  'Quantos alunos pagam alimentação?',
  'Quanto foi recebido este mês?',
]

export default function Assistente() {
  const [msgs, setMsgs] = useState<Msg[]>([{ who: 'a', text: 'Olá. O que quer saber sobre o colégio?' }])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [msgs, busy])

  const ask = async (text: string) => {
    const pergunta = text.trim()
    if (!pergunta || busy) return
    setMsgs((m) => [...m, { who: 'u', text: pergunta }])
    setQ('')
    setBusy(true)
    try {
      const r = await api.post<any>('/assistente', { pergunta })
      const txt = typeof r === 'string' ? r : pick(r, 'resposta', 'texto', 'answer', 'mensagem', 'resultado')
      const rows = typeof r === 'object' ? asList(pick(r, 'dados', 'linhas', 'registos', 'items') ?? r) : []
      setMsgs((m) => [...m, { who: 'a', text: typeof txt === 'string' ? txt : txt !== undefined ? JSON.stringify(txt) : rows.length ? 'Resultado:' : JSON.stringify(r, null, 2), rows: rows.length ? rows : undefined }])
    } catch (e) {
      setMsgs((m) => [...m, { who: 'a', text: `Não consegui responder: ${errMsg(e)}` }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHead title="Assistente" sub="Pergunte em linguagem natural. O assistente só consulta dados — nunca altera nada." />
      <Card>
        <div className="sugs">
          {SUGESTOES.map((s) => <Btn key={s} variant="ghost" size="sm" onClick={() => ask(s)}>{s}</Btn>)}
        </div>
        <div className="chat" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={`m ${m.who}`}>
              {m.text}
              {m.rows && <div style={{ marginTop: 8 }}><Table rows={m.rows} cols={autoCols(m.rows)} pageSize={8} /></div>}
            </div>
          ))}
          {busy && <div className="m a">A pensar…</div>}
          <div ref={end} />
        </div>
        <form className="chat-in" onSubmit={(e: FormEvent) => { e.preventDefault(); ask(q) }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escreva a pergunta" aria-label="Pergunta" />
          <Btn type="submit" busy={busy}>Perguntar</Btn>
        </form>
      </Card>
    </>
  )
}

import { useState, type FormEvent } from 'react'
import { useOptions } from '@/components/FormDialog'
import { Modal } from '@/components/Modal'
import { Btn, Field, Tag } from '@/components/ui'
import { api } from '@/lib/api'
import type { Row } from '@/lib/data'
import { alunoOptions, classeOptions } from '@/lib/academic'
import { useAct, useGet, useList } from '@/lib/hooks'

type Vagas = { id: number; designacao: string; alunos: number; capacidade: number; vagas: number; cheia: boolean }
type Sugestao = { classe_id: number; turma_pedida: Vagas | null; sugerida: Vagas | null; mensagem: string }

/**
 * Matrícula com a ocupação das turmas à vista: escolhe-se a classe e o sistema propõe a primeira turma com vaga
 * (A, depois B…). Se a turma escolhida estiver cheia, mostra a próxima e deixa usá-la com um clique.
 */
export function NovaMatricula({ onClose, invalidate }: { onClose: () => void; invalidate: string[] }) {
  const alunos = useOptions(alunoOptions)
  const classes = useOptions(classeOptions)
  const [aluno, setAluno] = useState('')
  const [classe, setClasse] = useState('')
  const [turma, setTurma] = useState('')
  const [tipo, setTipo] = useState('renovacao')
  const [obs, setObs] = useState('')
  const turmas = useList(classe ? '/turmas' : null)
  const daClasse = turmas.rows.filter((t) => String(t.classe_id) === classe)
  const sug = useGet<Sugestao>(classe ? '/turmas/sugestao' : null, turma ? { turma_id: turma } : { classe_id: classe })
  const s = sug.data

  const matricular = useAct((p: Row) => api.post('/matriculas', p), {
    invalidate, ok: (r) => `Aluno matriculado na turma ${r?.turma ?? ''}.`, onDone: onClose,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // Sem turma escolhida, vai só a classe e o backend escolhe a primeira com vaga.
    matricular.mutate({ aluno_id: Number(aluno), tipo, observacoes: obs || undefined,
      ...(turma ? { turma_id: Number(turma) } : { classe_id: Number(classe) }) })
  }

  const cheia = !!s?.turma_pedida?.cheia
  const semVaga = !!s && !s.sugerida && (!s.turma_pedida || cheia)

  return (
    <Modal title="Nova matrícula" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="fgrid">
          <Field label="Aluno" wide>
            <select required value={aluno} onChange={(e) => setAluno(e.target.value)}>
              <option value="">{alunos.loading ? 'A carregar…' : 'Seleccione…'}</option>
              {alunos.opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Classe">
            <select required value={classe} onChange={(e) => { setClasse(e.target.value); setTurma('') }}>
              <option value="">Seleccione…</option>
              {classes.opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Turma" hint="Em branco: a primeira turma da classe com vaga">
            <select value={turma} onChange={(e) => setTurma(e.target.value)} disabled={!classe}>
              <option value="">Automática (com vaga)</option>
              {daClasse.map((t) => (
                <option key={t.id} value={t.id}>{t.designacao} — {t.alunos}/{t.capacidade}{t.cheia ? ' (cheia)' : ''}</option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="renovacao">Renovação</option>
              <option value="nova">Nova matrícula</option>
              <option value="transferencia">Transferência</option>
            </select>
          </Field>
          <Field label="Observações" wide>
            <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </Field>
        </div>

        {classe && s && (
          <div className="intro" role="status" style={{ marginTop: 12 }}>
            {cheia ? <Tag tone="er">Turma cheia</Tag> : semVaga ? <Tag tone="er">Sem vagas</Tag> : <Tag tone="ok">Com vaga</Tag>}{' '}
            {s.mensagem}
            {cheia && s.sugerida && (
              <> <Btn size="sm" variant="ghost" onClick={() => setTurma(String(s.sugerida!.id))}>Usar {s.sugerida.designacao}</Btn></>
            )}
          </div>
        )}

        <div className="form-f">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" busy={matricular.isPending} disabled={!aluno || !classe || cheia || semVaga}>Matricular</Btn>
        </div>
      </form>
    </Modal>
  )
}

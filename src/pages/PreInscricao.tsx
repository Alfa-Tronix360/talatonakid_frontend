import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { FormFields, initialValues, toPayload, type FieldDef } from '@/components/FormDialog'
import { Btn } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { PARENTESCOS } from '@/lib/academic'
import { type Row } from '@/lib/data'
import { AuthShell } from './Login'

/** Pré-inscrição de um aluno novo, pública (sem conta). Vai para a coordenação do nível, como as do Google Forms. */
export default function PreInscricao() {
  const [classes, setClasses] = useState<{ value: number; label: string }[]>([])
  const [feito, setFeito] = useState<Row | null>(null)
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)
  const campos: FieldDef[] = [
    { name: 'nome_aluno', label: 'Nome completo da criança', required: true, wide: true },
    { name: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
    { name: 'sexo', label: 'Sexo', type: 'select', options: [{ value: 'F', label: 'Feminino' }, { value: 'M', label: 'Masculino' }] },
    { name: 'classe_id', label: 'Classe pretendida', type: 'select', options: classes, required: true },
    { name: 'escola_anterior', label: 'Escola anterior (se houver)' },
    { name: 'nome_encarregado', label: 'Nome do encarregado de educação', required: true, wide: true },
    { name: 'parentesco', label: 'Parentesco', type: 'select', options: PARENTESCOS, default: 'mae', required: true },
    { name: 'telefone', label: 'Telefone / WhatsApp', type: 'tel', hint: 'Telefone ou e-mail: pelo menos um' },
    { name: 'email', label: 'E-mail', type: 'email' },
    { name: 'observacoes', label: 'Informação que queira acrescentar', type: 'textarea' },
    { name: 'aceito', label: 'Dados pessoais', type: 'checkbox', hint: 'Autorizo a escola a tratar estes dados para a candidatura' },
  ]
  const [valores, setValores] = useState<Row>(() => initialValues(campos))

  useEffect(() => {
    document.title = 'Pré-inscrição · CLACS Escola'
    api.get<Row[]>('/publico/candidaturas/classes')
      .then((r) => setClasses(r.map((c) => ({ value: c.id, label: `${c.designacao} (${c.nivel})` }))))
      .catch((e) => setErro(errMsg(e)))
  }, [])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valores.telefone && !valores.email) { setErro('Indique o telefone ou o e-mail.'); return }
    if (!valores.aceito) { setErro('É preciso autorizar o tratamento dos dados.'); return }
    setBusy(true); setErro('')
    try {
      const form = e.currentTarget as HTMLFormElement
      const site = (form.elements.namedItem('site') as HTMLInputElement | null)?.value || undefined
      setFeito(await api.post<Row>('/publico/candidaturas', { ...toPayload(campos, valores), site }))
    } catch (err) { setErro(errMsg(err)) } finally { setBusy(false) }
  }

  return (
    <AuthShell largo>
      <div className="entrada-caixa formalizacao">
        <h2>Pré-inscrição</h2>
        {feito ? (
          <>
            <div className="okm" role="status">{feito.mensagem}</div>
            <p>Referência da pré-inscrição: <b>{feito.referencia}</b>. Guarde-a para qualquer contacto com a escola.</p>
            <Btn variant="ghost" onClick={() => { setFeito(null); setValores(initialValues(campos)) }}>Fazer outra pré-inscrição</Btn>
          </>
        ) : (
          <form onSubmit={enviar}>
            <p className="sub">Preencha os dados da criança e do encarregado. A coordenação analisa a pré-inscrição e contacta a família para uma reunião.</p>
            {erro && <div className="err" role="alert">{erro}</div>}
            <FormFields fields={campos} values={valores} set={(n, v) => setValores((s) => ({ ...s, [n]: v }))} />
            {/* anti-spam: escondido das pessoas, os robôs preenchem-no */}
            <input name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
            <div className="form-f"><Btn type="submit" busy={busy}>Enviar pré-inscrição</Btn></div>
          </form>
        )}
        <p className="mu" style={{ fontSize: 13 }}><Link to="/login">Já é encarregado? Entrar no portal</Link></p>
      </div>
    </AuthShell>
  )
}

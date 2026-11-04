import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { FormFields, initialValues, toPayload, type FieldDef } from '@/components/FormDialog'
import { Btn, Loading } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { type Row } from '@/lib/data'
import { AuthShell } from './Login'

const SEXOS = [{ value: 'F', label: 'Feminino' }, { value: 'M', label: 'Masculino' }]
const ALUNO: FieldDef[] = [
  { name: 'nome_aluno', label: 'Nome completo do aluno', wide: true },
  { name: 'data_nascimento', label: 'Data de nascimento', type: 'date', required: true },
  { name: 'sexo', label: 'Sexo', type: 'select', options: SEXOS, required: true },
  { name: 'nacionalidade', label: 'Nacionalidade', default: 'Angolana' },
  { name: 'bi_numero', label: 'N.º do BI ou da cédula' },
  { name: 'morada', label: 'Morada', required: true, wide: true },
  { name: 'alergias', label: 'Alergias' },
  { name: 'grupo_sanguineo', label: 'Grupo sanguíneo' },
  { name: 'condicoes_saude', label: 'Doenças ou condições de saúde' },
  { name: 'medicacao', label: 'Medicação habitual' },
  { name: 'necessidades_especiais', label: 'Necessidades educativas especiais', type: 'textarea' },
  { name: 'contacto_emergencia', label: 'Contacto de emergência (nome)', required: true },
  { name: 'telefone_emergencia', label: 'Telefone de emergência', type: 'tel', required: true },
]
const FAMILIA: FieldDef[] = [
  { name: 'nome_encarregado', label: 'Nome do encarregado de educação', wide: true },
  { name: 'bi_encarregado', label: 'N.º do BI do encarregado', required: true },
  { name: 'nif', label: 'NIF' },
  { name: 'profissao', label: 'Profissão' },
  { name: 'telefone', label: 'Telefone', type: 'tel' },
  { name: 'whatsapp', label: 'WhatsApp', type: 'tel' },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'morada_encarregado', label: 'Morada do encarregado (se diferente)', wide: true },
]

/** Página aberta pela família no link recebido (sem conta): dados da matrícula e documentos. */
export default function Formalizacao() {
  const { token } = useParams()
  const base = `/publico/candidaturas/${token}`
  const [c, setC] = useState<Row | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [valores, setValores] = useState<Row>({})
  const [busy, setBusy] = useState('')

  const carregar = (r: Row) => {
    setC(r)
    setValores(initialValues([...ALUNO, ...FAMILIA], {
      nome_aluno: r.nome_aluno, data_nascimento: r.data_nascimento, sexo: r.sexo, nome_encarregado: r.nome_encarregado,
      telefone: r.telefone, email: r.email, ...r.dados,
    }))
  }
  useEffect(() => {
    document.title = 'Matrícula · CLACS Escola'
    api.get<Row>(base).then(carregar, (e) => setErro(errMsg(e)))
  }, [base]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (n: string, v: unknown) => setValores((s) => ({ ...s, [n]: v }))
  const correr = async (qual: string, fn: () => Promise<Row>, ok: string) => {
    setBusy(qual); setErro(''); setAviso('')
    try { carregar(await fn()); setAviso(ok) } catch (e) { setErro(errMsg(e)) } finally { setBusy('') }
  }
  const gravar = (e?: FormEvent) => {
    e?.preventDefault()
    return correr('gravar', () => api.put(base, toPayload([...ALUNO, ...FAMILIA], valores)), 'Dados guardados.')
  }
  const enviar = (tipo: string, f: File) => {
    const d = new FormData(); d.append('tipo', tipo); d.append('ficheiro', f)
    return correr(tipo, () => api.form(`${base}/documentos`, d), 'Documento carregado.')
  }
  const submeter = async () => {
    await gravar()
    await correr('submeter', () => api.post(`${base}/submeter`), 'Obrigado! Os dados e os documentos foram entregues à secretaria.')
  }

  if (!c) return <AuthShell><div className="auth-form">{erro ? <div className="err" role="alert">{erro}</div> : <Loading />}</div></AuthShell>
  const docs = (tipo: string) => (c.documentos as Row[]).filter((d) => d.tipo === tipo)

  return (
    <AuthShell largo>
      <div className="entrada-caixa formalizacao">
        <h2>Matrícula de {c.nome_aluno}</h2>
        <p className="sub">{c.escola} · {c.classe}{c.ano ? ` · ${c.ano}` : ''}</p>
        {!c.pode_editar && <div className="okm">Estado: {c.estado_nome}. {c.estado === 'documentos_entregues' ? 'A secretaria vai validar os dados e confirmar a matrícula.' : ''}</div>}
        {c.correccao && c.pode_editar && <div className="err" role="alert">A secretaria pede: {c.correccao}</div>}
        {erro && <div className="err" role="alert">{erro}</div>}
        {aviso && <div className="okm" role="status">{aviso}</div>}
        {c.pode_editar && (
          <form onSubmit={gravar}>
            <h3>1. Dados do aluno</h3>
            <FormFields fields={ALUNO} values={valores} set={set} />
            <h3>2. Encarregado de educação</h3>
            <FormFields fields={FAMILIA} values={valores} set={set} />
            <div className="form-f"><Btn type="submit" variant="ghost" busy={busy === 'gravar'}>Guardar e continuar depois</Btn></div>
            <h3>3. Documentos</h3>
            <p className="mu">PDF ou fotografia (JPG, PNG), até 10 MB cada.</p>
            <ul className="docs">
              {(c.documentos_pedidos as Row[]).map((p) => (
                <li key={p.tipo}>
                  <span>{p.nome}{p.obrigatorio && <em aria-hidden> *</em>}
                    {docs(p.tipo).map((d) => (
                      <small key={d.id} className="doc-ok">✓ {d.nome}
                        <button type="button" className="btn link" onClick={() => correr('apagar', () => api.del(`${base}/documentos/${d.id}`), 'Documento retirado.')}>retirar</button>
                      </small>
                    ))}
                  </span>
                  <label className="btn ghost sm">
                    {busy === p.tipo ? 'A enviar…' : docs(p.tipo).length ? 'Outro ficheiro' : 'Carregar'}
                    <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" hidden
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(p.tipo, f); e.target.value = '' }} />
                  </label>
                </li>
              ))}
            </ul>
            {c.em_falta.length > 0 && <p className="mu">Ainda falta: {c.em_falta.join(', ')}.</p>}
            <div className="form-f">
              <Btn onClick={submeter} busy={busy === 'submeter'}>Entregar à secretaria</Btn>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  )
}

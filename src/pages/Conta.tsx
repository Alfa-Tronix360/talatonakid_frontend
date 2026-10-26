import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { Avatar } from '@/components/Layout'
import { Btn, Card, Field, KV, PageHead } from '@/components/ui'
import { api } from '@/lib/api'
import { label } from '@/lib/format'
import { nameOf, perfisOf, pick, type Row } from '@/lib/data'
import { useAct } from '@/lib/hooks'
import { useToast } from '@/components/Toast'

function Senha() {
  const toast = useToast()
  const [a, setA] = useState('')
  const [n, setN] = useState('')
  const [c, setC] = useState('')
  const m = useAct(() => api.post('/auth/senha', { senha_actual: a, senha_nova: n }), { ok: 'Palavra-passe alterada.', onDone: () => { setA(''); setN(''); setC('') } })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (n !== c) { toast.error('As palavras-passe novas não coincidem.'); return }
    m.mutate()
  }
  return (
    <Card title="Alterar palavra-passe">
      <form onSubmit={submit}>
        <div className="fgrid">
          <Field label="Palavra-passe actual" wide><input type="password" autoComplete="current-password" required value={a} onChange={(e) => setA(e.target.value)} /></Field>
          <Field label="Nova palavra-passe"><input type="password" autoComplete="new-password" minLength={8} required value={n} onChange={(e) => setN(e.target.value)} /></Field>
          <Field label="Repetir nova palavra-passe"><input type="password" autoComplete="new-password" minLength={8} required value={c} onChange={(e) => setC(e.target.value)} /></Field>
        </div>
        <div className="form-f"><Btn type="submit" busy={m.isPending}>Alterar</Btn></div>
      </form>
    </Card>
  )
}

function DoisPassos({ activo, onChange }: { activo: boolean; onChange: () => void }) {
  const [seg, setSeg] = useState<Row | null>(null)
  const [codigo, setCodigo] = useState('')
  const iniciar = useAct(() => api.post<Row>('/auth/2fa/iniciar'), { silent: true, onDone: (r) => setSeg(r ?? {}) })
  const activar = useAct(() => api.post('/auth/2fa/activar', { codigo: codigo.trim() }), { ok: 'Verificação em dois passos activada.', onDone: () => { setSeg(null); setCodigo(''); onChange() } })
  const desactivar = useAct(() => api.post('/auth/2fa/desactivar', { codigo: codigo.trim() }), { ok: 'Verificação em dois passos desactivada.', onDone: () => { setCodigo(''); onChange() } })

  const segredo = pick(seg, 'segredo', 'secret', 'chave')
  const uri = pick(seg, 'uri', 'otpauth', 'otpauth_uri', 'url')

  return (
    <Card title="Verificação em dois passos">
      <p className="mu" style={{ marginTop: 0 }}>Protege a conta com um código temporário gerado numa aplicação autenticadora (Google Authenticator, Microsoft Authenticator, Authy…).</p>
      {!seg && !activo && <Btn busy={iniciar.isPending} onClick={() => iniciar.mutate()}>Configurar</Btn>}
      {seg && (
        <div className="stack">
          <div className="intro">
            1. Na aplicação autenticadora, adicione uma conta com a chave abaixo.<br />
            2. Introduza o código de 6 dígitos que a aplicação mostrar e confirme.
          </div>
          {segredo && <div><span className="mu">Chave: </span><code style={{ fontSize: 16, userSelect: 'all' }}>{String(segredo)}</code></div>}
          {uri && <div style={{ overflowWrap: 'anywhere' }}><span className="mu">Ligação: </span><a href={String(uri)}>{String(uri)}</a></div>}
          {!segredo && !uri && <KV data={seg} />}
        </div>
      )}
      {(seg || activo) && (
        <form className="toolbar" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); (activo ? desactivar : activar).mutate() }}>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={8} required placeholder="Código de 6 dígitos" aria-label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          <Btn type="submit" variant={activo ? 'danger' : 'primary'} busy={activar.isPending || desactivar.isPending}>{activo ? 'Desactivar' : 'Activar'}</Btn>
        </form>
      )}
    </Card>
  )
}

/** O meu perfil: fotografia, nome e telefone (o e-mail e os perfis são geridos pelo administrador). */
function MeuPerfil() {
  const { user, reload } = useAuth()
  const [nome, setNome] = useState(String(pick(user, 'nome') ?? ''))
  const [tel, setTel] = useState(String(pick(user, 'telefone') ?? ''))
  const guardar = useAct(() => api.patch('/auth/me', { nome: nome.trim(), telefone: tel.trim() || null }), { ok: 'Perfil actualizado.', onDone: () => reload() })
  const foto = useAct((f: File) => { const d = new FormData(); d.append('ficheiro', f); return api.form('/auth/me/foto', d) }, { ok: 'Fotografia actualizada.', onDone: () => reload() })
  return (
    <Card title="O meu perfil">
      <div className="perfil-eu">
        <div className="perfil-foto">
          <Avatar user={user} size={96} />
          <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
            {foto.isPending ? 'A enviar…' : 'Mudar fotografia'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr" onChange={(e) => { const f = e.target.files?.[0]; if (f) foto.mutate(f); e.target.value = '' }} />
          </label>
        </div>
        <form className="grow" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
          <div className="fgrid">
            <Field label="Nome" wide><input required minLength={2} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
            <Field label="Telefone"><input type="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Field>
            <Field label="E-mail" hint="Alterado pelo administrador"><input value={String(pick(user, 'email') ?? '')} disabled /></Field>
            <Field label="Perfis" wide><input value={perfisOf(user).map(label).join(', ')} disabled /></Field>
          </div>
          <div className="form-f"><Btn type="submit" busy={guardar.isPending}>Guardar</Btn></div>
        </form>
      </div>
    </Card>
  )
}

export default function Conta() {
  const { user, reload } = useAuth()
  const activo = !!pick(user, 'doisfa_activo', 'dois_fa', 'totp_activo', 'tem_2fa', '2fa_activo', 'doisfa')
  return (
    <>
      <PageHead title="Configurações" sub={`O seu perfil e a segurança da conta, ${nameOf(user).split(' ')[0] || ''}.`} />
      <div className="stack" style={{ maxWidth: 820 }}>
        <MeuPerfil />
        <Senha />
        <DoisPassos activo={activo} onChange={reload} />
      </div>
    </>
  )
}

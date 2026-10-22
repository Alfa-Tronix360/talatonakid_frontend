import { Resource } from '@/components/Resource'
import { Estado, PageHead } from '@/components/ui'
import { funcionarioOptions } from '@/lib/academic'
import { asList, perfisOf, pick } from '@/lib/data'
import { label } from '@/lib/format'
import { useList } from '@/lib/hooks'

export default function Utilizadores() {
  const perfis = useList('/perfis')
  const opts = perfis.rows.map((p: any) => {
    const v = typeof p === 'string' ? p : String(pick(p, 'codigo', 'nome', 'perfil'))
    return { value: v, label: typeof p === 'string' ? label(p) : String(pick(p, 'nome', 'designacao', 'codigo') ?? v) }
  })
  const lista = asList(perfis.data)
  const options = opts.length ? opts : lista.map((p: any) => ({ value: String(p), label: label(String(p)) }))

  return (
    <>
      <PageHead title="Utilizadores" sub="Contas de acesso da equipa do colégio e respectivos perfis." />
      <Resource
        path="/utilizadores" search createLabel="Novo utilizador"
        createFields={[
          { name: 'nome', label: 'Nome', required: true, wide: true },
          { name: 'email', label: 'E-mail (início de sessão)', type: 'email', required: true },
          { name: 'telefone', label: 'Telefone', type: 'tel' },
          { name: 'senha', label: 'Palavra-passe inicial', type: 'password', required: true, hint: 'Mínimo de 8 caracteres' },
          { name: 'funcionario_id', label: 'Funcionário associado', type: 'select', options: funcionarioOptions },
          { name: 'perfis', label: 'Perfis', type: 'multi', options: options, default: ['secretaria'] },
        ]}
        editFields={[
          { name: 'nome', label: 'Nome', wide: true },
          { name: 'telefone', label: 'Telefone', type: 'tel' },
          { name: 'senha', label: 'Nova palavra-passe', type: 'password', hint: 'Deixe em branco para não alterar' },
          { name: 'perfis', label: 'Perfis', type: 'multi', options: options },
          { name: 'activo', label: 'Estado', type: 'checkbox', hint: 'Conta activa', default: true },
        ]}
        editPath={(r) => `/utilizadores/${r.id}`}
        cols={[
          { h: 'Nome', k: ['nome', 'nome_completo'] }, { h: 'E-mail', k: 'email' }, { h: 'Telefone', k: 'telefone' },
          { h: 'Perfis', render: (r) => perfisOf(r).map(label).join(', ') || '—' },
          { h: '2FA', render: (r) => (pick(r, 'doisfa_activo', 'dois_fa', 'totp_activo', 'tem_2fa') ? 'Activo' : '—') },
          { h: 'Estado', render: (r) => <Estado v={pick(r, 'activo') === false ? 'inactivo' : 'activo'} /> },
        ]}
      />
    </>
  )
}

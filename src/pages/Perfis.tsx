import { useEffect, useMemo, useState } from 'react'
import { Btn, Card, Loading, PageHead, Tag } from '@/components/ui'
import { api } from '@/lib/api'
import { asList, type Row } from '@/lib/data'
import { useAct, useGet } from '@/lib/hooks'

type Catalogo = { modulos: { codigo: string; nome: string }[]; accoes: { codigo: string; nome: string }[] }

/** Perfis e permissões: o que cada perfil pode ver e fazer em cada módulo (o administrador tem sempre tudo). */
export default function Perfis() {
  const cat = useGet<Catalogo>('/permissoes/catalogo')
  const perfis = useGet<Row[]>('/perfis/permissoes')
  const lista = asList(perfis.data)
  const [sel, setSel] = useState<number | null>(null)
  const perfil = lista.find((p) => p.perfil_id === sel) ?? lista.find((p) => p.codigo !== 'admin') ?? lista[0]
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  useEffect(() => { if (perfil) setMarcadas(new Set(perfil.permissoes)) }, [perfil?.perfil_id, perfis.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = useAct((p: Row) => api.put(`/perfis/${p.perfil_id}/permissoes`, { permissoes: [...marcadas].sort() }), {
    invalidate: ['/perfis'], ok: (_, p) => `Permissões de ${p.nome} guardadas. Valem a partir do próximo pedido de cada utilizador.`,
  })
  const alterado = useMemo(() => perfil && [...marcadas].sort().join() !== [...perfil.permissoes].sort().join(), [marcadas, perfil])

  if (cat.isLoading || perfis.isLoading || !cat.data || !perfil) return <Loading />
  const editavel = perfil.editavel
  const tem = (m: string, a: string) => marcadas.has(`${m}:${a}`)
  const trocar = (chaves: string[], ligar: boolean) => setMarcadas((s) => {
    const n = new Set(s)
    chaves.forEach((k) => (ligar ? n.add(k) : n.delete(k)))
    // sem "ver" não há nada a fazer no módulo: ligar outra acção liga também o "ver"
    if (ligar) chaves.forEach((k) => n.add(`${k.split(':')[0]}:ver`))
    return n
  })

  return (
    <>
      <PageHead title="Perfis e permissões" sub="Escolha um perfil e marque o que pode ver e fazer em cada módulo. As alterações valem para todos os utilizadores desse perfil." />
      <div className="perfis-tabs" role="tablist">
        {lista.map((p) => (
          <button key={p.perfil_id} type="button" role="tab" aria-selected={p.perfil_id === perfil.perfil_id}
            className={`perfil-tab ${p.perfil_id === perfil.perfil_id ? 'on' : ''}`} onClick={() => setSel(p.perfil_id)}>
            {p.nome} <small>{p.utilizadores} utilizador(es)</small>
          </button>
        ))}
      </div>
      <Card
        title={<>{perfil.nome} {!editavel && <Tag tone="n">Tem sempre todas as permissões</Tag>}</>}
        actions={editavel && (
          <>
            <Btn variant="ghost" disabled={!alterado} onClick={() => setMarcadas(new Set(perfil.permissoes))}>Desfazer</Btn>
            <Btn disabled={!alterado} busy={guardar.isPending} onClick={() => guardar.mutate(perfil)}>Guardar permissões</Btn>
          </>
        )}
        pad={false}
      >
        <div className="tw-s">
          <table className="matriz">
            <thead>
              <tr>
                <th>Módulo</th>
                {cat.data.accoes.map((a) => <th key={a.codigo} className="c">{a.nome}</th>)}
                <th className="c">Tudo</th>
              </tr>
            </thead>
            <tbody>
              {cat.data.modulos.map((m) => {
                const chaves = cat.data!.accoes.map((a) => `${m.codigo}:${a.codigo}`)
                const todas = chaves.every((k) => marcadas.has(k))
                return (
                  <tr key={m.codigo}>
                    <td>{m.nome}</td>
                    {cat.data!.accoes.map((a) => (
                      <td key={a.codigo} className="c">
                        <input type="checkbox" aria-label={`${m.nome}: ${a.nome}`} disabled={!editavel}
                          checked={!editavel || tem(m.codigo, a.codigo)}
                          onChange={(e) => (a.codigo === 'ver' && !e.target.checked
                            ? trocar(chaves, false)                       // tirar "ver" tira tudo no módulo
                            : trocar([`${m.codigo}:${a.codigo}`], e.target.checked))} />
                      </td>
                    ))}
                    <td className="c">
                      <input type="checkbox" aria-label={`${m.nome}: tudo`} disabled={!editavel} checked={!editavel || todas}
                        onChange={(e) => trocar(chaves, e.target.checked)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="note">O perfil «Encarregado» só usa o portal do encarregado; as permissões aqui não se aplicam ao portal.</p>
    </>
  )
}

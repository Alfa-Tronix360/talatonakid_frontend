import { useRef, useState } from 'react'
import { AuthImage } from '@/components/AuthImage'
import { useConfirm } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Btn, Estado, PageHead, Select, Tabs } from '@/components/ui'
import { alunoOptions } from '@/lib/academic'
import { api } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { dataPT, hojeISO, label } from '@/lib/format'
import { useAct } from '@/lib/hooks'

const MAX_IMAGENS = 6 // o mesmo limite da API

/** O campo de ficheiros pode trazer uma lista, um só File, uma FileList ou nada. */
const comoLista = (v: unknown): File[] =>
  v instanceof File ? [v] : v instanceof FileList ? [...v] : Array.isArray(v) ? v.filter((x) => x instanceof File) : []

const enviarImagem = (oid: number, f: File) => {
  const d = new FormData()
  d.append('ficheiro', f)
  return api.form(`/ocorrencias/${oid}/imagens`, d)
}

/** Abre a imagem em tamanho real num separador novo (os ficheiros pedem sessão, por isso vai como blob). */
async function abrir(url: string) {
  const janela = window.open('', '_blank')
  const b = await api.blob(url)
  const obj = URL.createObjectURL(b)
  if (janela) janela.location.href = obj
  else window.open(obj, '_blank')
}

/** Fotografias da ocorrência: ver, juntar mais e retirar. */
function ImagensOcorrencia({ r }: { r: Row }) {
  const confirm = useConfirm()
  const input = useRef<HTMLInputElement>(null)
  const imagens: Row[] = r.imagens ?? []
  const juntar = useAct(async (fs: File[]) => { for (const f of fs) await enviarImagem(r.id, f) },
    { invalidate: ['/ocorrencias'], ok: 'Imagens anexadas.' })
  const retirar = useAct((iid: number) => api.del(`/ocorrencias/${r.id}/imagens/${iid}`), { invalidate: ['/ocorrencias'], ok: 'Imagem retirada.' })
  const livres = MAX_IMAGENS - imagens.length
  return (
    <div className="oc-det">
      <p><b>Descrição:</b> {r.descricao}</p>
      {r.accao_tomada && <p><b>Acção tomada:</b> {r.accao_tomada}</p>}
      <div className="oc-imgs">
        {imagens.map((i) => (
          <figure key={i.id}>
            <button type="button" className="oc-img" onClick={() => abrir(i.url)} title="Ver em tamanho real">
              <AuthImage src={i.url} alt={i.nome ?? 'Imagem da ocorrência'} fallback="…" />
            </button>
            <figcaption>
              <span title={i.nome ?? ''}>{i.nome ?? 'imagem'}</span>
              <Btn variant="link" onClick={async () => {
                if (await confirm({ title: 'Retirar imagem', text: 'Retirar esta imagem da ocorrência?', danger: true, yes: 'Retirar' })) retirar.mutate(i.id)
              }}>Retirar</Btn>
            </figcaption>
          </figure>
        ))}
        {livres > 0 && (
          <button type="button" className="oc-img oc-novo" disabled={juntar.isPending} onClick={() => input.current?.click()}>
            {juntar.isPending ? 'A enviar…' : <><b>+</b>Juntar imagens</>}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
        onChange={(e) => { const fs = [...(e.target.files ?? [])].slice(0, livres); e.target.value = ''; if (fs.length) juntar.mutate(fs) }} />
      <p className="note">Até {MAX_IMAGENS} fotografias por ocorrência (JPG, PNG ou WEBP).</p>
    </div>
  )
}

export default function Ocorrencias() {
  const [tab, setTab] = useState<'lista' | 'tipos'>('lista')
  const [estado, setEstado] = useState('')
  return (
    <>
      <PageHead title="Ocorrências" sub="Registo disciplinar e positivo dos alunos, com acompanhamento e aviso ao encarregado." />
      <Tabs value={tab} onChange={setTab} tabs={[['lista', 'Ocorrências'], ['tipos', 'Tipos de ocorrência']]} />
      {tab === 'lista' && (
        <Resource
          path="/ocorrencias" params={{ estado }} search createLabel="Nova ocorrência"
          toolbar={<Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos os estados" options={[{ value: 'aberta', label: 'Abertas' }, { value: 'em_acompanhamento', label: 'Em acompanhamento' }, { value: 'fechada', label: 'Fechadas' }]} />}
          createFields={[
            { name: 'aluno_id', label: 'Aluno', type: 'select', options: alunoOptions, required: true, wide: true },
            { name: 'tipo_id', label: 'Tipo', type: 'select', options: { path: '/tipos-ocorrencia', label: ['designacao'] }, required: true },
            { name: 'data', label: 'Data', type: 'date', default: hojeISO() },
            { name: 'descricao', label: 'Descrição', type: 'textarea', required: true },
            { name: 'accao_tomada', label: 'Acção tomada', type: 'textarea' },
            { name: 'notificar_ee', label: 'Aviso', type: 'checkbox', hint: 'Avisar o encarregado' },
            { name: 'imagens', label: 'Imagens', type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, wide: true,
              hint: `Opcional: até ${MAX_IMAGENS} fotografias.` },
          ]}
          afterCreate={async (oc, v) => { for (const f of comoLista(v.imagens).slice(0, MAX_IMAGENS)) await enviarImagem(oc.id, f) }}
          expand={(r) => <ImagensOcorrencia r={r} />}
          editFields={[
            { name: 'estado', label: 'Estado', type: 'select', options: [{ value: 'aberta', label: 'Aberta' }, { value: 'em_acompanhamento', label: 'Em acompanhamento' }, { value: 'fechada', label: 'Fechada' }] },
            { name: 'accao_tomada', label: 'Acção tomada', type: 'textarea' },
          ]}
          editPath={(r) => `/ocorrencias/${r.id}`}
          deletePath={(r) => `/ocorrencias/${r.id}`} deleteName={() => 'esta ocorrência'}
          cols={[
            { h: 'Data', render: (r) => dataPT(pick(r, 'data')) },
            { h: 'Aluno', k: ['aluno', 'aluno_nome', 'aluno.nome_completo'] },
            { h: 'Tipo', k: ['tipo', 'tipo_designacao', 'tipo.designacao'] },
            { h: 'Gravidade', render: (r) => { const g = pick(r, 'gravidade', 'tipo.gravidade'); return g ? <Estado v={g} /> : '—' } },
            { h: 'Descrição', k: 'descricao', nowrap: false },
            { h: 'Imagens', render: (r) => (r.imagens?.length ? <span className="oc-conta" title="Clique na linha para ver">📷 {r.imagens.length}</span> : <span className="mu">—</span>) },
            { h: 'Estado', render: (r) => <Estado v={pick(r, 'estado')} /> },
          ]}
        />
      )}
      {tab === 'tipos' && (
        <Resource path="/tipos-ocorrencia" crud="/tipos-ocorrencia" createLabel="Novo tipo"
          createFields={[
            { name: 'designacao', label: 'Designação', required: true, wide: true },
            { name: 'gravidade', label: 'Gravidade', type: 'select', required: true, default: 'leve', options: ['positiva', 'leve', 'moderada', 'grave'].map((v) => ({ value: v, label: label(v) })) },
          ]}
          cols={[{ h: 'Tipo', k: 'designacao' }, { h: 'Gravidade', render: (r) => <Estado v={pick(r, 'gravidade')} /> }]} />
      )}
    </>
  )
}

import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AuthImage } from '@/components/AuthImage'
import { AutoSections } from '@/components/Auto'
import { FormDialog } from '@/components/FormDialog'
import { useConfirm } from '@/components/Modal'
import { Table } from '@/components/Table'
import { Btn, Card, Empty, ErrorBox, Estado, Loading, PageHead, Select, Tabs } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { asList, nameOf, pick, type Row } from '@/lib/data'
import { CANAIS, PARENTESCOS, encarregadoOptions, useAnoActivo } from '@/lib/academic'
import { dataPT, label } from '@/lib/format'
import { useAct, useGet } from '@/lib/hooks'
import { useToast } from '@/components/Toast'
import { alunoFields } from './Alunos'

type Tab = 'geral' | 'dados' | 'enc' | 'docs'

export default function AlunoDetalhe() {
  const { id } = useParams()
  const toast = useToast()
  const confirm = useConfirm()
  const { periodos } = useAnoActivo()
  const [tab, setTab] = useState<Tab>('geral')
  const [dlg, setDlg] = useState<'editar' | 'msg' | 'ligar' | 'doc' | null>(null)
  const [periodo, setPeriodo] = useState('')

  const v360 = useGet<Row>(`/alunos/${id}/360`)
  const det = useGet<Row>(`/alunos/${id}`)
  const aluno: Row = { ...(det.data || {}), ...(pick(v360.data, 'aluno') || {}) }
  const nome = String(pick(aluno, 'nome_completo', 'nome') ?? 'Aluno')
  const inval = [`/alunos/${id}`, '/alunos']

  const editar = useAct((p: Row) => api.patch(`/alunos/${id}`, p), { invalidate: inval, ok: 'Dados guardados.' })
  // Criar a mensagem só a põe em fila (estado "agendada"); despachamos logo a seguir para a enviar de facto.
  const msg = useAct(async (p: Row) => {
    const r = await api.post(`/alunos/${id}/mensagem`, p)
    await api.post('/mensagens/despachar').catch(() => { /* fica em fila; pode reenviar-se em Mensagens */ })
    return r
  }, { invalidate: ['/mensagens'], ok: 'Mensagem enviada ao encarregado.' })
  const ligar = useAct((p: Row) => api.post(`/alunos/${id}/encarregados`, p), { invalidate: inval, ok: 'Encarregado ligado.' })
  const desligar = useAct((eid: number) => api.del(`/alunos/${id}/encarregados/${eid}`), { invalidate: inval, ok: 'Encarregado desligado.' })
  const foto = useAct((f: File) => { const d = new FormData(); d.append('ficheiro', f); return api.form(`/alunos/${id}/foto`, d) }, { invalidate: inval, ok: 'Fotografia actualizada.' })
  const doc = useAct((p: Row) => {
    const d = new FormData()
    d.append('tipo', String(p.tipo))
    if (p.validade) d.append('validade', String(p.validade))
    d.append('ficheiro', p.ficheiro)
    return api.form(`/alunos/${id}/documentos/ficheiro`, d)
  }, { invalidate: inval, ok: 'Documento anexado.' })

  const pdf = async (path: string, params?: Record<string, string>) => {
    try { await api.download(path, params, undefined, true) } catch (e) { toast.error(errMsg(e)) }
  }

  if (det.isLoading && v360.isLoading) return <Loading />
  if (det.isError && v360.isError) return <ErrorBox error={det.error} retry={() => { det.refetch(); v360.refetch() }} />

  const encs = asList(pick(aluno, 'encarregados', 'ligacoes') ?? pick(v360.data, 'encarregados'))
  const docs = asList(pick(aluno, 'documentos') ?? pick(v360.data, 'documentos'))
  const turma = pick(aluno, 'turma', 'turma_designacao', 'turma.designacao', 'matricula.turma', 'matricula.turma.designacao')
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
  const matriculaId = pick(aluno, 'matricula_id', 'matricula.id', 'matricula_actual.id')

  return (
    <>
      <PageHead
        title={nome}
        sub={<><Link to="/alunos">← Alunos</Link></>}
        actions={
          <>
            <Btn variant="ghost" onClick={() => setDlg('msg')}>Enviar mensagem ao encarregado</Btn>
            <Btn variant="ghost" onClick={() => pdf(`/alunos/${id}/extracto.pdf`)}>Extracto (PDF)</Btn>
            {matriculaId && <Btn variant="ghost" onClick={() => pdf(`/matriculas/${matriculaId}/declaracao.pdf`)}>Declaração</Btn>}
          </>
        }
      />

      <Card>
        <div className="profile">
          <div className="avatar"><AuthImage src={pick(aluno, 'foto_url')} alt={`Fotografia de ${nome}`} fallback={iniciais || '?'} /></div>
          <div>
            <h3>{nome}</h3>
            <div className="mu">
              {turma ? `Turma ${typeof turma === 'object' ? nameOf(turma) : turma}` : 'Sem turma'}
              {pick(aluno, 'numero_processo') ? ` · Processo ${pick(aluno, 'numero_processo')}` : ''}
            </div>
            <div style={{ marginTop: 6 }}><Estado v={pick(aluno, 'estado')} /></div>
          </div>
          <span style={{ flex: 1 }} />
          <label className="btn ghost" style={{ cursor: 'pointer' }}>
            {foto.isPending ? 'A enviar…' : 'Mudar fotografia'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr" onChange={(e) => { const f = e.target.files?.[0]; if (f) foto.mutate(f); e.target.value = '' }} />
          </label>
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[['geral', 'Visão 360°'], ['dados', 'Dados pessoais'], ['enc', 'Encarregados'], ['docs', 'Documentos e boletim']]} />
      </div>

      {tab === 'geral' && (
        v360.isLoading ? <Loading /> : v360.isError ? <ErrorBox error={v360.error} retry={() => v360.refetch()} /> :
        <AutoSections data={v360.data} skip={['aluno', 'encarregados', 'documentos']} titles={{ financeiro: 'Financeiro', pedagogico: 'Pedagógico', _: 'Resumo' }} />
      )}

      {tab === 'dados' && (
        <Card title="Dados pessoais" actions={<Btn variant="ghost" onClick={() => setDlg('editar')}>Editar</Btn>}>
          <dl className="kv">
            {([
              ['Nome completo', nome], ['Data de nascimento', dataPT(pick(aluno, 'data_nascimento'))], ['Sexo', label(pick(aluno, 'sexo'))],
              ['Nacionalidade', pick(aluno, 'nacionalidade')], ['BI / Cédula', pick(aluno, 'bi_numero')], ['Morada', pick(aluno, 'morada')],
              ['Alergias', pick(aluno, 'alergias')], ['Necessidades especiais', pick(aluno, 'necessidades_especiais')], ['Escola anterior', pick(aluno, 'escola_anterior')],
            ] as [string, unknown][]).map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{(val as string) || '—'}</dd></div>)}
          </dl>
        </Card>
      )}

      {tab === 'enc' && (
        <Card title="Encarregados de educação" pad={false} actions={<Btn onClick={() => setDlg('ligar')}>Ligar encarregado</Btn>}>
          <Table
            rows={encs}
            empty="Este aluno ainda não tem encarregado ligado."
            pageSize={0}
            cols={[
              { h: 'Nome', k: ['nome_completo', 'nome', 'encarregado.nome_completo', 'encarregado.nome'] },
              { h: 'Parentesco', render: (r) => label(pick(r, 'parentesco')) },
              { h: 'Telefone', k: ['telefone', 'whatsapp', 'encarregado.telefone'] },
              { h: 'Principal', render: (r) => (pick(r, 'principal') ? 'Sim' : '—') },
              { h: 'Financeiro', render: (r) => (pick(r, 'responsavel_financeiro') ? 'Sim' : '—') },
              {
                h: '',
                render: (r) => (
                  <Btn variant="link" onClick={async () => {
                    if (await confirm({ text: `Desligar ${nameOf(r.encarregado ?? r)} deste aluno?`, danger: true, yes: 'Desligar' }))
                      desligar.mutate(pick(r, 'encarregado_id', 'encarregado.id', 'id'))
                  }}>Desligar</Btn>
                ),
              },
            ]}
          />
        </Card>
      )}

      {tab === 'docs' && (
        <div className="stack">
          <Card title="Boletim de avaliação">
            <div className="toolbar" style={{ margin: 0 }}>
              <Select label="Período" value={periodo} onChange={setPeriodo} placeholder="Escolha o período"
                options={periodos.map((p) => ({ value: p.id, label: String(pick(p, 'designacao', 'nome')) }))} />
              <Btn disabled={!periodo} onClick={() => pdf(`/alunos/${id}/boletim.pdf`, { periodo_id: periodo })}>Abrir boletim (PDF)</Btn>
            </div>
          </Card>
          <Card title="Documentos" pad={false} actions={<Btn onClick={() => setDlg('doc')}>Anexar documento</Btn>}>
            <Table
              rows={docs}
              empty="Sem documentos anexados."
              pageSize={0}
              cols={[
                { h: 'Tipo', k: ['tipo'] },
                { h: 'Validade', render: (r) => dataPT(pick(r, 'validade')) },
                { h: 'Anexado em', render: (r) => dataPT(pick(r, 'criado_em', 'created_at', 'data')) },
                {
                  h: '',
                  render: (r) => {
                    const u = String(pick(r, 'ficheiro_url', 'url', 'chave') ?? '')
                    if (!u) return null
                    return <Btn variant="link" onClick={() => (/^https?:/.test(u) && !u.includes('/api/') ? window.open(u, '_blank', 'noopener') : pdf(u.includes('/ficheiros/') ? u.replace(/^.*\/api/, '') : `/ficheiros/${u}`))}>Abrir</Btn>
                  },
                },
              ]}
            />
          </Card>
          {!docs.length && !encs.length && <Empty>Sem mais informação.</Empty>}
        </div>
      )}

      {dlg === 'editar' && (
        <FormDialog title="Editar aluno" size="lg" fields={alunoFields(false)} initial={aluno} onClose={() => setDlg(null)} onSubmit={(p) => editar.mutateAsync(p)} />
      )}
      {dlg === 'msg' && (
        <FormDialog
          title={`Mensagem ao encarregado de ${nome}`}
          submitLabel="Enviar"
          onClose={() => setDlg(null)}
          fields={[
            { name: 'assunto', label: 'Assunto', wide: true },
            { name: 'corpo', label: 'Mensagem', type: 'textarea', required: true },
            { name: 'canais', label: 'Canais', type: 'multi', options: CANAIS, default: ['whatsapp'] },
          ]}
          onSubmit={(p) => msg.mutateAsync(p)}
        />
      )}
      {dlg === 'ligar' && (
        <FormDialog
          title="Ligar encarregado"
          onClose={() => setDlg(null)}
          fields={[
            { name: 'encarregado_id', label: 'Encarregado', type: 'select', options: encarregadoOptions, required: true, wide: true },
            { name: 'parentesco', label: 'Parentesco', type: 'select', options: PARENTESCOS, required: true, default: 'mae' },
            { name: 'principal', label: 'Contacto principal', type: 'checkbox', hint: 'Contacto principal' },
            { name: 'responsavel_financeiro', label: 'Responsável financeiro', type: 'checkbox', hint: 'Responsável financeiro' },
            { name: 'autorizado_recolha', label: 'Recolha', type: 'checkbox', hint: 'Autorizado a recolher o aluno', default: true },
          ]}
          onSubmit={(p) => ligar.mutateAsync(p)}
        />
      )}
      {dlg === 'doc' && (
        <FormDialog
          title="Anexar documento"
          onClose={() => setDlg(null)}
          fields={[
            { name: 'tipo', label: 'Tipo (BI, certificado, vacinas…)', required: true },
            { name: 'validade', label: 'Validade', type: 'date' },
            { name: 'ficheiro', label: 'Ficheiro', type: 'file', required: true, wide: true },
          ]}
          onSubmit={(_, raw) => doc.mutateAsync(raw)}
        />
      )}
    </>
  )
}

import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Modal } from '@/components/Modal'
import { Table } from '@/components/Table'
import { useToast } from '@/components/Toast'
import { Btn, Card, Estado, Kpi, Loading, PageHead, SearchBox, Select, Toolbar } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { classeOptions, PARENTESCOS, turmaOptions } from '@/lib/academic'
import { type Row } from '@/lib/data'
import { dataPT } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'

/** As etapas do procedimento de admissão, pela ordem (quem faz cada uma). */
export const ETAPAS: { estado: string; nome: string; quem: string }[] = [
  { estado: 'submetida', nome: 'Pré-inscrição', quem: 'Família' },
  { estado: 'reuniao_marcada', nome: 'Reunião marcada', quem: 'Coordenação' },
  { estado: 'reuniao_realizada', nome: 'Reunião / avaliação', quem: 'Coordenação' },
  { estado: 'validada', nome: 'Validada', quem: 'Coordenação' },
  { estado: 'autorizada', nome: 'Autorizada', quem: 'Direcção' },
  { estado: 'vaga_comunicada', nome: 'Vaga comunicada', quem: 'Secretaria' },
  { estado: 'documentos_entregues', nome: 'Dados e documentos', quem: 'Família' },
  { estado: 'matriculada', nome: 'Matriculado', quem: 'Secretaria' },
  { estado: 'concluida', nome: 'Boas-vindas', quem: 'Secretaria' },
]
const FINAIS = ['concluida', 'rejeitada', 'cancelada']
const TOM: Record<string, string> = { concluida: 'pago', matriculada: 'pago', rejeitada: 'divida', cancelada: 'anulada' }
const ORIGEM: Record<string, string> = { google_forms: 'Google Forms', secretaria: 'Secretaria', importacao: 'CSV do formulário' }
const SEXOS = [{ value: 'F', label: 'Feminino' }, { value: 'M', label: 'Masculino' }]

const camposCandidatura: FieldDef[] = [
  { name: 'nome_aluno', label: 'Nome completo do aluno', required: true, wide: true },
  { name: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
  { name: 'sexo', label: 'Sexo', type: 'select', options: SEXOS },
  { name: 'classe_id', label: 'Classe pretendida', type: 'select', options: classeOptions },
  { name: 'escola_anterior', label: 'Escola anterior' },
  { name: 'nome_encarregado', label: 'Encarregado de educação', required: true, wide: true },
  { name: 'parentesco', label: 'Parentesco', type: 'select', options: PARENTESCOS, default: 'mae' },
  { name: 'telefone', label: 'Telefone / WhatsApp', type: 'tel' },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]

/** "2026-11-10" + "09:30" → "2026-11-10T09:30:00+01:00": a hora escolhida, com o fuso do computador. */
function dataHora(d: string, h: string) {
  const min = -new Date(`${d}T${h || '09:00'}`).getTimezoneOffset()
  const fuso = `${min < 0 ? '-' : '+'}${String(Math.floor(Math.abs(min) / 60)).padStart(2, '0')}:${String(Math.abs(min) % 60).padStart(2, '0')}`
  return `${d}T${h || '09:00'}:00${fuso}`
}

type Accao = { chave: string; label: string; titulo: string; intro?: ReactNode; fields: FieldDef[]; papel: string; variante?: 'ghost' | 'danger'; corpo?: (p: Row) => Row; ok: string }

function accoes(c: Row): Accao[] {
  const rejeitar: Accao = { chave: 'rejeitar', label: 'Rejeitar', titulo: 'Rejeitar a candidatura', papel: 'coordenacao', variante: 'danger',
    intro: 'A família recebe o motivo por WhatsApp e e-mail.', ok: 'Candidatura rejeitada. A família foi avisada.',
    fields: [{ name: 'parecer', label: 'Motivo', type: 'textarea', required: true }] }
  const reuniao: Accao = { chave: 'reuniao', label: c.estado === 'submetida' ? 'Convocar para reunião' : 'Remarcar reunião',
    titulo: 'Reunião com a família (obrigatória)', papel: 'coordenacao', variante: c.estado === 'submetida' ? undefined : 'ghost',
    intro: <>Confira as vagas da classe antes de convocar. A família recebe a convocatória por WhatsApp e e-mail.</>,
    ok: 'Reunião marcada. A família foi convocada.',
    fields: [
      { name: 'dia', label: 'Dia', type: 'date', required: true }, { name: 'hora', label: 'Hora', type: 'time', required: true, default: '09:00' },
      { name: 'reuniao_local', label: 'Local', placeholder: 'Secretaria do colégio', wide: true },
      { name: 'mensagem', label: 'Mensagem para a família (opcional)', type: 'textarea', placeholder: 'Ex.: traga o último boletim e a cédula.' },
    ],
    corpo: (p) => ({ reuniao_em: dataHora(p.dia, p.hora), reuniao_local: p.reuniao_local, mensagem: p.mensagem }) }
  switch (c.estado) {
    case 'submetida': return [reuniao, rejeitar]
    case 'reuniao_marcada': return [
      { chave: 'avaliacao', label: 'Registar reunião / avaliação', titulo: 'Reunião, entrevista e avaliação', papel: 'coordenacao', ok: 'Reunião registada.',
        fields: [{ name: 'avaliacao', label: 'Notas da reunião e, se houve, da entrevista ou avaliação do aluno', type: 'textarea', required: true }] },
      reuniao, rejeitar]
    case 'reuniao_realizada': return [
      { chave: 'validar', label: 'Validar', titulo: 'Validar a candidatura', papel: 'coordenacao', ok: 'Candidatura validada. Segue para a Direcção.',
        intro: 'Só é possível validar se houver vaga na classe. A Direcção é avisada.',
        fields: [{ name: 'parecer', label: 'Parecer da coordenação (opcional)', type: 'textarea' }] },
      rejeitar]
    case 'validada': return [
      { chave: 'autorizar', label: 'Autorizar admissão', titulo: 'Decisão da Direcção', papel: 'direccao', ok: 'Admissão autorizada. A secretaria foi informada.',
        intro: 'Autorizar informa os serviços administrativos, que comunicam a vaga à família.',
        fields: [{ name: 'parecer', label: 'Nota (opcional)', type: 'textarea' }] },
      { ...rejeitar, papel: 'direccao' }]
    case 'autorizada':
    case 'vaga_comunicada': return [
      { chave: 'comunicar', label: c.estado === 'autorizada' ? 'Comunicar vaga à família' : 'Reenviar comunicação', titulo: 'Comunicar a vaga',
        papel: 'secretaria', variante: c.estado === 'autorizada' ? undefined : 'ghost', ok: 'Vaga comunicada. A família recebeu o link para formalizar.',
        intro: 'A família recebe, por WhatsApp e e-mail, a vaga atribuída, os passos da matrícula e o link para preencher os dados e carregar os documentos.',
        fields: [{ name: 'mensagem', label: 'Informação adicional (opcional)', type: 'textarea', placeholder: 'Ex.: prazo, valor da matrícula, horário da secretaria.' }] }]
    case 'documentos_entregues': return [
      { chave: 'matricular', label: 'Validar e matricular', titulo: 'Matricular o aluno', papel: 'secretaria', ok: 'Aluno matriculado. A coordenação pedagógica foi avisada.',
        intro: 'Cria o aluno, o encarregado (ou usa o que já existe), os documentos e a matrícula de uma só vez.',
        fields: [{ name: 'turma_id', label: 'Turma', type: 'select', wide: true, empty: 'Automática (1.ª turma da classe com vaga)',
          options: { ...turmaOptions, filter: (t: Row) => t.classe_id === c.classe_id } }] },
      { chave: 'correccao', label: 'Pedir correcção', titulo: 'Devolver à família', papel: 'secretaria', variante: 'ghost', ok: 'Pedido de correcção enviado à família.',
        fields: [{ name: 'correccao', label: 'O que a família tem de corrigir ou entregar', type: 'textarea', required: true }] }]
    case 'matriculada':
    case 'concluida': return [
      { chave: 'boas-vindas', label: c.estado === 'matriculada' ? 'Boas-vindas e integração' : 'Actualizar integração', titulo: 'Boas-vindas e integração',
        papel: 'secretaria', variante: c.estado === 'matriculada' ? undefined : 'ghost', ok: 'Integração registada.',
        intro: c.estado === 'matriculada' ? 'A família recebe a mensagem de boas-vindas com a turma e o número de processo.' : undefined,
        fields: [
          { name: 'kit_entregue', label: 'Welcome kit', type: 'checkbox', hint: 'Entregue', default: !!c.integracao?.kit_entregue },
          { name: 'documentacao_entregue', label: 'Documentação de integração', type: 'checkbox', hint: 'Regulamento, calendário e lista de material entregues', default: !!c.integracao?.documentacao_entregue },
          { name: 'dia', label: 'Dia de integração (opcional)', type: 'date' }, { name: 'hora', label: 'Hora', type: 'time' },
          { name: 'mensagem', label: 'Mensagem para a família (opcional)', type: 'textarea' },
        ],
        corpo: (p) => ({ kit_entregue: p.kit_entregue, documentacao_entregue: p.documentacao_entregue, mensagem: p.mensagem,
          ...(p.dia ? { reuniao_integracao: dataHora(p.dia, p.hora) } : {}) }) }]
    default: return []
  }
}

function Etapas({ estado }: { estado: string }) {
  const actual = estado === 'concluida' ? ETAPAS.length : ETAPAS.findIndex((e) => e.estado === estado)
  return (
    <ol className="etapas" aria-label="Etapas da candidatura">
      {ETAPAS.map((e, i) => (
        <li key={e.estado} className={actual < 0 ? '' : i < actual ? 'feita' : i === actual ? 'actual' : ''}>
          <b>{i + 1}</b><span>{e.nome}<small>{e.quem}</small></span>
        </li>
      ))}
    </ol>
  )
}

function Dados({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {itens.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  )
}

function Detalhe({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useGet<Row>(`/candidaturas/${id}`)
  const { perfis } = useAuth()
  const toast = useToast()
  const [accao, setAccao] = useState<Accao | null>(null)
  const [cancelar, setCancelar] = useState(false)
  const [editar, setEditar] = useState(false)
  const inv = ['/candidaturas', '/alertas', '/alunos', '/matriculas', '/turmas']
  const act = useAct((v: { chave: string; corpo: Row }) => api.post(`/candidaturas/${id}/${v.chave}`, v.corpo), { invalidate: inv, silent: true })
  const guardar = useAct((p: Row) => api.patch(`/candidaturas/${id}`, p), { invalidate: inv, silent: true })
  const c = q.data
  const pode = (papel: string) => perfis.some((p) => ['admin', 'direccao', papel].includes(p))
  const abrir = async (u: string) => {
    try { await api.download(u.replace(/^.*\/api/, ''), undefined, undefined, true) } catch (e) { toast.error(errMsg(e)) }
  }
  const copiar = async (t: string) => {
    try { await navigator.clipboard.writeText(t); toast.ok('Link copiado.') } catch { toast.error('Não foi possível copiar.') }
  }

  return (
    <Modal title={c ? `Candidatura — ${c.nome_aluno}` : 'Candidatura'} onClose={onClose} size="xl">
      {!c ? <Loading /> : (
        <div className="cand">
          <Etapas estado={c.estado} />
          <div className="cand-estado">
            <Estado v={TOM[c.estado] ?? 'pendente'} text={c.estado_nome} />
            <span className="mu">{ORIGEM[c.origem] ?? c.origem} · recebida a {dataPT(c.criado_em)}</span>
            <span className="grow" />
            {accoes(c).filter((a) => pode(a.papel)).map((a) => (
              <Btn key={a.label} variant={a.variante === 'danger' ? 'danger' : a.variante} onClick={() => setAccao(a)}>{a.label}</Btn>
            ))}
            {!FINAIS.includes(c.estado) && c.estado !== 'matriculada' && <Btn variant="link" onClick={() => setCancelar(true)}>Cancelar candidatura</Btn>}
            {['submetida', 'reuniao_marcada', 'reuniao_realizada'].includes(c.estado)
              && perfis.some((p) => ['admin', 'direccao', 'coordenacao', 'secretaria'].includes(p))
              && <Btn variant="link" onClick={() => setEditar(true)}>Editar pré-inscrição</Btn>}
          </div>
          {accoes(c).length > 0 && !accoes(c).some((a) => pode(a.papel)) && (
            <div className="intro">Esta etapa é da {accoes(c)[0].papel === 'coordenacao' ? 'coordenação' : accoes(c)[0].papel === 'direccao' ? 'Direcção' : 'secretaria'}.</div>
          )}

          <div className="grid g2">
            <Card title="Aluno">
              <Dados itens={[['Nome', c.nome_aluno], ['Nascimento', c.data_nascimento && dataPT(c.data_nascimento)],
                ['Sexo', c.sexo === 'F' ? 'Feminino' : c.sexo === 'M' ? 'Masculino' : null], ['Classe pretendida', c.classe ?? <span className="er">Por indicar</span>],
                ['Nível', c.nivel], ['Ano lectivo', c.ano], ['Escola anterior', c.escola_anterior], ['Observações', c.observacoes],
                ['Turma', c.turma], ['Processo', c.aluno_id && <Link to={`/alunos/${c.aluno_id}`}>Abrir ficha do aluno</Link>]]} />
            </Card>
            <Card title="Família">
              <Dados itens={[['Encarregado', c.nome_encarregado], ['Parentesco', PARENTESCOS.find((p) => p.value === c.parentesco)?.label],
                ['Telefone', c.telefone], ['E-mail', c.email]]} />
            </Card>
            <Card title="Coordenação">
              <Dados itens={[['Coordenador do nível', c.coordenador ?? 'Toda a coordenação'],
                ['Vagas na classe', c.classe_id ? `${c.vagas.livres} livre(s) de ${c.vagas.capacidade}` : '—'],
                ['Turmas', c.vagas.turmas.map((t: Row) => `${t.designacao} ${t.alunos}/${t.capacidade}`).join(' · ') || null],
                ['Reunião', c.reuniao_em && `${dataPT(c.reuniao_em, true)} — ${c.reuniao_local ?? ''}`],
                ['Reunião / avaliação', c.avaliacao], ['Parecer', c.parecer]]} />
            </Card>
            <Card title="Formalização pela família">
              <Dados itens={[
                ['Link', c.link_formalizacao && <Btn variant="link" onClick={() => copiar(c.link_formalizacao)}>Copiar link</Btn>],
                ['Correcção pedida', c.correccao],
                ['Em falta', ['vaga_comunicada', 'documentos_entregues'].includes(c.estado) ? (c.em_falta.join(', ') || 'Nada') : null],
                ...Object.entries(c.dados_matricula ?? {}).map(([k, v]) => [k.replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase()), String(v)] as [string, ReactNode]),
              ]} />
              {c.lista_documentos.length > 0 && (
                <ul className="docs">
                  {c.lista_documentos.map((d: Row) => (
                    <li key={d.id}>
                      <span>{c.documentos_pedidos.find((p: Row) => p.tipo === d.tipo)?.nome ?? d.tipo}<small className="mu"> {d.nome}</small></span>
                      <Btn variant="link" onClick={() => abrir(d.ficheiro_url)}>Abrir</Btn>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {c.respostas && (
            <Card title="Respostas do formulário">
              <Dados itens={Object.entries(c.respostas as Row).map(([k, v]) => [k, String(v)] as [string, ReactNode])} />
            </Card>
          )}

          <Card title="Histórico">
            <ol className="hist">
              {[...(c.historico ?? [])].reverse().map((h: Row, i: number) => (
                <li key={i}><span className="mu">{dataPT(h.em, true)}</span> <b>{ETAPAS.find((e) => e.estado === h.estado)?.nome ?? h.estado}</b>
                  {h.por && <span className="mu"> · {h.por}</span>}{h.nota && <div>{h.nota}</div>}</li>
              ))}
            </ol>
          </Card>
        </div>
      )}
      {accao && c && (
        <FormDialog title={`${accao.titulo} — ${c.nome_aluno}`} size="sm" intro={accao.intro} submitLabel={accao.label} fields={accao.fields}
          onClose={() => setAccao(null)}
          onSubmit={async (p) => { await act.mutateAsync({ chave: accao.chave, corpo: accao.corpo ? accao.corpo(p) : p }); toast.ok(accao.ok) }} />
      )}
      {cancelar && c && (
        <FormDialog title={`Cancelar — ${c.nome_aluno}`} size="sm" submitLabel="Cancelar candidatura"
          intro="Use quando a família desiste ou a candidatura está repetida. A família não é avisada."
          fields={[{ name: 'parecer', label: 'Motivo', type: 'textarea' }]} onClose={() => setCancelar(false)}
          onSubmit={async (p) => { await act.mutateAsync({ chave: 'cancelar', corpo: p }); toast.ok('Candidatura cancelada.') }} />
      )}
      {editar && c && (
        <FormDialog title={`Editar pré-inscrição — ${c.nome_aluno}`} fields={camposCandidatura} initial={c}
          submitLabel="Guardar alterações"
          intro="Corrija os dados da pré-inscrição, por exemplo a classe pretendida. Se mudar de classe, a coordenação do novo nível é avisada."
          onClose={() => setEditar(false)}
          onSubmit={async (p) => { await guardar.mutateAsync(p); toast.ok('Pré-inscrição actualizada.') }} />
      )}
    </Modal>
  )
}

function GoogleForms({ onClose }: { onClose: () => void }) {
  const q = useGet<Row>('/candidaturas/google-forms')
  const toast = useToast()
  const copiar = async () => {
    try { await navigator.clipboard.writeText(q.data?.script ?? ''); toast.ok('Script copiado.') } catch { toast.error('Não foi possível copiar.') }
  }
  const d = q.data
  return (
    <Modal title="Ligar o Google Forms" onClose={onClose} size="lg">
      {!d ? <Loading /> : (
        <div className="cand">
          {!d.segredo_configurado && (
            <div className="intro" role="alert">O servidor ainda não tem <code>GOOGLE_FORMS_SEGREDO</code> definido: até lá as respostas do formulário são recusadas.</div>
          )}
          <ol className="passos">
            <li>No Google Forms da pré-inscrição use perguntas com estes títulos (outras perguntas ficam guardadas nas respostas):
              <div className="multi">{d.perguntas.map((p: string) => <span key={p} className="chip">{p}</span>)}</div></li>
            <li>No formulário: <b>⋮ → Editor de scripts</b>. Apague o conteúdo e cole o script abaixo.</li>
            <li>Escolha a função <b>instalar</b> e carregue em <b>Executar</b>; autorize o acesso pedido pela Google.</li>
            <li>Opcional: execute <b>enviarRespostasAntigas</b> para trazer as respostas já recebidas. Também pode importar o CSV das respostas. Não há duplicados.</li>
          </ol>
          <div className="toolbar"><span className="grow" /><Btn onClick={copiar}>Copiar script</Btn></div>
          <pre className="codigo">{d.script}</pre>
        </div>
      )}
    </Modal>
  )
}

export default function Candidaturas() {
  const { perfis } = useAuth()
  const [estado, setEstado] = useState('em_curso')
  const [texto, setTexto] = useState('')
  const [meus, setMeus] = useState(false)
  const [aberta, setAberta] = useState<number | null>(null)
  const [nova, setNova] = useState(false)
  const [forms, setForms] = useState(false)
  const toast = useToast()
  const resumo = useGet<Row>('/candidaturas/resumo')
  const q = useList('/candidaturas', { estado, q: texto, meus_niveis: meus || undefined }, { keep: true })
  const inv = ['/candidaturas', '/alertas']
  const criar = useAct((p: Row) => api.post('/candidaturas', p), { invalidate: inv, ok: 'Pré-inscrição registada. A coordenação foi avisada.' })
  const importar = useAct((f: File) => { const d = new FormData(); d.append('ficheiro', f); return api.form('/candidaturas/importar', d) }, {
    invalidate: inv, silent: true,
    onDone: (r: Row) => {
      toast.ok(`${r.criadas} candidatura(s) nova(s), ${r.duplicadas} já existente(s).`)
      if (r.erros?.length) toast.error(r.erros.map((e: Row) => `Linha ${e.linha}: ${e.mensagem}`).join(' · '))
    },
  })
  const n = (e: string) => resumo.data?.por_estado?.[e] ?? 0
  const coord = perfis.includes('coordenacao')

  return (
    <>
      <PageHead
        title="Candidaturas"
        sub="Pré-inscrições (Google Forms) até à matrícula: coordenação, Direcção, secretaria, formalização pela família e boas-vindas."
        actions={<>
          <Btn variant="ghost" onClick={() => setForms(true)}>Google Forms</Btn>
          <label className="btn ghost">
            Importar CSV
            <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importar.mutate(f); e.target.value = '' }} />
          </label>
          <Btn onClick={() => setNova(true)}>Nova pré-inscrição</Btn>
        </>}
      />
      <div className="grid" style={{ marginBottom: 12 }}>
        <Kpi label="Na coordenação" value={n('submetida') + n('reuniao_marcada') + n('reuniao_realizada')} hint="Reunião e decisão" onClick={() => setEstado('submetida')} />
        <Kpi label="Na Direcção" value={n('validada')} hint="Aguardam autorização" tone={n('validada') ? 'warn' : undefined} onClick={() => setEstado('validada')} />
        <Kpi label="Na secretaria" value={n('autorizada') + n('documentos_entregues') + n('matriculada')} hint="Comunicar, matricular, boas-vindas" onClick={() => setEstado('documentos_entregues')} />
        <Kpi label="Com a família" value={n('vaga_comunicada')} hint="A preencher dados e documentos" onClick={() => setEstado('vaga_comunicada')} />
        <Kpi label="Concluídas" value={n('concluida')} tone="good" onClick={() => setEstado('concluida')} />
      </div>
      <Toolbar>
        <Select label="Etapa" value={estado} onChange={setEstado} placeholder="Todas"
          options={[{ value: 'em_curso', label: 'Em curso' }, ...ETAPAS.map((e) => ({ value: e.estado, label: e.nome })),
            { value: 'rejeitada', label: 'Rejeitadas' }, { value: 'cancelada', label: 'Canceladas' }]} />
        <SearchBox value={texto} onChange={setTexto} placeholder="Procurar aluno, encarregado, contacto…" />
        {coord && <label className="inline-chk"><input type="checkbox" checked={meus} onChange={(e) => setMeus(e.target.checked)} /><span>Só os níveis que coordeno</span></label>}
      </Toolbar>
      <Table
        rows={q.rows}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onRow={(r) => setAberta(r.id)}
        empty="Não há candidaturas nesta selecção."
        cols={[
          { h: 'Recebida', render: (r) => dataPT(r.criado_em) },
          { h: 'Aluno', k: 'nome_aluno' },
          { h: 'Classe', render: (r) => r.classe ?? <span className="mu">Por indicar</span> },
          { h: 'Encarregado', render: (r) => <>{r.nome_encarregado}<br /><small className="mu">{r.telefone ?? r.email}</small></>, nowrap: false },
          { h: 'Origem', render: (r) => ORIGEM[r.origem] ?? r.origem },
          { h: 'Etapa', render: (r) => <Estado v={TOM[r.estado] ?? 'pendente'} text={r.estado_nome} /> },
        ]}
      />
      {aberta !== null && <Detalhe id={aberta} onClose={() => setAberta(null)} />}
      {forms && <GoogleForms onClose={() => setForms(false)} />}
      {nova && (
        <FormDialog title="Nova pré-inscrição" fields={camposCandidatura} submitLabel="Registar"
          intro="Para pré-inscrições entregues em papel ou por telefone. As do Google Forms entram sozinhas."
          onClose={() => setNova(false)} onSubmit={(p) => criar.mutateAsync(p)} />
      )}
    </>
  )
}

import { useState } from 'react'
import { type FieldDef } from '@/components/FormDialog'
import { Resource } from '@/components/Resource'
import { Estado, PageHead, Tabs } from '@/components/ui'
import { classeOptions, servicoOptions, useAnoActivo } from '@/lib/academic'
import { pick } from '@/lib/data'
import { Kz, label } from '@/lib/format'

type Tab = 'servicos' | 'precos' | 'planos' | 'multas' | 'descontos' | 'metodos'

const CATEGORIAS = ['propina', 'alimentacao', 'refeitorio', 'transporte', 'actividade', 'fardamento', 'matricula', 'outro'].map((v) => ({ value: v, label: label(v) }))

const servicoFields: FieldDef[] = [
  { name: 'codigo', label: 'Código', required: true, placeholder: 'PROP' },
  { name: 'nome', label: 'Nome', required: true, placeholder: 'Propina mensal' },
  { name: 'categoria', label: 'Categoria', type: 'select', options: CATEGORIAS, required: true, default: 'propina' },
  { name: 'periodicidade', label: 'Periodicidade', type: 'select', default: 'mensal', options: ['mensal', 'trimestral', 'anual', 'unica'].map((v) => ({ value: v, label: label(v) })) },
  { name: 'artigo_primavera', label: 'Artigo no Primavera', hint: 'Código do artigo para facturação' },
  { name: 'activo', label: 'Estado', type: 'checkbox', hint: 'Serviço activo', default: true },
]

export default function Catalogo() {
  const [tab, setTab] = useState<Tab>('servicos')
  const { ano } = useAnoActivo()

  return (
    <>
      <PageHead title="Serviços e preços" sub="Catálogo de serviços cobrados pelo colégio, preços do ano lectivo, planos de pagamento, multas e descontos." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[['servicos', 'Serviços'], ['precos', 'Preços'], ['planos', 'Planos de pagamento'], ['multas', 'Multas'], ['descontos', 'Descontos'], ['metodos', 'Métodos de pagamento']]} />

      {tab === 'servicos' && (
        <Resource
          path="/servicos" createLabel="Novo serviço" createFields={servicoFields} editFields={servicoFields} editMethod="patch" editPath={(r) => `/servicos/${r.id}`}
          cols={[
            { h: 'Código', k: 'codigo' }, { h: 'Serviço', k: 'nome' }, { h: 'Categoria', render: (r) => label(pick(r, 'categoria')) },
            { h: 'Periodicidade', render: (r) => label(pick(r, 'periodicidade')) }, { h: 'Artigo Primavera', k: 'artigo_primavera' },
            { h: 'Estado', render: (r) => <Estado v={pick(r, 'activo') === false ? 'inactivo' : 'activo'} /> },
          ]}
        />
      )}

      {tab === 'precos' && (
        <Resource
          path="/precos" params={{ ano_id: ano?.id }}
          hint={`Preços do ano lectivo ${ano ? pick(ano, 'designacao') : 'activo'}. Se definir um preço por classe, ele sobrepõe-se ao preço geral do serviço.`}
          createLabel="Definir preço"
          createFields={[
            { name: 'servico_id', label: 'Serviço', type: 'select', options: servicoOptions, required: true },
            { name: 'valor', label: 'Valor (Kz)', type: 'number', required: true, asString: true },
            { name: 'classe_id', label: 'Só para a classe', type: 'select', options: classeOptions, empty: '— Todas as classes —' },
          ]}
          beforeCreate={(p) => ({ ...p, ano_id: ano?.id })}
          createMethod="put"
          cols={[
            { h: 'Serviço', k: ['servico', 'servico_nome', 'servico.nome'] },
            { h: 'Classe', k: ['classe', 'classe_designacao', 'classe.designacao'], },
            { h: 'Valor', right: true, render: (r) => Kz(pick(r, 'valor', 'preco')) },
          ]}
          invalidate={['/precos']}
        />
      )}

      {tab === 'planos' && (
        <Resource
          path="/planos-pagamento" createLabel="Novo plano"
          createFields={[
            { name: 'designacao', label: 'Designação', required: true, placeholder: 'Propina em 10 prestações', wide: true },
            { name: 'num_prestacoes', label: 'N.º de prestações', type: 'number', required: true, default: 10, min: 1 },
            { name: 'mes_inicio', label: 'Mês de início (1–12)', type: 'number', required: true, default: 9, min: 1, max: 12 },
            { name: 'dia_vencimento', label: 'Dia de vencimento', type: 'number', required: true, default: 10, min: 1, max: 31 },
          ]}
          cols={[{ h: 'Plano', k: 'designacao' }, { h: 'Prestações', k: 'num_prestacoes' }, { h: 'Mês de início', k: 'mes_inicio' }, { h: 'Vence no dia', k: 'dia_vencimento' }]}
        />
      )}

      {tab === 'multas' && (
        <Resource
          path="/multas" createLabel="Nova regra de multa"
          hint="A multa aplica-se depois dos dias de tolerância. Use «Aplicar multas» em Propinas e cobranças para a calcular."
          createFields={[
            { name: 'servico_id', label: 'Serviço', type: 'select', options: servicoOptions, empty: '— Todos os serviços —' },
            { name: 'dias_tolerancia', label: 'Dias de tolerância', type: 'number', default: 0, min: 0 },
            { name: 'tipo', label: 'Tipo', type: 'select', required: true, default: 'percentual', options: [{ value: 'percentual', label: 'Percentagem' }, { value: 'fixo', label: 'Valor fixo' }] },
            { name: 'valor', label: 'Valor / %', type: 'number', required: true, asString: true },
            { name: 'maximo', label: 'Máximo (Kz)', type: 'number', asString: true },
          ]}
          cols={[
            { h: 'Serviço', k: ['servico', 'servico_nome', 'servico.nome'] }, { h: 'Tolerância (dias)', k: 'dias_tolerancia' },
            { h: 'Tipo', render: (r) => label(pick(r, 'tipo')) },
            { h: 'Valor', render: (r) => (pick(r, 'tipo') === 'percentual' ? `${pick(r, 'valor')}%` : Kz(pick(r, 'valor'))) },
            { h: 'Máximo', render: (r) => (pick(r, 'maximo') ? Kz(pick(r, 'maximo')) : '—') },
          ]}
        />
      )}

      {tab === 'descontos' && (
        <Resource
          path="/descontos" createLabel="Novo desconto"
          createFields={[
            { name: 'designacao', label: 'Designação', required: true, placeholder: 'Desconto de irmãos', wide: true },
            { name: 'origem', label: 'Origem', type: 'select', required: true, default: 'manual', options: ['manual', 'irmaos', 'bolsa', 'funcionario', 'pontualidade'].map((v) => ({ value: v, label: label(v) })) },
            { name: 'tipo', label: 'Tipo', type: 'select', required: true, default: 'percentual', options: [{ value: 'percentual', label: 'Percentagem' }, { value: 'fixo', label: 'Valor fixo' }] },
            { name: 'valor', label: 'Valor / %', type: 'number', required: true, asString: true },
            { name: 'servico_id', label: 'Só para o serviço', type: 'select', options: servicoOptions, empty: '— Todos —' },
          ]}
          cols={[
            { h: 'Desconto', k: 'designacao' }, { h: 'Origem', render: (r) => label(pick(r, 'origem')) },
            { h: 'Valor', render: (r) => (pick(r, 'tipo') === 'percentual' ? `${pick(r, 'valor')}%` : Kz(pick(r, 'valor'))) },
            { h: 'Serviço', k: ['servico', 'servico_nome', 'servico.nome'] },
          ]}
        />
      )}

      {tab === 'metodos' && (
        <Resource
          path="/metodos-pagamento" createLabel="Novo método"
          createFields={[
            { name: 'nome', label: 'Nome', required: true, placeholder: 'Transferência BAI', wide: true },
            { name: 'tipo', label: 'Tipo', type: 'select', required: true, default: 'numerario', options: ['numerario', 'transferencia', 'multicaixa', 'tpa', 'deposito', 'referencia'].map((v) => ({ value: v, label: label(v) })) },
          ]}
          cols={[{ h: 'Método', k: 'nome' }, { h: 'Tipo', render: (r) => label(pick(r, 'tipo')) }]}
        />
      )}
    </>
  )
}

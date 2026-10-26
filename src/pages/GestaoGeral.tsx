import { Link } from 'react-router'
import { usePode } from '@/components/Layout'

const CARTOES: { titulo: string; texto: string; to: string; modulo: string }[] = [
  { titulo: 'Período lectivo', texto: 'Defina o ano lectivo actual e os trimestres, edite-os ou feche o ano.', to: '/academico?tab=anos', modulo: 'academico' },
  { titulo: 'Sala', texto: 'Crie e edite as salas: tipo (laboratório, informática…), piso e localização.', to: '/academico?tab=salas', modulo: 'academico' },
  { titulo: 'Classe', texto: 'Defina os níveis e as classes oferecidas, com o plano curricular de cada uma.', to: '/academico?tab=classes', modulo: 'academico' },
  { titulo: 'Disciplina', texto: 'Crie as disciplinas que serão ministradas pelos docentes.', to: '/academico?tab=disciplinas', modulo: 'academico' },
  { titulo: 'Turma', texto: 'Adicione turmas ao ano lectivo, com a capacidade e os professores de cada disciplina.', to: '/turmas', modulo: 'cadastro' },
  { titulo: 'Funcionários', texto: 'Professores, coordenação e pessoal da escola, com o ano de contratação.', to: '/academico?tab=funcionarios', modulo: 'academico' },
  { titulo: 'Serviços e preços', texto: 'Propina, alimentação, transporte e outros serviços, com os preços por classe.', to: '/catalogo', modulo: 'propinas' },
  { titulo: 'Definições da escola', texto: 'Dados da escola e parâmetros: capacidade das turmas, escala das notas…', to: '/definicoes', modulo: 'academico' },
]

/** "Gestão geral" do Exitus: atalhos para a estrutura da escola. */
export default function GestaoGeral() {
  const pode = usePode()
  return (
    <>
      <div className="page-h"><div><h2>Gestão geral</h2><p className="sub">A estrutura da escola, num só lugar.</p></div></div>
      <div className="gestao">
        {CARTOES.filter((c) => pode(c.modulo)).map((c) => (
          <section key={c.titulo} className="card gestao-c">
            <h3>{c.titulo}</h3>
            <p>{c.texto}</p>
            <Link className="btn" to={c.to}>Acessar <span aria-hidden="true">➜</span></Link>
          </section>
        ))}
      </div>
    </>
  )
}

import { pick, type Row } from './data'
import { useList } from './hooks'

export const isActivo = (r: Row) => {
  const v = pick(r, 'activo', 'activa', 'estado')
  return v === true || String(v).toLowerCase() === 'activo' || String(v).toLowerCase() === 'activa' || String(v).toLowerCase() === 'true'
}

/** Ano lectivo activo e respectivos períodos de avaliação. */
export function useAnoActivo() {
  const anos = useList('/anos-lectivos')
  const activo = anos.rows.find(isActivo) ?? anos.rows[0]
  const periodos = useList(activo?.id ? `/anos-lectivos/${activo.id}/periodos` : null)
  return { anos: anos.rows, ano: activo as Row | undefined, periodos: periodos.rows, loading: anos.isLoading }
}

/** Turmas com a ocupação na etiqueta, ex.: "5.ª A — 7/7 (cheia)". */
/** Escala das notas da escola: parâmetros nota_maxima (10 por omissão) e nota_minima (metade da máxima). */
export function useEscala() {
  const q = useList('/parametros')
  const valor = (chave: string) => {
    const v = q.rows.find((p) => p.chave === chave)?.valor
    return v === undefined || v === null || v === '' ? undefined : Number(v)
  }
  const maxima = valor('nota_maxima') ?? 10
  const minima = valor('nota_minima')
  // Como no backend: uma nota mínima fora da escala (ex.: 10 com máxima 10) passa a metade da máxima.
  return { maxima, minima: minima !== undefined && minima > 0 && minima < maxima ? minima : maxima / 2 }
}

export const turmaOptions = {
  path: '/turmas',
  text: (r: Row) => {
    const cap = Number(r.capacidade)
    const n = Number(r.alunos)
    if (!cap || Number.isNaN(n)) return String(r.designacao ?? r.nome ?? r.id)
    return `${r.designacao} — ${n}/${cap}${n >= cap ? ' (cheia)' : ''}`
  },
}
export const alunoOptions = { path: '/alunos', params: { limit: 500 }, label: ['nome_completo', 'nome'] }
export const encarregadoOptions = { path: '/encarregados', label: ['nome_completo', 'nome'] }
export const servicoOptions = { path: '/servicos', label: ['nome', 'designacao'] }
export const disciplinaOptions = { path: '/disciplinas', label: ['nome', 'designacao'] }
export const metodoOptions = { path: '/metodos-pagamento', label: ['nome', 'designacao'] }
export const classeOptions = { path: '/classes', label: ['designacao', 'nome'] }
export const funcionarioOptions = { path: '/funcionarios', label: ['nome_completo', 'nome'] }
export const salaOptions = { path: '/salas', label: ['designacao', 'nome'] }

export const CANAIS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'E-mail' },
  { value: 'app', label: 'App' },
]
export const PARENTESCOS = [
  { value: 'mae', label: 'Mãe' }, { value: 'pai', label: 'Pai' }, { value: 'tutor', label: 'Tutor' }, { value: 'outro', label: 'Outro' },
]
export const TIPOS_SALA = [
  { value: 'sala_aula', label: 'Sala de aula' }, { value: 'laboratorio', label: 'Laboratório' },
  { value: 'informatica', label: 'Sala de informática' }, { value: 'biblioteca', label: 'Biblioteca' },
  { value: 'ginasio', label: 'Ginásio' }, { value: 'auditorio', label: 'Auditório' },
  { value: 'refeitorio', label: 'Refeitório' }, { value: 'outro', label: 'Outro' },
]
export const PERIODOS_DIA = [
  { value: 'manha', label: 'Manhã' }, { value: 'tarde', label: 'Tarde' }, { value: 'noite', label: 'Noite' },
]

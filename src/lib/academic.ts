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

export const turmaOptions = { path: '/turmas', label: ['designacao', 'nome'] }
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
export const PERIODOS_DIA = [
  { value: 'manha', label: 'Manhã' }, { value: 'tarde', label: 'Tarde' }, { value: 'noite', label: 'Noite' },
]

import { num } from './data'

export const Kz = (v: unknown) => `${num(v).toLocaleString('pt-PT', { maximumFractionDigits: 2 })} Kz`

export const pct = (v: number) => `${Math.round(v)}%`
/** Nota ou média com uma casa decimal; "—" sem valor. */
export const fmtNota = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))

export function dataPT(v: unknown, withTime = false) {
  if (!v) return '—'
  const s = String(v)
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export const mesAno = (v: unknown) => {
  if (!v) return '—'
  const s = String(v)
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  if (Number.isNaN(d.getTime())) return s
  const m = d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
  return m.charAt(0).toUpperCase() + m.slice(1)
}

export const hojeISO = () => new Date().toLocaleDateString('sv-SE')
export const primeiroDiaMes = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('sv-SE')

export const LABELS: Record<string, string> = {
  pago: 'Pago', paga: 'Pago', divida: 'Em dívida', atraso: 'Em atraso', pendente: 'Pendente', parcial: 'Parcial',
  anulada: 'Anulada', anulado: 'Anulado', confirmado: 'Confirmado', rejeitado: 'Rejeitado',
  activo: 'Activo', activa: 'Activa', inactivo: 'Inactivo', suspensa: 'Suspensa', cancelada: 'Cancelada',
  transferido: 'Transferido', desistente: 'Desistente', concluido: 'Concluído',
  aberta: 'Aberta', em_acompanhamento: 'Em acompanhamento', fechada: 'Fechada', nova: 'Nova',
  resolvida: 'Resolvida', ignorada: 'Ignorada', tratado: 'Tratado', tratada: 'Tratada', lida: 'Lida',
  presente: 'Presente', falta_justificada: 'Falta justificada', falta_injustificada: 'Falta injustificada', atraso_aula: 'Atraso',
  whatsapp: 'WhatsApp', sms: 'SMS', email: 'E-mail', app: 'App',
  manha: 'Manhã', tarde: 'Tarde', noite: 'Noite',
  mae: 'Mãe', pai: 'Pai', tutor: 'Tutor', outro: 'Outro',
  padrao: 'Padrão', so_utilizacao: 'Só utilização', alimentacao_completa: 'Alimentação completa', avulso: 'Avulso',
  bom: 'Bom', regular: 'Regular', atencao: 'Atenção',
  renovacao: 'Renovação', transferencia: 'Transferência',
  F: 'Feminino', M: 'Masculino',
  baixa: 'Baixa', media: 'Média', alta: 'Alta',
  risco_incumprimento: 'Risco de incumprimento', queda_desempenho: 'Queda de desempenho',
  padrao_faltas: 'Padrão de faltas', divergencia_primavera: 'Divergência Primavera', comportamento: 'Comportamento',
}

export const label = (v: unknown) => {
  const s = String(v ?? '')
  return LABELS[s] ?? LABELS[s.toLowerCase()] ?? (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—')
}

export type Tone = 'ok' | 'er' | 'wa' | 'n'
const OK = ['pago', 'paga', 'confirmado', 'activo', 'activa', 'presente', 'bom', 'concluido', 'resolvida', 'tratado', 'tratada', 'fechada', 'positiva', 'lida', 'sucesso', 'ok', 'aprovado', 'baixa']
const ER = ['divida', 'atraso', 'rejeitado', 'falta_injustificada', 'grave', 'cancelada', 'desistente', 'erro', 'reprovado', 'anulada', 'anulado', 'falhou', 'falha', 'inactivo', 'alta']
const WA = ['pendente', 'parcial', 'regular', 'atencao', 'suspensa', 'moderada', 'falta_justificada', 'atraso_aula', 'aberta', 'em_acompanhamento', 'transferido', 'nova', 'novo', 'leve', 'media']

export const toneOf = (v: unknown): Tone => {
  const s = String(v ?? '').toLowerCase()
  if (OK.includes(s)) return 'ok'
  if (ER.includes(s)) return 'er'
  if (WA.includes(s)) return 'wa'
  return 'n'
}

export const toISODate = (v: unknown) => (v ? String(v).slice(0, 10) : '')

export function sizeOf(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

/* Ilustrações planas dos cartões de acesso (desenhadas para o CLACS, no estilo das do Exitus). */
const T = '#19c3b9' // turquesa
const N = '#2b2f4c' // tinta escura
const P = '#e9b48a' // pele
const C = '#c9d3e3' // cinza claro

export const IlustracaoAdmin = () => (
  <svg viewBox="0 0 240 170" role="img" aria-label="Administração ao computador">
    <rect x="18" y="14" width="66" height="62" rx="3" fill={N} opacity=".9" />
    <path d="M51 14v62M18 45h66" stroke="#fff" strokeWidth="3" />
    <circle cx="190" cy="90" r="50" fill={C} opacity=".6" />
    <rect x="40" y="112" width="160" height="7" rx="2" fill={N} />
    <rect x="58" y="62" width="74" height="48" rx="4" fill="#fff" stroke={N} strokeWidth="3" />
    <rect x="68" y="74" width="34" height="5" rx="2" fill={T} /><rect x="68" y="84" width="50" height="4" rx="2" fill={C} />
    <rect x="68" y="92" width="44" height="4" rx="2" fill={C} />
    <rect x="88" y="110" width="14" height="4" fill={N} />
    <circle cx="160" cy="64" r="13" fill={N} />
    <path d="M140 112c0-26 8-38 20-38s20 12 20 38z" fill={N} />
    <rect x="128" y="95" width="30" height="20" rx="3" fill={T} />
    <rect x="173" y="100" width="12" height="12" rx="2" fill="#fff" stroke={N} strokeWidth="2" />
    <path d="M70 119v38M170 119v38" stroke={N} strokeWidth="4" />
  </svg>
)

export const IlustracaoDocente = () => (
  <svg viewBox="0 0 240 170" role="img" aria-label="Professor ao quadro">
    {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={60 + i * 26} y="8" width="20" height="5" rx="2" fill={T} opacity=".35" />)}
    <rect x="22" y="28" width="150" height="92" rx="4" fill={N} />
    <rect x="40" y="42" width="40" height="30" rx="3" fill="none" stroke={T} strokeWidth="2" />
    <path d="M50 64l8-10 6 7 6-4" stroke="#fff" strokeWidth="2" fill="none" />
    <circle cx="125" cy="58" r="9" fill="none" stroke={T} strokeWidth="2" /><circle cx="150" cy="86" r="9" fill="none" stroke={T} strokeWidth="2" />
    <path d="M80 57h36M131 64l12 14M86 100h50" stroke={T} strokeWidth="2" />
    <rect x="34" y="96" width="30" height="4" rx="2" fill={C} />
    <circle cx="196" cy="62" r="10" fill={P} /><path d="M187 58c2-9 16-10 19-1" fill="#fff" />
    <path d="M182 108c0-18 5-34 14-34s14 16 14 34z" fill="#4a4f8f" />
    <path d="M186 108v42M206 108v42" stroke={N} strokeWidth="5" />
    <path d="M182 84l-14-8" stroke={P} strokeWidth="4" strokeLinecap="round" />
    <path d="M24 152c10-14 18-14 26 0M200 152c8-12 16-12 22 0" fill={T} opacity=".7" />
  </svg>
)

export const IlustracaoEncarregado = () => (
  <svg viewBox="0 0 240 170" role="img" aria-label="Encarregado de educação com a criança">
    <circle cx="120" cy="96" r="62" fill={T} opacity=".18" />
    <circle cx="96" cy="42" r="14" fill={P} /><path d="M82 40c0-14 28-14 28 0-6-6-20-6-28 0z" fill={N} />
    <path d="M74 128c0-36 8-66 22-66s22 30 22 66z" fill={T} />
    <path d="M84 128v28M108 128v28" stroke={N} strokeWidth="6" />
    <path d="M116 84l20 10" stroke={P} strokeWidth="5" strokeLinecap="round" />
    <circle cx="150" cy="78" r="10" fill={P} /><path d="M140 75c2-10 18-10 20 0-6-4-14-4-20 0z" fill="#7a4b2a" />
    <path d="M136 132c0-26 6-46 14-46s14 20 14 46z" fill="#f06a6a" />
    <path d="M143 132v24M157 132v24" stroke={N} strokeWidth="5" />
    <rect x="160" y="104" width="22" height="16" rx="2" fill="#fff" stroke={N} strokeWidth="2" />
    <path d="M165 110h12M165 115h8" stroke={T} strokeWidth="2" />
    <path d="M40 156h160" stroke={N} strokeWidth="3" opacity=".25" />
  </svg>
)

export const IlustracaoAluno = () => (
  <svg viewBox="0 0 240 170" role="img" aria-label="Aluno com a mochila e os livros">
    <circle cx="120" cy="92" r="60" fill={C} opacity=".55" />
    <rect x="150" y="96" width="46" height="8" rx="2" fill={T} /><rect x="154" y="88" width="40" height="8" rx="2" fill={N} />
    <rect x="148" y="104" width="50" height="8" rx="2" fill="#f06a6a" />
    <circle cx="112" cy="46" r="13" fill={P} /><path d="M99 44c0-14 26-14 26 0-6-5-19-5-26 0z" fill={N} />
    <rect x="86" y="62" width="18" height="34" rx="6" fill="#f0b03f" />
    <path d="M96 128c0-34 6-62 16-62s16 28 16 62z" fill={T} />
    <path d="M104 128v26M120 128v26" stroke={N} strokeWidth="6" />
    <path d="M126 82l18 14" stroke={P} strokeWidth="5" strokeLinecap="round" />
    <path d="M40 156h160" stroke={N} strokeWidth="3" opacity=".25" />
  </svg>
)

export const IlustracaoFinanceiro = () => (
  <svg viewBox="0 0 240 170" role="img" aria-label="Recibo e moedas">
    <circle cx="70" cy="86" r="50" fill={C} opacity=".55" />
    <path d="M78 22h84v118l-10-7-11 7-10-7-11 7-10-7-11 7-10-7-11 7z" fill="#fff" stroke={N} strokeWidth="3" strokeLinejoin="round" />
    <rect x="92" y="40" width="40" height="6" rx="2" fill={T} />
    <rect x="92" y="56" width="56" height="4" rx="2" fill={C} /><rect x="92" y="68" width="48" height="4" rx="2" fill={C} />
    <rect x="92" y="80" width="56" height="4" rx="2" fill={C} />
    <path d="M92 104h56" stroke={N} strokeWidth="2" /><rect x="120" y="110" width="28" height="6" rx="2" fill={N} />
    {[0, 1, 2].map((i) => <ellipse key={i} cx="186" cy={146 - i * 10} rx="22" ry="7" fill={i === 2 ? T : '#f0b03f'} stroke={N} strokeWidth="2" />)}
    <ellipse cx="54" cy="148" rx="18" ry="6" fill="#f0b03f" stroke={N} strokeWidth="2" />
  </svg>
)

export const IlustracaoDireccao = () => (
  <svg viewBox="0 0 240 170" role="img" aria-label="Painel com gráficos da escola">
    <circle cx="176" cy="84" r="48" fill={C} opacity=".55" />
    <rect x="30" y="22" width="140" height="100" rx="6" fill="#fff" stroke={N} strokeWidth="3" />
    <rect x="44" y="36" width="44" height="6" rx="2" fill={T} />
    {[[48, 30], [66, 46], [84, 22], [102, 38]].map(([x, h]) => <rect key={x} x={x} y={108 - h} width="12" height={h} rx="2" fill={N} />)}
    <circle cx="142" cy="78" r="20" fill="none" stroke={C} strokeWidth="9" />
    <path d="M142 58a20 20 0 0 1 19 26" fill="none" stroke={T} strokeWidth="9" />
    <path d="M86 122v18M114 122v18M70 140h60" stroke={N} strokeWidth="4" strokeLinecap="round" />
    <circle cx="198" cy="64" r="11" fill={P} /><path d="M188 60c2-10 18-10 20 0-6-4-14-4-20 0z" fill={N} />
    <path d="M184 136c0-30 6-54 14-54s14 24 14 54z" fill="#4a4f8f" />
  </svg>
)

/**
 * Aproximações de forma fechada para o período de grandes amplitudes.
 *
 * Regra inegociável (RF-011, RNF-021): **nenhuma aproximação entra no produto
 * sem fonte bibliográfica verificada**. O tipo `ModeloAproximacao` exige o
 * campo `fonte`, então um modelo sem procedência não compila.
 *
 * Aproximações de Padé para o período do pêndulo foram deliberadamente
 * excluídas: não houve fonte confirmável (constituição, Princípio I, regra 6).
 *
 * Em todas, `c = cos(α/2)`.
 */

import { periodoPequenaAmplitude } from './period.js'
import { ErroDeDominio, segundo, type Metro, type MPorS2, type Rad, type Segundo } from './units.js'

function cosMeioAngulo(alpha: Rad): number {
  const a = Math.abs(alpha)
  if (!Number.isFinite(a) || a >= Math.PI) {
    throw new ErroDeDominio('α', alpha, '|α| < π')
  }
  // Com |α| < π garantido acima, cos(α/2) > 0 estritamente — não há caso a
  // proteger aqui. É em α = 180° que estas aproximações divergem, e esse caso
  // já foi barrado.
  return Math.cos(a / 2)
}

/**
 * Kidd–Fogg: `T ≈ T₀ / √c`.
 *
 * **Superestima** o período em toda a faixa. Erro de +0,75 % em α = 90°.
 */
export function periodoKiddFogg(L: Metro, g: MPorS2, alpha: Rad): Segundo {
  const T0 = periodoPequenaAmplitude(L, g)
  return segundo(T0 / Math.sqrt(cosMeioAngulo(alpha)))
}

/**
 * Lima–Arun: `T ≈ T₀ · (−ln c)/(1 − c)`.
 *
 * **Superestima**, porém é cerca de três vezes melhor que Kidd–Fogg.
 * O sinal negativo é essencial e costuma ser omitido em reproduções
 * secundárias — sem ele a fórmula dá período negativo.
 */
export function periodoLimaArun(L: Metro, g: MPorS2, alpha: Rad): Segundo {
  const T0 = periodoPequenaAmplitude(L, g)
  const c = cosMeioAngulo(alpha)
  if (c === 1) return T0 // α = 0: o limite de (−ln c)/(1 − c) vale 1
  return segundo(T0 * (-Math.log(c) / (1 - c)))
}

/**
 * AGM interrompido na segunda iteração: `T ≈ 4·T₀/(1 + √c)²`.
 *
 * Precisão excepcional a custo praticamente nulo — erro abaixo de 0,002 % até
 * 90°, cerca de mil vezes melhor que a série truncada em N = 2 nessa amplitude.
 * **Subestima** ligeiramente.
 */
export function periodoDuasIteracoes(L: Metro, g: MPorS2, alpha: Rad): Segundo {
  const T0 = periodoPequenaAmplitude(L, g)
  const c = cosMeioAngulo(alpha)
  const raiz = 1 + Math.sqrt(c)
  return segundo((4 * T0) / (raiz * raiz))
}

/** Um modelo de período selecionável na interface. A fonte é obrigatória. */
export interface ModeloAproximacao {
  readonly id: string
  readonly rotulo: string
  readonly latex: string
  /** Procedência bibliográfica. Sem ela o modelo não pode existir (RF-011). */
  readonly fonte: string
  readonly calcular: (L: Metro, g: MPorS2, alpha: Rad) => Segundo
  /** Sinal do desvio em relação ao valor exato, para a legenda. */
  readonly tendencia: 'superestima' | 'subestima'
}

export const MODELOS_APROXIMACAO: readonly ModeloAproximacao[] = [
  {
    id: 'kiddFogg',
    rotulo: 'Kidd–Fogg',
    latex: 'T \\approx \\dfrac{T_0}{\\sqrt{\\cos(\\alpha/2)}}',
    fonte: 'Kidd, R. B.; Fogg, S. L. "A simple formula for the large-angle pendulum period", The Physics Teacher 40 (2002), p. 81.',
    calcular: periodoKiddFogg,
    tendencia: 'superestima',
  },
  {
    id: 'limaArun',
    rotulo: 'Lima–Arun',
    latex: 'T \\approx T_0\\,\\dfrac{-\\ln\\cos(\\alpha/2)}{1-\\cos(\\alpha/2)}',
    fonte: 'Lima, F. M. S.; Arun, P. "An accurate formula for the period of a simple pendulum oscillating beyond the small-angle regime", American Journal of Physics 74 (2006), p. 892.',
    calcular: periodoLimaArun,
    tendencia: 'superestima',
  },
  {
    id: 'duasIteracoes',
    rotulo: 'AGM, duas iterações',
    latex: 'T \\approx \\dfrac{4T_0}{\\left(1+\\sqrt{\\cos(\\alpha/2)}\\right)^2}',
    fonte: 'Carvalhaes, C. G.; Suppes, P. "Approximations for the period of the simple pendulum based on the arithmetic-geometric mean", American Journal of Physics 76 (2008), p. 1150.',
    calcular: periodoDuasIteracoes,
    tendencia: 'subestima',
  },
] as const

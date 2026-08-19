/**
 * Média aritmético-geométrica e integral elíptica completa de primeira espécie.
 *
 * É daqui que sai a **referência de verdade** do projeto: o período exato contra
 * o qual toda truncagem da série é comparada (constituição, Princípio I, regra 4).
 *
 *     K(k) = π / (2·AGM(1, k'))       com  k' = √(1 − k²) = cos(α/2)
 *     T/T₀ = (2/π)·K(k) = 1 / AGM(1, cos(α/2))
 *
 * Convenção fixa em todo o projeto: `k = sen(α/2)` é o **módulo**, nunca o
 * parâmetro `m = k²` (RF-012). Trocar um pelo outro produz gráficos plausíveis
 * e falsos, que é a pior espécie de erro neste domínio.
 */

import { AGM_MAX_ITERACOES, TOL_AGM } from './constants.js'
import { ErroDeDominio, exigirPositivo, type Rad } from './units.js'

/**
 * Média aritmético-geométrica de dois positivos. Convergência quadrática:
 * cerca de cinco iterações bastam para a precisão de um `double`.
 *
 * A parada é por **tolerância relativa mais teto de iterações**. Comparar por
 * igualdade estrita de ponto flutuante entra em ciclo-limite em α = 90° e
 * α = 179° — é regra explícita da constituição não fazer isso.
 */
export function agm(a: number, b: number): number {
  exigirPositivo('a', a)
  exigirPositivo('b', b)

  let x = a
  let y = b
  for (let i = 0; i < AGM_MAX_ITERACOES; i++) {
    if (Math.abs(x - y) <= TOL_AGM * Math.abs(x)) break
    const media = (x + y) / 2
    y = Math.sqrt(x * y)
    x = media
  }
  return x
}

/**
 * Integral elíptica completa de primeira espécie, na convenção do módulo:
 *
 *     K(k) = ∫₀^{π/2} dφ / √(1 − k²·sen²φ)
 *
 * @param k módulo, em [0, 1). Em k = 1 a integral diverge.
 */
export function integralElipticaK(k: number): number {
  if (!Number.isFinite(k) || k < 0 || k >= 1) {
    throw new ErroDeDominio('k', k, '0 ≤ k < 1 (em k = 1 a integral diverge)')
  }
  const complementar = Math.sqrt(1 - k * k)
  return Math.PI / (2 * agm(1, complementar))
}

/**
 * Razão exata `T/T₀` do pêndulo simples, para qualquer amplitude admissível.
 *
 * Esta é a referência contra a qual o erro de toda aproximação é medido.
 * Independe de `L` e de `g` — propriedade verificada por teste.
 */
export function razaoPeriodoExata(alpha: Rad): number {
  const a = Math.abs(alpha)
  if (!Number.isFinite(a) || a >= Math.PI) {
    throw new ErroDeDominio('α', alpha, '|α| < π (o período diverge em 180°)')
  }
  if (a === 0) return 1
  return 1 / agm(1, Math.cos(a / 2))
}

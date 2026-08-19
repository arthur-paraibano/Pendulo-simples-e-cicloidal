/**
 * Energia mecânica do pêndulo.
 *
 *     E_c = ½·m·L²·ω²
 *     E_p = m·g·h        h medido a partir do ponto mais baixo da trajetória
 *     E_total = E_c + E_p + E_térmica
 *
 * A altura depende do **regime**, e usar a fórmula errada é um erro silencioso:
 *
 *     simples:    h = L·(1 − cos θ)
 *     cicloidal:  h = L·sen²θ / 2
 *
 * As duas coincidem em pequenos ângulos (ambas → L·θ²/2), e divergem quando a
 * amplitude cresce — que é justamente onde o produto quer olhar.
 */

import { alturaParaAngulo } from './cycloid.js'
import type { ModoPendulo } from './types.js'
import {
  exigirPositivo,
  joule,
  metro,
  type Joule,
  type Kg,
  type Metro,
  type MPorS2,
  type Rad,
  type RadPorS,
} from './units.js'

export interface Energias {
  readonly cinetica: Joule
  readonly potencial: Joule
  readonly termica: Joule
  readonly total: Joule
}

/** Altura da massa acima do ponto mais baixo da trajetória, conforme o regime. */
export function alturaAcimaDoPontoZero(L: Metro, theta: Rad, modo: ModoPendulo): Metro {
  exigirPositivo('L', L)
  if (modo === 'cicloidal') return alturaParaAngulo(L, theta)
  return metro(L * (1 - Math.cos(theta)))
}

export function energias(
  m: Kg,
  L: Metro,
  g: MPorS2,
  theta: Rad,
  omega: RadPorS,
  modo: ModoPendulo,
  termica: Joule = joule(0),
): Energias {
  exigirPositivo('m', m)
  exigirPositivo('L', L)
  exigirPositivo('g', g)

  const cinetica = joule(0.5 * m * L * L * omega * omega)
  const potencial = joule(m * g * alturaAcimaDoPontoZero(L, theta, modo))

  return {
    cinetica,
    potencial,
    termica,
    total: joule(cinetica + potencial + termica),
  }
}

/**
 * Energia total de um pêndulo solto do repouso na amplitude `α`.
 *
 * Serve de referência para medir a deriva do integrador: sem dissipação, a
 * energia calculada a cada passo deve permanecer igual a esta.
 */
export function energiaDeLargada(
  m: Kg,
  L: Metro,
  g: MPorS2,
  alpha: Rad,
  modo: ModoPendulo,
): Joule {
  return joule(m * g * alturaAcimaDoPontoZero(L, alpha, modo))
}

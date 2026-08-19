/**
 * O período do pêndulo — uma fórmula-motor, dois regimes.
 *
 *     T = 2π·√(L/g) · S(α, N, modo)
 *
 * `periodoSerie` é a única função de período do produto: o modo cicloidal
 * **não** tem função própria, é o caso em que χ(n) anula os termos de n ≥ 1
 * (constituição, Princípio IV).
 */

import {
  DOIS_PI,
  LIMIAR_CONFIANCA_BOA_GRAUS,
  LIMIAR_CONFIANCA_EXCELENTE_GRAUS,
  LIMIAR_CONFIANCA_LIMITADA_GRAUS,
} from './constants.js'
import { razaoPeriodoExata } from './elliptic.js'
import { somatorioSerie, termosNecessarios, termosSerie } from './series.js'
import type {
  FaixaConfianca,
  ModoPendulo,
  ParametrosPeriodo,
  ResultadoPeriodo,
} from './types.js'
import { exigirPositivo, segundo, type Metro, type MPorS2, type Rad, type Segundo } from './units.js'

/** T₀ = 2π·√(L/g) — o período de pequenas oscilações. Não depende de α nem da massa. */
export function periodoPequenaAmplitude(L: Metro, g: MPorS2): Segundo {
  exigirPositivo('L', L)
  exigirPositivo('g', g)
  return segundo(DOIS_PI * Math.sqrt(L / g))
}

/** T = T₀ · S(α, N, modo). Com N = 0, ou no modo cicloidal, reduz-se a T₀. */
export function periodoSerie(
  L: Metro,
  g: MPorS2,
  alpha: Rad,
  N: number,
  modo: ModoPendulo,
): Segundo {
  const T0 = periodoPequenaAmplitude(L, g)
  return segundo(T0 * somatorioSerie(alpha, N, modo))
}

/**
 * Período **exato**, a referência de verdade.
 *
 * Modo simples: `T₀ / AGM(1, cos(α/2))`.
 * Modo cicloidal: `T₀`, exato por definição — a isocronia de Huygens.
 */
export function periodoExato(L: Metro, g: MPorS2, alpha: Rad, modo: ModoPendulo): Segundo {
  const T0 = periodoPequenaAmplitude(L, g)
  if (modo === 'cicloidal') return T0
  return segundo(T0 * razaoPeriodoExata(alpha))
}

/** Razão `T/T₀`. Independe de `L` e de `g` — propriedade verificada por teste. */
export function razaoPeriodo(alpha: Rad, N: number, modo: ModoPendulo): number {
  return somatorioSerie(alpha, N, modo)
}

/**
 * Faixa de confiança da aproximação corrente (RF-013).
 *
 * Para N = 2 os limiares caem em α = 54,373°, 81,603° e 110,164°.
 */
export function classificarConfianca(erroRelativo: number): FaixaConfianca {
  const e = Math.abs(erroRelativo)
  if (e < 0.001) return 'excelente'
  if (e < 0.01) return 'boa'
  if (e < 0.05) return 'limitada'
  return 'inadequada'
}

/** Amplitudes, em graus, onde N = 2 cruza cada limiar. Para rótulos e legendas. */
export const LIMIARES_N2_GRAUS = {
  excelente: LIMIAR_CONFIANCA_EXCELENTE_GRAUS,
  boa: LIMIAR_CONFIANCA_BOA_GRAUS,
  limitada: LIMIAR_CONFIANCA_LIMITADA_GRAUS,
} as const

/**
 * Fachada: tudo que o painel da fórmula precisa, em uma chamada.
 *
 * É a única função que a camada de estado precisa conhecer para alimentar a
 * exibição da fórmula viva.
 */
export function resultadoPeriodo(p: ParametrosPeriodo): ResultadoPeriodo {
  const { L, g, alpha, N, modo } = p

  const T0 = periodoPequenaAmplitude(L, g)
  const razao = somatorioSerie(alpha, N, modo)
  const T = segundo(T0 * razao)
  const Texato = periodoExato(L, g, alpha, modo)

  const erroAbsoluto = segundo(T - Texato)
  const erroRelativo = (T - Texato) / Texato

  return {
    T0,
    T,
    Texato,
    razao,
    termos: termosSerie(alpha, N, modo, T0),
    erroAbsoluto,
    erroRelativo,
    faixaConfianca: classificarConfianca(erroRelativo),
    NparaMilesimo: termosNecessariosNoModo(alpha, 0.001, modo),
    NparaDecimoMilesimo: termosNecessariosNoModo(alpha, 0.0001, modo),
    frequencia: 1 / T,
    omegaAngular: DOIS_PI / T,
  }
}

/**
 * No modo cicloidal nenhum termo de correção é necessário: o primeiro termo já
 * é exato. Responder "0" aqui é o resultado correto, não um atalho.
 */
function termosNecessariosNoModo(alpha: Rad, erroAlvo: number, modo: ModoPendulo): number {
  return modo === 'cicloidal' ? 0 : termosNecessarios(alpha, erroAlvo)
}

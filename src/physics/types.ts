/** Tipos de domínio compartilhados pelo núcleo de física. */

import type { Metro, MPorS2, Rad, Segundo } from './units.js'

/**
 * Os dois regimes derivados da MESMA fórmula-motor (constituição, Princípio IV).
 * O cicloidal não é outra fórmula: é o caso em que os termos de n ≥ 1 se anulam.
 */
export type ModoPendulo = 'simples' | 'cicloidal'

/** Um termo da série de Bernoulli/Legendre, pronto para exibição termo a termo. */
export interface TermoSerie {
  /** Índice do termo. */
  readonly n: number
  /** a_n = [C(2n,n)/4ⁿ]². */
  readonly coeficiente: number
  /** Forma exata para exibição, por exemplo "9/64". */
  readonly coeficienteFracao: string
  /** sen^{2n}(α/2). */
  readonly fatorSeno: number
  /** a_n · sen^{2n}(α/2) — a contribuição adimensional do termo. */
  readonly contribuicao: number
  /** Contribuição do termo para o período, em segundos. */
  readonly contribuicaoTempo: Segundo
  /** χ(n, modo): falso para n ≥ 1 no modo cicloidal. */
  readonly ativo: boolean
  /** Âncora do termo no LaTeX, para destaque e injeção de valor. */
  readonly idSlot: string
}

/** Quão confiável é a série truncada na amplitude corrente (RF-013). */
export type FaixaConfianca = 'excelente' | 'boa' | 'limitada' | 'inadequada'

/** Resultado completo do cálculo de período, base do painel da fórmula. */
export interface ResultadoPeriodo {
  readonly T0: Segundo
  readonly T: Segundo
  readonly Texato: Segundo
  readonly razao: number
  readonly termos: readonly TermoSerie[]
  readonly erroAbsoluto: Segundo
  readonly erroRelativo: number
  readonly faixaConfianca: FaixaConfianca
  readonly NparaMilesimo: number
  readonly NparaDecimoMilesimo: number
  readonly frequencia: number
  readonly omegaAngular: number
}

/** Entrada de `resultadoPeriodo`. */
export interface ParametrosPeriodo {
  readonly L: Metro
  readonly g: MPorS2
  readonly alpha: Rad
  readonly N: number
  readonly modo: ModoPendulo
}

/** Ponto no plano da cena, em metros. */
export interface Ponto {
  readonly x: Metro
  readonly y: Metro
}

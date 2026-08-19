/**
 * Inferência da gravidade a partir do período medido — a coluna `g` da tabela.
 *
 * Existem duas contas, e a diferença entre elas é o conteúdo didático central
 * do produto:
 *
 *     ingênua:   g = 4π²·L / T²                  ignora os termos de correção
 *     correta:   g = 4π²·L·S(α,N)² / T²          usa a fórmula-motor
 *
 * No pêndulo **cicloidal** as duas coincidem em qualquer amplitude, porque
 * `S ≡ 1`. No pêndulo **simples** elas divergem depressa: medindo a 45° e
 * aplicando a fórmula de pequenos ângulos obtém-se `g = 9,070` em vez de
 * `9,810` — um erro de 7,5 % que **nenhum cronômetro melhor corrige**, porque
 * é erro de modelo, não de instrumento.
 */

import { DOIS_PI } from './constants.js'
import { somatorioSerie } from './series.js'
import type { ModoPendulo } from './types.js'
import {
  exigirPositivo,
  mPorS2,
  type Metro,
  type MPorS2,
  type Rad,
  type Segundo,
} from './units.js'

const QUATRO_PI2 = DOIS_PI * DOIS_PI

/**
 * Gravidade pela fórmula de pequenos ângulos, sem nenhuma correção.
 *
 * É o que um estudante obtém ao inverter `T = 2π√(L/g)` diretamente.
 */
export function inferirGravidadeIngenua(T: Segundo, L: Metro): MPorS2 {
  exigirPositivo('T', T)
  exigirPositivo('L', L)
  return mPorS2((QUATRO_PI2 * L) / (T * T))
}

/**
 * Gravidade inferida com a fórmula-motor, respeitando o regime.
 *
 * Invariante de inversão, verificado por teste:
 * `inferirGravidade(periodoSerie(L, g, α, N, modo), L, α, N, modo) === g`.
 */
export function inferirGravidade(
  T: Segundo,
  L: Metro,
  alpha: Rad,
  N: number,
  modo: ModoPendulo,
): MPorS2 {
  exigirPositivo('T', T)
  exigirPositivo('L', L)
  const S = somatorioSerie(alpha, N, modo)
  return mPorS2((QUATRO_PI2 * L * S * S) / (T * T))
}

export interface ComparacaoGravidade {
  /** Gravidade inferida com os termos de correção ativos. */
  readonly correta: MPorS2
  /** Gravidade inferida ignorando os termos de correção. */
  readonly ingenua: MPorS2
  /** Erro relativo da ingênua em relação à correta. */
  readonly erroRelativoIngenua: number
  /** As duas coincidem? Verdadeiro em todo o modo cicloidal. */
  readonly coincidem: boolean
}

/**
 * As duas inferências lado a lado — o que a tabela de coleta exibe.
 *
 * @param tolerancia diferença relativa abaixo da qual se consideram coincidentes.
 */
export function compararInferencias(
  T: Segundo,
  L: Metro,
  alpha: Rad,
  N: number,
  modo: ModoPendulo,
  tolerancia = 1e-12,
): ComparacaoGravidade {
  const correta = inferirGravidade(T, L, alpha, N, modo)
  const ingenua = inferirGravidadeIngenua(T, L)
  const erroRelativoIngenua = (ingenua - correta) / correta

  return {
    correta,
    ingenua,
    erroRelativoIngenua,
    coincidem: Math.abs(erroRelativoIngenua) <= tolerancia,
  }
}

/**
 * Comprimento inferido a partir do período, quando `g` é conhecido.
 *
 * O caminho inverso, útil para conferir o aparato real contra a medida da régua.
 */
export function inferirComprimento(
  T: Segundo,
  g: MPorS2,
  alpha: Rad,
  N: number,
  modo: ModoPendulo,
): Metro {
  exigirPositivo('T', T)
  exigirPositivo('g', g)
  const S = somatorioSerie(alpha, N, modo)
  return ((g * T * T) / (QUATRO_PI2 * S * S)) as Metro
}

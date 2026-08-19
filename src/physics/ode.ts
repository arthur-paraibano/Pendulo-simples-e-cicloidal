/**
 * Equação do movimento — e a coordenada generalizada que unifica os dois regimes.
 *
 * O motor integra uma coordenada `q` cujo significado depende do modo:
 *
 *   simples:    q = θ           (rad)         q̈ = −ω₀²·sen q
 *   cicloidal:  q = s/L = sen θ (adimensional) q̈ = −ω₀²·q
 *
 * com `ω₀² = g/L`. A única diferença é `sen q` contra `q` — e é exatamente esse
 * o ponto pedagógico: no pêndulo cicloidal a equação **é** harmônica, sem
 * aproximação nenhuma, porque a restrição geométrica encurta o fio como
 * `L·cos θ` e compensa a não linearidade. No pêndulo simples, escrever `q` no
 * lugar de `sen q` seria a aproximação de pequenos ângulos.
 *
 * A velocidade da massa vale `L·q̇` nos **dois** modos, o que torna a energia
 * cinética idêntica em forma: `E_c = ½·m·L²·q̇²`.
 */

import type { ModoPendulo } from './types.js'
import { exigirPositivo, type Kg, type Metro, type MPorS2, type Segundo } from './units.js'

/** Como a dissipação é modelada. */
export type ModeloAtrito = 'nenhum' | 'viscoso' | 'quadratico'

export interface ParametrosDinamica {
  readonly L: Metro
  readonly g: MPorS2
  readonly m: Kg
  readonly modo: ModoPendulo
  readonly modeloAtrito: ModeloAtrito
  /** Amortecimento viscoso `γ = b/m`, em 1/s. Atua como `−γ·q̇`. */
  readonly gamma: number
  /** Arrasto quadrático, em s. Atua como `−c_q·q̇·|q̇|`. */
  readonly cq: number
  /** Amplitude do forçamento externo, em 1/s². */
  readonly amplitudeForcamento: number
  /** Frequência angular do forçamento, em rad/s. */
  readonly omegaForcamento: number
  /** Fase inicial do forçamento, em rad. */
  readonly faseForcamento: number
}

/** Parâmetros de um pêndulo ideal: sem atrito, sem forçamento. */
export function dinamicaIdeal(
  L: Metro,
  g: MPorS2,
  m: Kg,
  modo: ModoPendulo,
): ParametrosDinamica {
  return {
    L,
    g,
    m,
    modo,
    modeloAtrito: 'nenhum',
    gamma: 0,
    cq: 0,
    amplitudeForcamento: 0,
    omegaForcamento: 0,
    faseForcamento: 0,
  }
}

/** `ω₀² = g/L` — o quadrado da frequência angular de pequenas oscilações. */
export function omegaZeroQuadrado(L: Metro, g: MPorS2): number {
  exigirPositivo('L', L)
  exigirPositivo('g', g)
  return g / L
}

/**
 * Aceleração generalizada `q̈` no instante `t`.
 *
 * @param q coordenada generalizada (θ no modo simples, `s/L` no cicloidal)
 * @param qPonto sua derivada temporal
 */
export function aceleracaoGeneralizada(
  q: number,
  qPonto: number,
  t: Segundo,
  p: ParametrosDinamica,
): number {
  const w2 = omegaZeroQuadrado(p.L, p.g)

  // A única diferença entre os regimes.
  const restauradora = p.modo === 'cicloidal' ? -w2 * q : -w2 * Math.sin(q)

  let dissipacao = 0
  if (p.modeloAtrito === 'viscoso') {
    dissipacao = -p.gamma * qPonto
  } else if (p.modeloAtrito === 'quadratico') {
    dissipacao = -p.cq * qPonto * Math.abs(qPonto)
  }

  const forcamento =
    p.amplitudeForcamento === 0
      ? 0
      : p.amplitudeForcamento * Math.cos(p.omegaForcamento * t + p.faseForcamento)

  return restauradora + dissipacao + forcamento
}

/** O sistema é conservativo? Só então faz sentido exigir energia constante. */
export function ehConservativo(p: ParametrosDinamica): boolean {
  return p.modeloAtrito === 'nenhum' && p.amplitudeForcamento === 0
}

/**
 * Converte a coordenada generalizada no ângulo do fio, para desenho e leitura.
 *
 * No modo cicloidal `q = sen θ`, logo `θ = arcsen q`.
 */
export function anguloDaCoordenada(q: number, modo: ModoPendulo): number {
  if (modo !== 'cicloidal') return q
  // Protege contra `q` escapar de [−1, 1] por erro de arredondamento.
  return Math.asin(Math.max(-1, Math.min(1, q)))
}

/** Converte o ângulo do fio na coordenada generalizada — o inverso do acima. */
export function coordenadaDoAngulo(theta: number, modo: ModoPendulo): number {
  return modo === 'cicloidal' ? Math.sin(theta) : theta
}

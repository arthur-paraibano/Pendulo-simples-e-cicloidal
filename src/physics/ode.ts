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
import { ErroDeDominio, exigirPositivo, type Kg, type Metro, type MPorS2, type Segundo } from './units.js'

/** Como a dissipação é modelada. */
export type ModeloAtrito = 'nenhum' | 'viscoso' | 'quadratico'

/**
 * Converte a opção da interface somente quando há parâmetros suficientes para
 * o modelo. O atrito seco no pivô exige um torque de Coulomb, parâmetro ainda
 * ausente do catálogo; rejeitá-lo explicitamente evita tratá-lo como viscoso.
 */
export function exigirModeloAtritoImplementado(valor: string): ModeloAtrito {
  if (valor === 'nenhum' || valor === 'viscoso' || valor === 'quadratico') return valor
  if (valor === 'pivo') {
    throw new Error('Atrito no pivô requer um coeficiente de torque próprio e ainda não está disponível.')
  }
  throw new Error(`Modelo de atrito desconhecido: ${valor}.`)
}

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
  const toleranciaNumerica = 1e-9
  if (!Number.isFinite(q) || q < -1 - toleranciaNumerica || q > 1 + toleranciaNumerica) {
    throw new ErroDeDominio(
      'q',
      q,
      '−1 ≤ q ≤ 1 no modo cicloidal; reduza θ₀, ω₀ ou o forçamento externo',
    )
  }
  // Somente o ruído de arredondamento da própria fronteira pode ser aparado.
  return Math.asin(Math.max(-1, Math.min(1, q)))
}

/** Converte o ângulo do fio na coordenada generalizada — o inverso do acima. */
export function coordenadaDoAngulo(theta: number, modo: ModoPendulo): number {
  if (modo !== 'cicloidal') return theta
  if (!Number.isFinite(theta) || Math.abs(theta) > Math.PI / 2 + 1e-12) {
    throw new ErroDeDominio('theta', theta, '|θ| ≤ π/2 no modo cicloidal')
  }
  return Math.sin(theta)
}

/**
 * Valida condições iniciais cicloidais. No caso conservativo a amplitude de
 * q é conhecida exatamente; logo um impulso que exigiria |q| > 1 é recusado
 * antes do primeiro passo. Com forçamento, a fronteira também é fiscalizada
 * pelo motor durante cada passo.
 */
export function validarEstadoCicloidalInicial(
  theta: number,
  omegaInicial: number,
  p: ParametrosDinamica,
): void {
  if (p.modo !== 'cicloidal') return
  const q0 = coordenadaDoAngulo(theta, p.modo)
  const qPonto0 = Math.cos(theta) * omegaInicial
  if (ehConservativo(p)) {
    const amplitudeQ = Math.hypot(q0, qPonto0 / Math.sqrt(omegaZeroQuadrado(p.L, p.g)))
    if (amplitudeQ > 1 + 1e-12) {
      throw new ErroDeDominio(
        'omega0',
        omegaInicial,
        'energia inicial compatível com |q| ≤ 1 no modo cicloidal',
      )
    }
  }
}

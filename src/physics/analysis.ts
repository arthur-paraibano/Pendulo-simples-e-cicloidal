/**
 * Varreduras e análises derivadas — o que alimenta os gráficos.
 *
 * A curva `T(α)` é a evidência visual mais direta do produto: no modo simples
 * ela sobe; no cicloidal é uma **reta horizontal**. Essa diferença de forma é a
 * assinatura da isocronia.
 */

import { razaoPeriodoExata } from './elliptic.js'
import { periodoPequenaAmplitude, periodoSerie } from './period.js'
import type { ModoPendulo } from './types.js'
import {
  ErroDeDominio,
  segundo,
  type Metro,
  type MPorS2,
  type Rad,
  type Segundo,
} from './units.js'

export interface PontoVarredura {
  /** Amplitude, em radianos. */
  readonly alpha: Rad
  /** Período pela série truncada em N. */
  readonly T: Segundo
  /** Período exato de referência. */
  readonly Texato: Segundo
  /** Erro relativo da série em relação ao exato. Nunca positivo para série truncada. */
  readonly erroRelativo: number
}

/**
 * Varre `T(α)` de `deAlpha` a `ateAlpha`.
 *
 * @param passos número de intervalos; o resultado tem `passos + 1` pontos.
 */
export function varreduraPeriodoPorAmplitude(
  L: Metro,
  g: MPorS2,
  N: number,
  modo: ModoPendulo,
  deAlpha: Rad,
  ateAlpha: Rad,
  passos = 180,
): PontoVarredura[] {
  if (!Number.isInteger(passos) || passos < 1) {
    throw new ErroDeDominio('passos', passos, 'inteiro ≥ 1')
  }
  if (ateAlpha < deAlpha) {
    throw new ErroDeDominio('ateAlpha', ateAlpha, `ateAlpha ≥ deAlpha (${deAlpha})`)
  }

  const T0 = periodoPequenaAmplitude(L, g)
  const pontos: PontoVarredura[] = []

  for (let i = 0; i <= passos; i++) {
    const alpha = (deAlpha + ((ateAlpha - deAlpha) * i) / passos) as Rad
    const T = periodoSerie(L, g, alpha, N, modo)
    const Texato = modo === 'cicloidal' ? T0 : segundo(T0 * razaoPeriodoExata(alpha))
    pontos.push({ alpha, T, Texato, erroRelativo: (T - Texato) / Texato })
  }
  return pontos
}

/**
 * Média e desvio padrão **amostral** (denominador n − 1) de uma amostra.
 *
 * Com menos de dois valores, dispersão é `null` — e a interface exibe "—",
 * jamais zero. Zero afirmaria uma precisão que não foi medida.
 */
export function estatisticas(valores: readonly number[]): {
  contagem: number
  media: number | null
  desvioPadrao: number | null
  erroPadrao: number | null
  minimo: number | null
  maximo: number | null
} {
  const n = valores.length
  if (n === 0) {
    return { contagem: 0, media: null, desvioPadrao: null, erroPadrao: null, minimo: null, maximo: null }
  }

  const media = valores.reduce((a, b) => a + b, 0) / n
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)

  if (n < 2) {
    return { contagem: n, media, desvioPadrao: null, erroPadrao: null, minimo, maximo }
  }

  const variancia = valores.reduce((acc, v) => acc + (v - media) ** 2, 0) / (n - 1)
  const desvioPadrao = Math.sqrt(variancia)
  return {
    contagem: n,
    media,
    desvioPadrao,
    erroPadrao: desvioPadrao / Math.sqrt(n),
    minimo,
    maximo,
  }
}

/**
 * Amplitude do ciclo corrente, para acompanhar o decaimento sob atrito (RF-058).
 *
 * Toma o máximo de `|q|` desde a última passagem pelo zero. É o que a interface
 * exibe como "amplitude atual", distinta da amplitude de largada.
 *
 * @returns o máximo em módulo, ou `null` se a amostra estiver vazia.
 */
export function amplitudeCorrente(amostras: readonly { q: number }[]): number | null {
  if (amostras.length === 0) return null

  // Percorre de trás para frente até a penúltima troca de sinal: esse trecho é
  // o meio-ciclo corrente.
  let maximo = 0
  let sinalAnterior = 0
  let trocas = 0

  for (let i = amostras.length - 1; i >= 0; i--) {
    const q = amostras[i]!.q
    const sinal = Math.sign(q)
    if (sinal !== 0) {
      if (sinalAnterior !== 0 && sinal !== sinalAnterior) {
        trocas += 1
        if (trocas >= 2) break
      }
      sinalAnterior = sinal
    }
    maximo = Math.max(maximo, Math.abs(q))
  }
  return maximo
}

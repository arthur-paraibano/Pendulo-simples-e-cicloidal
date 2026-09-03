/**
 * Varreduras e análises derivadas — o que alimenta os gráficos.
 *
 * A curva `T(α)` é a evidência visual mais direta do produto: no modo simples
 * ela sobe; no cicloidal é uma **reta horizontal**. Essa diferença de forma é a
 * assinatura da isocronia.
 */

import { N_MAXIMO } from './constants.js'
import { razaoPeriodoExata } from './elliptic.js'
import { periodoPequenaAmplitude, periodoSerie } from './period.js'
import { somatorioSerie } from './series.js'
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

/**
 * Menor `N` cuja série truncada atinge a tolerância relativa pedida (RF-013).
 *
 * Responde à pergunta que o gráfico de convergência levanta: *quantos termos
 * bastam aqui?* A resposta depende fortemente da amplitude — a 90° bastam 6
 * termos para 0,1 %, enquanto a 150° a resposta matemática é 53, **acima do
 * teto de `N_MAXIMO`**. Devolver `null` nesse caso não é uma limitação a
 * esconder: é justamente a explosão de custo perto de 180° que justifica
 * existir um valor exato ao lado da série.
 *
 * @param tolerancia erro relativo aceitável, em fração (0,001 = 0,1 %).
 * @param nMaximo teto de busca; não pode exceder o domínio do somatório.
 * @returns o menor `N`, ou `null` se `nMaximo` não bastar.
 */
export function termosNecessarios(
  alpha: Rad,
  tolerancia: number,
  modo: ModoPendulo = 'simples',
  nMaximo: number = N_MAXIMO,
): number | null {
  if (!(tolerancia > 0)) throw new ErroDeDominio('tolerância', tolerancia, 'tolerância > 0')
  // No cicloidal todo termo n ≥ 1 é anulado, e N = 0 já é exato por construção.
  const exato = modo === 'cicloidal' ? 1 : razaoPeriodoExata(alpha)
  const teto = Math.min(nMaximo, N_MAXIMO)
  for (let n = 0; n <= teto; n++) {
    const razao = somatorioSerie(alpha, n, modo)
    if (Math.abs((razao - exato) / exato) <= tolerancia) return n
  }
  return null
}

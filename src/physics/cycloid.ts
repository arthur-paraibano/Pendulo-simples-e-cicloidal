/**
 * Geometria do pêndulo cicloidal de Huygens.
 *
 * Duas curvas, ambas cicloides congruentes de raio gerador `r = L/4`:
 *
 *   - as **faces** (evoluta), sobre as quais o fio se enrola;
 *   - a **trajetória da massa** (involuta), gerada pelo fio ao desenrolar.
 *
 * Com `θ` medido como o ângulo do trecho livre do fio em relação à vertical:
 *
 *     s     = L·sen θ      deslocamento ao longo do arco, a partir do ponto zero
 *     ℓ     = L·cos θ      comprimento do trecho livre
 *     s² + ℓ² = L²         invariante pitagórico — a verificação que importa
 *
 * É desse `s` que sai a isocronia: `s̈ = −(g/L)·s` é harmônico **exato**, sem
 * aproximação alguma. O encurtamento do fio compensa precisamente o efeito que,
 * no pêndulo simples, faria o período crescer com a amplitude.
 *
 * Origem do sistema de coordenadas: o **ponto zero**, ponto mais baixo da
 * trajetória, onde o sensor é fixado. `y` cresce para cima.
 */

import { ALPHA_MAX_CICLOIDAL_GRAUS, FIO_POR_RAIO_GERADOR } from './constants.js'
import type { Ponto } from './types.js'
import {
  ErroDeDominio,
  exigirPositivo,
  metro,
  rad,
  RAD_POR_GRAU,
  type Metro,
  type Rad,
} from './units.js'

/** Raio do círculo gerador a partir do comprimento do fio: `r = L/4`. */
export function raioGerador(L: Metro): Metro {
  exigirPositivo('L', L)
  return metro(L / FIO_POR_RAIO_GERADOR)
}

/** Comprimento do fio a partir do raio gerador: `L = 4r`. */
export function comprimentoDoFio(r: Metro): Metro {
  exigirPositivo('r', r)
  return metro(FIO_POR_RAIO_GERADOR * r)
}

/**
 * Cicloide geradora, na forma da tautócrona com a cúspide na origem:
 *
 *     x = r(φ − sen φ)      y = −r(1 − cos φ)
 *
 * `φ = 0` é a cúspide; `φ = π` é o ponto mais baixo, em `(rπ, −2r)`.
 * Usada para desenhar as faces.
 */
export function pontoCicloide(r: Metro, phi: Rad): Ponto {
  exigirPositivo('r', r)
  return {
    x: metro(r * (phi - Math.sin(phi))),
    y: metro(-r * (1 - Math.cos(phi))),
  }
}

/** Amplitude máxima do modo cicloidal: 90°, pois `s = L·sen θ` e `|s| ≤ L` (RF-025). */
export function amplitudeMaximaCicloidal(): Rad {
  return rad(ALPHA_MAX_CICLOIDAL_GRAUS * RAD_POR_GRAU)
}

/** O ponto zero fica na origem por construção — é onde o sensor é fixado (RF-135). */
export function pontoZero(): Ponto {
  return { x: metro(0), y: metro(0) }
}

/** Estado geométrico da massa sobre a trajetória cicloidal. */
export interface EstadoCicloidal {
  /** Posição da massa, com origem no ponto zero. */
  readonly posicao: Ponto
  /** Deslocamento ao longo do arco, com sinal: `s = L·sen θ`. */
  readonly s: Metro
  /** Trecho livre do fio: `ℓ = L·cos θ`. */
  readonly comprimentoLivre: Metro
  /** Trecho enrolado nas faces: `L − ℓ`. */
  readonly comprimentoEnrolado: Metro
  /** Altura acima do ponto zero: `h = L·sen²θ / 2`. */
  readonly altura: Metro
}

/**
 * Posição e geometria do fio para um ângulo `θ` do trecho livre.
 *
 * A trajetória é a involuta, que em função de `θ` fica notavelmente simples:
 *
 *     x = r(2θ + sen 2θ)      y = r(1 − cos 2θ) = 2r·sen²θ
 *
 * Derivando, `|velocidade| = 4r·cos θ`, e o comprimento de arco de 0 a θ é
 * `4r·sen θ = L·sen θ` — exatamente `s`. Essa identidade é verificada por
 * quadratura numérica nos testes: é ela que impede uma geometria plausível
 * mas errada.
 */
export function trajetoriaMassa(r: Metro, theta: Rad): EstadoCicloidal {
  exigirPositivo('r', r)
  const limite = amplitudeMaximaCicloidal()
  if (!Number.isFinite(theta) || Math.abs(theta) > limite) {
    throw new ErroDeDominio(
      'θ',
      theta,
      `|θ| ≤ ${ALPHA_MAX_CICLOIDAL_GRAUS}° — além disso seria preciso desenrolar mais fio do que existe`,
    )
  }

  const L = comprimentoDoFio(r)
  const doisTheta = 2 * theta
  const sen = Math.sin(theta)

  return {
    posicao: {
      x: metro(r * (doisTheta + Math.sin(doisTheta))),
      y: metro(r * (1 - Math.cos(doisTheta))),
    },
    s: metro(L * sen),
    comprimentoLivre: metro(L * Math.cos(theta)),
    comprimentoEnrolado: metro(L * (1 - Math.cos(theta))),
    altura: metro((L * sen * sen) / 2),
  }
}

/**
 * Altura de largada a partir do ângulo (RF-158): `h = L·sen²θ / 2`.
 *
 * No topo da face, θ = 90°, dá `h = L/2 = 2r` — que é exatamente a altura da
 * cicloide. A coerência dos dois caminhos é verificada por teste.
 */
export function alturaParaAngulo(L: Metro, theta: Rad): Metro {
  exigirPositivo('L', L)
  const sen = Math.sin(theta)
  return metro((L * sen * sen) / 2)
}

/** Inverso de `alturaParaAngulo`: recupera θ ≥ 0 a partir da altura de largada. */
export function anguloParaAltura(L: Metro, h: Metro): Rad {
  exigirPositivo('L', L)
  const alturaMaxima = L / 2
  if (!Number.isFinite(h) || h < 0 || h > alturaMaxima) {
    throw new ErroDeDominio('h', h, `0 ≤ h ≤ ${alturaMaxima} m (metade do comprimento do fio)`)
  }
  return rad(Math.asin(Math.sqrt((2 * h) / L)))
}

/**
 * Amostra a trajetória da massa para desenho, de `−θ` a `+θ`.
 *
 * @param passos número de segmentos; o resultado tem `passos + 1` pontos.
 */
export function amostrarTrajetoria(r: Metro, thetaMax: Rad, passos = 128): Ponto[] {
  if (!Number.isInteger(passos) || passos < 1) {
    throw new ErroDeDominio('passos', passos, 'inteiro ≥ 1')
  }
  const pontos: Ponto[] = []
  for (let i = 0; i <= passos; i++) {
    const theta = rad(-thetaMax + (2 * thetaMax * i) / passos)
    pontos.push(trajetoriaMassa(r, theta).posicao)
  }
  return pontos
}

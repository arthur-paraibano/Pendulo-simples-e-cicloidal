/**
 * Integradores de passo fixo.
 *
 * **velocity-Verlet é o padrão** (AD-08): é simplético, então mantém o erro de
 * energia *limitado e oscilante* por tempos longos, em vez de acumular deriva.
 * Como a aplicação exibe um gráfico de energia, uma deriva sistemática seria
 * lida pelo estudante como erro de física — e não como artefato do método.
 *
 * RK4 tem erro local menor por passo, mas dissipa energia de forma monotônica.
 * Fica disponível como opção comparativa, e a diferença entre os dois vira
 * conteúdo didático (RF-113).
 */

import { aceleracaoGeneralizada, type ParametrosDinamica } from './ode.js'
import { ErroDeDominio, segundo, type Segundo } from './units.js'

/** Estado instantâneo na coordenada generalizada. */
export interface EstadoQ {
  readonly t: Segundo
  readonly q: number
  readonly qPonto: number
}

export type MetodoIntegracao = 'verlet' | 'rk4'

function exigirPasso(h: number): void {
  if (!Number.isFinite(h) || h <= 0 || h > 0.02) {
    throw new ErroDeDominio('h', h, '0 < h ≤ 0,02 s')
  }
}

/**
 * velocity-Verlet.
 *
 * Sem dissipação a aceleração depende só de `q`, e o método é o Verlet
 * simplético canônico. Com termos dependentes da velocidade, usa-se uma
 * velocidade prevista para avaliar a aceleração no fim do passo — o método
 * segue de segunda ordem, e deixa de ser exatamente simplético apenas onde já
 * não há energia a conservar.
 */
export function velocityVerlet(estado: EstadoQ, h: number, p: ParametrosDinamica): EstadoQ {
  exigirPasso(h)
  const { t, q, qPonto } = estado

  const a0 = aceleracaoGeneralizada(q, qPonto, t, p)
  const qNovo = q + qPonto * h + 0.5 * a0 * h * h

  const tNovo = segundo(t + h)
  const qPontoPrevisto = qPonto + a0 * h
  const a1 = aceleracaoGeneralizada(qNovo, qPontoPrevisto, tNovo, p)

  return {
    t: tNovo,
    q: qNovo,
    qPonto: qPonto + 0.5 * (a0 + a1) * h,
  }
}

/** Runge–Kutta clássico de quarta ordem. */
export function rk4(estado: EstadoQ, h: number, p: ParametrosDinamica): EstadoQ {
  exigirPasso(h)
  const { t, q, qPonto } = estado
  const a = (qq: number, vv: number, tt: number): number =>
    aceleracaoGeneralizada(qq, vv, segundo(tt), p)

  const k1q = qPonto
  const k1v = a(q, qPonto, t)

  const k2q = qPonto + (h / 2) * k1v
  const k2v = a(q + (h / 2) * k1q, k2q, t + h / 2)

  const k3q = qPonto + (h / 2) * k2v
  const k3v = a(q + (h / 2) * k2q, k3q, t + h / 2)

  const k4q = qPonto + h * k3v
  const k4v = a(q + h * k3q, k4q, t + h)

  return {
    t: segundo(t + h),
    q: q + (h / 6) * (k1q + 2 * k2q + 2 * k3q + k4q),
    qPonto: qPonto + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v),
  }
}

/** Aplica o método escolhido. */
export function passo(
  estado: EstadoQ,
  h: number,
  p: ParametrosDinamica,
  metodo: MetodoIntegracao,
): EstadoQ {
  return metodo === 'rk4' ? rk4(estado, h, p) : velocityVerlet(estado, h, p)
}

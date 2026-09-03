import type { PaletaCena } from './palette.js'
import type { TransformacaoMundo } from './transform.js'
import type { PontoMundo } from './types.js'

export interface GeometriaCicloidal {
  readonly massa: PontoMundo
  readonly contato: PontoMundo
  readonly comprimentoLivre: number
  readonly comprimentoEnrolado: number
  readonly comprimentoTotal: number
  readonly raioGerador: number
}

/** Geometria em coordenadas do Canvas: pivo em (0,0), y positivo para baixo. */
export function geometriaCicloidal(L: number, theta: number): GeometriaCicloidal {
  if (!(L > 0) || !Number.isFinite(theta) || Math.abs(theta) > Math.PI / 2 + 1e-12) {
    throw new RangeError('A geometria cicloidal exige L > 0 e |theta| <= pi/2.')
  }
  const r = L / 4
  const doisTheta = 2 * theta
  const comprimentoLivre = L * Math.cos(theta)
  const comprimentoEnrolado = L * (1 - Math.cos(theta))
  return {
    massa: {
      x: r * (doisTheta + Math.sin(doisTheta)),
      y: L - r * (1 - Math.cos(doisTheta)),
    },
    contato: {
      x: r * (doisTheta - Math.sin(doisTheta)),
      y: r * (1 - Math.cos(doisTheta)),
    },
    comprimentoLivre,
    comprimentoEnrolado,
    comprimentoTotal: comprimentoLivre + comprimentoEnrolado,
    raioGerador: r,
  }
}

export function amostrarFaceCicloidal(
  L: number,
  thetaMin: number,
  thetaMax: number,
  segmentos = 96,
): PontoMundo[] {
  if (!Number.isInteger(segmentos) || segmentos < 1) throw new RangeError('segmentos deve ser >= 1.')
  const pontos: PontoMundo[] = []
  for (let i = 0; i <= segmentos; i++) {
    const theta = thetaMin + ((thetaMax - thetaMin) * i) / segmentos
    pontos.push(geometriaCicloidal(L, theta).contato)
  }
  return pontos
}

export function amostrarTrajetoriaCicloidal(
  L: number,
  thetaMax: number,
  segmentos = 128,
): PontoMundo[] {
  const limite = Math.min(Math.PI / 2, Math.abs(thetaMax))
  const pontos: PontoMundo[] = []
  for (let i = 0; i <= segmentos; i++) {
    const theta = -limite + (2 * limite * i) / segmentos
    pontos.push(geometriaCicloidal(L, theta).massa)
  }
  return pontos
}

function trazarPontos(
  contexto: CanvasRenderingContext2D,
  transformacao: TransformacaoMundo,
  pontos: readonly PontoMundo[],
): void {
  pontos.forEach((ponto, indice) => {
    const tela = transformacao.mundoParaTela(ponto)
    if (indice === 0) contexto.moveTo(tela.x, tela.y)
    else contexto.lineTo(tela.x, tela.y)
  })
}

export function desenharFacesETrajetoria(
  contexto: CanvasRenderingContext2D,
  transformacao: TransformacaoMundo,
  L: number,
  alpha: number,
  paleta: PaletaCena,
  exibirEvoluta = true,
  exibirInvoluta = true,
): void {
  const limiteFace = Math.PI / 2
  contexto.save()
  if (exibirEvoluta) {
    contexto.beginPath()
    trazarPontos(contexto, transformacao, amostrarFaceCicloidal(L, -limiteFace, limiteFace))
    contexto.strokeStyle = paleta.faceCicloidal
    contexto.lineWidth = 3
    contexto.stroke()
  }
  if (exibirInvoluta) {
    contexto.beginPath()
    trazarPontos(
      contexto,
      transformacao,
      amostrarTrajetoriaCicloidal(L, Math.max(Math.abs(alpha), 0.2)),
    )
    contexto.strokeStyle = paleta.trajetoria
    contexto.setLineDash([7, 5])
    contexto.lineWidth = 1.5
    contexto.stroke()
  }
  contexto.restore()
}

export function desenharFioCicloidal(
  contexto: CanvasRenderingContext2D,
  transformacao: TransformacaoMundo,
  L: number,
  theta: number,
  cor: string,
  /**
   * Vários pêndulos dividem o mesmo painel, e os rótulos deles cairiam uns
   * sobre os outros no meio da face. Anota-se apenas o pêndulo em foco: um
   * número ilegível informa menos que nenhum.
   */
  rotular = true,
): GeometriaCicloidal {
  const geometria = geometriaCicloidal(L, theta)
  const pontosEnrolados = amostrarFaceCicloidal(L, 0, theta, 40)
  contexto.save()
  contexto.beginPath()
  trazarPontos(contexto, transformacao, pontosEnrolados)
  const contato = transformacao.mundoParaTela(geometria.contato)
  const massa = transformacao.mundoParaTela(geometria.massa)
  contexto.lineTo(contato.x, contato.y)
  contexto.lineTo(massa.x, massa.y)
  contexto.strokeStyle = cor
  contexto.lineWidth = 2
  contexto.stroke()
  contexto.fillStyle = cor
  contexto.beginPath()
  contexto.arc(contato.x, contato.y, 4, 0, 2 * Math.PI)
  contexto.fill()
  if (rotular) {
    contexto.font = '11px var(--fonte-numerica)'
    contexto.fillText(
      `ℓ livre = ${geometria.comprimentoLivre.toFixed(3)} m`,
      (contato.x + massa.x) / 2 + 6,
      (contato.y + massa.y) / 2 - 6,
    )
  }
  contexto.restore()
  return geometria
}

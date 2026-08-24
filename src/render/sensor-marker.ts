import type { PaletaCena } from './palette.js'
import type { TransformacaoMundo } from './transform.js'
import type { PontoMundo } from './types.js'

export const DURACAO_FLASH_SENSOR_S = 0.18

export function sensorEmDisparo(
  tempo: number,
  ultimoDisparo: number | null,
  duracao = DURACAO_FLASH_SENSOR_S,
): boolean {
  return ultimoDisparo !== null && tempo >= ultimoDisparo && tempo - ultimoDisparo <= duracao
}

export function desenharSensorZero(
  contexto: CanvasRenderingContext2D,
  transformacao: TransformacaoMundo,
  pontoZero: PontoMundo,
  tempo: number,
  ultimoDisparo: number | null,
  paleta: PaletaCena,
): void {
  const ponto = transformacao.mundoParaTela(pontoZero)
  const disparando = sensorEmDisparo(tempo, ultimoDisparo)
  contexto.save()
  contexto.strokeStyle = disparando ? paleta.sensorDisparo : paleta.sensor
  contexto.fillStyle = disparando ? paleta.sensorDisparo : paleta.sensor
  contexto.lineWidth = disparando ? 4 : 2
  if (disparando) {
    contexto.globalAlpha = 0.22
    contexto.beginPath()
    contexto.arc(ponto.x, ponto.y, 18, 0, 2 * Math.PI)
    contexto.fill()
    contexto.globalAlpha = 1
  }
  contexto.beginPath()
  contexto.moveTo(ponto.x - 16, ponto.y + 12)
  contexto.lineTo(ponto.x - 16, ponto.y - 12)
  contexto.moveTo(ponto.x + 16, ponto.y + 12)
  contexto.lineTo(ponto.x + 16, ponto.y - 12)
  contexto.moveTo(ponto.x - 12, ponto.y)
  contexto.lineTo(ponto.x + 12, ponto.y)
  contexto.stroke()
  contexto.restore()
}

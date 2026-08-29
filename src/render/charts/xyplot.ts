/**
 * Renderizador único dos gráficos (AD-03, revista).
 *
 * Atende séries temporais, curvas analíticas e trajetórias paramétricas com o
 * mesmo vocabulário visual. O retrato de fase e os eixos escolhíveis são
 * paramétricos — o eixo x não é monotônico —, e é por isso que um renderizador
 * de séries não serviria.
 *
 * A geometria fica separada do desenho de propósito: `calcularLayout` e
 * `projetarSerie` são puros e testáveis sem canvas, e `desenhar` só traduz o
 * resultado em chamadas de contexto.
 */

import type {
  MarcadorGrafico,
  ModeloGrafico,
  PontoSerie,
  SerieGrafico,
  TracoSerie,
} from '../../state/charts.js'
import type { PaletaCena } from '../palette.js'
import {
  dominioDe,
  dominioLogDe,
  desprojetar,
  marcas,
  projetar,
  type Dominio,
  type Marca,
  type TipoEscala,
} from './escala.js'

export interface DimensoesGrafico {
  readonly largura: number
  readonly altura: number
}

export interface RetanguloPlot {
  readonly esquerda: number
  readonly topo: number
  readonly direita: number
  readonly base: number
}

export interface LayoutGrafico {
  readonly area: RetanguloPlot
  readonly dominioX: Dominio
  readonly dominioY: Dominio
  readonly marcasX: readonly Marca[]
  readonly marcasY: readonly Marca[]
}

/** Espaço reservado aos rótulos dos eixos, em pixels de CSS. */
export const MARGEM = { esquerda: 62, direita: 12, topo: 28, base: 40 } as const

const PADRAO_TRACO: Readonly<Record<TracoSerie, readonly number[]>> = {
  solido: [],
  tracejado: [6, 4],
  pontilhado: [1.5, 3],
}

function dominioDoEixo(valores: readonly number[], tipo: TipoEscala): Dominio {
  return tipo === 'logaritmica' ? dominioLogDe(valores) : dominioDe(valores)
}

/** Geometria do gráfico: área útil, domínios e marcas. Puro. */
export function calcularLayout(modelo: ModeloGrafico, dim: DimensoesGrafico): LayoutGrafico {
  const xs: number[] = []
  const ys: number[] = []
  for (const serie of modelo.series) {
    for (const ponto of serie.pontos) {
      xs.push(ponto.x)
      ys.push(ponto.y)
    }
  }
  for (const marcador of modelo.marcadores) {
    xs.push(marcador.x)
    ys.push(marcador.y)
  }

  const dominioX = dominioDoEixo(xs, modelo.eixoX.tipo)
  const dominioY = dominioDoEixo(ys, modelo.eixoY.tipo)

  return {
    area: {
      esquerda: MARGEM.esquerda,
      topo: MARGEM.topo,
      direita: Math.max(MARGEM.esquerda + 1, dim.largura - MARGEM.direita),
      base: Math.max(MARGEM.topo + 1, dim.altura - MARGEM.base),
    },
    dominioX,
    dominioY,
    marcasX: marcas(dominioX, modelo.eixoX.tipo, 6),
    marcasY: marcas(dominioY, modelo.eixoY.tipo, 5),
  }
}

export interface PontoTela {
  readonly x: number
  readonly y: number
}

/** Converte os pontos da série em coordenadas de tela. Puro. */
export function projetarSerie(
  pontos: readonly PontoSerie[],
  layout: LayoutGrafico,
  eixoX: TipoEscala,
  eixoY: TipoEscala,
): PontoTela[] {
  const faixaX = { inicio: layout.area.esquerda, fim: layout.area.direita }
  // O eixo vertical do canvas cresce para baixo: a faixa vai da base ao topo.
  const faixaY = { inicio: layout.area.base, fim: layout.area.topo }
  return pontos.map((ponto) => ({
    x: projetar(ponto.x, layout.dominioX, faixaX, eixoX),
    y: projetar(ponto.y, layout.dominioY, faixaY, eixoY),
  }))
}

/** Valor do domínio sob uma posição horizontal da tela — base da leitura por cursor. */
export function valorSobPosicao(
  posicaoX: number,
  layout: LayoutGrafico,
  eixoX: TipoEscala,
): number {
  return desprojetar(
    posicaoX,
    layout.dominioX,
    { inicio: layout.area.esquerda, fim: layout.area.direita },
    eixoX,
  )
}

export interface LeituraCursor {
  readonly serie: string
  readonly rotulo: string
  readonly cor: string
  readonly x: number
  readonly y: number
}

/**
 * Leitura de valores no ponto apontado (RF-083).
 *
 * Toma, em cada série, o ponto de `x` mais próximo do apontado. Em curvas
 * paramétricas mais de um ponto pode compartilhar o mesmo `x`; devolve-se o
 * primeiro, que é o comportamento previsível para quem lê um gráfico.
 */
export function lerNoPonto(modelo: ModeloGrafico, valorX: number): LeituraCursor[] {
  const leituras: LeituraCursor[] = []
  for (const serie of modelo.series) {
    if (serie.pontos.length === 0) continue
    let melhor = serie.pontos[0]!
    let distancia = Math.abs(melhor.x - valorX)
    for (const ponto of serie.pontos) {
      const d = Math.abs(ponto.x - valorX)
      if (d < distancia) {
        distancia = d
        melhor = ponto
      }
    }
    leituras.push({ serie: serie.id, rotulo: serie.rotulo, cor: serie.cor, x: melhor.x, y: melhor.y })
  }
  return leituras
}

function corDaPaleta(paleta: PaletaCena, chave: string): string {
  const valor = (paleta as unknown as Record<string, string | undefined>)[chave]
  return valor ?? paleta.texto
}

function desenharSerie(
  ctx: CanvasRenderingContext2D,
  serie: SerieGrafico,
  layout: LayoutGrafico,
  modelo: ModeloGrafico,
  paleta: PaletaCena,
): void {
  const pontos = projetarSerie(serie.pontos, layout, modelo.eixoX.tipo, modelo.eixoY.tipo)
  if (pontos.length === 0) return

  const cor = corDaPaleta(paleta, serie.cor)
  ctx.save()
  ctx.strokeStyle = cor
  ctx.fillStyle = cor
  ctx.lineWidth = 2
  ctx.setLineDash([...PADRAO_TRACO[serie.traco]])

  if (serie.forma === 'pontos') {
    for (const ponto of pontos) {
      ctx.beginPath()
      ctx.arc(ponto.x, ponto.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (serie.forma === 'barras') {
    const largura = Math.max(2, (layout.area.direita - layout.area.esquerda) / (pontos.length * 1.6))
    for (const ponto of pontos) {
      ctx.fillRect(ponto.x - largura / 2, ponto.y, largura, layout.area.base - ponto.y)
    }
  } else {
    ctx.beginPath()
    pontos.forEach((ponto, i) => {
      if (i === 0) ctx.moveTo(ponto.x, ponto.y)
      else ctx.lineTo(ponto.x, ponto.y)
    })
    ctx.stroke()
  }
  ctx.restore()
}

function desenharMarcador(
  ctx: CanvasRenderingContext2D,
  marcador: MarcadorGrafico,
  layout: LayoutGrafico,
  modelo: ModeloGrafico,
  paleta: PaletaCena,
): void {
  const [ponto] = projetarSerie([{ x: marcador.x, y: marcador.y }], layout, modelo.eixoX.tipo, modelo.eixoY.tipo)
  if (ponto === undefined) return

  ctx.save()
  ctx.setLineDash([])
  ctx.strokeStyle = paleta.eixo
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(ponto.x, layout.area.topo)
  ctx.lineTo(ponto.x, layout.area.base)
  ctx.stroke()

  ctx.fillStyle = paleta.texto
  ctx.beginPath()
  ctx.arc(ponto.x, ponto.y, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = ponto.x > (layout.area.esquerda + layout.area.direita) / 2 ? 'right' : 'left'
  ctx.fillText(marcador.rotulo, ponto.x + (ctx.textAlign === 'right' ? -6 : 6), layout.area.topo + 12)
  ctx.restore()
}

/** Desenha o gráfico inteiro no contexto informado. */
export function desenhar(
  ctx: CanvasRenderingContext2D,
  modelo: ModeloGrafico,
  dim: DimensoesGrafico,
  paleta: PaletaCena,
): LayoutGrafico {
  const layout = calcularLayout(modelo, dim)
  const { area } = layout

  ctx.clearRect(0, 0, dim.largura, dim.altura)
  ctx.save()
  ctx.fillStyle = paleta.fundo
  ctx.fillRect(0, 0, dim.largura, dim.altura)

  // Grade e marcas.
  ctx.font = '11px system-ui, sans-serif'
  ctx.setLineDash([])
  ctx.lineWidth = 1

  const faixaX = { inicio: area.esquerda, fim: area.direita }
  const faixaY = { inicio: area.base, fim: area.topo }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const marca of layout.marcasX) {
    const x = projetar(marca.valor, layout.dominioX, faixaX, modelo.eixoX.tipo)
    ctx.strokeStyle = paleta.grade
    ctx.beginPath()
    ctx.moveTo(x, area.topo)
    ctx.lineTo(x, area.base)
    ctx.stroke()
    ctx.fillStyle = paleta.textoSuave
    ctx.fillText(marca.rotulo, x, area.base + 6)
  }

  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const marca of layout.marcasY) {
    const y = projetar(marca.valor, layout.dominioY, faixaY, modelo.eixoY.tipo)
    ctx.strokeStyle = paleta.grade
    ctx.beginPath()
    ctx.moveTo(area.esquerda, y)
    ctx.lineTo(area.direita, y)
    ctx.stroke()
    ctx.fillStyle = paleta.textoSuave
    ctx.fillText(marca.rotulo, area.esquerda - 8, y)
  }

  // Eixos.
  ctx.strokeStyle = paleta.eixo
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(area.esquerda, area.topo)
  ctx.lineTo(area.esquerda, area.base)
  ctx.lineTo(area.direita, area.base)
  ctx.stroke()

  for (const serie of modelo.series) desenharSerie(ctx, serie, layout, modelo, paleta)
  for (const marcador of modelo.marcadores) desenharMarcador(ctx, marcador, layout, modelo, paleta)

  // Rótulos dos eixos.
  ctx.fillStyle = paleta.textoSuave
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  const unidadeX = modelo.eixoX.unidade === null ? '' : ` (${modelo.eixoX.unidade})`
  ctx.fillText(`${modelo.eixoX.rotulo}${unidadeX}`, (area.esquerda + area.direita) / 2, dim.altura - 2)

  ctx.restore()
  return layout
}

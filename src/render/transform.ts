import type { PontoMundo } from './types.js'

export interface RetanguloTela {
  readonly x: number
  readonly y: number
  readonly largura: number
  readonly altura: number
}

export interface PontoTela {
  readonly x: number
  readonly y: number
}

/** Transformacao afim reversivel entre metros e pixels CSS. */
export class TransformacaoMundo {
  readonly pixelsPorMetro: number

  constructor(
    readonly origem: PontoTela,
    pixelsPorMetro: number,
    readonly zoom = 1,
  ) {
    if (!(pixelsPorMetro > 0) || !(zoom > 0)) {
      throw new RangeError('A escala e o zoom da cena devem ser positivos.')
    }
    this.pixelsPorMetro = pixelsPorMetro
  }

  mundoParaTela(ponto: PontoMundo): PontoTela {
    const escala = this.pixelsPorMetro * this.zoom
    return {
      x: this.origem.x + ponto.x * escala,
      y: this.origem.y + ponto.y * escala,
    }
  }

  telaParaMundo(ponto: PontoTela): PontoMundo {
    const escala = this.pixelsPorMetro * this.zoom
    return {
      x: (ponto.x - this.origem.x) / escala,
      y: (ponto.y - this.origem.y) / escala,
    }
  }

  metrosParaPixels(valor: number): number {
    return valor * this.pixelsPorMetro * this.zoom
  }
}

export interface VistaCena {
  readonly retangulo: RetanguloTela
  readonly transformacao: TransformacaoMundo
  readonly modo: 'simples' | 'cicloidal'
}

/**
 * Divide o palco e calcula uma escala comum. Em comparacao, os dois pivos ficam
 * na mesma altura e um metro ocupa exatamente o mesmo numero de pixels.
 */
export function calcularVistas(
  largura: number,
  altura: number,
  comprimentoMaximo: number,
  zoom: number,
  visualizacao: 'simples' | 'cicloidal' | 'comparacao',
): VistaCena[] {
  if (!(largura > 0) || !(altura > 0) || !(comprimentoMaximo > 0)) return []
  const quantidade = visualizacao === 'comparacao' ? 2 : 1
  const larguraVista = largura / quantidade
  const margemX = Math.max(26, Math.min(64, larguraVista * 0.12))
  const margemTopo = Math.max(34, Math.min(72, altura * 0.12))
  const larguraUtil = Math.max(1, larguraVista - 2 * margemX)
  const alturaUtil = Math.max(1, altura - margemTopo - 42)
  // A excursao horizontal cicloidal pode chegar a aproximadamente 1,3 L.
  const escalaHorizontal = larguraUtil / (2.7 * comprimentoMaximo)
  const escalaVertical = alturaUtil / (1.12 * comprimentoMaximo)
  const pixelsPorMetro = Math.max(1, Math.min(escalaHorizontal, escalaVertical))
  const modos = visualizacao === 'comparacao'
    ? (['simples', 'cicloidal'] as const)
    : ([visualizacao] as const)

  return modos.map((modo, indice) => {
    const retangulo: RetanguloTela = {
      x: indice * larguraVista,
      y: 0,
      largura: larguraVista,
      altura,
    }
    return {
      retangulo,
      modo,
      transformacao: new TransformacaoMundo(
        { x: retangulo.x + larguraVista / 2, y: margemTopo },
        pixelsPorMetro,
        zoom,
      ),
    }
  })
}

import type { TransformacaoMundo } from './transform.js'
import type { PontoMundo } from './types.js'

interface UltimoPonto {
  readonly ponto: PontoMundo
  readonly tempo: number
}

export interface AmostraRastro {
  readonly ponto: PontoMundo
  readonly tempo: number
}

/** Histórico vetorial estritamente limitado à janela de um período. */
export class RastroDePeriodo {
  private readonly amostras = new Map<string, AmostraRastro[]>()
  private readonly inicios = new Map<string, number>()

  adicionar(id: string, ponto: PontoMundo, tempo: number, periodo: number): void {
    const atual = this.amostras.get(id) ?? []
    let inicio = this.inicios.get(id) ?? 0
    if (atual.length > inicio && tempo < atual.at(-1)!.tempo) { atual.length = 0; inicio = 0 }
    if (atual.at(-1)?.tempo !== tempo) atual.push({ ponto, tempo })
    const corteTemporal = tempo - Math.max(0, periodo)
    while (inicio < atual.length && atual[inicio]!.tempo < corteTemporal) inicio += 1
    // Compactação rara e amortizada; o hot loop nunca desloca o vetor inteiro.
    if (inicio > 1024 && inicio * 2 > atual.length) {
      atual.splice(0, inicio)
      inicio = 0
    }
    this.amostras.set(id, atual)
    this.inicios.set(id, inicio)
  }

  obter(id: string): readonly AmostraRastro[] {
    const atual = this.amostras.get(id)
    if (atual === undefined) return []
    return atual.slice(this.inicios.get(id) ?? 0)
  }

  desenhar(
    id: string,
    contexto: CanvasRenderingContext2D,
    transformacao: TransformacaoMundo,
    cor: string,
    tracejado = false,
  ): void {
    const atual = this.amostras.get(id)
    const inicio = this.inicios.get(id) ?? 0
    if (atual === undefined || atual.length - inicio < 2) return
    desenharIntervaloRastro(contexto, atual, inicio, transformacao, cor, tracejado)
  }

  limpar(): void {
    this.amostras.clear()
    this.inicios.clear()
  }
}

export function desenharRastroDePeriodo(
  contexto: CanvasRenderingContext2D,
  amostras: readonly AmostraRastro[],
  transformacao: TransformacaoMundo,
  cor: string,
  tracejado = false,
): void {
  if (amostras.length < 2) return
  desenharIntervaloRastro(contexto, amostras, 0, transformacao, cor, tracejado)
}

function desenharIntervaloRastro(
  contexto: CanvasRenderingContext2D,
  amostras: readonly AmostraRastro[],
  inicio: number,
  transformacao: TransformacaoMundo,
  cor: string,
  tracejado: boolean,
): void {
  contexto.save()
  contexto.strokeStyle = cor
  contexto.globalAlpha = 0.88
  contexto.lineWidth = 3
  if (tracejado) contexto.setLineDash([7, 4])
  contexto.beginPath()
  for (let indice = inicio; indice < amostras.length; indice++) {
    const { ponto } = amostras[indice]!
    const tela = transformacao.mundoParaTela(ponto)
    if (indice === inicio) contexto.moveTo(tela.x, tela.y)
    else contexto.lineTo(tela.x, tela.y)
  }
  contexto.stroke()
  contexto.restore()
}

export function opacidadeDeDesvanecimento(dt: number, duracao: number): number {
  if (duracao <= 0) return 1
  return Math.max(0, Math.min(1, 1 - Math.exp(-Math.max(0, dt) / duracao)))
}

/** Rastro incremental: desenha apenas o segmento novo e desvanece o bitmap existente. */
export class RastroIncremental {
  private readonly ultimos = new Map<string, UltimoPonto>()
  private ultimoTempoQuadro: number | null = null

  atualizarDesvanecimento(
    contexto: CanvasRenderingContext2D,
    largura: number,
    altura: number,
    tempo: number,
    duracao: number,
  ): void {
    const dt = this.ultimoTempoQuadro === null ? 0 : Math.max(0, tempo - this.ultimoTempoQuadro)
    this.ultimoTempoQuadro = tempo
    const opacidade = opacidadeDeDesvanecimento(dt, duracao)
    if (opacidade <= 0) return
    contexto.save()
    contexto.globalCompositeOperation = 'destination-out'
    contexto.globalAlpha = opacidade
    contexto.fillRect(0, 0, largura, altura)
    contexto.restore()
  }

  adicionar(
    contexto: CanvasRenderingContext2D,
    id: string,
    ponto: PontoMundo,
    tempo: number,
    transformacao: TransformacaoMundo,
    cor: string,
    tracejado = false,
  ): void {
    const anterior = this.ultimos.get(id)
    this.ultimos.set(id, { ponto, tempo })
    if (anterior === undefined || anterior.tempo === tempo || tempo < anterior.tempo) return
    const a = transformacao.mundoParaTela(anterior.ponto)
    const b = transformacao.mundoParaTela(ponto)
    contexto.save()
    contexto.strokeStyle = cor
    contexto.globalAlpha = 0.78
    contexto.lineWidth = 2
    if (tracejado) contexto.setLineDash([5, 4])
    contexto.beginPath()
    contexto.moveTo(a.x, a.y)
    contexto.lineTo(b.x, b.y)
    contexto.stroke()
    contexto.restore()
  }

  reiniciar(): void {
    this.ultimos.clear()
    this.ultimoTempoQuadro = null
  }
}

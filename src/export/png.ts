/**
 * Exportação de imagem da cena e dos gráficos (RF-110).
 *
 * A imagem sai **carimbada** com os parâmetros e a fórmula ativa. Uma captura
 * de tela sem os valores é um desenho bonito e inútil três meses depois: quem
 * a colar no relatório precisa saber de que experimento ela veio.
 *
 * A composição é feita num canvas próprio para não perturbar o quadro que está
 * sendo desenhado — copiar pixels do canvas vivo enquanto ele é redesenhado
 * produziria imagem rasgada.
 */

export interface CarimboImagem {
  readonly titulo: string
  readonly formula: string
  /** Linhas de `rótulo = valor`, já formatadas para leitura humana. */
  readonly parametros: readonly string[]
  readonly endereco: string
  readonly geradoEm: string
}

export interface OpcoesImagem {
  /** Margem em volta da cena, onde o carimbo é escrito. */
  readonly margem?: number
  readonly corFundo?: string
  readonly corTexto?: string
  readonly corSuave?: string
}

const ALTURA_LINHA = 18

/**
 * Compõe a imagem final sobre um canvas de destino.
 *
 * Recebe o canvas de destino em vez de criá-lo para que o teste possa passar um
 * canvas de mentira e conferir o que foi desenhado.
 */
export function comporImagem(
  destino: HTMLCanvasElement,
  origem: HTMLCanvasElement,
  carimbo: CarimboImagem,
  opcoes: OpcoesImagem = {},
): HTMLCanvasElement {
  const margem = opcoes.margem ?? 16
  const fundo = opcoes.corFundo ?? '#ffffff'
  const texto = opcoes.corTexto ?? '#1a1a1a'
  const suave = opcoes.corSuave ?? '#5a5a5a'

  const linhasCarimbo = [carimbo.formula, ...carimbo.parametros, carimbo.endereco]
  const alturaCarimbo = 28 + linhasCarimbo.length * ALTURA_LINHA + margem

  destino.width = origem.width + margem * 2
  destino.height = origem.height + margem + alturaCarimbo

  const contexto = destino.getContext('2d')
  if (contexto === null) return destino

  contexto.fillStyle = fundo
  contexto.fillRect(0, 0, destino.width, destino.height)
  contexto.drawImage(origem, margem, margem)

  let y = origem.height + margem + 24
  contexto.fillStyle = texto
  contexto.font = '600 14px system-ui, sans-serif'
  contexto.fillText(carimbo.titulo, margem, y)

  y += ALTURA_LINHA + 2
  contexto.font = '13px ui-monospace, monospace'
  for (const linha of linhasCarimbo) {
    contexto.fillStyle = linha === carimbo.endereco ? suave : texto
    contexto.fillText(linha, margem, y)
    y += ALTURA_LINHA
  }

  contexto.fillStyle = suave
  contexto.font = '11px system-ui, sans-serif'
  contexto.fillText(carimbo.geradoEm, margem, destino.height - 8)

  return destino
}

/** Nome do arquivo, no mesmo padrão datado do CSV. */
export function nomeArquivoPng(quando: Date, sufixo = 'cena'): string {
  const p = (v: number): string => String(v).padStart(2, '0')
  const data = `${quando.getFullYear()}-${p(quando.getMonth() + 1)}-${p(quando.getDate())}`
  return `pendulo-${sufixo}-${data}-${p(quando.getHours())}${p(quando.getMinutes())}.png`
}

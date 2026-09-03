export interface PaletaCena {
  readonly fundo: string
  readonly grade: string
  readonly eixo: string
  readonly faceCicloidal: string
  readonly trajetoria: string
  readonly sensor: string
  readonly sensorDisparo: string
  readonly simples: string
  readonly cicloidal: string
  readonly referenciaT0: string
  readonly texto: string
  readonly textoSuave: string
  readonly borda: string
  readonly energiaCinetica: string
  readonly energiaPotencial: string
  readonly energiaTermica: string
  readonly energiaTotal: string
  readonly valorExato: string
  readonly confiancaExcelente: string
  readonly confiancaBoa: string
  readonly confiancaLimitada: string
  readonly confiancaInadequada: string
}

const TOKENS = {
  fundo: '--cor-cena-fundo',
  grade: '--cor-cena-grade',
  eixo: '--cor-cena-eixo',
  faceCicloidal: '--cor-face-cicloidal',
  trajetoria: '--cor-trajetoria',
  sensor: '--cor-sensor',
  sensorDisparo: '--cor-sensor-disparo',
  simples: '--cor-pendulo-simples',
  cicloidal: '--cor-pendulo-cicloidal',
  referenciaT0: '--cor-referencia-t0',
  texto: '--cor-texto',
  textoSuave: '--cor-texto-suave',
  borda: '--cor-borda',
  energiaCinetica: '--cor-energia-cinetica',
  energiaPotencial: '--cor-energia-potencial',
  energiaTermica: '--cor-energia-termica',
  energiaTotal: '--cor-energia-total',
  valorExato: '--cor-valor-exato',
  confiancaExcelente: '--cor-confianca-excelente',
  confiancaBoa: '--cor-confianca-boa',
  confiancaLimitada: '--cor-confianca-limitada',
  confiancaInadequada: '--cor-confianca-inadequada',
} as const

export interface LeitorEstilos {
  getPropertyValue(nome: string): string
}

export function resolverPaleta(estilos: LeitorEstilos): PaletaCena {
  const valor = (token: string): string => estilos.getPropertyValue(token).trim()
  return Object.fromEntries(
    Object.entries(TOKENS).map(([chave, token]) => [chave, valor(token)]),
  ) as unknown as PaletaCena
}

/** Cache da paleta que se invalida quando o atributo de tema muda. */
export class ControladorPaleta {
  private valorAtual: PaletaCena | null = null
  private readonly observador: MutationObserver

  constructor(
    private readonly raiz: HTMLElement,
    private readonly aoInvalidar: () => void,
  ) {
    this.observador = new MutationObserver((mudancas) => {
      if (mudancas.some((m) => m.attributeName === 'data-tema')) this.invalidar()
    })
    this.observador.observe(raiz, { attributes: true, attributeFilter: ['data-tema'] })
  }

  get atual(): PaletaCena {
    this.valorAtual ??= resolverPaleta(getComputedStyle(this.raiz))
    return this.valorAtual
  }

  invalidar(): void {
    this.valorAtual = null
    this.aoInvalidar()
  }

  destruir(): void {
    this.observador.disconnect()
  }
}

/**
 * Deriva a cor de um pêndulo a partir da cor do seu modo.
 *
 * Vários pêndulos no mesmo modo compartilhariam a mesma cor, e a demonstração
 * de tautocronia — em que as massas partem de alturas diferentes e chegam
 * juntas — depende de poder acompanhar cada uma separadamente (RF-159).
 *
 * O matiz gira em passos regulares e a luminosidade alterna, para que a
 * distinção sobreviva também à paleta de daltonismo, onde o matiz sozinho não
 * basta.
 */
export function corDoPendulo(base: string, indice: number): string {
  if (indice <= 1) return base
  const rgb = lerHex(base)
  if (rgb === null) return base
  const { h, s, l } = paraHsl(rgb)
  const passo = (indice - 1) % 6
  const matiz = (h + passo * 47) % 360
  const luz = Math.min(0.82, Math.max(0.28, l + (passo % 2 === 0 ? 0.08 : -0.08)))
  return paraHex(deHsl(matiz, s, luz))
}

interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

function lerHex(texto: string): Rgb | null {
  const casamento = /^#?([0-9a-f]{6})$/i.exec(texto.trim())
  if (casamento === null) return null
  const n = Number.parseInt(casamento[1]!, 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

function paraHex({ r, g, b }: Rgb): string {
  const canal = (v: number): string =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${canal(r)}${canal(g)}${canal(b)}`
}

function paraHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
  else if (max === g) h = ((b - r) / d + 2) * 60
  else h = ((r - g) / d + 4) * 60
  return { h, s, l }
}

function deHsl(h: number, s: number, l: number): Rgb {
  if (s === 0) return { r: l, g: l, b: l }
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const faixa = Math.floor(h / 60) % 6
  const tabela: readonly (readonly [number, number, number])[] = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ]
  const [r, g, b] = tabela[faixa] ?? tabela[0]!
  return { r: r! + m, g: g! + m, b: b! + m }
}

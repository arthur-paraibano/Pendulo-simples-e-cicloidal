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

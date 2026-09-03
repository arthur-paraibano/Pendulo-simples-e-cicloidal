/** Tipos compartilhados pela camada de desenho. Todos os comprimentos estão em metros. */

export type ModoCena = 'simples' | 'cicloidal'
export type VisualizacaoCena = ModoCena | 'comparacao'

export interface PontoMundo {
  readonly x: number
  /** Eixo vertical positivo para baixo, como no Canvas 2D. */
  readonly y: number
}

export interface VetorMundo {
  readonly x: number
  readonly y: number
}

export interface EstadoPenduloCena {
  readonly id: string
  /** Indice do pendulo, de 1 a n_p, para rotulo e cor (RF-156). */
  readonly indice: number
  readonly modo: ModoCena
  readonly L: number
  readonly m: number
  readonly g: number
  readonly alphaInicial: number
  readonly theta: number
  /** Derivada da coordenada generalizada: theta no simples, s/L no cicloidal. */
  readonly qPonto: number
  readonly qDoisPontos: number
  readonly tempo: number
  readonly ultimoDisparoSensor: number | null
  readonly T0: number
  readonly periodo: number
  readonly modeloAtrito: 'nenhum' | 'viscoso' | 'quadratico'
  readonly gamma: number
  readonly cq: number
  readonly aceleracaoExterna: number
}

export type ForcaVisual = 'peso' | 'tracao' | 'arrasto' | 'externa' | 'resultante'

export interface OpcoesCena {
  readonly zoom: number
  /** Pêndulo em foco (P113): o único que recebe anotações numéricas na cena. */
  readonly penduloFoco: number
  readonly exibirEvoluta: boolean
  readonly exibirInvoluta: boolean
  readonly transferidor: boolean
  readonly regua: boolean
  readonly linhaVertical: boolean
  readonly arcoAmplitude: boolean
  readonly rastro: boolean
  readonly duracaoRastro: number
  readonly rastroPeriodo: boolean
  readonly vetorVelocidade: boolean
  readonly vetorAceleracao: boolean
  readonly decomporAceleracao: boolean
  readonly vetoresForca: readonly ForcaVisual[]
  readonly escalaVetores: number
  readonly estroboscopio: boolean
  readonly intervaloEstroboscopio: number
  readonly imagensEstroboscopio: number
  readonly penduloFantasma: boolean
  readonly grade: { readonly ligada: boolean; readonly espacamento: number }
}

export interface QuadroCena {
  readonly visualizacao: VisualizacaoCena
  readonly pendulos: readonly EstadoPenduloCena[]
  readonly opcoes: OpcoesCena
}

export interface TemposCamadas {
  readonly estatica: number
  readonly rastro: number
  readonly dinamica: number
  readonly total: number
}

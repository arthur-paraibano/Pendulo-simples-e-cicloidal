/**
 * Tipos da camada de estado.
 *
 * A `DefinicaoParametro` é a espinha dorsal do produto: dela derivam os
 * controles da interface, o console de texto, a validação, o endereço
 * compartilhável, os presets e a documentação. Nenhum controle pode ser escrito
 * à mão fora do esquema (constituição, Princípio III).
 */

import type { ModoPendulo } from '../physics/types.js'

export type TipoParametro =
  | 'numero'
  | 'inteiro'
  | 'booleano'
  | 'enum'
  | 'multipla'
  | 'cor'
  | 'acao'
  | 'texto'
  | 'composto'

export type GrupoParametro =
  | 'geometria'
  | 'cicloide'
  | 'ambiente'
  | 'modelo'
  | 'visual'
  | 'graficos'
  | 'medicao'
  | 'animacao'
  | 'dados'
  | 'acessibilidade'

export type NivelParametro = 'basico' | 'avancado'

/** O que precisa ser recalculado quando o parâmetro muda. */
export type Efeito = 'cena' | 'formula' | 'graficos' | 'periodo' | 'geometria' | 'apresentacao'

export type ValorParametro = number | boolean | string | readonly string[] | Record<string, unknown>

export interface OpcaoEnum {
  readonly valor: string
  readonly rotulo: string
}

/** Limite que depende de outros parâmetros — avaliado a cada validação. */
export type LimiteDinamico = (valores: LeitorDeValores) => { min?: number; max?: number } | null

/** Acesso somente-leitura aos valores correntes, para limites e derivações. */
export interface LeitorDeValores {
  numero(id: string): number
  booleano(id: string): boolean
  texto(id: string): string
}

export interface DefinicaoParametro {
  /** Código do catálogo da spec: `P01`…`P112`. */
  readonly codigo: string
  /** Identificador estável, usado na URL e no CSV. */
  readonly id: string
  /** Símbolo exibido junto ao controle. */
  readonly simbolo: string
  /** Nome legível em português. */
  readonly nome: string
  /** Explicação curta, exibida como dica. */
  readonly descricao: string
  readonly tipo: TipoParametro
  /** Unidade de exibição; `null` para adimensionais e não numéricos. */
  readonly unidade: string | null
  readonly min?: number
  readonly max?: number
  readonly passo?: number
  readonly passoFino?: number
  readonly precisao?: number
  readonly padrao: ValorParametro
  readonly grupo: GrupoParametro
  readonly nivel: NivelParametro
  readonly opcoes?: readonly OpcaoEnum[]
  /** Aceitos pelo console de texto, além do `id` e do `simbolo`. */
  readonly aliases: readonly string[]
  /** Somente-leitura: calculado a partir de outros (RF-037). */
  readonly derivado: boolean
  /** Existe por pêndulo e aceita índice subscrito, como `L₁` (RF-151). */
  readonly indexavel: boolean
  /** Modos em que o parâmetro faz sentido. */
  readonly aplicavelEm: readonly ModoPendulo[]
  readonly limiteDinamico?: LimiteDinamico
  readonly afeta: readonly Efeito[]
}

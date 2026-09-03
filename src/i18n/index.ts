import { ptBR, type DicionarioI18n } from './pt-BR.js'
import { en } from './en.js'
import { de } from './de.js'

export type { DicionarioI18n } from './pt-BR.js'
export type Idioma = 'pt-BR' | 'en' | 'de'

export const IDIOMAS_SUPORTADOS: readonly Idioma[] = ['pt-BR', 'en', 'de']

export const DICIONARIOS: Readonly<Record<Idioma, DicionarioI18n>> = {
  'pt-BR': ptBR,
  en,
  de,
}

export function obterDicionario(idioma: string): DicionarioI18n {
  if (idioma in DICIONARIOS) {
    return DICIONARIOS[idioma as Idioma]
  }
  return ptBR
}

type CaminhoChave<T, Prefixo extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? CaminhoChave<T[K], `${Prefixo}${K}.`>
        : `${Prefixo}${K}`
    }[keyof T & string]
  : never

export type ChaveI18n = CaminhoChave<DicionarioI18n>

function resolverChave(obj: unknown, caminho: string): string | undefined {
  const partes = caminho.split('.')
  let atual: unknown = obj
  for (const parte of partes) {
    if (atual && typeof atual === 'object' && parte in (atual as Record<string, unknown>)) {
      atual = (atual as Record<string, unknown>)[parte]
    } else {
      return undefined
    }
  }
  return typeof atual === 'string' ? atual : undefined
}

export function t(
  chave: ChaveI18n,
  parametros?: Record<string, string | number>,
  idioma: string = 'pt-BR',
): string {
  const dic = obterDicionario(idioma)
  let texto = resolverChave(dic, chave) ?? resolverChave(ptBR, chave) ?? chave
  if (parametros) {
    for (const [k, v] of Object.entries(parametros)) {
      texto = texto.replaceAll(`{${k}}`, String(v))
    }
  }
  return texto
}

export function formatarNumero(valor: number, idioma: string = 'pt-BR', casas?: number): string {
  const separadorDecimal = idioma === 'en' ? '.' : ','
  const separadorMilhar = idioma === 'en' ? ',' : '.'
  const fixado = casas !== undefined ? valor.toFixed(casas) : String(valor)
  const [inteiro, decimal] = fixado.split('.')
  const comMilhar = (inteiro ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, separadorMilhar)
  return decimal !== undefined ? `${comMilhar}${separadorDecimal}${decimal}` : comMilhar
}

export function formatarUnidade(unidade: string, idioma: string = 'pt-BR'): string {
  const dic = obterDicionario(idioma)
  const unidades = dic.unidades as Record<string, string>
  return unidades[unidade] ?? unidade
}

/**
 * Tipos nominais de unidade e conversões de fronteira.
 *
 * Motivação (constituição, Princípio I): a confusão radiano/grau e a mistura
 * metro/pixel são os dois erros mais silenciosos deste domínio — ambos produzem
 * gráficos plausíveis e falsos. Marcar os `number` impede que se somem grandezas
 * incompatíveis, e o erro aparece na compilação em vez de aparecer na tela.
 *
 * Regra do projeto: **dentro do motor, ângulo é sempre radiano**. A conversão
 * para grau acontece exclusivamente na borda de entrada e de apresentação.
 */

declare const marca: unique symbol

type Marcado<T, M extends string> = T & { readonly [marca]: M }

export type Rad = Marcado<number, 'rad'>
export type Deg = Marcado<number, 'deg'>
export type Metro = Marcado<number, 'm'>
export type Kg = Marcado<number, 'kg'>
export type Segundo = Marcado<number, 's'>
export type MPorS2 = Marcado<number, 'm/s²'>
export type RadPorS = Marcado<number, 'rad/s'>
export type Joule = Marcado<number, 'J'>

/** Construtores. Não validam faixa: isso é responsabilidade da camada de estado. */
export const rad = (v: number): Rad => v as Rad
export const deg = (v: number): Deg => v as Deg
export const metro = (v: number): Metro => v as Metro
export const kg = (v: number): Kg => v as Kg
export const segundo = (v: number): Segundo => v as Segundo
export const mPorS2 = (v: number): MPorS2 => v as MPorS2
export const radPorS = (v: number): RadPorS => v as RadPorS
export const joule = (v: number): Joule => v as Joule

/** Remove a marca. Use apenas ao entregar o número para fora do domínio. */
export const valor = (v: number): number => v

export const GRAUS_POR_RAD = 180 / Math.PI
export const RAD_POR_GRAU = Math.PI / 180

export const grausParaRad = (a: Deg): Rad => rad(a * RAD_POR_GRAU)
export const radParaGraus = (a: Rad): Deg => deg(a * GRAUS_POR_RAD)

/**
 * Erro de domínio do motor de física.
 *
 * O motor nunca devolve `NaN` silencioso: entrada inválida lança, e a camada
 * acima decide como comunicar (RNF-023 exige nomear parâmetro, valor e limite).
 */
export class ErroDeDominio extends Error {
  readonly parametro: string
  readonly valorRecebido: number
  readonly restricao: string

  constructor(parametro: string, valorRecebido: number, restricao: string) {
    super(`Parâmetro "${parametro}" recebeu ${valorRecebido}, mas exige-se ${restricao}.`)
    this.name = 'ErroDeDominio'
    this.parametro = parametro
    this.valorRecebido = valorRecebido
    this.restricao = restricao
  }
}

/** Exige número finito e estritamente positivo. */
export function exigirPositivo(parametro: string, v: number): void {
  if (!Number.isFinite(v) || v <= 0) {
    throw new ErroDeDominio(parametro, v, `${parametro} > 0 e finito`)
  }
}

/** Exige número finito dentro de [min, max], inclusive. */
export function exigirNaFaixa(parametro: string, v: number, min: number, max: number): void {
  if (!Number.isFinite(v) || v < min || v > max) {
    throw new ErroDeDominio(parametro, v, `${min} ≤ ${parametro} ≤ ${max}`)
  }
}

/** Exige inteiro finito dentro de [min, max], inclusive. */
export function exigirInteiroNaFaixa(
  parametro: string,
  v: number,
  min: number,
  max: number,
): void {
  if (!Number.isInteger(v) || v < min || v > max) {
    throw new ErroDeDominio(parametro, v, `inteiro com ${min} ≤ ${parametro} ≤ ${max}`)
  }
}

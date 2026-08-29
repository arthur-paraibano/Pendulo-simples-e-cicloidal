/**
 * Escalas e marcas de eixo dos gráficos.
 *
 * Módulo puro: não toca em canvas nem em DOM, e por isso é onde a correção dos
 * gráficos pode ser provada por teste em vez de conferida a olho.
 *
 * A escala logarítmica não é enfeite — o RF-082 pede o erro relativo de cada
 * modelo, e esse erro atravessa seis ordens de grandeza entre α = 1° e α = 150°.
 * Em escala linear, tudo abaixo de 1 % vira uma linha colada no eixo.
 */

export type TipoEscala = 'linear' | 'logaritmica'

export interface Dominio {
  readonly min: number
  readonly max: number
}

export interface Faixa {
  readonly inicio: number
  readonly fim: number
}

/** Menor positivo representável que a escala logarítmica aceita como piso. */
export const PISO_LOG = 1e-15

export class ErroDeEscala extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeEscala'
  }
}

/**
 * Converte valor do domínio para posição na tela.
 *
 * `faixa.inicio` e `faixa.fim` são posições em pixels; invertê-las é o modo
 * normal de desenhar o eixo vertical, que cresce para cima na física e para
 * baixo no canvas.
 */
export function projetar(
  valor: number,
  dominio: Dominio,
  faixa: Faixa,
  tipo: TipoEscala = 'linear',
): number {
  if (tipo === 'logaritmica') {
    const min = Math.max(dominio.min, PISO_LOG)
    const max = Math.max(dominio.max, min * 10)
    const v = Math.max(Math.abs(valor), PISO_LOG)
    const razao = (Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))
    return faixa.inicio + razao * (faixa.fim - faixa.inicio)
  }

  const amplitude = dominio.max - dominio.min
  if (amplitude === 0) return (faixa.inicio + faixa.fim) / 2
  return faixa.inicio + ((valor - dominio.min) / amplitude) * (faixa.fim - faixa.inicio)
}

/** Caminho inverso: da posição na tela de volta ao domínio. Base da leitura por cursor. */
export function desprojetar(
  posicao: number,
  dominio: Dominio,
  faixa: Faixa,
  tipo: TipoEscala = 'linear',
): number {
  const extensao = faixa.fim - faixa.inicio
  if (extensao === 0) return dominio.min
  const razao = (posicao - faixa.inicio) / extensao

  if (tipo === 'logaritmica') {
    const min = Math.max(dominio.min, PISO_LOG)
    const max = Math.max(dominio.max, min * 10)
    return 10 ** (Math.log10(min) + razao * (Math.log10(max) - Math.log10(min)))
  }
  return dominio.min + razao * (dominio.max - dominio.min)
}

/**
 * Passo "redondo" imediatamente acima do bruto: 1, 2, 5 ou 10 vezes a potência
 * de dez. É o que faz as marcas caírem em 0,5 e 1,0 em vez de 0,4713.
 */
export function passoRedondo(bruto: number): number {
  if (!Number.isFinite(bruto) || bruto <= 0) {
    throw new ErroDeEscala(`Passo bruto deve ser positivo e finito; recebeu ${bruto}.`)
  }
  const expoente = Math.floor(Math.log10(bruto))
  const potencia = 10 ** expoente
  const normalizado = bruto / potencia
  const escolhido = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10
  return escolhido * potencia
}

export interface Marca {
  readonly valor: number
  readonly rotulo: string
}

/** Casas decimais necessárias para distinguir marcas separadas por `passo`. */
export function casasDoPasso(passo: number): number {
  if (passo <= 0) return 0
  const expoente = Math.floor(Math.log10(passo))
  return expoente >= 0 ? 0 : Math.min(6, -expoente)
}

function formatar(valor: number, casas: number): string {
  const normalizado = Object.is(valor, -0) ? 0 : valor
  return normalizado.toFixed(casas).replace('.', ',')
}

/** Marcas de uma escala linear, alinhadas a múltiplos do passo redondo. */
export function marcasLineares(dominio: Dominio, alvo = 6): Marca[] {
  if (alvo < 2) throw new ErroDeEscala(`Alvo de marcas deve ser ao menos 2; recebeu ${alvo}.`)

  const amplitude = dominio.max - dominio.min
  if (!Number.isFinite(amplitude) || amplitude <= 0) {
    return [{ valor: dominio.min, rotulo: formatar(dominio.min, 2) }]
  }

  const passo = passoRedondo(amplitude / alvo)
  const casas = casasDoPasso(passo)
  const primeira = Math.ceil(dominio.min / passo) * passo

  const marcas: Marca[] = []
  // O épsilon evita perder a última marca por erro de ponto flutuante.
  for (let v = primeira; v <= dominio.max + passo * 1e-9; v += passo) {
    marcas.push({ valor: v, rotulo: formatar(v, casas) })
  }
  return marcas
}

/** Rótulo compacto de potência de dez: `0,001 %` vira `10⁻³`. */
function rotuloPotencia(expoente: number): string {
  const digitos = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  const sinal = expoente < 0 ? '⁻' : ''
  const corpo = String(Math.abs(expoente))
    .split('')
    .map((d) => digitos[Number(d)])
    .join('')
  return `10${sinal}${corpo}`
}

/** Marcas de uma escala logarítmica: uma por década. */
export function marcasLogaritmicas(dominio: Dominio): Marca[] {
  const min = Math.max(dominio.min, PISO_LOG)
  const max = Math.max(dominio.max, min * 10)
  const primeira = Math.floor(Math.log10(min))
  const ultima = Math.ceil(Math.log10(max))

  const marcas: Marca[] = []
  for (let e = primeira; e <= ultima; e++) {
    const valor = 10 ** e
    if (valor < min * 0.999 || valor > max * 1.001) continue
    marcas.push({ valor, rotulo: rotuloPotencia(e) })
  }
  return marcas.length > 0 ? marcas : [{ valor: min, rotulo: rotuloPotencia(primeira) }]
}

export function marcas(dominio: Dominio, tipo: TipoEscala, alvo = 6): Marca[] {
  return tipo === 'logaritmica' ? marcasLogaritmicas(dominio) : marcasLineares(dominio, alvo)
}

/**
 * Domínio que cobre os valores com uma folga proporcional.
 *
 * Sem folga, o extremo da série encosta na borda e some sob o eixo.
 */
export function dominioDe(valores: readonly number[], folga = 0.05): Dominio {
  const finitos = valores.filter((v) => Number.isFinite(v))
  if (finitos.length === 0) return { min: 0, max: 1 }

  let min = Math.min(...finitos)
  let max = Math.max(...finitos)

  if (min === max) {
    // Série constante — a reta horizontal da isocronia cai exatamente aqui.
    const desvio = Math.abs(min) > 0 ? Math.abs(min) * 0.05 : 0.5
    return { min: min - desvio, max: max + desvio }
  }

  const margem = (max - min) * folga
  min -= margem
  max += margem
  return { min, max }
}

/** Domínio logarítmico: descarta não positivos, que não têm lugar na escala. */
export function dominioLogDe(valores: readonly number[]): Dominio {
  const positivos = valores.filter((v) => Number.isFinite(v) && Math.abs(v) > 0).map(Math.abs)
  if (positivos.length === 0) return { min: PISO_LOG, max: 1 }

  const min = Math.min(...positivos)
  const max = Math.max(...positivos)
  return {
    min: 10 ** Math.floor(Math.log10(min)),
    max: 10 ** Math.ceil(Math.log10(max === min ? max * 10 : max)),
  }
}

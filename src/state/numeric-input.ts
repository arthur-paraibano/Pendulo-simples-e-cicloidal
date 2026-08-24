import type { DefinicaoParametro } from './tipos.js'

export interface ResultadoEntradaNumerica {
  readonly valido: boolean
  readonly valor?: number
  readonly mensagem?: string
}

/** Avaliador aritmético pequeno e fechado; nunca usa `eval`/`Function`. */
export function avaliarExpressaoNumerica(texto: string): number | null {
  const normalizado = texto.trim().toLowerCase().replaceAll(',', '.').replaceAll('π', 'pi').replaceAll(/\s/g, '')
  const tokens = normalizado.match(/pi|\d+(?:\.\d+)?(?:e[+-]?\d+)?|[()+\-*/]/g)
  if (tokens === null || tokens.join('') !== normalizado) return null
  let indice = 0
  const expressao = (): number | null => {
    let valor = termo()
    if (valor === null) return null
    while (tokens[indice] === '+' || tokens[indice] === '-') {
      const operador = tokens[indice++]
      const direita = termo()
      if (direita === null) return null
      valor = operador === '+' ? valor + direita : valor - direita
    }
    return valor
  }
  const termo = (): number | null => {
    let valor = fator()
    if (valor === null) return null
    while (tokens[indice] === '*' || tokens[indice] === '/') {
      const operador = tokens[indice++]
      const direita = fator()
      if (direita === null || (operador === '/' && direita === 0)) return null
      valor = operador === '*' ? valor * direita : valor / direita
    }
    return valor
  }
  const fator = (): number | null => {
    const token = tokens[indice++]
    if (token === undefined) return null
    if (token === '+') return fator()
    if (token === '-') {
      const valor = fator()
      return valor === null ? null : -valor
    }
    if (token === '(') {
      const valor = expressao()
      if (tokens[indice++] !== ')') return null
      return valor
    }
    if (token === 'pi') return Math.PI
    const valor = Number(token)
    return Number.isFinite(valor) ? valor : null
  }
  const valor = expressao()
  return valor !== null && indice === tokens.length && Number.isFinite(valor) ? valor : null
}

const semAcentos = (texto: string): string => texto.normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').toLowerCase()

function converterUnidade(valor: number, unidade: string, destino: string | null): number | null {
  const origem = semAcentos(unidade).replaceAll(' ', '').replaceAll('²', '2').replaceAll('³', '3')
  const alvo = semAcentos(destino ?? '').replaceAll(' ', '').replaceAll('²', '2').replaceAll('³', '3')
  if (origem === alvo) return valor

  if (alvo === 'm') return ({ m: 1, cm: 0.01, mm: 0.001 } as const)[origem as 'm'] !== undefined
    ? valor * ({ m: 1, cm: 0.01, mm: 0.001 } as const)[origem as 'm'] : null
  if (alvo === 'mm') return ({ m: 1000, cm: 10, mm: 1 } as const)[origem as 'm'] !== undefined
    ? valor * ({ m: 1000, cm: 10, mm: 1 } as const)[origem as 'm'] : null
  if (alvo === 'kg') return origem === 'g' ? valor / 1000 : origem === 'kg' ? valor : null
  if (alvo === 's') return origem === 'ms' ? valor / 1000 : origem === 's' ? valor : null
  if (alvo === 'm/s2') return ['m/s2', 'mps2'].includes(origem) ? valor : null

  const graus = ['°', 'deg', 'grau', 'graus'].includes(origem)
  const grados = ['grad', 'grado', 'grados', 'gon'].includes(origem)
  if (alvo === '°') {
    if (graus) return valor
    if (origem === 'rad') return (valor * 180) / Math.PI
    if (origem === 'pi') return valor * 180
    if (grados) return valor * 0.9
  }
  if (alvo === 'rad') {
    if (origem === 'rad') return valor
    if (graus) return (valor * Math.PI) / 180
    if (origem === 'pi') return valor * Math.PI
    if (grados) return (valor * Math.PI) / 200
  }
  return null
}

/** Interpreta expressão e converte somente unidades compatíveis com o esquema. */
export function interpretarEntradaNumerica(
  texto: string,
  definicao: Pick<DefinicaoParametro, 'simbolo' | 'unidade'>,
): ResultadoEntradaNumerica {
  const completo = texto.trim()
  const direto = avaliarExpressaoNumerica(completo)
  if (direto !== null) return { valido: true, valor: direto }

  const casamento = /^(.*?)\s+(\S+)\s*$/.exec(completo)
    ?? /^(.*?)([a-zA-Z°π²³/]+)\s*$/.exec(completo)
  if (casamento === null) return { valido: false, mensagem: `${definicao.simbolo} contém uma expressão inválida.` }
  const expressao = casamento[1]?.trim() ?? ''
  const unidade = casamento[2] ?? ''
  const base = avaliarExpressaoNumerica(expressao)
  if (base === null) return { valido: false, mensagem: `${definicao.simbolo} contém uma expressão inválida.` }
  const valor = converterUnidade(base, unidade, definicao.unidade)
  if (valor === null) return { valido: false, mensagem: `Unidade “${unidade}” incompatível com ${definicao.simbolo}.` }
  return { valido: true, valor }
}

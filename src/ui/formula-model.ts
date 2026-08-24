import type { ModoPendulo, ResultadoPeriodo, TermoSerie } from '../physics/types.js'
import { selecionarResultadoPeriodo } from '../state/formula.js'
import type { Store } from '../state/store.js'

export interface ModeloFormula {
  readonly modo: ModoPendulo
  readonly resultado: ResultadoPeriodo
  readonly tex: string
}

export function texDoTermo(termo: Pick<TermoSerie, 'n' | 'coeficienteFracao'>, id: string): string {
  if (termo.n === 0) return `\\htmlId{${id}}{1}`
  const coeficiente = termo.coeficienteFracao.includes('/')
    ? `\\frac{${termo.coeficienteFracao.replace('/', '}{')}}`
    : termo.coeficienteFracao
  return `\\htmlId{${id}}{${coeficiente}\\,\\operatorname{sen}^{${2 * termo.n}}\\!\\left(\\frac{\\alpha}{2}\\right)}`
}

export function texFormula(termos: readonly TermoSerie[], prefixo: string): string {
  return `2\\pi\\sqrt{\\frac{L}{g}}\\,\\left(${termos.map((termo) => texDoTermo(termo, `${prefixo}-termo-${termo.n}`)).join('+')}\\right)`
}

export function modeloFormula(store: Store, modo: ModoPendulo, prefixo: string): ModeloFormula {
  const resultado = selecionarResultadoPeriodo(store, modo)
  return { modo, resultado, tex: texFormula(resultado.termos, prefixo) }
}

export function formatarDecimal(valor: number, casas: number): string {
  const limiarZero = 0.5 * 10 ** -casas
  const normalizado = Object.is(valor, -0) || Math.abs(valor) < limiarZero ? 0 : valor
  return normalizado.toFixed(casas).replace('.', ',')
}

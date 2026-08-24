import { energias } from '../physics/energy.js'
import { kg, joule, metro, mPorS2, rad, radPorS } from '../physics/units.js'
import { selecionarResultadoPeriodo } from './formula.js'
import type { Store } from './store.js'

export interface EstadoDinamicoDerivados {
  readonly modo: 'simples' | 'cicloidal'
  readonly theta: number
  readonly qPonto: number
  readonly tempo: number
}

export interface ValorDerivadoUi {
  readonly id: string
  readonly simbolo: string
  readonly nome: string
  readonly valor: number | string
  readonly unidade: string | null
  readonly casas: number
  /** Identifica grandezas cuja definição física muda entre os dois modelos. */
  readonly modoEnergia?: 'simples' | 'cicloidal'
}

function comprimentoEfetivo(store: Store): number {
  const L = store.numero('L')
  const raio = store.numero('raioEsfera')
  switch (store.texto('modeloComprimento')) {
    case 'fioMaisRaio': return L + raio
    case 'esferaSolida': return L + (2 * raio * raio) / (5 * L)
    default: return L
  }
}

function fatorQualidade(store: Store): number | string {
  const frequenciaNatural = Math.sqrt(store.numero('g') / store.numero('L'))
  const gamma = store.numero('b') / store.numero('m') + 2 * store.numero('zeta') * frequenciaNatural
  return gamma === 0 ? '∞' : frequenciaNatural / gamma
}

/**
 * Seletores puros das grandezas somente-leitura. O estado dinâmico vem do
 * runtime; quando ainda não houve quadro, usa-se a condição inicial real.
 */
export function valoresDerivados(store: Store, estado?: EstadoDinamicoDerivados): readonly ValorDerivadoUi[] {
  const modoSelecionado = store.texto('modo')
  const modo = estado?.modo ?? (modoSelecionado === 'cicloidal' ? 'cicloidal' : 'simples')
  const periodo = selecionarResultadoPeriodo(store, modo)
  const theta = estado?.theta ?? (store.numero('theta0') * Math.PI) / 180
  const velocidade = estado?.qPonto ?? store.numero('omega0')
  const energia = energias(
    kg(store.numero('m')),
    metro(store.numero('L')),
    mPorS2(store.numero('g')),
    rad(theta),
    radPorS(velocidade),
    modo,
    joule(0),
  )
  const nomeModo = modo === 'simples' ? 'pêndulo simples' : 'pêndulo cicloidal'

  return [
    { id: 'tempo', simbolo: 't', nome: 'Tempo de simulação', valor: estado?.tempo ?? store.numero('t'), unidade: 's', casas: 3 },
    { id: 'T0', simbolo: 'T₀', nome: 'Período de pequena amplitude', valor: periodo.T0, unidade: 's', casas: 6 },
    { id: 'T', simbolo: 'T', nome: 'Período pela série', valor: periodo.T, unidade: 's', casas: 6 },
    { id: 'razao', simbolo: 'T/T₀', nome: 'Razão de períodos', valor: periodo.razao, unidade: null, casas: 6 },
    { id: 'frequencia', simbolo: 'f', nome: 'Frequência', valor: periodo.frequencia, unidade: 'Hz', casas: 6 },
    { id: 'omegaAngular', simbolo: 'ω', nome: 'Frequência angular', valor: periodo.omegaAngular, unidade: 'rad/s', casas: 6 },
    { id: 'raioCicloidal', simbolo: 'r', nome: 'Raio gerador cicloidal', valor: store.numero('L') / 4, unidade: 'm', casas: 4 },
    { id: 'comprimentoEfetivo', simbolo: 'Lₑᶠ', nome: 'Comprimento efetivo', valor: comprimentoEfetivo(store), unidade: 'm', casas: 6 },
    { id: 'energiaCinetica', simbolo: 'Eₖ', nome: `Energia cinética — ${nomeModo}`, valor: energia.cinetica, unidade: 'J', casas: 6, modoEnergia: modo },
    { id: 'energiaPotencial', simbolo: 'Eₚ', nome: `Energia potencial — ${nomeModo}`, valor: energia.potencial, unidade: 'J', casas: 6, modoEnergia: modo },
    { id: 'energiaTermica', simbolo: 'Eₜ', nome: `Energia térmica acumulada — ${nomeModo}`, valor: energia.termica, unidade: 'J', casas: 6, modoEnergia: modo },
    { id: 'energiaTotal', simbolo: 'E', nome: `Energia total — ${nomeModo}`, valor: energia.total, unidade: 'J', casas: 6, modoEnergia: modo },
    { id: 'fatorQualidade', simbolo: 'Q', nome: 'Fator de qualidade', valor: fatorQualidade(store), unidade: null, casas: 3 },
  ]
}

export function formatarDerivado(valor: ValorDerivadoUi): string {
  const numero = typeof valor.valor === 'number'
    ? valor.valor.toFixed(valor.casas).replace('.', ',')
    : valor.valor
  return `${numero}${valor.unidade === null ? '' : ` ${valor.unidade}`}`
}

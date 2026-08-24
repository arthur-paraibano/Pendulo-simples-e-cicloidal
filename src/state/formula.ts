import { resultadoPeriodo } from '../physics/period.js'
import type { ModoPendulo, ResultadoPeriodo } from '../physics/types.js'
import { deg, grausParaRad, metro, mPorS2 } from '../physics/units.js'
import type { Store } from './store.js'

/** Seletor único que adapta o estado da aplicação à fachada do motor. */
export function selecionarResultadoPeriodo(store: Store, modo: ModoPendulo): ResultadoPeriodo {
  return resultadoPeriodo({
    L: metro(store.numero('L')),
    g: mPorS2(store.numero('g')),
    alpha: grausParaRad(deg(store.numero('alpha'))),
    N: store.numero('N'),
    modo,
  })
}

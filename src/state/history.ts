/**
 * Histórico de desfazer e refazer.
 *
 * Regra de agrupamento: alterações do **mesmo parâmetro** dentro de uma janela
 * curta contam como um único passo. Arrastar um slider é *um* desfazer, não
 * duzentos — sem isso o histórico fica inutilizável.
 *
 * O tempo entra como argumento (`agora`), nunca lido do relógio: o Princípio V
 * exige que o histórico seja reproduzível em teste.
 */

import type { ValorParametro } from './tipos.js'
import type { Store } from './store.js'

export const LIMITE_PILHA = 50
export const JANELA_AGRUPAMENTO_MS = 500

interface Entrada {
  readonly valores: Record<string, ValorParametro>
  readonly rotulo: string
  readonly instante: number
}

export class Historico {
  private readonly passados: Entrada[] = []
  private readonly futuros: Entrada[] = []
  private ultimoRotulo: string | null = null
  private ultimoInstante = Number.NEGATIVE_INFINITY

  constructor(private readonly store: Store) {}

  /**
   * Registra o estado **anterior** a uma alteração.
   *
   * @param rotulo identifica o que mudou; alterações consecutivas com o mesmo
   *   rótulo dentro da janela são agrupadas.
   * @param agora instante em milissegundos, fornecido pelo chamador.
   */
  registrar(rotulo: string, agora: number, valoresAnteriores: Record<string, ValorParametro>): void {
    const agrupa =
      this.ultimoRotulo === rotulo && agora - this.ultimoInstante < JANELA_AGRUPAMENTO_MS

    this.ultimoRotulo = rotulo
    this.ultimoInstante = agora
    this.futuros.length = 0

    if (agrupa && this.passados.length > 0) return

    this.passados.push({ valores: valoresAnteriores, rotulo, instante: agora })
    if (this.passados.length > LIMITE_PILHA) this.passados.shift()
  }

  get podeDesfazer(): boolean {
    return this.passados.length > 0
  }

  get podeRefazer(): boolean {
    return this.futuros.length > 0
  }

  get profundidade(): number {
    return this.passados.length
  }

  desfazer(): boolean {
    const anterior = this.passados.pop()
    if (anterior === undefined) return false

    this.futuros.push({
      valores: this.store.instantaneo(),
      rotulo: anterior.rotulo,
      instante: anterior.instante,
    })
    this.restaurar(anterior.valores)
    this.ultimoRotulo = null
    return true
  }

  refazer(): boolean {
    const seguinte = this.futuros.pop()
    if (seguinte === undefined) return false

    this.passados.push({
      valores: this.store.instantaneo(),
      rotulo: seguinte.rotulo,
      instante: seguinte.instante,
    })
    this.restaurar(seguinte.valores)
    this.ultimoRotulo = null
    return true
  }

  limpar(): void {
    this.passados.length = 0
    this.futuros.length = 0
    this.ultimoRotulo = null
    this.ultimoInstante = Number.NEGATIVE_INFINITY
  }

  private restaurar(valores: Readonly<Record<string, ValorParametro>>): void {
    this.store.emLote(() => {
      for (const [id, valor] of Object.entries(valores)) {
        try {
          this.store.definirParametro(id, valor, 'usuario')
        } catch {
          // Parâmetro derivado ou removido entre versões: ignorado de propósito.
        }
      }
    })
  }
}

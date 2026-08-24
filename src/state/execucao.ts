/**
 * Máquina de estados da execução (data-model §3.5, RF-091 a RF-095).
 *
 * A regra que mais importa: alterar um parâmetro **estrutural** com a simulação
 * em curso reinicializa a dinâmica e pausa, **informando o motivo**. Alterar um
 * parâmetro de apresentação nunca interrompe nada. Sem essa distinção, mexer na
 * cor de um traço reiniciaria o experimento do usuário.
 */

import { POR_ID } from './schema.js'

export type EstadoExecucao = 'parado' | 'rodando' | 'pausado'

export type Comando =
  | 'reproduzir'
  | 'pausar'
  | 'parar'
  | 'passoAPasso'
  | 'parametroEstrutural'
  | 'movimentoReduzido'

/**
 * Parâmetros que, ao mudar, invalidam a trajetória já simulada.
 *
 * Derivado de `afeta`: o que toca período ou geometria é estrutural.
 */
export function ehEstrutural(id: string): boolean {
  const def = POR_ID.get(id)
  if (def === undefined) return false
  return def.afeta.includes('periodo') || def.afeta.includes('geometria')
}

export interface Transicao {
  readonly de: EstadoExecucao
  readonly para: EstadoExecucao
  readonly reiniciaDinamica: boolean
  readonly motivo?: string
}

export function transicionar(
  atual: EstadoExecucao,
  comando: Comando,
  detalhe?: string,
): Transicao {
  switch (comando) {
    case 'reproduzir':
      return { de: atual, para: 'rodando', reiniciaDinamica: false }

    case 'pausar':
      return {
        de: atual,
        para: atual === 'rodando' ? 'pausado' : atual,
        reiniciaDinamica: false,
      }

    case 'parar':
      return { de: atual, para: 'parado', reiniciaDinamica: true }

    case 'passoAPasso':
      // Passo a passo só faz sentido pausado; reproduzindo, é ignorado.
      return { de: atual, para: atual === 'rodando' ? 'rodando' : 'pausado', reiniciaDinamica: false }

    case 'parametroEstrutural':
      return {
        de: atual,
        para: 'pausado',
        reiniciaDinamica: true,
        motivo:
          detalhe === undefined
            ? 'Um parâmetro estrutural mudou; a simulação foi reiniciada e pausada.'
            : `"${detalhe}" mudou e invalida a trajetória já simulada; a simulação foi reiniciada e pausada.`,
      }

    case 'movimentoReduzido':
      // RF-122: com movimento reduzido, a aplicação inicia pausada.
      return {
        de: atual,
        para: 'pausado',
        reiniciaDinamica: false,
        motivo: 'Preferência de movimento reduzido ativa: a animação inicia pausada.',
      }
  }
}

/** Gerência do estado de execução, para a camada de interface consumir. */
export class ControleExecucao {
  private estadoAtual: EstadoExecucao

  constructor(inicial: EstadoExecucao = 'pausado') {
    this.estadoAtual = inicial
  }

  get estado(): EstadoExecucao {
    return this.estadoAtual
  }

  get rodando(): boolean {
    return this.estadoAtual === 'rodando'
  }

  /** Sincroniza uma restauração externa (URL/preset) sem inventar transição. */
  sincronizar(estado: EstadoExecucao): void {
    this.estadoAtual = estado
  }

  aplicar(comando: Comando, detalhe?: string): Transicao {
    const transicao = transicionar(this.estadoAtual, comando, detalhe)
    this.estadoAtual = transicao.para
    return transicao
  }

  /**
   * Notifica que um parâmetro mudou; devolve a transição se ela ocorreu.
   *
   * Parâmetros de apresentação devolvem `null` — nada acontece.
   */
  aoAlterarParametro(id: string): Transicao | null {
    if (!ehEstrutural(id)) return null
    if (this.estadoAtual === 'parado') return null
    const def = POR_ID.get(id)
    return this.aplicar('parametroEstrutural', def?.nome ?? id)
  }
}

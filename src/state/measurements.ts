/**
 * Coleção de medições — a tabela de coleta de `T` e `g` (RF-140 a RF-150).
 *
 * A tabela de coleta e o caderno de laboratório são **a mesma coleção** em duas
 * apresentações; não há registro duplicado (RF-150).
 */

import { estatisticas } from '../physics/analysis.js'
import { compararInferencias } from '../physics/inference.js'
import type { ModoPendulo } from '../physics/types.js'
import { metro, segundo, type Metro, type Rad, type Segundo } from '../physics/units.js'

export type GrandezaMedida = 'meioPeriodo' | 'periodoCompleto'
export type OrigemMedicao = 'automatica' | 'manual'

export interface Medicao {
  readonly n: number
  readonly idPendulo: string
  readonly pendulo: ModoPendulo
  /** Período medido, na grandeza indicada. */
  readonly T: Segundo
  readonly grandeza: GrandezaMedida
  /** Gravidade inferida do período, com os termos de correção (RF-142). */
  readonly gInferido: number
  /** Gravidade pela fórmula de pequenos ângulos, sem correção (RF-144). */
  readonly gInferidoIngenuo: number
  readonly gConfigurado: number
  /** Amplitude no instante da coleta, em graus. */
  readonly alphaGraus: number
  readonly L: Metro
  readonly Tteorico: Segundo
  readonly erroRelativo: number
  readonly N: number
  readonly tColeta: Segundo
  readonly origem: OrigemMedicao
  /** Distingue medição simulada de leitura de hardware real (feature 002). */
  readonly fonte: 'simulacao' | 'real'
}

export interface EntradaMedicao {
  readonly idPendulo: string
  readonly pendulo: ModoPendulo
  readonly T: Segundo
  readonly grandeza: GrandezaMedida
  readonly alpha: Rad
  readonly L: Metro
  readonly g: number
  readonly N: number
  readonly Tteorico: Segundo
  readonly tColeta: Segundo
  readonly origem?: OrigemMedicao
  readonly fonte?: 'simulacao' | 'real'
}

export interface ResumoEstatistico {
  readonly contagem: number
  readonly media: number | null
  readonly desvioPadrao: number | null
  readonly erroPadrao: number | null
  readonly minimo: number | null
  readonly maximo: number | null
}

export const LIMITE_LINHAS = 10_000

export class ColecaoMedicoes {
  private readonly linhas: Medicao[] = []
  private proximoNumero = 1

  /**
   * Registra uma medição, calculando as duas inferências de gravidade.
   *
   * Para o período completo usa-se `T`; para meio período, o dobro — a
   * inferência de `g` sempre trabalha com o período completo, e confundir as
   * duas grandezas é o erro mais comum ao reproduzir o experimento.
   */
  registrar(entrada: EntradaMedicao): Medicao {
    if (!(entrada.T > 0)) {
      throw new Error(`Período medido deve ser positivo; recebeu ${entrada.T}.`)
    }

    const periodoCompleto = segundo(
      entrada.grandeza === 'meioPeriodo' ? entrada.T * 2 : entrada.T,
    )
    const comparacao = compararInferencias(
      periodoCompleto,
      entrada.L,
      entrada.alpha,
      entrada.N,
      entrada.pendulo,
    )

    const medicao: Medicao = {
      n: this.proximoNumero,
      idPendulo: entrada.idPendulo,
      pendulo: entrada.pendulo,
      T: entrada.T,
      grandeza: entrada.grandeza,
      gInferido: comparacao.correta,
      gInferidoIngenuo: comparacao.ingenua,
      gConfigurado: entrada.g,
      alphaGraus: (entrada.alpha * 180) / Math.PI,
      L: entrada.L,
      Tteorico: entrada.Tteorico,
      erroRelativo:
        entrada.Tteorico === 0 ? 0 : (periodoCompleto - entrada.Tteorico) / entrada.Tteorico,
      N: entrada.N,
      tColeta: entrada.tColeta,
      origem: entrada.origem ?? 'automatica',
      fonte: entrada.fonte ?? 'simulacao',
    }

    this.proximoNumero += 1
    this.linhas.push(medicao)
    if (this.linhas.length > LIMITE_LINHAS) this.linhas.shift()
    return medicao
  }

  get todas(): readonly Medicao[] {
    return this.linhas
  }

  get contagem(): number {
    return this.linhas.length
  }

  /** Remove uma linha pelo número; devolve se algo foi removido. */
  remover(n: number): boolean {
    const indice = this.linhas.findIndex((m) => m.n === n)
    if (indice < 0) return false
    this.linhas.splice(indice, 1)
    return true
  }

  /** Esvazia a coleção. A confirmação é responsabilidade da interface (RF-105). */
  limpar(): void {
    this.linhas.length = 0
    this.proximoNumero = 1
  }

  /** Ordena para exibição, sem alterar a ordem de inserção. */
  ordenadas(coluna: keyof Medicao, direcao: 'asc' | 'desc' = 'asc'): readonly Medicao[] {
    const sinal = direcao === 'asc' ? 1 : -1
    return [...this.linhas].sort((a, b) => {
      const va = a[coluna]
      const vb = b[coluna]
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sinal
      return String(va).localeCompare(String(vb)) * sinal
    })
  }

  estatisticasDe(coluna: 'T' | 'gInferido' | 'gInferidoIngenuo'): ResumoEstatistico {
    return estatisticas(this.linhas.map((m) => m[coluna]))
  }

  /** Só as linhas de um pêndulo — útil na visualização lado a lado (RF-139). */
  doPendulo(idPendulo: string): readonly Medicao[] {
    return this.linhas.filter((m) => m.idPendulo === idPendulo)
  }

  /** Restaura de um preset ou arquivo importado. */
  carregar(linhas: readonly Medicao[]): void {
    this.limpar()
    for (const linha of linhas) this.linhas.push(linha)
    this.proximoNumero = this.linhas.reduce((maior, m) => Math.max(maior, m.n), 0) + 1
  }
}

/** Constrói a entrada a partir de grandezas cruas, para uso do motor. */
export function entradaDeMedicao(
  idPendulo: string,
  pendulo: ModoPendulo,
  T: number,
  grandeza: GrandezaMedida,
  alphaRad: number,
  Lmetros: number,
  g: number,
  N: number,
  Tteorico: number,
  tColeta: number,
): EntradaMedicao {
  return {
    idPendulo,
    pendulo,
    T: segundo(T),
    grandeza,
    alpha: alphaRad as Rad,
    L: metro(Lmetros),
    g,
    N,
    Tteorico: segundo(Tteorico),
    tColeta: segundo(tColeta),
  }
}

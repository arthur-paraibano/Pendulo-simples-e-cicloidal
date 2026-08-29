/**
 * Coleção de medições — a tabela de coleta de `T` e `g` (RF-140 a RF-150).
 *
 * A tabela de coleta e o caderno de laboratório são **a mesma coleção** em duas
 * apresentações; não há registro duplicado (RF-150).
 */

import { estatisticas } from '../physics/analysis.js'
import { compararInferencias } from '../physics/inference.js'
import { periodoExato, periodoSerie } from '../physics/period.js'
import { periodoDeEventos, type EventoPassagem } from '../physics/sensor.js'
import type { ModoPendulo } from '../physics/types.js'
import {
  deg,
  grausParaRad,
  metro,
  mPorS2,
  segundo,
  type Metro,
  type Rad,
  type Segundo,
} from '../physics/units.js'

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

interface LeitorColeta {
  numero(id: string): number
  texto(id: string): string
}

/** Porta de escrita do estado para a coleta; implementada pelo Store. */
export interface EstadoMedicoes extends LeitorColeta {
  registrarMedicao(entrada: EntradaMedicao): Medicao
}

export class ColecaoMedicoes {
  private readonly linhas: Medicao[] = []
  private readonly ouvintes = new Set<() => void>()
  private proximoNumero = 1

  /**
   * Registra uma medição, calculando as duas inferências de gravidade.
   *
   * Para o período completo usa-se `T`; para meio período, o dobro — a
   * inferência de `g` sempre trabalha com o período completo, e confundir as
   * duas grandezas é o erro mais comum ao reproduzir o experimento.
   */
  registrar(entrada: EntradaMedicao): Medicao {
    if (!Number.isFinite(entrada.T) || !(entrada.T > 0)) {
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
    this.notificar()
    return medicao
  }

  get todas(): readonly Medicao[] {
    // Quem consome a coleção recebe uma fotografia, não o array mutável que
    // sustenta a numeração, as estatísticas e as duas apresentações (RF-150).
    return [...this.linhas]
  }

  get contagem(): number {
    return this.linhas.length
  }

  /** Remove uma linha pelo número; devolve se algo foi removido. */
  remover(n: number): boolean {
    const indice = this.linhas.findIndex((m) => m.n === n)
    if (indice < 0) return false
    this.linhas.splice(indice, 1)
    this.notificar()
    return true
  }

  /** Esvazia a coleção. A confirmação é responsabilidade da interface (RF-105). */
  limpar(): void {
    this.linhas.length = 0
    this.proximoNumero = 1
    this.notificar()
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

  /**
   * Recorta uma página para a interface sem materializar milhares de linhas.
   * A ordem cronológica, usada durante a coleta, evita inclusive a ordenação
   * completa: custo proporcional apenas ao número de linhas visíveis.
   */
  paginaOrdenada(
    coluna: keyof Medicao,
    direcao: 'asc' | 'desc',
    inicio: number,
    limite: number,
  ): readonly Medicao[] {
    const primeiro = Math.max(0, Math.trunc(inicio))
    const quantidade = Math.max(0, Math.trunc(limite))
    if (quantidade === 0 || primeiro >= this.linhas.length) return []
    if (coluna === 'n') {
      if (direcao === 'asc') return this.linhas.slice(primeiro, primeiro + quantidade)
      const fimOriginal = this.linhas.length - primeiro
      const inicioOriginal = Math.max(0, fimOriginal - quantidade)
      return this.linhas.slice(inicioOriginal, fimOriginal).reverse()
    }
    return this.ordenadas(coluna, direcao).slice(primeiro, primeiro + quantidade)
  }

  estatisticasDe(coluna: 'T' | 'gInferido' | 'gInferidoIngenuo'): ResumoEstatistico {
    // Linhas de meio período e período completo podem coexistir. Para T, a
    // estatística usa uma grandeza homogênea: período completo normalizado.
    return estatisticas(this.linhas.map((m) => coluna === 'T'
      ? (m.grandeza === 'meioPeriodo' ? m.T * 2 : m.T)
      : m[coluna]))
  }

  /** Só as linhas de um pêndulo — útil na visualização lado a lado (RF-139). */
  doPendulo(idPendulo: string): readonly Medicao[] {
    return this.linhas.filter((m) => m.idPendulo === idPendulo)
  }

  /** Restaura de um preset ou arquivo importado. */
  carregar(linhas: readonly Medicao[]): void {
    // A origem pode ser uma visão da própria coleção. Copiá-la antes de
    // limpar torna `carregar(colecao.todas)` seguro mesmo se o seletor mudar.
    const restauradas = linhas.slice(-LIMITE_LINHAS)
    this.linhas.length = 0
    // Presets e importações também respeitam o teto de memória. Mantemos as
    // linhas mais recentes, que são as relevantes para continuar o caderno.
    for (const linha of restauradas) this.linhas.push(linha)
    this.proximoNumero = this.linhas.reduce((maior, m) => Math.max(maior, m.n), 0) + 1
    this.notificar()
  }

  /**
   * Observa a coleção única, independentemente da apresentação que a alterou.
   * Assim tabela e caderno nunca mantêm cópias divergentes (RF-150).
   */
  assinar(ouvinte: () => void): () => void {
    this.ouvintes.add(ouvinte)
    return () => this.ouvintes.delete(ouvinte)
  }

  private notificar(): void {
    for (const ouvinte of this.ouvintes) ouvinte()
  }
}

/**
 * Ação de estado que transforma disparos do sensor em linhas da coleção.
 * A UI só encaminha eventos e comandos; fórmulas e unidades ficam fora dela.
 */
export class ColetorTabela {
  private readonly historicos = new Map<ModoPendulo, EventoPassagem[]>()
  private readonly sentidoAutomatico = new Map<ModoPendulo, -1 | 1>()
  private coletaAtiva = false

  constructor(
    private readonly estado: EstadoMedicoes,
  ) {}

  get automaticaAtiva(): boolean {
    return this.coletaAtiva
  }

  definirColeta(ativa: boolean): void {
    if (ativa === this.coletaAtiva) return
    this.coletaAtiva = ativa
    // Nunca una passagens separadas por uma pausa da coleta. Tanto pausar
    // quanto retomar abre uma nova janela experimental.
    this.reiniciarSensor()
  }

  reiniciarSensor(): void {
    this.historicos.clear()
    this.sentidoAutomatico.clear()
  }

  registrarPassagem(modo: ModoPendulo, evento: EventoPassagem, alpha: Rad): Medicao | null {
    // Coleta pausada não observa o sensor em segundo plano. Assim, retomar
    // nunca fecha um ciclo iniciado antes da pausa, nem faz o histórico crescer.
    if (!this.coletaAtiva) return null
    const eventos = this.historicos.get(modo) ?? []
    const anterior = eventos.at(-1)
    if (!Number.isFinite(evento.t) || evento.t < 0 || (anterior !== undefined && evento.t <= anterior.t)) {
      // Um relógio reiniciado ou um evento fora de ordem delimita uma nova
      // série. Semeia o histórico sem produzir período negativo ou enorme.
      this.historicos.set(modo, Number.isFinite(evento.t) && evento.t >= 0 ? [evento] : [])
      this.sentidoAutomatico.delete(modo)
      if (Number.isFinite(evento.t) && evento.t >= 0) this.sentidoAutomatico.set(modo, evento.sentido)
      return null
    }
    eventos.push(evento)
    // Três travessias alternadas são suficientes para período completo; duas,
    // para meio período. O histórico de coleta não cresce com a execução.
    if (eventos.length > 3) eventos.splice(0, eventos.length - 3)
    this.historicos.set(modo, eventos)
    if (!this.sentidoAutomatico.has(modo)) this.sentidoAutomatico.set(modo, evento.sentido)
    if (evento.sentido !== this.sentidoAutomatico.get(modo)) return null

    // Uma direção é a âncora do ciclo. Sem isso, as duas direções gerariam
    // janelas sobrepostas e duas linhas para uma única oscilação completa.
    const periodoCompleto = periodoDeEventos(eventos, 'periodoCompleto')
    if (periodoCompleto === null) return null
    const grandeza = this.grandeza
    const T = grandeza === 'meioPeriodo'
      ? periodoDeEventos(eventos, 'meioPeriodo')
      : periodoCompleto
    if (T === null) return null
    return this.registrar(modo, T, 'automatica', evento.t, alpha)
  }

  coletarManual(modo: ModoPendulo, tColeta: number, alphaAtual?: Rad): Medicao {
    const eventos = this.historicos.get(modo) ?? []
    const observada = periodoDeEventos(eventos, this.grandeza)
    const alpha = alphaAtual ?? grausParaRad(deg(this.estado.numero('alpha')))
    const exata = periodoExato(
      metro(this.estado.numero('L')),
      mPorS2(this.estado.numero('g')),
      alpha,
      modo,
    )
    const imediata = this.grandeza === 'meioPeriodo' ? exata / 2 : exata
    return this.registrar(modo, observada ?? imediata, 'manual', tColeta, alpha)
  }

  private get grandeza(): GrandezaMedida {
    return this.estado.texto('modoContagem') as GrandezaMedida
  }

  private registrar(
    modo: ModoPendulo,
    T: number,
    origem: OrigemMedicao,
    tColeta: number,
    alphaAtual?: Rad,
  ): Medicao {
    const alpha = alphaAtual ?? grausParaRad(deg(this.estado.numero('alpha')))
    const L = metro(this.estado.numero('L'))
    const g = mPorS2(this.estado.numero('g'))
    const N = this.estado.numero('N')
    const Tteorico = periodoSerie(L, g, alpha, N, modo)
    return this.estado.registrarMedicao({
      ...entradaDeMedicao(
        modo,
        modo,
        T,
        this.grandeza,
        alpha,
        L,
        g,
        N,
        Tteorico,
        tColeta,
      ),
      origem,
    })
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

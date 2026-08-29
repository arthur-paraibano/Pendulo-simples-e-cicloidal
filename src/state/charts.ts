/**
 * Seletores de séries dos gráficos.
 *
 * Camada pura: transforma estado e amostras em pontos, sem tocar em canvas.
 * É aqui que a correção dos gráficos pode ser provada contra as tabelas de
 * referência — e não conferida a olho depois de desenhada.
 */

import { amplitudeCorrente, varreduraPeriodoPorAmplitude } from '../physics/analysis.js'
import {
  periodoDuasIteracoes,
  periodoKiddFogg,
  periodoLimaArun,
} from '../physics/approximations.js'
import { ALPHA_MAX_CICLOIDAL_GRAUS } from '../physics/constants.js'
import { energias } from '../physics/energy.js'
import type { Amostra } from '../physics/engine.js'
import { aceleracaoGeneralizada, type ParametrosDinamica } from '../physics/ode.js'
import { periodoExato, periodoPequenaAmplitude, periodoSerie } from '../physics/period.js'
import { razaoPeriodoExata } from '../physics/elliptic.js'
import { somatorioSerie } from '../physics/series.js'
import type { ModoPendulo } from '../physics/types.js'
import {
  deg,
  grausParaRad,
  kg,
  metro,
  mPorS2,
  rad,
  radPorS,
  segundo,
  type Rad,
} from '../physics/units.js'
import type { TipoEscala } from '../render/charts/escala.js'
import type { Store } from './store.js'

export interface PontoSerie {
  readonly x: number
  readonly y: number
}

/** Como a série é desenhada. O traço distingue mesmo sem cor (RF-121). */
export type FormaSerie = 'linha' | 'pontos' | 'barras'
export type TracoSerie = 'solido' | 'tracejado' | 'pontilhado'

export interface SerieGrafico {
  readonly id: string
  readonly rotulo: string
  /** Chave da paleta; a cor concreta é resolvida na renderização. */
  readonly cor: string
  readonly forma: FormaSerie
  readonly traco: TracoSerie
  readonly pontos: readonly PontoSerie[]
}

/** Ponto destacado que marca o valor corrente dos parâmetros (RF-084). */
export interface MarcadorGrafico {
  readonly rotulo: string
  readonly x: number
  readonly y: number
}

export interface EixoGrafico {
  readonly rotulo: string
  readonly tipo: TipoEscala
  readonly unidade: string | null
}

export interface ModeloGrafico {
  readonly id: string
  readonly titulo: string
  readonly descricao: string
  readonly eixoX: EixoGrafico
  readonly eixoY: EixoGrafico
  readonly series: readonly SerieGrafico[]
  readonly marcadores: readonly MarcadorGrafico[]
}

const g = (graus: number): Rad => grausParaRad(deg(graus))

function alphaMaximo(modo: ModoPendulo): number {
  return modo === 'cicloidal' ? ALPHA_MAX_CICLOIDAL_GRAUS : 179
}

function modoDoStore(store: Store): ModoPendulo {
  return store.texto('modo') === 'cicloidal' ? 'cicloidal' : 'simples'
}

/**
 * Normaliza um valor de múltipla escolha em lista de texto.
 *
 * O store já garante lista para parâmetros desse tipo, mas o tipo do valor
 * bruto é mais largo — e presets e endereços compartilhados são escritos por
 * quem quiser. Um gráfico não pode quebrar por causa disso.
 */
export function listaDeTexto(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map(String)
  if (typeof valor === 'string' && valor !== '') return [valor]
  return []
}

// ── T(α) ─────────────────────────────────────────────────────────────────────

/**
 * Curva `T(α)` com as três séries obrigatórias do RF-081.
 *
 * No modo cicloidal as três coincidem numa reta horizontal — é a assinatura
 * visual da isocronia, e o motivo de a escala precisar abrir folga para série
 * constante em vez de colapsar no eixo.
 */
export function graficoPeriodoPorAmplitude(store: Store, passos = 120): ModeloGrafico {
  const L = metro(store.numero('L'))
  const gravidade = mPorS2(store.numero('g'))
  const N = store.numero('N')
  const modo = modoDoStore(store)
  const maximo = alphaMaximo(modo)

  const varredura = varreduraPeriodoPorAmplitude(
    L,
    gravidade,
    N,
    modo,
    g(0.1),
    g(maximo),
    passos,
  )
  const T0 = periodoPequenaAmplitude(L, gravidade)
  const emGraus = (a: Rad): number => (a * 180) / Math.PI

  const series: SerieGrafico[] = [
    {
      id: 'T0',
      rotulo: 'T₀ = 2π√(L/g)',
      cor: 'referenciaT0',
      forma: 'linha',
      traco: 'tracejado',
      pontos: varredura.map((p) => ({ x: emGraus(p.alpha), y: T0 })),
    },
    {
      id: 'serie',
      rotulo: `Série com N = ${N}`,
      cor: modo === 'cicloidal' ? 'cicloidal' : 'simples',
      forma: 'linha',
      traco: 'solido',
      pontos: varredura.map((p) => ({ x: emGraus(p.alpha), y: p.T })),
    },
    {
      id: 'exato',
      rotulo: 'Valor exato',
      cor: 'valorExato',
      forma: 'linha',
      traco: 'pontilhado',
      pontos: varredura.map((p) => ({ x: emGraus(p.alpha), y: p.Texato })),
    },
  ]

  const extras = listaDeTexto(store.bruto('modelosExibidos'))
  const fechadas: Array<[string, string, (a: Rad) => number]> = [
    ['kiddFogg', 'Kidd–Fogg', (a) => periodoKiddFogg(L, gravidade, a)],
    ['limaArun', 'Lima–Arun', (a) => periodoLimaArun(L, gravidade, a)],
    ['duasIteracoes', 'AGM, duas iterações', (a) => periodoDuasIteracoes(L, gravidade, a)],
  ]
  for (const [id, rotulo, calcular] of fechadas) {
    if (!extras.includes(id)) continue
    series.push({
      id,
      rotulo,
      cor: 'textoSuave',
      forma: 'linha',
      traco: 'tracejado',
      pontos: varredura.map((p) => ({ x: emGraus(p.alpha), y: calcular(p.alpha) })),
    })
  }

  const alphaAtual = store.numero('alpha')
  return {
    id: 'periodo-por-amplitude',
    titulo: 'Período em função da amplitude',
    descricao:
      modo === 'cicloidal'
        ? 'No pêndulo cicloidal a curva é uma reta horizontal: o período não depende da amplitude.'
        : 'O período cresce com a amplitude, e a série truncada se descola do valor exato.',
    eixoX: { rotulo: 'Amplitude α', tipo: 'linear', unidade: '°' },
    eixoY: { rotulo: 'Período T', tipo: 'linear', unidade: 's' },
    series,
    marcadores: [
      {
        rotulo: `α = ${alphaAtual.toFixed(1).replace('.', ',')}°`,
        x: alphaAtual,
        y: periodoSerie(L, gravidade, g(alphaAtual), N, modo),
      },
    ],
  }
}

// ── Erro relativo ────────────────────────────────────────────────────────────

/**
 * Erro relativo da série truncada em relação ao valor exato (RF-082).
 *
 * Em escala logarítmica por necessidade: entre 1° e 150° o erro atravessa seis
 * ordens de grandeza, e em escala linear tudo abaixo de 1 % vira uma linha
 * colada no eixo.
 */
export function graficoErroPorAmplitude(store: Store, passos = 120): ModeloGrafico {
  const N = store.numero('N')
  const modo = modoDoStore(store)
  const maximo = alphaMaximo(modo)
  const passo = (maximo - 0.5) / passos

  const pontos: PontoSerie[] = []
  for (let i = 0; i <= passos; i++) {
    const graus = 0.5 + i * passo
    const alpha = g(graus)
    const exato = modo === 'cicloidal' ? 1 : razaoPeriodoExata(alpha)
    const aproximado = somatorioSerie(alpha, N, modo)
    pontos.push({ x: graus, y: Math.abs((aproximado - exato) / exato) })
  }

  const alphaAtual = store.numero('alpha')
  const exatoAtual = modo === 'cicloidal' ? 1 : razaoPeriodoExata(g(alphaAtual))
  const erroAtual = Math.abs((somatorioSerie(g(alphaAtual), N, modo) - exatoAtual) / exatoAtual)

  return {
    id: 'erro-por-amplitude',
    titulo: 'Erro da aproximação',
    descricao:
      'Toda truncagem subestima o período; o gráfico mostra o tamanho do desvio, não o sinal.',
    eixoX: { rotulo: 'Amplitude α', tipo: 'linear', unidade: '°' },
    eixoY: { rotulo: 'Erro relativo', tipo: 'logaritmica', unidade: null },
    series: [
      {
        id: 'erro-serie',
        rotulo: `Erro com N = ${N}`,
        cor: 'simples',
        forma: 'linha',
        traco: 'solido',
        pontos,
      },
      {
        id: 'limiar-1',
        rotulo: 'Limiar de 1 %',
        cor: 'confiancaLimitada',
        forma: 'linha',
        traco: 'tracejado',
        pontos: [
          { x: 0.5, y: 0.01 },
          { x: maximo, y: 0.01 },
        ],
      },
    ],
    marcadores: [{ rotulo: `α = ${alphaAtual.toFixed(1).replace('.', ',')}°`, x: alphaAtual, y: erroAtual }],
  }
}

// ── Convergência por número de termos ────────────────────────────────────────

/**
 * Como o erro cai ao acrescentar termos, na amplitude corrente.
 *
 * É o gráfico do Cenário 9: mostra que a 90° são precisos seis termos para
 * 0,1 %, e que o custo explode conforme a amplitude se aproxima de 180°.
 */
export function graficoConvergencia(store: Store, nMaximo = 20): ModeloGrafico {
  const modo = modoDoStore(store)
  const alpha = g(store.numero('alpha'))
  const exato = modo === 'cicloidal' ? 1 : razaoPeriodoExata(alpha)

  const pontos: PontoSerie[] = []
  for (let n = 0; n <= nMaximo; n++) {
    const erro = Math.abs((somatorioSerie(alpha, n, modo) - exato) / exato)
    pontos.push({ x: n, y: erro })
  }

  const N = store.numero('N')
  return {
    id: 'convergencia',
    titulo: 'Convergência da série',
    descricao: 'Quantos termos são necessários para a precisão desejada, na amplitude corrente.',
    eixoX: { rotulo: 'Número de termos N', tipo: 'linear', unidade: null },
    eixoY: { rotulo: 'Erro relativo', tipo: 'logaritmica', unidade: null },
    series: [
      {
        id: 'convergencia-erro',
        rotulo: 'Erro por número de termos',
        cor: 'simples',
        forma: 'pontos',
        traco: 'solido',
        pontos,
      },
    ],
    marcadores:
      N <= nMaximo
        ? [{ rotulo: `N = ${N}`, x: N, y: pontos[N]?.y ?? 0 }]
        : [],
  }
}

// ── Séries temporais ─────────────────────────────────────────────────────────

function parametrosDinamicos(store: Store, modo: ModoPendulo): ParametrosDinamica {
  const modelo = store.texto('modeloAtrito')
  return {
    L: metro(store.numero('L')),
    g: mPorS2(store.numero('g')),
    m: kg(store.numero('m')),
    modo,
    modeloAtrito: modelo === 'viscoso' || modelo === 'quadratico' ? modelo : 'nenhum',
    gamma: store.numero('zeta') * 2 * Math.sqrt(store.numero('g') / store.numero('L')),
    cq: store.numero('cq'),
    amplitudeForcamento: store.numero('amplitudeForcamento'),
    omegaForcamento: store.numero('omegaForcamento'),
    faseForcamento: store.numero('faseForcamento'),
  }
}

/** Ângulo, velocidade angular e aceleração ao longo do tempo (RF-078). */
export function graficoTemporal(
  store: Store,
  amostras: readonly Amostra[],
  modo: ModoPendulo,
): ModeloGrafico {
  const p = parametrosDinamicos(store, modo)
  const emGraus = (v: number): number => (v * 180) / Math.PI

  return {
    id: 'temporal',
    titulo: 'Movimento no tempo',
    descricao: 'Ângulo, velocidade angular e aceleração da massa.',
    eixoX: { rotulo: 'Tempo t', tipo: 'linear', unidade: 's' },
    eixoY: { rotulo: 'Grandeza', tipo: 'linear', unidade: null },
    series: [
      {
        id: 'theta',
        rotulo: 'θ (°)',
        cor: modo === 'cicloidal' ? 'cicloidal' : 'simples',
        forma: 'linha',
        traco: 'solido',
        pontos: amostras.map((a) => ({ x: a.t, y: emGraus(a.theta) })),
      },
      {
        id: 'omega',
        rotulo: 'ω (rad/s)',
        cor: 'energiaCinetica',
        forma: 'linha',
        traco: 'tracejado',
        pontos: amostras.map((a) => ({ x: a.t, y: a.qPonto })),
      },
      {
        id: 'aceleracao',
        rotulo: 'a (rad/s²)',
        cor: 'energiaPotencial',
        forma: 'linha',
        traco: 'pontilhado',
        pontos: amostras.map((a) => ({
          x: a.t,
          y: aceleracaoGeneralizada(a.q, a.qPonto, segundo(a.t), p),
        })),
      },
    ],
    marcadores: [],
  }
}

/** Parcelas de energia ao longo do tempo (RF-080). */
export function graficoEnergia(
  store: Store,
  amostras: readonly Amostra[],
  modo: ModoPendulo,
): ModeloGrafico {
  const m = kg(store.numero('m'))
  const L = metro(store.numero('L'))
  const gravidade = mPorS2(store.numero('g'))

  const parcelas = amostras.map((a) =>
    energias(m, L, gravidade, rad(a.theta), radPorS(a.qPonto), modo),
  )

  const serie = (id: string, rotulo: string, cor: string, traco: TracoSerie, pegar: (i: number) => number): SerieGrafico => ({
    id,
    rotulo,
    cor,
    forma: 'linha',
    traco,
    pontos: amostras.map((a, i) => ({ x: a.t, y: pegar(i) })),
  })

  return {
    id: 'energia',
    titulo: 'Energia mecânica',
    descricao: 'Sem dissipação, a soma permanece constante.',
    eixoX: { rotulo: 'Tempo t', tipo: 'linear', unidade: 's' },
    eixoY: { rotulo: 'Energia', tipo: 'linear', unidade: 'J' },
    series: [
      serie('cinetica', 'Cinética', 'energiaCinetica', 'solido', (i) => parcelas[i]!.cinetica),
      serie('potencial', 'Potencial', 'energiaPotencial', 'tracejado', (i) => parcelas[i]!.potencial),
      serie('total', 'Total', 'energiaTotal', 'pontilhado', (i) => parcelas[i]!.total),
    ],
    marcadores: [],
  }
}

/**
 * Retrato de fase `θ × ω` (RF-079).
 *
 * Curva paramétrica: o eixo x não é monotônico, e é justamente por isso que
 * um renderizador de séries temporais não serviria.
 */
export function graficoRetratoDeFase(
  amostras: readonly Amostra[],
  modo: ModoPendulo,
): ModeloGrafico {
  return {
    id: 'retrato-de-fase',
    titulo: 'Espaço de fase',
    descricao: 'Sem atrito a trajetória é fechada; com atrito, espirala até o repouso.',
    eixoX: { rotulo: 'Ângulo θ', tipo: 'linear', unidade: '°' },
    eixoY: { rotulo: 'Velocidade angular ω', tipo: 'linear', unidade: 'rad/s' },
    series: [
      {
        id: 'fase',
        rotulo: 'Trajetória',
        cor: modo === 'cicloidal' ? 'cicloidal' : 'simples',
        forma: 'linha',
        traco: 'solido',
        pontos: amostras.map((a) => ({ x: (a.theta * 180) / Math.PI, y: a.qPonto })),
      },
    ],
    marcadores:
      amostras.length > 0
        ? [
            {
              rotulo: 'agora',
              x: (amostras.at(-1)!.theta * 180) / Math.PI,
              y: amostras.at(-1)!.qPonto,
            },
          ]
        : [],
  }
}

/** Amplitude corrente em graus, para a leitura de decaimento sob atrito. */
export function amplitudeCorrenteEmGraus(
  amostras: readonly Amostra[],
  modo: ModoPendulo,
): number | null {
  const q = amplitudeCorrente(amostras)
  if (q === null) return null
  const theta = modo === 'cicloidal' ? Math.asin(Math.min(1, Math.max(-1, q))) : q
  return (theta * 180) / Math.PI
}

/** Todos os gráficos analíticos, que não dependem de amostras da simulação. */
export function graficosAnaliticos(store: Store): readonly ModeloGrafico[] {
  return [graficoPeriodoPorAmplitude(store), graficoErroPorAmplitude(store), graficoConvergencia(store)]
}

/** Período teórico corrente, para conferência cruzada com a leitura da tabela. */
export function periodoCorrente(store: Store): { serie: number; exato: number; T0: number } {
  const L = metro(store.numero('L'))
  const gravidade = mPorS2(store.numero('g'))
  const modo = modoDoStore(store)
  const alpha = g(store.numero('alpha'))
  return {
    serie: periodoSerie(L, gravidade, alpha, store.numero('N'), modo),
    exato: periodoExato(L, gravidade, alpha, modo),
    T0: periodoPequenaAmplitude(L, gravidade),
  }
}

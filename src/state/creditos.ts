/**
 * Catálogo de fontes e de afirmações numéricas rastreáveis (RF-125, RNF-021).
 *
 * A regra do RNF-021 é forte: **toda** afirmação numérica de referência que a
 * interface exibe precisa apontar para uma fonte citada dentro da própria
 * aplicação. Cumprir isso por disciplina não sobrevive à pressa, então aqui o
 * vínculo é estrutural — cada afirmação carrega o `id` de uma fonte, e
 * `afirmacoesSemFonte()` denuncia quem não carregar.
 *
 * As entradas bibliográficas das aproximações **não são digitadas de novo**:
 * saem de `MODELOS_APROXIMACAO`, onde o campo `fonte` já é obrigatório. Um
 * modelo novo aparece nos créditos sozinho, e um modelo sem procedência não
 * chega a compilar.
 */

import { MODELOS_APROXIMACAO } from '../physics/approximations.js'
import {
  ALPHA_MAX_CICLOIDAL_GRAUS,
  FIO_POR_RAIO_GERADOR,
  G_JUPITER,
  G_LUA,
  G_PLANETA_X,
  G_TERRA,
  LIMIAR_CONFIANCA_BOA_GRAUS,
  LIMIAR_CONFIANCA_EXCELENTE_GRAUS,
  LIMIAR_CONFIANCA_LIMITADA_GRAUS,
  SATURACAO_N2,
} from '../physics/constants.js'

export type CategoriaFonte = 'material' | 'simulacao' | 'bibliografia' | 'verificacao'

export interface Fonte {
  readonly id: string
  readonly categoria: CategoriaFonte
  /** Como a fonte é chamada na interface. */
  readonly titulo: string
  /** Referência completa, suficiente para alguém encontrar o original. */
  readonly detalhe: string
  readonly url?: string
}

/** Um número exibido pela interface, com a procedência que o RNF-021 exige. */
export interface AfirmacaoNumerica {
  readonly id: string
  readonly rotulo: string
  /** O número como a interface o mostra, já na notação do português. */
  readonly valor: string
  /** Quando verdadeiro, `valor` é LaTeX e a interface deve renderizá-lo. */
  readonly latex?: boolean
  /** `id` de uma entrada de `FONTES`. */
  readonly fonte: string
  /** Por que o número é esse, quando não for evidente pela fonte. */
  readonly nota?: string
}

const decimal = (valor: number, casas: number): string => valor.toFixed(casas).replace('.', ',')

const FONTES_BASE: readonly Fonte[] = [
  {
    id: 'formulas-usuario',
    categoria: 'material',
    titulo: 'Imagens de fórmula entregues pelo usuário',
    detalhe:
      'formula simples.jpeg, formula completa.jpeg e formula geral.jpeg — a origem da ' +
      'fórmula-motor e dos coeficientes 1/4 e 9/64 exibidos termo a termo.',
  },
  {
    id: 'roteiro-alemao',
    categoria: 'material',
    titulo: 'Zykloidenpendel — roteiro de experimento',
    detalhe:
      'mhd_zykloidenpendel.pdf: montagem, vínculo geométrico do fio e a tautocronia ' +
      'demonstrada em bancada. É o teste de aceite do modo cicloidal.',
  },
  {
    id: 'phet',
    categoria: 'simulacao',
    titulo: 'PhET Pendulum Lab',
    detalhe:
      'University of Colorado Boulder. Referência didática dos valores de gravidade dos ' +
      'presets planetários, inclusive o Planeta X do desafio.',
    url: 'https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html',
  },
  {
    id: 'geogebra',
    categoria: 'simulacao',
    titulo: 'Cycloidal Pendulum (GeoGebra)',
    detalhe: 'Applet de Rafael Losada Liste: evoluta, involuta e o traçado da cicloide.',
    url: 'https://www.geogebra.org/m/ymbbprbw',
  },
  {
    id: 'huygens',
    categoria: 'bibliografia',
    titulo: 'Huygens, C. — Horologium oscillatorium (1673)',
    detalhe:
      'A tautocronia da cicloide e as faces cicloidais do relógio de pêndulo. Origem do ' +
      'vínculo L = 4r usado no modo cicloidal.',
  },
  {
    id: 'verificacao-numerica',
    categoria: 'verificacao',
    titulo: 'Tabelas numéricas de referência do projeto',
    detalhe:
      'Tabelas A–E de research.md, calculadas por via independente e congeladas em ' +
      'tests/golden/. São a fonte de verdade dos testes, e não o contrário.',
  },
]

/** Bibliografia das aproximações, derivada dos próprios modelos. */
const FONTES_APROXIMACOES: readonly Fonte[] = MODELOS_APROXIMACAO.map((modelo) => ({
  id: `aproximacao:${modelo.id}`,
  categoria: 'bibliografia' as const,
  titulo: modelo.rotulo,
  detalhe: modelo.fonte,
}))

export const FONTES: readonly Fonte[] = [...FONTES_BASE, ...FONTES_APROXIMACOES]

export function buscarFonte(id: string): Fonte | undefined {
  return FONTES.find((fonte) => fonte.id === id)
}

const AFIRMACOES_BASE: readonly AfirmacaoNumerica[] = [
  {
    id: 'coeficiente-a1',
    rotulo: 'Coeficiente do termo n = 1',
    valor: '1/4',
    fonte: 'formulas-usuario',
    nota: 'a₁ = [C(2,1)/4]² = 1/4.',
  },
  {
    id: 'coeficiente-a2',
    rotulo: 'Coeficiente do termo n = 2',
    valor: '9/64',
    fonte: 'formulas-usuario',
    nota: 'a₂ = [C(4,2)/16]² = 9/64.',
  },
  {
    id: 'gravidade-lua',
    rotulo: 'Gravidade da Lua',
    valor: `${decimal(G_LUA, 2)} m/s²`,
    fonte: 'phet',
  },
  {
    id: 'gravidade-terra',
    rotulo: 'Gravidade da Terra',
    valor: `${decimal(G_TERRA, 2)} m/s²`,
    fonte: 'phet',
  },
  {
    id: 'gravidade-jupiter',
    rotulo: 'Gravidade de Júpiter',
    valor: `${decimal(G_JUPITER, 2)} m/s²`,
    fonte: 'phet',
  },
  {
    id: 'gravidade-planeta-x',
    rotulo: 'Gravidade do Planeta X',
    valor: `${decimal(G_PLANETA_X, 2)} m/s²`,
    fonte: 'phet',
    nota: 'Fica oculta enquanto o desafio está em curso.',
  },
  {
    id: 'limiar-excelente',
    rotulo: 'Amplitude em que N = 2 erra 0,1 %',
    valor: `${decimal(LIMIAR_CONFIANCA_EXCELENTE_GRAUS, 3)}°`,
    fonte: 'verificacao-numerica',
  },
  {
    id: 'limiar-boa',
    rotulo: 'Amplitude em que N = 2 erra 1 %',
    valor: `${decimal(LIMIAR_CONFIANCA_BOA_GRAUS, 3)}°`,
    fonte: 'verificacao-numerica',
  },
  {
    id: 'limiar-limitada',
    rotulo: 'Amplitude em que N = 2 erra 5 %',
    valor: `${decimal(LIMIAR_CONFIANCA_LIMITADA_GRAUS, 3)}°`,
    fonte: 'verificacao-numerica',
  },
  {
    id: 'saturacao-n2',
    rotulo: 'Saturação de T/T₀ com N = 2 quando α → 180°',
    valor: decimal(SATURACAO_N2, 6),
    fonte: 'formulas-usuario',
    nota: '1 + 1/4 + 9/64 = 89/64. O período real diverge; a série truncada, não.',
  },
  {
    id: 'fio-por-raio',
    rotulo: 'Vínculo do pêndulo cicloidal',
    valor: `L = ${String(FIO_POR_RAIO_GERADOR)}r`,
    fonte: 'huygens',
  },
  {
    id: 'amplitude-maxima-cicloidal',
    rotulo: 'Amplitude máxima do modo cicloidal',
    valor: `${decimal(ALPHA_MAX_CICLOIDAL_GRAUS, 0)}°`,
    fonte: 'huygens',
    nota: 'Consequência de s = L·sen θ com |s| ≤ L.',
  },
]

/** As três aproximações de forma fechada, cada uma sob a sua referência. */
const AFIRMACOES_APROXIMACOES: readonly AfirmacaoNumerica[] = MODELOS_APROXIMACAO.map((modelo) => ({
  id: `formula:${modelo.id}`,
  rotulo: `Aproximação ${modelo.rotulo}`,
  valor: modelo.latex,
  latex: true,
  fonte: `aproximacao:${modelo.id}`,
  nota: `${modelo.tendencia === 'superestima' ? 'Superestima' : 'Subestima'} o período exato.`,
}))

export const AFIRMACOES: readonly AfirmacaoNumerica[] = [
  ...AFIRMACOES_BASE,
  ...AFIRMACOES_APROXIMACOES,
]

/**
 * Afirmações cuja fonte não existe no catálogo — o portão do RNF-021.
 *
 * Lista vazia é a única saída aceitável, e é o que o teste unitário exige.
 */
export function afirmacoesSemFonte(): readonly AfirmacaoNumerica[] {
  return AFIRMACOES.filter((afirmacao) => buscarFonte(afirmacao.fonte) === undefined)
}

/** Fontes agrupadas por categoria, na ordem em que a interface as apresenta. */
export const ORDEM_CATEGORIAS: readonly CategoriaFonte[] = [
  'material',
  'simulacao',
  'bibliografia',
  'verificacao',
]

export const ROTULO_CATEGORIA: Readonly<Record<CategoriaFonte, string>> = {
  material: 'Materiais do usuário',
  simulacao: 'Simulações de referência',
  bibliografia: 'Referências físico-matemáticas',
  verificacao: 'Verificação numérica',
}

export function fontesDaCategoria(categoria: CategoriaFonte): readonly Fonte[] {
  return FONTES.filter((fonte) => fonte.categoria === categoria)
}

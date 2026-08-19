/**
 * Constantes do domínio.
 *
 * Princípio I e RNF-021: todo número aqui é rastreável a uma fonte citada.
 * Nada de literal solto espalhado pelo código (Princípio III).
 */

import { mPorS2, type MPorS2 } from './units.js'

export const DOIS_PI = 2 * Math.PI

// ── Gravidade ────────────────────────────────────────────────────────────────
// Valores dos presets planetários, alinhados com a simulação PhET Pendulum Lab,
// que é a referência didática adotada em research.md.
export const G_LUA: MPorS2 = mPorS2(1.62)
export const G_TERRA: MPorS2 = mPorS2(9.81)
export const G_JUPITER: MPorS2 = mPorS2(24.79)
/** Gravidade do desafio "Planeta X" (RF-104). Fica oculta do usuário durante o desafio. */
export const G_PLANETA_X: MPorS2 = mPorS2(14.2)

export const G_PADRAO: MPorS2 = G_TERRA

export const CORPOS_CELESTES = {
  lua: G_LUA,
  terra: G_TERRA,
  jupiter: G_JUPITER,
  planetaX: G_PLANETA_X,
} as const

export type CorpoCeleste = keyof typeof CORPOS_CELESTES

// ── Série do período ─────────────────────────────────────────────────────────
/** Termos da série por padrão: reproduz exatamente a fórmula entregue pelo usuário. */
export const N_PADRAO = 2
export const N_MAXIMO = 50

/**
 * Saturação da série truncada em N = 2 quando α → 180°: 1 + 1/4 + 9/64 = 89/64.
 * A série satura enquanto o período real diverge — conteúdo didático do RF-008.
 */
export const SATURACAO_N2 = 89 / 64

// ── Limiares de confiança da série N = 2 (research.md, Tabela A) ──────────────
/** Amplitude, em graus, em que o erro de N = 2 atinge 0,1 %. */
export const LIMIAR_CONFIANCA_EXCELENTE_GRAUS = 54.373
/** Amplitude, em graus, em que o erro de N = 2 atinge 1 %. */
export const LIMIAR_CONFIANCA_BOA_GRAUS = 81.603
/** Amplitude, em graus, em que o erro de N = 2 atinge 5 %. */
export const LIMIAR_CONFIANCA_LIMITADA_GRAUS = 110.164

// ── Faixas de amplitude ──────────────────────────────────────────────────────
export const ALPHA_MAX_GRAUS = 179.9
/** No modo cicloidal, s = L·sen θ com |s| ≤ L limita a amplitude a 90° (RF-025). */
export const ALPHA_MAX_CICLOIDAL_GRAUS = 90

// ── Integração numérica ──────────────────────────────────────────────────────
/** Passo fixo padrão: 1/600 s, dez sub-passos por quadro a 60 fps (AD-07). */
export const PASSO_PADRAO_S = 1 / 600
/** Teto anti-espiral do acumulador: evita a espiral da morte após uma aba suspensa. */
export const ACUMULADOR_MAX_S = 0.25

// ── Tolerâncias ──────────────────────────────────────────────────────────────
/** Funções de forma fechada: série, AGM, período analítico. */
export const TOL_FECHADA = 1e-12
/** Resultados de integração numérica. */
export const TOL_NUMERICA = 1e-6
/** Critério de parada do AGM, com teto de iterações (constituição, Princípio I, regra 5). */
export const TOL_AGM = 1e-17
export const AGM_MAX_ITERACOES = 60

// ── Cicloide ─────────────────────────────────────────────────────────────────
/** Vínculo geométrico do pêndulo cicloidal: o fio mede quatro raios geradores. */
export const FIO_POR_RAIO_GERADOR = 4

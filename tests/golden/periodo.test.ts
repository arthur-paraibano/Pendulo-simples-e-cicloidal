/**
 * Confronto do motor contra as tabelas-ouro.
 *
 * As tabelas foram geradas por `scripts/gerar-tabelas.mjs`, que reimplementa a
 * matemática por caminho diferente (binomiais em BigInt, quadratura da integral
 * elíptica), e foram conferidas em Python antes de virarem teste. Se este
 * arquivo falhar, ou o motor regrediu, ou a tabela foi editada à mão.
 *
 * Tolerância: 1×10⁻¹² relativo para toda função de forma fechada
 * (constituição, Princípio I).
 */

import { describe, expect, it } from 'vitest'
import tabela from './periodo.snap.json' with { type: 'json' }
import {
  coeficienteSerie,
  coeficienteSerieFracao,
  saturacaoSerie,
  somatorioSerie,
} from '../../src/physics/series.js'
import { razaoPeriodoExata } from '../../src/physics/elliptic.js'
import { periodoExato, periodoPequenaAmplitude, periodoSerie } from '../../src/physics/period.js'
import {
  periodoDuasIteracoes,
  periodoKiddFogg,
  periodoLimaArun,
} from '../../src/physics/approximations.js'
import {
  alturaParaAngulo,
  raioGerador,
  trajetoriaMassa,
} from '../../src/physics/cycloid.js'
import { deg, grausParaRad, metro, mPorS2 } from '../../src/physics/units.js'

const TOL = 1e-12
const g = (graus: number) => grausParaRad(deg(graus))
const L = metro(tabela.base.L)
const gravidade = mPorS2(tabela.base.g)

/**
 * Compara por erro relativo, com **piso absoluto**.
 *
 * O piso não é frouxidão: quantidades obtidas por diferença de valores quase
 * iguais — o erro da série em α = 1°, que vale ~1e-12 — sofrem cancelamento
 * catastrófico. Exigir 1e-9 *relativo* de um número que já é 1e-12 seria
 * comparar ruído de arredondamento, e o teste falharia sem que nada estivesse
 * errado.
 */
function pertoRelativo(obtido: number, esperado: number, tol = TOL, piso = 0): void {
  const desvio = Math.abs(obtido - esperado)
  if (desvio <= piso) return
  const erro = esperado === 0 ? desvio : desvio / Math.abs(esperado)
  expect(erro, `obtido ${obtido}, esperado ${esperado}, erro relativo ${erro}`).toBeLessThan(tol)
}

describe('tabela-ouro: integridade', () => {
  it('foi gerada por dois caminhos independentes que concordaram', () => {
    expect(tabela.maiorDivergenciaEntreCaminhos).toBeLessThan(1e-10)
  })

  it('cobre a faixa de amplitudes prevista', () => {
    expect(tabela.linhas.length).toBeGreaterThanOrEqual(16)
    expect(tabela.linhas[0]?.alphaGraus).toBe(1)
    expect(tabela.linhas.at(-1)?.alphaGraus).toBe(179)
  })

  it('registra T₀ = 2,006067 s para L = 1 m na Terra', () => {
    pertoRelativo(periodoPequenaAmplitude(L, gravidade), tabela.base.T0)
  })
})

describe('tabela-ouro: coeficientes da série', () => {
  it.each(tabela.coeficientes)('a_$n = $fracao', ({ n, fracao, valor }) => {
    pertoRelativo(coeficienteSerie(n), valor)
    expect(coeficienteSerieFracao(n)).toBe(fracao)
  })

  it('a saturação de N = 2 confere', () => {
    pertoRelativo(saturacaoSerie(2), tabela.saturacao.N2)
    expect(tabela.saturacao.fracao).toBe('89/64')
  })
})

describe('tabela-ouro: série e período exato', () => {
  it.each(tabela.linhas)('α = $alphaGraus°', (linha) => {
    const alpha = g(linha.alphaGraus)

    pertoRelativo(somatorioSerie(alpha, 0, 'simples'), linha.serie.N0)
    pertoRelativo(somatorioSerie(alpha, 1, 'simples'), linha.serie.N1)
    pertoRelativo(somatorioSerie(alpha, 2, 'simples'), linha.serie.N2)
    pertoRelativo(somatorioSerie(alpha, 3, 'simples'), linha.serie.N3)
    pertoRelativo(somatorioSerie(alpha, 5, 'simples'), linha.serie.N5)
    pertoRelativo(somatorioSerie(alpha, 10, 'simples'), linha.serie.N10)

    pertoRelativo(razaoPeriodoExata(alpha), linha.exato)
    pertoRelativo(periodoSerie(L, gravidade, alpha, 2, 'simples'), linha.periodoSerieN2)
    pertoRelativo(periodoExato(L, gravidade, alpha, 'simples'), linha.periodoExato)
  })

  it.each(tabela.linhas)('α = $alphaGraus°: erro de N = 2 e sinal', (linha) => {
    const alpha = g(linha.alphaGraus)
    const T = periodoSerie(L, gravidade, alpha, 2, 'simples')
    const Te = periodoExato(L, gravidade, alpha, 'simples')
    // Piso de 1e-15: em amplitudes pequenas o próprio erro já é da ordem de 1e-12.
    pertoRelativo((T - Te) / Te, linha.erroRelativoN2, 1e-9, 1e-15)
    // Toda truncagem subestima o período.
    expect(linha.erroRelativoN2).toBeLessThanOrEqual(0)
  })

  it.each(tabela.linhas)('α = $alphaGraus°: no modo cicloidal o período não muda', (linha) => {
    const alpha = g(Math.min(linha.alphaGraus, 90))
    pertoRelativo(periodoSerie(L, gravidade, alpha, 2, 'cicloidal'), tabela.base.T0)
    pertoRelativo(periodoExato(L, gravidade, alpha, 'cicloidal'), tabela.base.T0)
  })
})

describe('tabela-ouro: aproximações de forma fechada', () => {
  it.each(tabela.aproximacoes)('α = $alphaGraus°', (ap) => {
    const alpha = g(ap.alphaGraus)
    const T0 = tabela.base.T0
    pertoRelativo(periodoKiddFogg(L, gravidade, alpha) / T0, ap.kiddFogg)
    pertoRelativo(periodoLimaArun(L, gravidade, alpha) / T0, ap.limaArun)
    pertoRelativo(periodoDuasIteracoes(L, gravidade, alpha) / T0, ap.duasIteracoes)
  })
})

describe('tabela-ouro: geometria cicloidal', () => {
  const r = raioGerador(L)

  it.each(tabela.cicloide)('θ = $thetaGraus°', (ponto) => {
    const theta = g(ponto.thetaGraus)
    const e = trajetoriaMassa(r, theta)

    pertoRelativo(e.posicao.x, ponto.x)
    pertoRelativo(e.posicao.y, ponto.y)
    pertoRelativo(e.s, ponto.arcoFormaFechada)
    pertoRelativo(e.comprimentoLivre, ponto.comprimentoLivre)
    pertoRelativo(alturaParaAngulo(L, theta), ponto.alturaDeLargada)

    // O arco por quadratura é numérico: tolerância própria, mais frouxa.
    pertoRelativo(e.s, ponto.arcoPorQuadratura, 1e-8)

    // Invariante pitagórico.
    pertoRelativo(e.s ** 2 + e.comprimentoLivre ** 2, tabela.base.L ** 2)
  })
})

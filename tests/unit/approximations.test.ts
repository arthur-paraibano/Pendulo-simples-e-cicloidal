import { describe, expect, it } from 'vitest'
import {
  MODELOS_APROXIMACAO,
  periodoDuasIteracoes,
  periodoKiddFogg,
  periodoLimaArun,
} from '../../src/physics/approximations.js'
import { periodoExato, periodoPequenaAmplitude, periodoSerie } from '../../src/physics/period.js'
import { G_TERRA } from '../../src/physics/constants.js'
import { ErroDeDominio, deg, grausParaRad, metro } from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))
const L1 = metro(1)
const gT = G_TERRA

const erroPct = (obtido: number, graus: number): number => {
  const exato = periodoExato(L1, gT, g(graus), 'simples')
  return ((obtido - exato) / exato) * 100
}

describe('periodoKiddFogg', () => {
  it('reproduz os erros tabelados', () => {
    expect(erroPct(periodoKiddFogg(L1, gT, g(45)), 45)).toBeCloseTo(0.0392, 3)
    expect(erroPct(periodoKiddFogg(L1, gT, g(90)), 90)).toBeCloseTo(0.7512, 3)
    expect(erroPct(periodoKiddFogg(L1, gT, g(150)), 150)).toBeCloseTo(11.5439, 3)
  })

  it('superestima o período em toda a faixa', () => {
    for (const graus of [10, 45, 90, 150])
      expect(erroPct(periodoKiddFogg(L1, gT, g(graus)), graus)).toBeGreaterThan(0)
  })
})

describe('periodoLimaArun', () => {
  it('reproduz os erros tabelados', () => {
    expect(erroPct(periodoLimaArun(L1, gT, g(45)), 45)).toBeCloseTo(0.0131, 3)
    expect(erroPct(periodoLimaArun(L1, gT, g(90)), 90)).toBeCloseTo(0.2487, 3)
    expect(erroPct(periodoLimaArun(L1, gT, g(150)), 150)).toBeCloseTo(3.4847, 3)
  })

  it('é cerca de três vezes melhor que Kidd–Fogg', () => {
    for (const graus of [45, 90, 150]) {
      const lima = Math.abs(erroPct(periodoLimaArun(L1, gT, g(graus)), graus))
      const kidd = Math.abs(erroPct(periodoKiddFogg(L1, gT, g(graus)), graus))
      expect(lima).toBeLessThan(kidd)
    }
  })

  it('tende a T₀ em α = 0, onde a forma 0/0 exige tratamento explícito', () => {
    expect(periodoLimaArun(L1, gT, g(0))).toBeCloseTo(periodoPequenaAmplitude(L1, gT), 12)
  })
})

describe('periodoDuasIteracoes', () => {
  it('reproduz os erros tabelados, muito menores que os demais', () => {
    expect(erroPct(periodoDuasIteracoes(L1, gT, g(45)), 45)).toBeCloseTo(0, 4)
    expect(erroPct(periodoDuasIteracoes(L1, gT, g(90)), 90)).toBeCloseTo(-0.00139, 4)
    expect(erroPct(periodoDuasIteracoes(L1, gT, g(150)), 150)).toBeCloseTo(-0.282, 3)
  })

  it('subestima ligeiramente', () => {
    for (const graus of [60, 90, 120, 150])
      expect(erroPct(periodoDuasIteracoes(L1, gT, g(graus)), graus)).toBeLessThan(0)
  })

  it('bate a série truncada em N = 2 por ordens de grandeza em 90°', () => {
    const duasIt = Math.abs(erroPct(periodoDuasIteracoes(L1, gT, g(90)), 90))
    const serie = Math.abs(erroPct(periodoSerie(L1, gT, g(90), 2, 'simples'), 90))
    expect(duasIt * 100).toBeLessThan(serie)
  })
})

describe('domínio das aproximações', () => {
  it('todas rejeitam α ≥ 180°, onde divergem', () => {
    for (const f of [periodoKiddFogg, periodoLimaArun, periodoDuasIteracoes]) {
      expect(() => f(L1, gT, g(180))).toThrow(ErroDeDominio)
      expect(() => f(L1, gT, g(200))).toThrow(ErroDeDominio)
    }
  })

  it('todas concordam com o exato dentro de 0,01 % em pequenas amplitudes', () => {
    for (const f of [periodoKiddFogg, periodoLimaArun, periodoDuasIteracoes]) {
      expect(Math.abs(erroPct(f(L1, gT, g(10)), 10))).toBeLessThan(0.01)
    }
  })
})

describe('MODELOS_APROXIMACAO — o registro que exige procedência', () => {
  it('nenhum modelo existe sem fonte bibliográfica (RF-011)', () => {
    expect(MODELOS_APROXIMACAO.length).toBeGreaterThan(0)
    for (const m of MODELOS_APROXIMACAO) {
      expect(m.fonte.trim().length).toBeGreaterThan(20)
      expect(m.fonte).toMatch(/\d{4}/) // o ano da publicação
      expect(m.latex.trim().length).toBeGreaterThan(0)
      expect(m.rotulo.trim().length).toBeGreaterThan(0)
    }
  })

  it('não inclui aproximação de Padé, banida por falta de fonte confirmável', () => {
    for (const m of MODELOS_APROXIMACAO) {
      expect(m.id.toLowerCase()).not.toContain('pade')
      expect(m.rotulo.toLowerCase()).not.toContain('padé')
    }
  })

  it('usa identificadores únicos', () => {
    const ids = MODELOS_APROXIMACAO.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('a tendência declarada corresponde ao comportamento medido', () => {
    for (const m of MODELOS_APROXIMACAO) {
      const erro = erroPct(m.calcular(L1, gT, g(120)), 120)
      if (m.tendencia === 'superestima') expect(erro).toBeGreaterThan(0)
      else expect(erro).toBeLessThan(0)
    }
  })
})

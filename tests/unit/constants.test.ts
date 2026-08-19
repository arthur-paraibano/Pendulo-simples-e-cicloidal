import { describe, expect, it } from 'vitest'
import {
  ACUMULADOR_MAX_S,
  AGM_MAX_ITERACOES,
  ALPHA_MAX_CICLOIDAL_GRAUS,
  ALPHA_MAX_GRAUS,
  CORPOS_CELESTES,
  DOIS_PI,
  FIO_POR_RAIO_GERADOR,
  G_JUPITER,
  G_LUA,
  G_PADRAO,
  G_PLANETA_X,
  G_TERRA,
  LIMIAR_CONFIANCA_BOA_GRAUS,
  LIMIAR_CONFIANCA_EXCELENTE_GRAUS,
  LIMIAR_CONFIANCA_LIMITADA_GRAUS,
  N_MAXIMO,
  N_PADRAO,
  PASSO_PADRAO_S,
  SATURACAO_N2,
  TOL_AGM,
  TOL_FECHADA,
  TOL_NUMERICA,
} from '../../src/physics/constants.js'

describe('gravidades planetárias', () => {
  it('reproduz os valores dos presets da referência PhET', () => {
    expect(G_LUA).toBe(1.62)
    expect(G_TERRA).toBe(9.81)
    expect(G_JUPITER).toBe(24.79)
    expect(G_PLANETA_X).toBe(14.2)
  })

  it('adota a Terra como padrão', () => {
    expect(G_PADRAO).toBe(G_TERRA)
  })

  it('expõe o mapa de corpos celestes completo e positivo', () => {
    expect(Object.keys(CORPOS_CELESTES)).toEqual(['lua', 'terra', 'jupiter', 'planetaX'])
    for (const g of Object.values(CORPOS_CELESTES)) {
      expect(g).toBeGreaterThan(0)
      expect(Number.isFinite(g)).toBe(true)
    }
  })
})

describe('parâmetros da série', () => {
  it('mantém N = 2 como padrão, fiel à fórmula entregue pelo usuário', () => {
    expect(N_PADRAO).toBe(2)
  })

  it('permite estender a série até 50 termos', () => {
    expect(N_MAXIMO).toBe(50)
    expect(N_MAXIMO).toBeGreaterThan(N_PADRAO)
  })

  it('registra a saturação de N = 2 em 89/64 quando α → 180°', () => {
    // RF-008: a série truncada satura enquanto o período real diverge.
    expect(SATURACAO_N2).toBe(89 / 64)
    expect(SATURACAO_N2).toBeCloseTo(1.390625, 15)
    // Confere a soma dos coeficientes: 1 + 1/4 + 9/64.
    expect(SATURACAO_N2).toBeCloseTo(1 + 1 / 4 + 9 / 64, 15)
  })
})

describe('limiares de confiança da série N = 2', () => {
  it('usa as amplitudes calculadas em research.md', () => {
    expect(LIMIAR_CONFIANCA_EXCELENTE_GRAUS).toBeCloseTo(54.373, 3)
    expect(LIMIAR_CONFIANCA_BOA_GRAUS).toBeCloseTo(81.603, 3)
    expect(LIMIAR_CONFIANCA_LIMITADA_GRAUS).toBeCloseTo(110.164, 3)
  })

  it('mantém os limiares em ordem crescente', () => {
    expect(LIMIAR_CONFIANCA_EXCELENTE_GRAUS).toBeLessThan(LIMIAR_CONFIANCA_BOA_GRAUS)
    expect(LIMIAR_CONFIANCA_BOA_GRAUS).toBeLessThan(LIMIAR_CONFIANCA_LIMITADA_GRAUS)
    expect(LIMIAR_CONFIANCA_LIMITADA_GRAUS).toBeLessThan(ALPHA_MAX_GRAUS)
  })
})

describe('faixas de amplitude', () => {
  it('limita o pêndulo simples a 179,9°, afastando a divergência em 180°', () => {
    expect(ALPHA_MAX_GRAUS).toBe(179.9)
    expect(ALPHA_MAX_GRAUS).toBeLessThan(180)
  })

  it('limita o modo cicloidal a 90° por restrição geométrica', () => {
    // s = L·sen θ com |s| ≤ L ⇒ θ ≤ 90° (RF-025).
    expect(ALPHA_MAX_CICLOIDAL_GRAUS).toBe(90)
    expect(ALPHA_MAX_CICLOIDAL_GRAUS).toBeLessThan(ALPHA_MAX_GRAUS)
  })
})

describe('integração numérica', () => {
  it('adota passo fixo de 1/600 s', () => {
    expect(PASSO_PADRAO_S).toBeCloseTo(1 / 600, 15)
    // Dez sub-passos por quadro a 60 fps.
    expect(PASSO_PADRAO_S * 10).toBeCloseTo(1 / 60, 15)
  })

  it('mantém teto anti-espiral do acumulador', () => {
    expect(ACUMULADOR_MAX_S).toBe(0.25)
    expect(ACUMULADOR_MAX_S).toBeGreaterThan(PASSO_PADRAO_S)
  })
})

describe('tolerâncias', () => {
  it('exige mais das funções de forma fechada que da integração numérica', () => {
    expect(TOL_FECHADA).toBe(1e-12)
    expect(TOL_NUMERICA).toBe(1e-6)
    expect(TOL_FECHADA).toBeLessThan(TOL_NUMERICA)
  })

  it('define parada do AGM por tolerância e por teto de iterações', () => {
    // Constituição, Princípio I, regra 5: nunca parar por igualdade estrita.
    expect(TOL_AGM).toBe(1e-17)
    expect(AGM_MAX_ITERACOES).toBe(60)
    expect(AGM_MAX_ITERACOES).toBeGreaterThan(0)
  })
})

describe('geometria', () => {
  it('fixa o vínculo L = 4r do pêndulo cicloidal', () => {
    expect(FIO_POR_RAIO_GERADOR).toBe(4)
  })

  it('expõe 2π coerente', () => {
    expect(DOIS_PI).toBeCloseTo(2 * Math.PI, 15)
  })
})

describe('coerência com o período de referência', () => {
  it('produz T₀ = 2,006067 s para L = 1 m na Terra', () => {
    // Valor de referência que atravessa todo o spec kit.
    const T0 = DOIS_PI * Math.sqrt(1 / G_TERRA)
    expect(T0).toBeCloseTo(2.006067, 6)
  })
})

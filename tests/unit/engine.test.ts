import { describe, expect, it } from 'vitest'
import { BufferCircular, MotorPendulo } from '../../src/physics/engine.js'
import { dinamicaIdeal, type ParametrosDinamica } from '../../src/physics/ode.js'
import { periodoExato, periodoPequenaAmplitude } from '../../src/physics/period.js'
import { inferirGravidade, inferirGravidadeIngenua } from '../../src/physics/inference.js'
import { amplitudeCorrente } from '../../src/physics/analysis.js'
import { G_TERRA, PASSO_PADRAO_S } from '../../src/physics/constants.js'
import { ErroDeDominio, deg, grausParaRad, kg, metro, segundo } from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))
const L1 = metro(1)
const m1 = kg(1)
const gT = G_TERRA

const ideal = (modo: 'simples' | 'cicloidal'): ParametrosDinamica =>
  dinamicaIdeal(L1, gT, m1, modo)

/** Roda até acumular `n` períodos completos e devolve o período medido. */
function medirPeriodo(
  modo: 'simples' | 'cicloidal',
  alphaGraus: number,
  h = PASSO_PADRAO_S,
): number {
  const motor = new MotorPendulo(ideal(modo), g(alphaGraus), { h })
  // Três períodos bastam: o primeiro pode ser parcial.
  const alvo = 4 * periodoExato(L1, gT, g(alphaGraus), modo)
  motor.avancarPassos(Math.ceil(alvo / h))
  const T = motor.sensor.periodo('periodoCompleto')
  expect(T).not.toBeNull()
  return T!
}

describe('BufferCircular', () => {
  it('acumula até a capacidade', () => {
    const b = new BufferCircular<number>(3)
    b.push(1)
    b.push(2)
    expect(b.comprimento).toBe(2)
    expect(b.paraArray()).toEqual([1, 2])
    expect(b.ultimo()).toBe(2)
  })

  it('descarta o mais antigo ao encher — memória constante', () => {
    const b = new BufferCircular<number>(3)
    for (const v of [1, 2, 3, 4, 5]) b.push(v)
    expect(b.comprimento).toBe(3)
    expect(b.paraArray()).toEqual([3, 4, 5])
    expect(b.ultimo()).toBe(5)
  })

  it('não cresce indefinidamente nem com muitas inserções', () => {
    const b = new BufferCircular<number>(10)
    for (let i = 0; i < 100_000; i++) b.push(i)
    expect(b.comprimento).toBe(10)
    expect(b.paraArray()[0]).toBe(99_990)
  })

  it('limpar zera o conteúdo', () => {
    const b = new BufferCircular<number>(3)
    b.push(1)
    b.limpar()
    expect(b.comprimento).toBe(0)
    expect(b.ultimo()).toBeUndefined()
    expect(b.paraArray()).toEqual([])
  })

  it('rejeita capacidade inválida', () => {
    expect(() => new BufferCircular<number>(0)).toThrow(ErroDeDominio)
    expect(() => new BufferCircular<number>(2.5)).toThrow(ErroDeDominio)
  })
})

describe('MotorPendulo: estado inicial', () => {
  it('começa em repouso na amplitude pedida', () => {
    const motor = new MotorPendulo(ideal('simples'), g(30))
    expect(motor.tempo).toBe(0)
    expect(motor.theta).toBeCloseTo(g(30), 12)
    expect(motor.atual.qPonto).toBe(0)
  })

  it('no cicloidal guarda q = sen θ mas devolve θ', () => {
    const motor = new MotorPendulo(ideal('cicloidal'), g(30))
    expect(motor.atual.q).toBeCloseTo(0.5, 12)
    expect(motor.theta).toBeCloseTo(g(30), 12)
  })

  it('reconhece que o pêndulo ideal é conservativo', () => {
    expect(new MotorPendulo(ideal('simples'), g(10)).conservativo).toBe(true)
    const comAtrito: ParametrosDinamica = {
      ...ideal('simples'),
      modeloAtrito: 'viscoso',
      gamma: 0.1,
    }
    expect(new MotorPendulo(comAtrito, g(10)).conservativo).toBe(false)
  })
})

describe('MotorPendulo: determinismo e passo fixo', () => {
  it('duas execuções idênticas produzem exatamente o mesmo estado', () => {
    const a = new MotorPendulo(ideal('simples'), g(45))
    const b = new MotorPendulo(ideal('simples'), g(45))
    a.avancarPassos(5000)
    b.avancarPassos(5000)
    expect(a.atual).toEqual(b.atual)
  })

  it('avança apenas por múltiplos inteiros do passo, guardando o resíduo', () => {
    const motor = new MotorPendulo(ideal('simples'), g(10), { h: 0.01 })
    motor.avancar(0.025)
    expect(motor.tempo).toBeCloseTo(0.02, 12)
    expect(motor.residuo).toBeCloseTo(0.005, 12)
    motor.avancar(0.025)
    expect(motor.tempo).toBeCloseTo(0.05, 12)
  })

  it('o teto anti-espiral limita um salto grande de tempo real', () => {
    const motor = new MotorPendulo(ideal('simples'), g(10), { h: 0.01 })
    // Simula uma aba suspensa por dez segundos.
    motor.avancar(10)
    expect(motor.tempo).toBeLessThanOrEqual(0.25 + 1e-12)
  })

  it('a câmera lenta escala o tempo simulado, não a taxa de quadros', () => {
    const normal = new MotorPendulo(ideal('simples'), g(10), { h: 0.001 })
    const lento = new MotorPendulo(ideal('simples'), g(10), { h: 0.001 })
    normal.avancar(0.1, 1)
    lento.avancar(0.1, 0.5)
    expect(lento.tempo).toBeCloseTo(normal.tempo / 2, 9)
  })

  it('rejeita entradas inválidas de avanço', () => {
    const motor = new MotorPendulo(ideal('simples'), g(10))
    expect(() => motor.avancarPassos(-1)).toThrow(ErroDeDominio)
    expect(() => motor.avancarPassos(1.5)).toThrow(ErroDeDominio)
    expect(() => motor.avancar(-1)).toThrow(ErroDeDominio)
    expect(() => motor.avancar(Number.NaN)).toThrow(ErroDeDominio)
  })
})

describe('MotorPendulo: buffer de amostras', () => {
  it('registra amostras com memória limitada', () => {
    const motor = new MotorPendulo(ideal('simples'), g(20), { capacidadeBuffer: 50 })
    motor.avancarPassos(500)
    expect(motor.amostras).toHaveLength(50)
    expect(motor.amostras.at(-1)?.t).toBeCloseTo(motor.tempo, 12)
  })
})

describe('MotorPendulo: conservação de energia (portão da Fase 2)', () => {
  it('a deriva fica abaixo de 0,1 % em mil períodos, no modo cicloidal', () => {
    const motor = new MotorPendulo(ideal('cicloidal'), g(45))
    const T0 = periodoPequenaAmplitude(L1, gT)
    const passos = Math.round((1000 * T0) / motor.h)
    motor.avancarPassos(passos)
    expect(Math.abs(motor.derivaDeEnergia())).toBeLessThan(0.001)
  })

  it('a deriva fica abaixo de 0,1 % em mil períodos, no modo simples a 90°', () => {
    const motor = new MotorPendulo(ideal('simples'), g(90))
    const T = periodoExato(L1, gT, g(90), 'simples')
    const passos = Math.round((1000 * T) / motor.h)
    motor.avancarPassos(passos)
    expect(Math.abs(motor.derivaDeEnergia())).toBeLessThan(0.001)
  })

  it('com atrito a energia cai, como deve', () => {
    const comAtrito: ParametrosDinamica = {
      ...ideal('simples'),
      modeloAtrito: 'viscoso',
      gamma: 0.3,
    }
    const motor = new MotorPendulo(comAtrito, g(45))
    motor.avancarPassos(6000)
    expect(motor.derivaDeEnergia()).toBeLessThan(-0.1)
  })
})

describe('MotorPendulo + sensor: o período medido bate com o analítico', () => {
  it('α = 10° reproduz 2,009893 s dentro de 1×10⁻⁴ relativo', () => {
    const medido = medirPeriodo('simples', 10)
    const analitico = periodoExato(L1, gT, g(10), 'simples')
    expect(analitico).toBeCloseTo(2.009893, 6)
    expect(Math.abs(medido - analitico) / analitico).toBeLessThan(1e-4)
  })

  it.each([5, 20, 45, 60, 90])('α = %i° concorda com o analítico', (graus) => {
    const medido = medirPeriodo('simples', graus)
    const analitico = periodoExato(L1, gT, g(graus), 'simples')
    expect(Math.abs(medido - analitico) / analitico).toBeLessThan(1e-4)
  })

  it('a DIFERENÇA entre 10° e 20° é reproduzida com erro abaixo de 0,1 ms', () => {
    // É este efeito — os "alguns milissegundos" do roteiro alemão — que a
    // interpolação do instante de cruzamento existe para preservar.
    const medido10 = medirPeriodo('simples', 10)
    const medido20 = medirPeriodo('simples', 20)
    const analitico10 = periodoExato(L1, gT, g(10), 'simples')
    const analitico20 = periodoExato(L1, gT, g(20), 'simples')

    const diferencaMedida = medido20 - medido10
    const diferencaAnalitica = analitico20 - analitico10
    expect(diferencaAnalitica * 1000).toBeCloseTo(11.56, 1)
    expect(Math.abs(diferencaMedida - diferencaAnalitica)).toBeLessThan(1e-4)
  })

  it('o meio período medido é metade do período completo', () => {
    const motor = new MotorPendulo(ideal('simples'), g(10))
    motor.avancarPassos(Math.ceil((4 * 2.009893) / motor.h))
    const meio = motor.sensor.periodo('meioPeriodo')!
    const completo = motor.sensor.periodo('periodoCompleto')!
    expect(completo).toBeCloseTo(2 * meio, 6)
    // A grandeza do roteiro alemão, para L = 1 m: ~1,0049 s.
    expect(meio).toBeCloseTo(1.004946, 3)
  })
})

describe('MotorPendulo + sensor: a isocronia medida, não apenas calculada', () => {
  it('o período do cicloidal é o mesmo em 10°, 45° e 90°', () => {
    const medidos = [10, 45, 90].map((a) => medirPeriodo('cicloidal', a))
    const T0 = periodoPequenaAmplitude(L1, gT)
    for (const T of medidos) {
      expect(Math.abs(T - T0) / T0).toBeLessThan(1e-4)
    }
    // E são iguais entre si dentro da precisão numérica.
    expect(Math.abs(medidos[0]! - medidos[2]!) / medidos[0]!).toBeLessThan(1e-5)
  })

  it('no simples o período muda com a amplitude — o contraste', () => {
    const T10 = medirPeriodo('simples', 10)
    const T90 = medirPeriodo('simples', 90)
    expect(T90 / T10).toBeCloseTo(2.367842 / 2.009893, 3)
    expect(T90).toBeGreaterThan(T10 * 1.15)
  })
})

describe('do sensor à tabela: g inferido de uma medição simulada', () => {
  it('recupera 9,81 no cicloidal a 45°, e a ingênua também acerta', () => {
    const T = segundo(medirPeriodo('cicloidal', 45))
    expect(inferirGravidade(T, L1, g(45), 2, 'cicloidal')).toBeCloseTo(9.81, 3)
    expect(inferirGravidadeIngenua(T, L1)).toBeCloseTo(9.81, 3)
  })

  it('no simples a 45° a ingênua erra 7,5 % e a correta acerta', () => {
    const T = segundo(medirPeriodo('simples', 45))
    expect(inferirGravidade(T, L1, g(45), 2, 'simples')).toBeCloseTo(9.803478, 2)
    expect(inferirGravidadeIngenua(T, L1)).toBeCloseTo(9.070361, 2)
  })
})

describe('casos-limite do repouso', () => {
  it('largado em α = 0 fica parado, sem disparar o sensor', () => {
    // Caso-limite da spec: α = 0 não é erro, é ausência de oscilação.
    const motor = new MotorPendulo(ideal('simples'), g(0))
    motor.avancarPassos(5000)
    expect(motor.theta).toBeCloseTo(0, 12)
    expect(motor.sensor.passagens).toHaveLength(0)
    expect(motor.sensor.periodo('periodoCompleto')).toBeNull()
  })

  it('a deriva de energia é zero, e não NaN, quando a energia inicial é zero', () => {
    // Dividir por E₀ = 0 daria NaN e envenenaria o gráfico de energia.
    const motor = new MotorPendulo(ideal('simples'), g(0))
    motor.avancarPassos(1000)
    expect(motor.derivaDeEnergia()).toBe(0)
    expect(Number.isNaN(motor.derivaDeEnergia())).toBe(false)
  })
})

describe('amplitudeCorrente', () => {
  it('devolve null sem amostras', () => {
    expect(amplitudeCorrente([])).toBeNull()
  })

  it('atravessa amostras exatamente no zero sem se confundir', () => {
    // q = 0 não tem sinal: não pode contar como troca de sentido.
    expect(amplitudeCorrente([{ q: 0 }, { q: 0 }, { q: 0 }])).toBe(0)
    expect(amplitudeCorrente([{ q: 0.3 }, { q: 0 }, { q: 0.2 }])).toBeCloseTo(0.3, 12)
  })

  it('acompanha a amplitude do pêndulo sem atrito', () => {
    const motor = new MotorPendulo(ideal('cicloidal'), g(30), { capacidadeBuffer: 100_000 })
    motor.avancarPassos(3000)
    const amplitude = amplitudeCorrente(motor.amostras)!
    expect(amplitude).toBeCloseTo(Math.sin(g(30)), 2)
  })

  it('detecta o decaimento sob atrito', () => {
    const comAtrito: ParametrosDinamica = {
      ...ideal('cicloidal'),
      modeloAtrito: 'viscoso',
      gamma: 0.5,
    }
    const motor = new MotorPendulo(comAtrito, g(45), { capacidadeBuffer: 100_000 })
    motor.avancarPassos(1200)
    const inicial = amplitudeCorrente(motor.amostras)!
    motor.avancarPassos(6000)
    const depois = amplitudeCorrente(motor.amostras)!
    expect(depois).toBeLessThan(inicial)
  })
})

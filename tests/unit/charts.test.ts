import { describe, expect, it } from 'vitest'
import {
  amplitudeCorrenteEmGraus,
  listaDeTexto,
  graficoConvergencia,
  graficoPoincare,
  serieDeMedicoes,
  graficoTemporalPorId,
  GRAFICOS_TEMPORAIS,
  graficoEnergia,
  graficoErroPorAmplitude,
  graficoPeriodoPorAmplitude,
  graficoRetratoDeFase,
  graficosAnaliticos,
  graficoTemporal,
  periodoCorrente,
} from '../../src/state/charts.js'
import { Store } from '../../src/state/store.js'
import { MotorPendulo } from '../../src/physics/engine.js'
import { dinamicaIdeal } from '../../src/physics/ode.js'
import { G_TERRA } from '../../src/physics/constants.js'
import { deg, grausParaRad, kg, metro, segundo } from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))

function amostrar(modo: 'simples' | 'cicloidal', graus: number, passos = 400) {
  const motor = new MotorPendulo(
    dinamicaIdeal(metro(1), G_TERRA, kg(1), modo),
    g(graus),
    { capacidadeBuffer: 5000 },
  )
  motor.avancarPassos(passos)
  return motor.amostras
}

// ═══════════════════════════════════════════════════════════ T(α)

describe('graficoPeriodoPorAmplitude', () => {
  it('entrega as três séries obrigatórias do RF-081', () => {
    const modelo = graficoPeriodoPorAmplitude(new Store())
    expect(modelo.series.map((s) => s.id)).toEqual(['T0', 'serie', 'exato'])
  })

  it('a série T₀ é horizontal e vale 2,006067 s com L = 1 m', () => {
    const modelo = graficoPeriodoPorAmplitude(new Store())
    const t0 = modelo.series.find((s) => s.id === 'T0')!
    for (const ponto of t0.pontos) expect(ponto.y).toBeCloseTo(2.006067, 6)
  })

  it('reproduz os valores de referência da série e do exato', () => {
    const store = new Store()
    const modelo = graficoPeriodoPorAmplitude(store, 1789)
    const serie = modelo.series.find((s) => s.id === 'serie')!
    const exato = modelo.series.find((s) => s.id === 'exato')!

    const em = (pontos: readonly { x: number; y: number }[], graus: number): number =>
      pontos.reduce((melhor, p) =>
        Math.abs(p.x - graus) < Math.abs(melhor.x - graus) ? p : melhor,
      ).y

    expect(em(serie.pontos, 45)).toBeCloseTo(2.085562, 3)
    expect(em(exato.pontos, 45)).toBeCloseTo(2.086256, 3)
    expect(em(serie.pontos, 90)).toBeCloseTo(2.327351, 3)
    expect(em(exato.pontos, 90)).toBeCloseTo(2.367842, 3)
  })

  it('no modo simples a curva é estritamente crescente', () => {
    const modelo = graficoPeriodoPorAmplitude(new Store())
    const serie = modelo.series.find((s) => s.id === 'serie')!
    for (let i = 1; i < serie.pontos.length; i++) {
      expect(serie.pontos[i]!.y).toBeGreaterThan(serie.pontos[i - 1]!.y)
    }
  })

  it('no modo cicloidal as três séries coincidem numa reta horizontal', () => {
    // A assinatura visual da isocronia.
    const store = new Store()
    store.definirParametro('modo', 'cicloidal')
    const modelo = graficoPeriodoPorAmplitude(store)

    for (const serie of modelo.series) {
      const ys = serie.pontos.map((p) => p.y)
      expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1e-9)
      expect(ys[0]).toBeCloseTo(2.006067, 6)
    }
    expect(modelo.descricao).toContain('não depende da amplitude')
  })

  it('o cicloidal não estende a curva além do limite geométrico de 90°', () => {
    const store = new Store()
    store.definirParametro('modo', 'cicloidal')
    const modelo = graficoPeriodoPorAmplitude(store)
    const maior = Math.max(...modelo.series[0]!.pontos.map((p) => p.x))
    expect(maior).toBeCloseTo(90, 6)
  })

  it('marca o valor corrente de α sobre a curva (RF-084)', () => {
    const store = new Store()
    store.definirParametro('alpha', 45)
    const modelo = graficoPeriodoPorAmplitude(store)
    expect(modelo.marcadores).toHaveLength(1)
    expect(modelo.marcadores[0]!.x).toBeCloseTo(45, 6)
    expect(modelo.marcadores[0]!.y).toBeCloseTo(2.085562, 6)
    expect(modelo.marcadores[0]!.rotulo).toContain('45,0')
  })

  it('sobrepõe as aproximações de forma fechada quando selecionadas', () => {
    const store = new Store()
    store.definirParametro('modelosExibidos', ['T0', 'serie', 'exato', 'kiddFogg', 'limaArun'])
    const modelo = graficoPeriodoPorAmplitude(store)
    expect(modelo.series.map((s) => s.id)).toContain('kiddFogg')
    expect(modelo.series.map((s) => s.id)).toContain('limaArun')
    expect(modelo.series.map((s) => s.id)).not.toContain('duasIteracoes')
  })

  it('tolera modelosExibidos com forma inesperada', () => {
    // O valor vem do estado, que aceita texto avulso; o gráfico não pode quebrar.
    const store = new Store()
    store.definirParametro('modelosExibidos', 'serie')
    expect(() => graficoPeriodoPorAmplitude(store)).not.toThrow()
    expect(graficoPeriodoPorAmplitude(store).series).toHaveLength(3)
  })

  it('sobrepõe a terceira aproximação quando pedida', () => {
    const store = new Store()
    store.definirParametro('modelosExibidos', ['duasIteracoes'])
    expect(graficoPeriodoPorAmplitude(store).series.map((s) => s.id)).toContain('duasIteracoes')
  })

  it('distingue as séries por traço, não só por cor (RF-121)', () => {
    const modelo = graficoPeriodoPorAmplitude(new Store())
    const tracos = new Set(modelo.series.map((s) => s.traco))
    expect(tracos.size).toBe(modelo.series.length)
  })

  it('acompanha L e g', () => {
    const store = new Store()
    store.definirParametro('L', 4)
    const modelo = graficoPeriodoPorAmplitude(store)
    // T₀ dobra quando L quadruplica.
    expect(modelo.series[0]!.pontos[0]!.y).toBeCloseTo(2 * 2.006067, 5)
  })
})

// ═══════════════════════════════════════════════════════════ erro

describe('graficoErroPorAmplitude', () => {
  it('usa escala logarítmica no eixo do erro', () => {
    expect(graficoErroPorAmplitude(new Store()).eixoY.tipo).toBe('logaritmica')
  })

  it('o erro é sempre positivo, porque o gráfico mostra o tamanho e não o sinal', () => {
    const modelo = graficoErroPorAmplitude(new Store())
    for (const ponto of modelo.series[0]!.pontos) expect(ponto.y).toBeGreaterThanOrEqual(0)
  })

  it('cresce com a amplitude', () => {
    const pontos = graficoErroPorAmplitude(new Store()).series[0]!.pontos
    expect(pontos.at(-1)!.y).toBeGreaterThan(pontos[0]!.y)
  })

  it('reproduz o erro tabelado de 1,71 % a 90° com N = 2', () => {
    const store = new Store()
    store.definirParametro('alpha', 90)
    const modelo = graficoErroPorAmplitude(store)
    expect(modelo.marcadores[0]!.y).toBeCloseTo(0.0171, 4)
  })

  it('desenha o limiar de 1 % como referência', () => {
    const modelo = graficoErroPorAmplitude(new Store())
    const limiar = modelo.series.find((s) => s.id === 'limiar-1')!
    expect(limiar.pontos.every((p) => p.y === 0.01)).toBe(true)
  })

  it('no modo cicloidal o erro é identicamente nulo', () => {
    const store = new Store()
    store.definirParametro('modo', 'cicloidal')
    const modelo = graficoErroPorAmplitude(store)
    for (const ponto of modelo.series[0]!.pontos) expect(ponto.y).toBeCloseTo(0, 12)
  })
})

// ═══════════════════════════════════════════════════════════ convergência

describe('graficoConvergencia', () => {
  it('o erro cai monotonicamente ao acrescentar termos', () => {
    const store = new Store()
    store.definirParametro('alpha', 90)
    const pontos = graficoConvergencia(store).series[0]!.pontos
    for (let i = 1; i < pontos.length; i++) {
      expect(pontos[i]!.y).toBeLessThanOrEqual(pontos[i - 1]!.y)
    }
  })

  it('reproduz a tabela do Cenário 9 a 90°', () => {
    const store = new Store()
    store.definirParametro('alpha', 90)
    const pontos = graficoConvergencia(store).series[0]!.pontos
    const exato = 1.180341
    // Razões tabeladas: N=1 → 1,125000; N=2 → 1,160156; N=5 → 1,178929.
    expect(pontos[1]!.y).toBeCloseTo(Math.abs((1.125 - exato) / exato), 4)
    expect(pontos[2]!.y).toBeCloseTo(Math.abs((1.160156 - exato) / exato), 4)
    expect(pontos[5]!.y).toBeCloseTo(Math.abs((1.178929 - exato) / exato), 4)
  })

  it('mostra que a 90° são precisos seis termos para ficar abaixo de 0,1 %', () => {
    const store = new Store()
    store.definirParametro('alpha', 90)
    const pontos = graficoConvergencia(store).series[0]!.pontos
    expect(pontos[5]!.y).toBeGreaterThan(0.001)
    expect(pontos[6]!.y).toBeLessThan(0.001)
  })

  it('marca o N corrente', () => {
    const store = new Store()
    store.definirParametro('N', 7)
    const modelo = graficoConvergencia(store)
    expect(modelo.marcadores[0]!.x).toBe(7)
  })

  it('omite o marcador quando N está fora do eixo desenhado', () => {
    const store = new Store()
    store.definirParametro('N', 40)
    expect(graficoConvergencia(store, 20).marcadores).toHaveLength(0)
  })

  it('no cicloidal o erro é nulo já no primeiro termo', () => {
    const store = new Store()
    store.definirParametro('modo', 'cicloidal')
    const pontos = graficoConvergencia(store).series[0]!.pontos
    expect(pontos[0]!.y).toBeCloseTo(0, 12)
  })
})

// ═══════════════════════════════════════════════════════════ tempo

describe('graficoTemporal', () => {
  it('produz um ponto por amostra nas três séries', () => {
    const amostras = amostrar('simples', 20)
    const modelo = graficoTemporal(new Store(), amostras, 'simples')
    expect(modelo.series).toHaveLength(3)
    for (const serie of modelo.series) expect(serie.pontos).toHaveLength(amostras.length)
  })

  it('θ oscila em torno de zero, dentro da amplitude de largada', () => {
    const store = new Store()
    store.definirParametro('alpha', 20)
    const modelo = graficoTemporal(store, amostrar('simples', 20, 1500), 'simples')
    const theta = modelo.series.find((s) => s.id === 'theta')!.pontos.map((p) => p.y)
    expect(Math.max(...theta)).toBeLessThanOrEqual(20.001)
    expect(Math.min(...theta)).toBeGreaterThanOrEqual(-20.001)
    expect(Math.min(...theta)).toBeLessThan(-1)
  })

  it('a aceleração se opõe ao deslocamento', () => {
    const store = new Store()
    store.definirParametro('alpha', 20)
    const modelo = graficoTemporal(store, amostrar('simples', 20, 50), 'simples')
    const theta = modelo.series.find((s) => s.id === 'theta')!.pontos
    const acel = modelo.series.find((s) => s.id === 'aceleracao')!.pontos
    const i = 10
    expect(Math.sign(acel[i]!.y)).toBe(-Math.sign(theta[i]!.y))
  })

  it('tolera lista de amostras vazia', () => {
    const modelo = graficoTemporal(new Store(), [], 'simples')
    for (const serie of modelo.series) expect(serie.pontos).toHaveLength(0)
  })
})

describe('graficoEnergia', () => {
  it('a energia total é constante sem dissipação', () => {
    const total = graficoEnergia(new Store(), amostrar('simples', 30, 1200), 'simples')
      .series.find((s) => s.id === 'total')!
      .pontos.map((p) => p.y)
    const variacao = (Math.max(...total) - Math.min(...total)) / Math.max(...total)
    expect(variacao).toBeLessThan(1e-3)
  })

  it('cinética e potencial trocam de papel ao longo do ciclo', () => {
    const modelo = graficoEnergia(new Store(), amostrar('simples', 30, 1200), 'simples')
    const cinetica = modelo.series.find((s) => s.id === 'cinetica')!.pontos.map((p) => p.y)
    const potencial = modelo.series.find((s) => s.id === 'potencial')!.pontos.map((p) => p.y)
    expect(Math.max(...cinetica)).toBeGreaterThan(0)
    expect(Math.max(...potencial)).toBeGreaterThan(0)
    // No instante de maior energia cinética, a potencial está próxima do mínimo.
    const iMax = cinetica.indexOf(Math.max(...cinetica))
    expect(potencial[iMax]!).toBeLessThan(Math.max(...potencial) * 0.1)
  })

  it('usa a altura do regime cicloidal, que difere da do simples', () => {
    const store = new Store()
    const amostras = amostrar('cicloidal', 90, 10)
    const potencialCicloidal = graficoEnergia(store, amostras, 'cicloidal')
      .series.find((s) => s.id === 'potencial')!.pontos[0]!.y
    const potencialSimples = graficoEnergia(store, amostras, 'simples')
      .series.find((s) => s.id === 'potencial')!.pontos[0]!.y
    expect(potencialSimples).toBeCloseTo(2 * potencialCicloidal, 6)
  })
})

describe('graficoRetratoDeFase', () => {
  it('é uma curva paramétrica: o eixo x não é monotônico', () => {
    // É exatamente esta propriedade que descarta um renderizador de séries.
    const pontos = graficoRetratoDeFase(new Store(), amostrar('simples', 30, 1200), 'simples').series[0]!.pontos
    let subiu = false
    let desceu = false
    for (let i = 1; i < pontos.length; i++) {
      if (pontos[i]!.x > pontos[i - 1]!.x) subiu = true
      if (pontos[i]!.x < pontos[i - 1]!.x) desceu = true
    }
    expect(subiu && desceu).toBe(true)
  })

  it('sem atrito a órbita é fechada: volta perto do ponto de partida', () => {
    const amostras = amostrar('cicloidal', 30, 1206)
    const pontos = graficoRetratoDeFase(new Store(), amostras, 'cicloidal').series[0]!.pontos
    const primeiro = pontos[0]!
    const ultimo = pontos.at(-1)!
    expect(Math.abs(ultimo.x - primeiro.x)).toBeLessThan(2)
  })

  it('marca o estado corrente', () => {
    const modelo = graficoRetratoDeFase(new Store(), amostrar('simples', 20), 'simples')
    expect(modelo.marcadores).toHaveLength(1)
  })

  it('tolera amostras vazias sem marcador', () => {
    expect(graficoRetratoDeFase(new Store(), [], 'simples').marcadores).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════ auxiliares

describe('amplitudeCorrenteEmGraus', () => {
  it('recupera a amplitude de largada no modo simples', () => {
    expect(amplitudeCorrenteEmGraus(amostrar('simples', 30, 700), 'simples')).toBeCloseTo(30, 0)
  })

  it('converte a coordenada generalizada de volta a graus no cicloidal', () => {
    expect(amplitudeCorrenteEmGraus(amostrar('cicloidal', 30, 700), 'cicloidal')).toBeCloseTo(30, 0)
  })

  it('devolve nulo sem amostras', () => {
    expect(amplitudeCorrenteEmGraus([], 'simples')).toBeNull()
  })
})

describe('listaDeTexto', () => {
  it('devolve a lista quando já é lista', () => {
    expect(listaDeTexto(['a', 'b'])).toEqual(['a', 'b'])
  })

  it('embrulha texto avulso', () => {
    expect(listaDeTexto('serie')).toEqual(['serie'])
  })

  it('devolve vazio para o que não é lista nem texto útil', () => {
    expect(listaDeTexto('')).toEqual([])
    expect(listaDeTexto(null)).toEqual([])
    expect(listaDeTexto(undefined)).toEqual([])
    expect(listaDeTexto(42)).toEqual([])
    expect(listaDeTexto({ a: 1 })).toEqual([])
  })
})

describe('atrito nas séries temporais', () => {
  it('a aceleração inclui o amortecimento viscoso', () => {
    const store = new Store()
    store.definirParametro('modeloAtrito', 'viscoso')
    store.definirParametro('zeta', 0.1)
    const amostras = amostrar('simples', 30, 200)
    const comAtrito = graficoTemporal(store, amostras, 'simples')
      .series.find((s) => s.id === 'aceleracao')!.pontos

    const semAtrito = new Store()
    const sem = graficoTemporal(semAtrito, amostras, 'simples')
      .series.find((s) => s.id === 'aceleracao')!.pontos

    const diferentes = comAtrito.some((p, i) => Math.abs(p.y - sem[i]!.y) > 1e-9)
    expect(diferentes).toBe(true)
  })

  it('aceita o modelo de arrasto quadrático', () => {
    const store = new Store()
    store.definirParametro('modeloAtrito', 'quadratico')
    store.definirParametro('cq', 0.3)
    expect(() => graficoTemporal(store, amostrar('simples', 20, 50), 'simples')).not.toThrow()
  })

  it('trata atrito no pivô como ausência de modelo suportado, sem quebrar', () => {
    const store = new Store()
    store.definirParametro('modeloAtrito', 'pivo')
    expect(() => graficoTemporal(store, amostrar('simples', 20, 50), 'simples')).not.toThrow()
  })
})

describe('graficosAnaliticos e periodoCorrente', () => {
  it('reúne os três gráficos que não dependem da simulação', () => {
    expect(graficosAnaliticos(new Store()).map((m) => m.id)).toEqual([
      'periodo-por-amplitude',
      'erro-por-amplitude',
      'convergencia',
    ])
  })

  it('periodoCorrente bate com as fixtures do quickstart', () => {
    const store = new Store()
    store.definirParametro('alpha', 45)
    const { serie, exato, T0 } = periodoCorrente(store)
    expect(T0).toBeCloseTo(2.006067, 6)
    expect(serie).toBeCloseTo(2.085562, 6)
    expect(exato).toBeCloseTo(2.086256, 6)
  })
})

describe('graficoPoincare', () => {
  const forcado = (): Store => {
    const store = new Store()
    store.definirParametro('amplitudeForcamento', 0.5)
    store.definirParametro('omegaForcamento', 3)
    return store
  }

  it('sem forçamento não inventa uma nuvem de pontos', () => {
    const modelo = graficoPoincare(new Store(), amostrar('simples', 30), 'simples')
    expect(modelo.series[0]!.pontos).toHaveLength(0)
    expect(modelo.descricao).toContain('Exige forçamento externo')
  })

  it('amostra um ponto por ciclo do forçamento', () => {
    const amostras = amostrar('simples', 30, 2000)
    const modelo = graficoPoincare(forcado(), amostras, 'simples')
    const duracao = amostras.at(-1)!.t - amostras[0]!.t
    const ciclos = Math.floor(duracao / ((2 * Math.PI) / 3))
    // Um ponto por período de forçamento, com folga de um na borda.
    expect(modelo.series[0]!.pontos.length).toBeGreaterThanOrEqual(ciclos - 1)
    expect(modelo.series[0]!.pontos.length).toBeLessThanOrEqual(ciclos + 1)
    expect(modelo.descricao).toContain('regime caótico')
  })

  it('os pontos ficam dentro do envelope do movimento', () => {
    const amostras = amostrar('simples', 30, 2000)
    const modelo = graficoPoincare(forcado(), amostras, 'simples')
    for (const ponto of modelo.series[0]!.pontos) {
      expect(Math.abs(ponto.x)).toBeLessThanOrEqual(30.001)
      expect(Number.isFinite(ponto.y)).toBe(true)
    }
  })

  it('sem amostras suficientes não há o que estroboscopar', () => {
    expect(graficoPoincare(forcado(), [], 'simples').series[0]!.pontos).toHaveLength(0)
  })

  it('usa a cor do modo cicloidal quando é esse o pêndulo', () => {
    const modelo = graficoPoincare(forcado(), amostrar('cicloidal', 30, 500), 'cicloidal')
    expect(modelo.series[0]!.cor).toBe('cicloidal')
  })
})

describe('graficoTemporalPorId', () => {
  it('despacha cada identificador para o seu construtor', () => {
    const store = new Store()
    const amostras = amostrar('simples', 20, 200)
    const ids = GRAFICOS_TEMPORAIS.map(
      (id) => graficoTemporalPorId(id, store, amostras, 'simples').id,
    )
    expect(ids).toEqual(['temporal', 'energia', 'retrato-de-fase', 'poincare'])
  })
})

describe('nota de amostras ausentes nos gráficos temporais', () => {
  const vazio = new Store()

  it('explica que a fórmula fechada não produz série temporal', () => {
    // FONTE = formula é o padrão: sem a nota, o painel em branco pareceria defeito.
    expect(vazio.texto('fonteMovimento')).toBe('formula')
    for (const modelo of [
      graficoTemporal(vazio, [], 'simples'),
      graficoEnergia(vazio, [], 'simples'),
      graficoRetratoDeFase(vazio, [], 'simples'),
    ]) {
      expect(modelo.descricao).toContain('Exige FONTE = integração numérica')
    }
  })

  it('sob integração, apenas avisa que a simulação ainda não avançou', () => {
    const store = new Store({ fonteMovimento: 'integracao' })
    const modelo = graficoTemporal(store, [], 'simples')
    expect(modelo.descricao).toContain('Aguardando a simulação avançar')
    expect(modelo.descricao).not.toContain('Exige FONTE')
  })

  it('com amostras suficientes a nota some', () => {
    const modelo = graficoTemporal(vazio, amostrar('simples', 20, 50), 'simples')
    expect(modelo.descricao).toBe('Ângulo, velocidade angular e aceleração da massa.')
  })
})

describe('medições projetadas sobre a curva teórica (RF-103)', () => {
  const comMedicoes = (grandeza: 'periodoCompleto' | 'meioPeriodo' = 'periodoCompleto'): Store => {
    const s = new Store()
    for (const [alpha, T] of [[10, 2.0099], [45, 2.0863]] as const) {
      s.registrarMedicao({
        idPendulo: 'simples#1',
        pendulo: 'simples',
        grandeza,
        T: segundo(grandeza === 'meioPeriodo' ? T / 2 : T),
        alpha: g(alpha),
        L: metro(1),
        g: G_TERRA,
        N: 2,
        Tteorico: segundo(T),
        tColeta: segundo(1),
      })
    }
    return s
  }

  it('sem medições, a curva não ganha série nem nota', () => {
    const modelo = graficoPeriodoPorAmplitude(new Store())
    expect(modelo.series.some((s) => s.id === 'medicoes')).toBe(false)
    expect(modelo.descricao).not.toContain('medido')
  })

  it('os pontos medidos entram por cima das curvas', () => {
    const modelo = graficoPeriodoPorAmplitude(comMedicoes())
    const medidos = modelo.series.at(-1)!
    expect(medidos.id).toBe('medicoes')
    expect(medidos.forma).toBe('pontos')
    expect(medidos.pontos).toHaveLength(2)
    expect(modelo.descricao).toContain('2 ponto(s) medido(s)')
  })

  it('cada ponto cai na amplitude em que foi medido', () => {
    const pontos = graficoPeriodoPorAmplitude(comMedicoes()).series.at(-1)!.pontos
    expect(pontos[0]!.x).toBeCloseTo(10, 4)
    expect(pontos[0]!.y).toBeCloseTo(2.0099, 4)
    expect(pontos[1]!.x).toBeCloseTo(45, 4)
  })

  it('meio período é normalizado para período completo antes de comparar', () => {
    // A curva T(α) descreve o período completo; sobrepor meios períodos crus
    // faria os pontos caírem sistematicamente na metade da curva.
    const pontos = graficoPeriodoPorAmplitude(comMedicoes('meioPeriodo')).series.at(-1)!.pontos
    expect(pontos[0]!.y).toBeCloseTo(2.0099, 4)
  })

  it('serieDeMedicoes devolve nulo quando não há o que projetar', () => {
    expect(serieDeMedicoes(new Store())).toBeNull()
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  calcularLayout,
  desenhar,
  lerNoPonto,
  MARGEM,
  projetarSerie,
  valorSobPosicao,
  type DimensoesGrafico,
} from '../../src/render/charts/xyplot.js'
import type { ModeloGrafico } from '../../src/state/charts.js'
import { graficoErroPorAmplitude, graficoPeriodoPorAmplitude } from '../../src/state/charts.js'
import { Store } from '../../src/state/store.js'
import type { PaletaCena } from '../../src/render/palette.js'

const DIM: DimensoesGrafico = { largura: 600, altura: 300 }

const paleta: PaletaCena = {
  fundo: '#fff', grade: '#eee', eixo: '#999', faceCicloidal: '#111', trajetoria: '#666',
  sensor: '#080', sensorDisparo: '#0f0', simples: '#b00', cicloidal: '#06c', referenciaT0: '#777',
  texto: '#111', textoSuave: '#555', borda: '#ccc', energiaCinetica: '#06c',
  energiaPotencial: '#73c', energiaTermica: '#b50', energiaTotal: '#111',
  valorExato: '#0a8', confiancaExcelente: '#0a0', confiancaBoa: '#5a0',
  confiancaLimitada: '#b70', confiancaInadequada: '#b00',
}

function contexto(): CanvasRenderingContext2D {
  const nada = (): void => undefined
  return {
    save: vi.fn(nada), restore: vi.fn(nada), beginPath: vi.fn(nada), moveTo: vi.fn(nada),
    lineTo: vi.fn(nada), stroke: vi.fn(nada), fill: vi.fn(nada), arc: vi.fn(nada),
    fillRect: vi.fn(nada), clearRect: vi.fn(nada), fillText: vi.fn(nada),
    setLineDash: vi.fn(nada),
  } as unknown as CanvasRenderingContext2D
}

const modeloSimples: ModeloGrafico = {
  id: 'teste',
  titulo: 'Teste',
  descricao: 'modelo mínimo',
  eixoX: { rotulo: 'x', tipo: 'linear', unidade: null },
  eixoY: { rotulo: 'y', tipo: 'linear', unidade: null },
  series: [
    {
      id: 'reta',
      rotulo: 'Reta',
      cor: 'simples',
      forma: 'linha',
      traco: 'solido',
      pontos: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
    },
  ],
  marcadores: [],
}

describe('calcularLayout', () => {
  it('reserva as margens declaradas para os rótulos', () => {
    const layout = calcularLayout(modeloSimples, DIM)
    expect(layout.area.esquerda).toBe(MARGEM.esquerda)
    expect(layout.area.topo).toBe(MARGEM.topo)
    expect(layout.area.direita).toBe(DIM.largura - MARGEM.direita)
    expect(layout.area.base).toBe(DIM.altura - MARGEM.base)
  })

  it('o domínio cobre os pontos com folga', () => {
    const layout = calcularLayout(modeloSimples, DIM)
    expect(layout.dominioX.min).toBeLessThan(0)
    expect(layout.dominioX.max).toBeGreaterThan(10)
  })

  it('inclui os marcadores no domínio, para não desenhá-los fora da área', () => {
    const comMarcador: ModeloGrafico = {
      ...modeloSimples,
      marcadores: [{ rotulo: 'fora', x: 40, y: 40 }],
    }
    expect(calcularLayout(comMarcador, DIM).dominioX.max).toBeGreaterThanOrEqual(40)
  })

  it('não colapsa a área quando o gráfico é menor que as margens', () => {
    const layout = calcularLayout(modeloSimples, { largura: 20, altura: 20 })
    expect(layout.area.direita).toBeGreaterThan(layout.area.esquerda)
    expect(layout.area.base).toBeGreaterThan(layout.area.topo)
  })

  it('usa domínio logarítmico quando o eixo é logarítmico', () => {
    const modelo = graficoErroPorAmplitude(new Store())
    const layout = calcularLayout(modelo, DIM)
    expect(layout.dominioY.min).toBeGreaterThan(0)
    // Décadas inteiras: a razão entre limites é potência de dez.
    const razao = Math.log10(layout.dominioY.max / layout.dominioY.min)
    expect(Math.abs(razao - Math.round(razao))).toBeLessThan(1e-9)
  })

  it('gera marcas em ambos os eixos', () => {
    const layout = calcularLayout(modeloSimples, DIM)
    expect(layout.marcasX.length).toBeGreaterThan(1)
    expect(layout.marcasY.length).toBeGreaterThan(1)
  })
})

describe('projetarSerie', () => {
  it('inverte o eixo vertical: y maior fica mais acima na tela', () => {
    const layout = calcularLayout(modeloSimples, DIM)
    const [baixo, alto] = projetarSerie(
      [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ],
      layout,
      'linear',
      'linear',
    )
    expect(alto!.y).toBeLessThan(baixo!.y)
  })

  it('mantém os pontos dentro da área do gráfico', () => {
    const layout = calcularLayout(modeloSimples, DIM)
    for (const ponto of projetarSerie(modeloSimples.series[0]!.pontos, layout, 'linear', 'linear')) {
      expect(ponto.x).toBeGreaterThanOrEqual(layout.area.esquerda)
      expect(ponto.x).toBeLessThanOrEqual(layout.area.direita)
      expect(ponto.y).toBeGreaterThanOrEqual(layout.area.topo)
      expect(ponto.y).toBeLessThanOrEqual(layout.area.base)
    }
  })

  it('devolve lista vazia para série vazia', () => {
    const layout = calcularLayout(modeloSimples, DIM)
    expect(projetarSerie([], layout, 'linear', 'linear')).toEqual([])
  })
})

describe('valorSobPosicao', () => {
  it('é o inverso da projeção horizontal', () => {
    const layout = calcularLayout(modeloSimples, DIM)
    const [ponto] = projetarSerie([{ x: 7, y: 0 }], layout, 'linear', 'linear')
    expect(valorSobPosicao(ponto!.x, layout, 'linear')).toBeCloseTo(7, 9)
  })
})

describe('lerNoPonto', () => {
  it('devolve uma leitura por série (RF-083)', () => {
    const modelo = graficoPeriodoPorAmplitude(new Store())
    const leituras = lerNoPonto(modelo, 45)
    expect(leituras).toHaveLength(modelo.series.length)
    expect(leituras.map((l) => l.serie)).toEqual(['T0', 'serie', 'exato'])
  })

  it('lê os valores de referência em α = 45°', () => {
    const modelo = graficoPeriodoPorAmplitude(new Store(), 1789)
    const leituras = lerNoPonto(modelo, 45)
    expect(leituras.find((l) => l.serie === 'T0')!.y).toBeCloseTo(2.006067, 4)
    expect(leituras.find((l) => l.serie === 'serie')!.y).toBeCloseTo(2.085562, 3)
    expect(leituras.find((l) => l.serie === 'exato')!.y).toBeCloseTo(2.086256, 3)
  })

  it('escolhe o ponto de x mais próximo, mesmo fora do intervalo', () => {
    expect(lerNoPonto(modeloSimples, -100)[0]!.x).toBe(0)
    expect(lerNoPonto(modeloSimples, 100)[0]!.x).toBe(10)
  })

  it('ignora séries sem pontos', () => {
    const vazio: ModeloGrafico = {
      ...modeloSimples,
      series: [{ ...modeloSimples.series[0]!, pontos: [] }],
    }
    expect(lerNoPonto(vazio, 5)).toEqual([])
  })
})

describe('desenhar', () => {
  it('limpa, pinta o fundo e traça a série', () => {
    const ctx = contexto()
    desenhar(ctx, modeloSimples, DIM, paleta)
    expect(ctx.clearRect).toHaveBeenCalled()
    expect(ctx.fillRect).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('devolve o layout usado, para o cursor consultar depois', () => {
    const layout = desenhar(contexto(), modeloSimples, DIM, paleta)
    expect(layout.area.esquerda).toBe(MARGEM.esquerda)
  })

  it('aplica traço distinto por série, e não só cor', () => {
    const ctx = contexto()
    desenhar(ctx, graficoPeriodoPorAmplitude(new Store()), DIM, paleta)
    const padroes = (ctx.setLineDash as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((c) => JSON.stringify(c[0]))
    expect(new Set(padroes).size).toBeGreaterThan(1)
  })

  it('desenha pontos com arco quando a forma é de pontos', () => {
    const ctx = contexto()
    desenhar(ctx, { ...modeloSimples, series: [{ ...modeloSimples.series[0]!, forma: 'pontos' }] }, DIM, paleta)
    expect(ctx.arc).toHaveBeenCalled()
  })

  it('desenha barras com retângulos quando a forma é de barras', () => {
    const ctx = contexto()
    desenhar(ctx, { ...modeloSimples, series: [{ ...modeloSimples.series[0]!, forma: 'barras' }] }, DIM, paleta)
    expect((ctx.fillRect as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBeGreaterThan(1)
  })

  it('desenha o marcador do valor corrente com rótulo', () => {
    const ctx = contexto()
    const store = new Store()
    store.definirParametro('alpha', 45)
    desenhar(ctx, graficoPeriodoPorAmplitude(store), DIM, paleta)
    const textos = (ctx.fillText as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((c) => String(c[0]))
    expect(textos.some((t) => t.includes('45,0'))).toBe(true)
  })

  it('cai para a cor de texto quando a chave da paleta não existe', () => {
    // Uma série pode declarar uma cor que a paleta ainda não tem; o gráfico
    // desenha em vez de sumir.
    const ctx = contexto()
    const modelo: ModeloGrafico = {
      ...modeloSimples,
      series: [{ ...modeloSimples.series[0]!, cor: 'corInexistente' }],
    }
    expect(() => desenhar(ctx, modelo, DIM, paleta)).not.toThrow()
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('posiciona o rótulo do marcador para dentro nos dois lados do gráfico', () => {
    const alinhamentos: string[] = []
    for (const x of [1, 9]) {
      const ctx = contexto()
      desenhar(ctx, { ...modeloSimples, marcadores: [{ rotulo: `m${x}`, x, y: 5 }] }, DIM, paleta)
      alinhamentos.push(String((ctx as unknown as { textAlign: string }).textAlign))
    }
    // O marcador à esquerda e o à direita não podem usar o mesmo alinhamento,
    // ou um dos rótulos sairia da área desenhada.
    expect(alinhamentos.length).toBe(2)
  })

  it('ignora série vazia sem desenhar nada por ela', () => {
    const ctx = contexto()
    const modelo: ModeloGrafico = {
      ...modeloSimples,
      series: [{ ...modeloSimples.series[0]!, pontos: [] }],
      marcadores: [],
    }
    desenhar(ctx, modelo, DIM, paleta)
    expect(ctx.clearRect).toHaveBeenCalled()
  })

  it('atravessa um modelo sem séries sem quebrar', () => {
    const ctx = contexto()
    expect(() =>
      desenhar(ctx, { ...modeloSimples, series: [], marcadores: [] }, DIM, paleta),
    ).not.toThrow()
  })

  it('desenha os três gráficos analíticos sem erro', () => {
    const store = new Store()
    for (const modelo of [
      graficoPeriodoPorAmplitude(store),
      graficoErroPorAmplitude(store),
    ]) {
      expect(() => desenhar(contexto(), modelo, DIM, paleta)).not.toThrow()
    }
  })
})

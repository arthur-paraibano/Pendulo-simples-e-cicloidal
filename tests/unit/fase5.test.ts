import { describe, expect, it } from 'vitest'
import { executar, formatarEstadoConsole, interpretar } from '../../src/state/console.js'
import { selecionarResultadoPeriodo } from '../../src/state/formula.js'
import { Store } from '../../src/state/store.js'
import {
  avaliarExpressaoNumerica,
  formatarValorParametro,
  interpretarEntradaNumerica,
} from '../../src/ui/param-control.js'
import { formatarDecimal, modeloFormula, texDoTermo, texFormula } from '../../src/ui/formula.js'
import { OPCOES_VISUALIZACAO } from '../../src/ui/view-selector.js'
import { POR_ID } from '../../src/state/schema.js'
import { formatarDerivado, valoresDerivados } from '../../src/ui/derived-values.js'
import type { EstadoPenduloCena } from '../../src/render/types.js'

describe('Fase 5 — modelo do seletor e da fórmula', () => {
  it('mantém a ordem normativa Simples, Cicloidal e Ambos', () => {
    expect(OPCOES_VISUALIZACAO.map((opcao) => [opcao.valor, opcao.rotulo])).toEqual([
      ['simples', 'Simples'],
      ['cicloidal', 'Cicloidal'],
      ['comparacao', 'Ambos'],
    ])
  })

  it('produz os valores vivos do quickstart no modo simples', () => {
    const store = new Store()
    const modelo = modeloFormula(store, 'simples', 'teste')
    expect(modelo.resultado.T0).toBeCloseTo(2.00606668, 6)
    expect(modelo.resultado.T).toBeCloseTo(2.009893, 6)
    expect(modelo.resultado.razao).toBeCloseTo(1.001907, 6)
    expect(modelo.resultado.termos.map((termo) => termo.contribuicao)).toEqual([
      1,
      expect.closeTo(0.001899, 6),
      expect.closeTo(0.000008, 6),
    ])
    expect(modelo.tex).toContain('teste-termo-1')
    expect(modelo.tex).toContain('\\operatorname{sen}^{2}')
  })

  it('usa a mesma expressão e apaga n ≥ 1 no cicloidal', () => {
    const store = new Store()
    const simples = modeloFormula(store, 'simples', 'mesma')
    const cicloidal = modeloFormula(store, 'cicloidal', 'mesma')
    expect(cicloidal.tex).toBe(simples.tex)
    expect(cicloidal.resultado.T).toBe(cicloidal.resultado.T0)
    expect(cicloidal.resultado.termos.slice(1).every((termo) => !termo.ativo && termo.contribuicao === 0)).toBe(true)
    expect(cicloidal.resultado.faixaConfianca).toBe('excelente')
  })

  it('gera TeX com uma âncora estável por termo e formatação pt-BR', () => {
    const resultado = selecionarResultadoPeriodo(new Store(), 'simples')
    expect(texDoTermo(resultado.termos[0]!, 't0')).toBe('\\htmlId{t0}{1}')
    expect(texDoTermo(resultado.termos[2]!, 't2')).toContain('\\frac{9}{64}')
    expect(texDoTermo({ n: 1, coeficienteFracao: '1' }, 'inteiro')).toContain('{1\\,')
    expect(texFormula(resultado.termos, 'formula').match(/\\htmlId/g)).toHaveLength(3)
    expect(formatarDecimal(1.001907, 6)).toBe('1,001907')
    expect(formatarDecimal(-0, 4)).toBe('0,0000')
    expect(formatarDecimal(-1e-8, 4)).toBe('0,0000')
  })
})

describe('Fase 5 — entrada numérica com buffer', () => {
  const comprimento = POR_ID.get('L')!
  const amplitude = POR_ID.get('alpha')!

  it.each([
    ['1,5', 1.5],
    ['2*pi', 2 * Math.PI],
    ['(2 + 3) / 5', 1],
    ['-2+5e-1', -1.5],
  ])('avalia %s sem executar JavaScript', (texto, esperado) => {
    expect(avaliarExpressaoNumerica(texto)).toBeCloseTo(esperado, 12)
  })

  it('recusa tokens, divisão por zero e parênteses inválidos', () => {
    expect(avaliarExpressaoNumerica('alert(1)')).toBeNull()
    expect(avaliarExpressaoNumerica('1/0')).toBeNull()
    expect(avaliarExpressaoNumerica('(1+2')).toBeNull()
    expect(avaliarExpressaoNumerica('')).toBeNull()
  })

  it('converte unidades declaradas e rejeita unidade incompatível', () => {
    expect(interpretarEntradaNumerica('150 cm', comprimento)).toMatchObject({ valido: true, valor: 1.5 })
    expect(interpretarEntradaNumerica('1000 mm', comprimento)).toMatchObject({ valido: true, valor: 1 })
    expect(interpretarEntradaNumerica('pi/2 rad', amplitude).valor).toBeCloseTo(90, 12)
    expect(interpretarEntradaNumerica('10 kg', comprimento)).toMatchObject({ valido: false })
    expect(interpretarEntradaNumerica('x', comprimento)).toMatchObject({ valido: false })
  })

  it.each([
    ['10 m', 'L', 10],
    ['1 cm', 'L', 0.01],
    ['10cm', 'L', 0.1],
    ['10 mm', 'L', 0.01],
    ['0.002 m', 'espessuraFaces', 2],
    ['0.2 cm', 'espessuraFaces', 2],
    ['2 mm', 'espessuraFaces', 2],
    ['500 g', 'm', 0.5],
    ['1 kg', 'm', 1],
    ['250 ms', 'dt', 0.25],
    ['9.81 mps2', 'g', 9.81],
    ['90 deg', 'alpha', 90],
    ['90 graus', 'alpha', 90],
    ['0.5 pi', 'alpha', 90],
    ['100 grados', 'alpha', 90],
    ['180 °', 'faseCicloide', Math.PI],
    ['0.5 pi', 'faseCicloide', Math.PI / 2],
    ['100 gon', 'faseCicloide', Math.PI / 2],
  ])('converte %s para a unidade canônica de %s', (texto, id, esperado) => {
    const resultado = interpretarEntradaNumerica(texto, POR_ID.get(id)!)
    expect(resultado.valido).toBe(true)
    expect(resultado.valor).toBeCloseTo(esperado, 12)
  })

  it.each([
    ['1 km', 'L'], ['1 km', 'espessuraFaces'], ['1 m', 'm'], ['1 lb', 'm'],
    ['1 min', 'dt'], ['1 s', 'g'], ['1 foo', 'alpha'],
  ])('rejeita a unidade incompatível %s para %s', (texto, id) => {
    expect(interpretarEntradaNumerica(texto, POR_ID.get(id)!)).toMatchObject({ valido: false })
  })

  it('cobre operadores unários e expressões incompletas sem aceitar lixo', () => {
    expect(avaliarExpressaoNumerica('+2')).toBe(2)
    expect(avaliarExpressaoNumerica('1+')).toBeNull()
    expect(avaliarExpressaoNumerica('2*')).toBeNull()
    expect(avaliarExpressaoNumerica('-')).toBeNull()
    expect(interpretarEntradaNumerica('x m', comprimento)).toMatchObject({ valido: false })
    expect(interpretarEntradaNumerica('@', comprimento)).toMatchObject({ valido: false })
    expect(interpretarEntradaNumerica('1 unidade', { simbolo: 'x', unidade: null })).toMatchObject({ valido: false })
  })

  it('formata com a precisão do esquema', () => {
    expect(formatarValorParametro(1.5, comprimento)).toBe('1,500')
    expect(formatarValorParametro(10, amplitude)).toBe('10,0')
  })

  it('mantém o passo fino no estado mesmo quando a apresentação tem uma casa', () => {
    const store = new Store()
    store.definirParametro('alpha', store.numero('alpha') + amplitude.passoFino!)
    expect(store.numero('alpha')).toBeCloseTo(10.01, 12)
    expect(formatarValorParametro(store.numero('alpha'), amplitude)).toBe('10,0')
  })
})

describe('Fase 5 — console atômico e reprodutível', () => {
  it('ignora comentários e aplica várias linhas em um lote', () => {
    const store = new Store()
    const resultado = executar(store, '# experimento\nalpha = 45\nL = 1,5 m // fio')
    expect(resultado.sucesso).toBe(true)
    expect(store.numero('alpha')).toBe(45)
    expect(store.numero('L')).toBe(1.5)
  })

  it('não aplica prefixo válido quando um enum posterior é inválido', () => {
    const store = new Store()
    const resultado = executar(store, 'alpha=45; modo=inexistente; L=2')
    expect(resultado.sucesso).toBe(false)
    expect(store.numero('alpha')).toBe(10)
    expect(store.numero('L')).toBe(1)
    expect(store.texto('modo')).toBe('simples')
    expect(resultado.erros[0]).toMatch(/Linha 1, posição \d+:/)
  })

  it('converte unidades compatíveis e rejeita sufixos sem quebrar a atomicidade', () => {
    const store = new Store()
    expect(executar(store, 'L=150 cm; alpha=pi/2 rad; m=500 g; g=9,81 m/s²').sucesso).toBe(true)
    expect(store.numero('L')).toBe(1.5)
    expect(store.numero('alpha')).toBeCloseTo(90, 12)
    expect(store.numero('m')).toBe(0.5)
    const rejeitado = executar(store, 'L=2 kg; alpha=45')
    expect(rejeitado.sucesso).toBe(false)
    expect(rejeitado.erros[0]).toMatch(/Linha 1, posição 1: Unidade “kg” incompatível/)
    expect(store.numero('L')).toBe(1.5)
    expect(store.numero('alpha')).toBeCloseTo(90, 12)
  })

  it('exporta um bloco que o próprio interpretador aceita', () => {
    const store = new Store()
    store.definirParametro('alpha', 45)
    const bloco = formatarEstadoConsole(store)
    expect(bloco).toContain('alpha = 45 °')
    expect(bloco).not.toMatch(/^t =/m)
    expect(interpretar(bloco).sucesso).toBe(true)
  })

  it('comunica os clamps derivados da troca de modo feita pelo console', () => {
    const store = new Store({ alpha: 120, theta0: 110 })
    const resultado = executar(store, 'modo=cicloidal')
    expect(resultado.sucesso).toBe(true)
    expect(resultado.mensagens.join(' ')).toMatch(/α foi ajustado de 120° para 90°/)
    expect(resultado.mensagens.join(' ')).toMatch(/θ₀ foi ajustado de 110° para 90°/)
  })
})

describe('Fase 5 — grandezas derivadas somente leitura', () => {
  it('calcula o conjunto mínimo e atualiza tempo e energias a partir do runtime', () => {
    const store = new Store()
    const inicial = valoresDerivados(store)
    expect(inicial.map((valor) => valor.id)).toEqual(expect.arrayContaining([
      'T0', 'T', 'razao', 'frequencia', 'omegaAngular', 'raioCicloidal',
      'comprimentoEfetivo', 'energiaCinetica', 'energiaPotencial', 'energiaTermica', 'energiaTotal',
    ]))
    const estado: EstadoPenduloCena = {
      id: 'simples', modo: 'simples', L: 1, m: 1, g: 9.81, alphaInicial: Math.PI / 6,
      theta: 0, qPonto: 1, qDoisPontos: 0, tempo: 1.25, ultimoDisparoSensor: null,
      T0: 2, periodo: 2.1, modeloAtrito: 'nenhum', gamma: 0, cq: 0, aceleracaoExterna: 0,
    }
    const dinamico = valoresDerivados(store, estado)
    expect(formatarDerivado(dinamico.find((valor) => valor.id === 'tempo')!)).toBe('1,250 s')
    expect(dinamico.find((valor) => valor.id === 'energiaCinetica')?.valor).toBeCloseTo(0.5, 12)
    expect(dinamico.find((valor) => valor.id === 'energiaPotencial')?.valor).toBeCloseTo(0, 12)
    expect(dinamico.find((valor) => valor.id === 'energiaTotal')).toMatchObject({
      nome: 'Energia total — pêndulo simples',
      modoEnergia: 'simples',
    })
  })

  it.each([
    ['pontual', 1], ['fioMaisRaio', 1.1], ['esferaSolida', 1.004],
  ])('calcula comprimento efetivo no modelo %s', (modelo, esperado) => {
    const store = new Store({ modeloComprimento: modelo, raioEsfera: 0.1 })
    const valor = valoresDerivados(store).find((item) => item.id === 'comprimentoEfetivo')!
    expect(valor.valor).toBeCloseTo(esperado, 12)
  })

  it('calcula Q finito, seleciona o cicloidal e formata adimensionais', () => {
    const store = new Store({ modo: 'cicloidal', zeta: 0.1 })
    const derivados = valoresDerivados(store)
    const Q = derivados.find((item) => item.id === 'fatorQualidade')!
    expect(Q.valor).toBeCloseTo(5, 12)
    expect(formatarDerivado(Q)).toBe('5,000')
    expect(derivados.find((item) => item.id === 'T')?.valor).toBe(derivados.find((item) => item.id === 'T0')?.valor)
    expect(derivados.find((item) => item.id === 'energiaTotal')).toMatchObject({
      nome: 'Energia total — pêndulo cicloidal',
      modoEnergia: 'cicloidal',
    })
  })
})

import { describe, expect, it, vi } from 'vitest'
import { Store } from '../../src/state/store.js'
import {
  aplicarPreset,
  buscarPresetFabrica,
  capturarPreset,
  IDS_CONHECIDOS,
  PRESETS_FABRICA,
  validarPreset,
} from '../../src/state/presets.js'
import { Historico, JANELA_AGRUPAMENTO_MS, LIMITE_PILHA } from '../../src/state/history.js'
import { ColecaoMedicoes, entradaDeMedicao, LIMITE_LINHAS, type Medicao } from '../../src/state/measurements.js'
import { ControleExecucao, ehEstrutural, transicionar } from '../../src/state/execucao.js'
import { ArmazenamentoMemoria, Persistencia } from '../../src/state/persist.js'
import { periodoExato } from '../../src/physics/period.js'
import { G_TERRA } from '../../src/physics/constants.js'
import { deg, grausParaRad, metro, segundo } from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))

// ═══════════════════════════════════════════════════════════════════ presets

describe('presets de fábrica', () => {
  it('inclui todos os exigidos pelo RF-097', () => {
    const ids = PRESETS_FABRICA.map((p) => p.id)
    expect(ids).toContain('pequenas-oscilacoes')
    expect(ids).toContain('regime-anarmonico')
    expect(ids).toContain('roteiro-alemao')
    expect(ids).toContain('tautocrona-huygens')
    expect(ids).toContain('planeta-x')
    expect(ids).toContain('amortecido')
    expect(ids.filter((i) => ['lua', 'jupiter'].includes(i))).toHaveLength(2)
  })

  it('todos são válidos e referenciam parâmetros existentes', () => {
    for (const preset of PRESETS_FABRICA) {
      const { valido, erros } = validarPreset(preset)
      expect(valido, `${preset.id}: ${erros.join('; ')}`).toBe(true)
      for (const id of Object.keys(preset.parametros)) {
        expect(IDS_CONHECIDOS, `${preset.id} → ${id}`).toContain(id)
      }
    }
  })

  it('o preset do roteiro alemão reproduz o experimento do PDF', () => {
    const preset = buscarPresetFabrica('roteiro-alemao')!
    expect(preset.parametros['L']).toBe(1)
    // A barreira de luz do roteiro mede meio período.
    expect(preset.parametros['modoContagem']).toBe('meioPeriodo')
    expect(preset.visualizacao).toBe('ambos')
  })

  it('aplica um preset e produz o estado esperado', () => {
    const s = new Store()
    const { aplicados, avisos } = aplicarPreset(s, buscarPresetFabrica('tautocrona-huygens')!)
    expect(avisos).toHaveLength(0)
    expect(aplicados).toBeGreaterThan(0)
    expect(s.texto('modo')).toBe('cicloidal')
    expect(s.numero('numeroPendulos')).toBe(3)

    // O cenário é justamente as três alturas diferentes: soltas de 0,05 m,
    // 0,2 m e 0,45 m, as massas chegam juntas ao ponto zero (RF-159).
    expect(s.acoplado('h0')).toBe(false)
    for (const [i, h] of [[1, 0.05], [2, 0.2], [3, 0.45]] as const) {
      expect(s.numeroDoPendulo('h0', i)).toBeCloseTo(h, 6)
    }
    // Ângulos correspondentes na face cicloidal: asin(√(2h/L)).
    expect(s.numeroDoPendulo('alpha', 1)).toBeCloseTo(18.4349, 3)
    expect(s.numeroDoPendulo('alpha', 3)).toBeCloseTo(71.5651, 3)
  })

  it('carregar um preset por cima de outro não deixa resíduo', () => {
    const s = new Store()
    aplicarPreset(s, buscarPresetFabrica('regime-anarmonico')!)
    expect(s.numero('alpha')).toBe(90)
    aplicarPreset(s, buscarPresetFabrica('pequenas-oscilacoes')!)
    expect(s.numero('alpha')).toBe(5)
    expect(s.booleano('curvaTalpha')).toBe(true) // padrão, não resíduo do anterior
  })

  it('avisa sobre parâmetro desconhecido sem falhar', () => {
    const s = new Store()
    const { avisos } = aplicarPreset(s, {
      versaoEsquema: 1,
      id: 'teste',
      nome: 'Teste',
      origem: 'arquivo',
      parametros: { alpha: 30, naoExiste: 1 },
    })
    expect(avisos.some((a) => a.includes('naoExiste'))).toBe(true)
    expect(s.numero('alpha')).toBe(30)
  })

  it('avisa sobre versão futura', () => {
    const s = new Store()
    const { avisos } = aplicarPreset(s, {
      versaoEsquema: 99,
      id: 'futuro',
      nome: 'Futuro',
      origem: 'arquivo',
      parametros: { alpha: 20 },
    })
    expect(avisos.some((a) => a.includes('99'))).toBe(true)
    expect(s.numero('alpha')).toBe(20)
  })

  it('captura o estado corrente como preset, só com o que difere', () => {
    const s = new Store()
    s.definirParametro('alpha', 60)
    const preset = capturarPreset(s, 'meu-preset', 'Meu preset', 'descrição')
    // Guarda-se o canônico da largada; α e h₀ são reconstruídos ao aplicar.
    expect(preset.parametros['theta0']).toBe(60)
    expect(preset.parametros['alpha']).toBeUndefined()
    expect(preset.parametros['N']).toBeUndefined()
    expect(preset.origem).toBe('usuario')
    expect(validarPreset(preset).valido).toBe(true)
  })

  it('ida e volta: capturar e aplicar restaura o mesmo estado', () => {
    const a = new Store()
    a.definirParametro('alpha', 60)
    a.definirParametro('modo', 'cicloidal')
    a.definirParametro('N', 7)

    const b = new Store()
    aplicarPreset(b, capturarPreset(a, 'x', 'X'))
    expect(b.instantaneo()).toEqual(a.instantaneo())
  })
})

describe('validarPreset', () => {
  it('recusa objetos que não são preset', () => {
    expect(validarPreset(null).valido).toBe(false)
    expect(validarPreset('texto').valido).toBe(false)
    expect(validarPreset({}).valido).toBe(false)
  })

  it('exige id em kebab-case', () => {
    const base = { versaoEsquema: 1, nome: 'N', parametros: {} }
    expect(validarPreset({ ...base, id: 'Maiuscula' }).valido).toBe(false)
    expect(validarPreset({ ...base, id: 'com espaco' }).valido).toBe(false)
    expect(validarPreset({ ...base, id: 'valido-123' }).valido).toBe(true)
  })

  it('exige nome não vazio', () => {
    expect(validarPreset({ versaoEsquema: 1, id: 'x', nome: '  ', parametros: {} }).valido).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════ histórico

describe('Historico', () => {
  const instantaneo = (s: Store) => s.instantaneo()

  it('desfaz uma alteração', () => {
    const s = new Store()
    const h = new Historico(s)
    h.registrar('alpha', 0, instantaneo(s))
    s.definirParametro('alpha', 45)
    expect(h.podeDesfazer).toBe(true)
    h.desfazer()
    expect(s.numero('alpha')).toBe(10)
  })

  it('refaz o que foi desfeito', () => {
    const s = new Store()
    const h = new Historico(s)
    h.registrar('alpha', 0, instantaneo(s))
    s.definirParametro('alpha', 45)
    h.desfazer()
    expect(h.podeRefazer).toBe(true)
    h.refazer()
    expect(s.numero('alpha')).toBe(45)
  })

  it('arrastar um slider é UM passo de desfazer, não duzentos', () => {
    const s = new Store()
    const h = new Historico(s)
    for (let i = 0; i < 200; i++) {
      h.registrar('alpha', i, instantaneo(s))
      s.definirParametro('alpha', 10 + i * 0.1)
    }
    expect(h.profundidade).toBe(1)
    h.desfazer()
    expect(s.numero('alpha')).toBe(10)
  })

  it('alterações separadas por mais que a janela contam separado', () => {
    const s = new Store()
    const h = new Historico(s)
    h.registrar('alpha', 0, instantaneo(s))
    s.definirParametro('alpha', 30)
    h.registrar('alpha', JANELA_AGRUPAMENTO_MS + 1, instantaneo(s))
    s.definirParametro('alpha', 60)
    expect(h.profundidade).toBe(2)
    h.desfazer()
    expect(s.numero('alpha')).toBe(30)
    h.desfazer()
    expect(s.numero('alpha')).toBe(10)
  })

  it('parâmetros diferentes nunca são agrupados', () => {
    const s = new Store()
    const h = new Historico(s)
    h.registrar('alpha', 0, instantaneo(s))
    s.definirParametro('alpha', 30)
    h.registrar('L', 1, instantaneo(s))
    s.definirParametro('L', 2)
    expect(h.profundidade).toBe(2)
  })

  it('uma nova alteração descarta o futuro', () => {
    const s = new Store()
    const h = new Historico(s)
    h.registrar('alpha', 0, instantaneo(s))
    s.definirParametro('alpha', 45)
    h.desfazer()
    expect(h.podeRefazer).toBe(true)
    h.registrar('L', 1000, instantaneo(s))
    expect(h.podeRefazer).toBe(false)
  })

  it('a pilha não cresce indefinidamente', () => {
    const s = new Store()
    const h = new Historico(s)
    for (let i = 0; i < LIMITE_PILHA + 20; i++) {
      h.registrar(`p${i}`, i * 1000, instantaneo(s))
    }
    expect(h.profundidade).toBe(LIMITE_PILHA)
  })

  it('desfazer e refazer devolvem falso quando não há o que fazer', () => {
    const s = new Store()
    const h = new Historico(s)
    expect(h.desfazer()).toBe(false)
    expect(h.refazer()).toBe(false)
  })

  it('limpar esvazia as duas pilhas', () => {
    const s = new Store()
    const h = new Historico(s)
    h.registrar('alpha', 0, instantaneo(s))
    h.limpar()
    expect(h.podeDesfazer).toBe(false)
    expect(h.podeRefazer).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════ medições

describe('ColecaoMedicoes', () => {
  const L1 = metro(1)

  function entrada(modo: 'simples' | 'cicloidal', graus: number, n = 2) {
    const T = periodoExato(L1, G_TERRA, g(graus), modo)
    return entradaDeMedicao('p1', modo, T, 'periodoCompleto', g(graus), 1, 9.81, n, T, 0)
  }

  it('numera as medições em sequência', () => {
    const c = new ColecaoMedicoes()
    expect(c.registrar(entrada('simples', 10)).n).toBe(1)
    expect(c.registrar(entrada('simples', 20)).n).toBe(2)
    expect(c.contagem).toBe(2)
  })

  it('calcula as DUAS inferências de g — o cerne da tabela', () => {
    const c = new ColecaoMedicoes()
    const m = c.registrar(entrada('simples', 45))
    expect(m.gInferido).toBeCloseTo(9.803478, 4)
    expect(m.gInferidoIngenuo).toBeCloseTo(9.070361, 4)
    expect(m.gConfigurado).toBe(9.81)
  })

  it('no cicloidal as duas inferências coincidem, em qualquer amplitude', () => {
    const c = new ColecaoMedicoes()
    for (const graus of [10, 45, 90]) {
      const m = c.registrar(entrada('cicloidal', graus))
      expect(m.gInferido).toBeCloseTo(m.gInferidoIngenuo, 9)
      expect(m.gInferido).toBeCloseTo(9.81, 6)
    }
  })

  it('converte meio período em período completo antes de inferir g', () => {
    // Confundir as duas grandezas é o erro mais comum ao reproduzir o roteiro.
    const c = new ColecaoMedicoes()
    const T = periodoExato(L1, G_TERRA, g(10), 'simples')
    const m = c.registrar({
      idPendulo: 'p1',
      pendulo: 'simples',
      T: segundo(T / 2),
      grandeza: 'meioPeriodo',
      alpha: g(10),
      L: L1,
      g: 9.81,
      N: 2,
      Tteorico: segundo(T),
      tColeta: segundo(0),
    })
    expect(m.gInferido).toBeCloseTo(9.81, 4)
    expect(m.grandeza).toBe('meioPeriodo')
  })

  it('recusa período não positivo', () => {
    const c = new ColecaoMedicoes()
    expect(() =>
      c.registrar({ ...entrada('simples', 10), T: segundo(0) }),
    ).toThrow(/positivo/)
    expect(() =>
      c.registrar({ ...entrada('simples', 10), T: segundo(Number.POSITIVE_INFINITY) }),
    ).toThrow(/positivo/)
  })

  it('remove uma linha e recalcula', () => {
    const c = new ColecaoMedicoes()
    c.registrar(entrada('simples', 10))
    c.registrar(entrada('simples', 20))
    expect(c.remover(1)).toBe(true)
    expect(c.contagem).toBe(1)
    expect(c.remover(99)).toBe(false)
  })

  it('limpa e reinicia a numeração', () => {
    const c = new ColecaoMedicoes()
    c.registrar(entrada('simples', 10))
    c.limpar()
    expect(c.contagem).toBe(0)
    expect(c.registrar(entrada('simples', 10)).n).toBe(1)
  })

  it('ordena para exibição sem alterar a ordem de inserção', () => {
    const c = new ColecaoMedicoes()
    c.registrar(entrada('simples', 45))
    c.registrar(entrada('simples', 10))
    const porT = c.ordenadas('T', 'asc')
    expect(porT[0]!.alphaGraus).toBeCloseTo(10, 3)
    expect(c.todas[0]!.alphaGraus).toBeCloseTo(45, 3)
    expect(c.ordenadas('pendulo', 'desc')).toHaveLength(2)
  })

  it('calcula estatísticas de T e de g', () => {
    const c = new ColecaoMedicoes()
    c.registrar(entrada('simples', 10))
    c.registrar(entrada('simples', 20))
    c.registrar(entrada('simples', 30))
    const est = c.estatisticasDe('T')
    expect(est.contagem).toBe(3)
    expect(est.media).toBeGreaterThan(2)
    expect(est.desvioPadrao).toBeGreaterThan(0)
    expect(c.estatisticasDe('gInferido').contagem).toBe(3)
    expect(c.estatisticasDe('gInferidoIngenuo').media).toBeLessThan(9.81)
  })

  it('normaliza meio período para não misturar grandezas nas estatísticas de T', () => {
    const c = new ColecaoMedicoes()
    const completa = entrada('simples', 10)
    c.registrar(completa)
    c.registrar({ ...completa, T: segundo(completa.T / 2), grandeza: 'meioPeriodo' })
    expect(c.estatisticasDe('T').media).toBeCloseTo(completa.T, 12)
    expect(c.estatisticasDe('T').desvioPadrao).toBeCloseTo(0, 12)
  })

  it('com uma linha só, não afirma dispersão', () => {
    const c = new ColecaoMedicoes()
    c.registrar(entrada('simples', 10))
    expect(c.estatisticasDe('T').desvioPadrao).toBeNull()
  })

  it('filtra por pêndulo, para a visualização lado a lado', () => {
    const c = new ColecaoMedicoes()
    c.registrar(entrada('simples', 10))
    c.registrar({ ...entrada('cicloidal', 10), idPendulo: 'p2' })
    expect(c.doPendulo('p1')).toHaveLength(1)
    expect(c.doPendulo('p2')).toHaveLength(1)
  })

  it('marca a fonte, distinguindo simulação de hardware real', () => {
    const c = new ColecaoMedicoes()
    expect(c.registrar(entrada('simples', 10)).fonte).toBe('simulacao')
    expect(c.registrar({ ...entrada('simples', 10), fonte: 'real' }).fonte).toBe('real')
  })

  it('restaura de um conjunto salvo e continua a numeração', () => {
    const c = new ColecaoMedicoes()
    c.registrar(entrada('simples', 10))
    c.registrar(entrada('simples', 20))
    const salvo = [...c.todas]

    const outra = new ColecaoMedicoes()
    outra.carregar(salvo)
    expect(outra.contagem).toBe(2)
    expect(outra.registrar(entrada('simples', 30)).n).toBe(3)
  })

  it('aceita recarregar a própria visão e não expõe o array interno', () => {
    const c = new ColecaoMedicoes()
    c.registrar(entrada('simples', 10))
    c.registrar(entrada('cicloidal', 20))
    const visao = c.todas
    ;(visao as Medicao[]).pop()
    expect(c.contagem).toBe(2)

    c.carregar(c.todas)
    expect(c.todas.map((medicao) => medicao.n)).toEqual([1, 2])
    expect(c.registrar(entrada('simples', 30)).n).toBe(3)
  })

  it('limita também o histórico carregado e preserva as linhas mais recentes', () => {
    const origem = new ColecaoMedicoes()
    const base = origem.registrar(entrada('simples', 10))
    const linhas = Array.from({ length: LIMITE_LINHAS + 2 }, (_, indice) => ({
      ...base,
      n: indice + 1,
    }))
    origem.carregar(linhas)
    expect(origem.contagem).toBe(LIMITE_LINHAS)
    expect(origem.todas[0]!.n).toBe(3)
    expect(origem.registrar(entrada('simples', 20)).n).toBe(LIMITE_LINHAS + 3)
    expect(origem.paginaOrdenada('n', 'asc', 0, 100)).toHaveLength(100)
    expect(origem.paginaOrdenada('n', 'desc', 0, 100)[0]!.n).toBe(LIMITE_LINHAS + 3)
    expect(origem.paginaOrdenada('pendulo', 'asc', 0, 2)).toHaveLength(2)
    expect(origem.paginaOrdenada('n', 'asc', LIMITE_LINHAS, 100)).toEqual([])
    expect(origem.paginaOrdenada('n', 'asc', 0, 0)).toEqual([])
    expect(origem.contagem).toBe(LIMITE_LINHAS)
  })

  it('notifica todas as apresentações da coleção única sem duplicar registros', () => {
    const c = new ColecaoMedicoes()
    let notificacoes = 0
    const cancelar = c.assinar(() => { notificacoes += 1 })
    c.registrar(entrada('simples', 10))
    c.remover(1)
    c.carregar([c.registrar(entrada('cicloidal', 20))])
    cancelar()
    c.limpar()
    expect(notificacoes).toBe(4)
    expect(c.contagem).toBe(0)
  })

  it('coleta manual imediatamente e respeita a grandeza meio período', () => {
    const store = new Store()
    expect(store.coletarMedicaoManual('simples', 0).T).toBeCloseTo(2.009893, 6)
    store.definirParametro('modoContagem', 'meioPeriodo')
    expect(store.coletarMedicaoManual('cicloidal', 1).T).toBeCloseTo(1.003033, 6)
    expect(store.selecionarMedicoes()[1]!.origem).toBe('manual')
  })

  it('ancora a coleta automática em uma direção: uma linha por ciclo', () => {
    const store = new Store()
    const passagem = (t: number, sentido: -1 | 1, numeroTravessia: number) => ({
      t: segundo(t),
      sentido,
      qPonto: sentido,
      numeroTravessia,
    })
    store.definirColetaAutomatica(true)
    expect(store.selecionarColetaAutomatica()).toBe(true)
    expect(store.registrarPassagemSensor('simples', passagem(0.5, -1, 0), g(10))).toBeNull()
    expect(store.registrarPassagemSensor('simples', passagem(1, 1, 1), g(10))).toBeNull()
    expect(store.registrarPassagemSensor('simples', passagem(1.5, -1, 2), g(9))).not.toBeNull()
    expect(store.registrarPassagemSensor('simples', passagem(2, 1, 3), g(8))).toBeNull()
    expect(store.registrarPassagemSensor('simples', passagem(2.5, -1, 4), g(7))).not.toBeNull()
    expect(store.selecionarMedicoes()).toHaveLength(2)
    expect(store.selecionarMedicoes().map((m) => m.alphaGraus)).toEqual([9, 7])
    store.definirColetaAutomatica(false)
    expect(store.registrarPassagemSensor('simples', passagem(3.5, -1, 5), g(10))).toBeNull()
    store.reiniciarSensorColeta()
    store.definirColetaAutomatica(true)
    expect(store.registrarPassagemSensor('cicloidal', passagem(4, 1, 0), g(10))).toBeNull()
    expect(store.selecionarMedicoes()).toHaveLength(2)
  })

  it('delimita séries ao pausar/retomar e ao relógio voltar, sem períodos espúrios', () => {
    const store = new Store()
    const passagem = (t: number, sentido: -1 | 1, numeroTravessia: number) => ({
      t: segundo(t), sentido, qPonto: sentido, numeroTravessia,
    })
    store.definirColetaAutomatica(true)
    store.registrarPassagemSensor('simples', passagem(1, -1, 0), g(10))
    store.registrarPassagemSensor('simples', passagem(2, 1, 1), g(10))
    store.definirColetaAutomatica(false)
    store.registrarPassagemSensor('simples', passagem(100, -1, 2), g(10))
    store.definirColetaAutomatica(true)
    expect(store.registrarPassagemSensor('simples', passagem(101, 1, 3), g(10))).toBeNull()
    expect(store.selecionarMedicoes()).toHaveLength(0)
    expect(store.registrarPassagemSensor('simples', passagem(0.5, -1, 0), g(10))).toBeNull()
    expect(store.selecionarMedicoes()).toHaveLength(0)
  })

  it('faz da coleção uma parte única e acessível do Store', () => {
    const store = new Store()
    const notificou = vi.fn()
    const cancelar = store.assinarMedicoes(notificou)
    store.registrarMedicao(entrada('simples', 10))
    expect(store.selecionarMedicoes()).toHaveLength(1)
    expect(store.ordenarMedicoes('n')).toHaveLength(1)
    expect(store.estatisticasMedicoes('T').contagem).toBe(1)
    store.removerMedicao(1)
    expect(notificou).toHaveBeenCalledTimes(2)
    cancelar()
  })

  it('carrega e limpa medições pela porta única do Store', () => {
    const origem = new Store()
    origem.registrarMedicao(entrada('simples', 10))
    origem.registrarMedicao(entrada('cicloidal', 20))

    const destino = new Store()
    destino.carregarMedicoes(origem.selecionarMedicoes())
    expect(destino.contagemMedicoes()).toBe(2)
    expect(destino.paginarMedicoes('n', 'asc', 0, 1)).toHaveLength(1)
    destino.limparTabela()
    expect(destino.selecionarMedicoes()).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════ execução

describe('máquina de estados da execução', () => {
  it('classifica parâmetros estruturais e de apresentação', () => {
    expect(ehEstrutural('L')).toBe(true)
    expect(ehEstrutural('g')).toBe(true)
    expect(ehEstrutural('N')).toBe(true)
    expect(ehEstrutural('modo')).toBe(true)
    // Mexer na cor de um traço não pode reiniciar o experimento.
    expect(ehEstrutural('rastro')).toBe(false)
    expect(ehEstrutural('tema')).toBe(false)
    expect(ehEstrutural('inexistente')).toBe(false)
  })

  it('percorre as transições básicas', () => {
    expect(transicionar('parado', 'reproduzir').para).toBe('rodando')
    expect(transicionar('rodando', 'pausar').para).toBe('pausado')
    expect(transicionar('pausado', 'reproduzir').para).toBe('rodando')
    expect(transicionar('rodando', 'parar').para).toBe('parado')
    expect(transicionar('rodando', 'parar').reiniciaDinamica).toBe(true)
  })

  it('pausar só age quando está rodando', () => {
    expect(transicionar('pausado', 'pausar').para).toBe('pausado')
    expect(transicionar('parado', 'pausar').para).toBe('parado')
  })

  it('passo a passo mantém pausado', () => {
    expect(transicionar('pausado', 'passoAPasso').para).toBe('pausado')
    expect(transicionar('parado', 'passoAPasso').para).toBe('pausado')
  })

  it('parâmetro estrutural pausa, reinicia e EXPLICA o motivo', () => {
    const t = transicionar('rodando', 'parametroEstrutural', 'Comprimento do fio')
    expect(t.para).toBe('pausado')
    expect(t.reiniciaDinamica).toBe(true)
    expect(t.motivo).toContain('Comprimento do fio')
  })

  it('sem detalhe, ainda explica', () => {
    expect(transicionar('rodando', 'parametroEstrutural').motivo).toContain('estrutural')
  })

  it('movimento reduzido inicia pausado', () => {
    const t = transicionar('rodando', 'movimentoReduzido')
    expect(t.para).toBe('pausado')
    expect(t.motivo).toContain('movimento reduzido')
  })
})

describe('ControleExecucao', () => {
  it('começa pausado e responde aos comandos', () => {
    const c = new ControleExecucao()
    expect(c.estado).toBe('pausado')
    expect(c.rodando).toBe(false)
    c.aplicar('reproduzir')
    expect(c.rodando).toBe(true)
    c.aplicar('pausar')
    expect(c.estado).toBe('pausado')
  })

  it('aceita estado inicial diferente', () => {
    expect(new ControleExecucao('parado').estado).toBe('parado')
  })

  it('alterar parâmetro estrutural em curso pausa e informa', () => {
    const c = new ControleExecucao()
    c.aplicar('reproduzir')
    const t = c.aoAlterarParametro('L')
    expect(t).not.toBeNull()
    expect(c.estado).toBe('pausado')
    expect(t!.motivo).toContain('Comprimento')
  })

  it('alterar parâmetro de apresentação não interrompe nada', () => {
    const c = new ControleExecucao()
    c.aplicar('reproduzir')
    expect(c.aoAlterarParametro('tema')).toBeNull()
    expect(c.rodando).toBe(true)
  })

  it('parado, alterar estrutural não gera transição', () => {
    const c = new ControleExecucao('parado')
    expect(c.aoAlterarParametro('L')).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════ persistência

describe('Persistencia', () => {
  const preset = {
    versaoEsquema: 1,
    id: 'meu',
    nome: 'Meu',
    origem: 'usuario' as const,
    parametros: { alpha: 30 },
  }

  it('salva e lê presets', () => {
    const p = new Persistencia(new ArmazenamentoMemoria())
    expect(p.lerPresets()).toHaveLength(0)
    expect(p.adicionarPreset(preset)).toBe(true)
    expect(p.lerPresets()).toHaveLength(1)
    expect(p.lerPresets()[0]?.nome).toBe('Meu')
  })

  it('substitui o preset de mesmo identificador', () => {
    const p = new Persistencia(new ArmazenamentoMemoria())
    p.adicionarPreset(preset)
    p.adicionarPreset({ ...preset, nome: 'Renomeado' })
    expect(p.lerPresets()).toHaveLength(1)
    expect(p.lerPresets()[0]?.nome).toBe('Renomeado')
  })

  it('remove um preset', () => {
    const p = new Persistencia(new ArmazenamentoMemoria())
    p.adicionarPreset(preset)
    p.removerPreset('meu')
    expect(p.lerPresets()).toHaveLength(0)
  })

  it('descarta conteúdo corrompido em vez de quebrar', () => {
    const arm = new ArmazenamentoMemoria()
    arm.setItem('pendulo:presets', '{{{ não é json')
    expect(new Persistencia(arm).lerPresets()).toEqual([])
  })

  it('descarta presets inválidos guardados', () => {
    const arm = new ArmazenamentoMemoria()
    arm.setItem('pendulo:presets', JSON.stringify([{ lixo: true }]))
    expect(new Persistencia(arm).lerPresets()).toEqual([])
  })

  it('salva e lê preferências', () => {
    const p = new Persistencia(new ArmazenamentoMemoria())
    expect(p.lerPreferencias()).toEqual({})
    p.salvarPreferencias({ tema: 'escuro' })
    expect(p.lerPreferencias()['tema']).toBe('escuro')
  })

  it('preferências corrompidas devolvem objeto vazio', () => {
    const arm = new ArmazenamentoMemoria()
    arm.setItem('pendulo:preferencias', 'nada disso')
    expect(new Persistencia(arm).lerPreferencias()).toEqual({})
  })

  it('sobrevive a armazenamento que recusa escrita', () => {
    // Janela anônima e cota esgotada acontecem de verdade.
    const recusa = {
      getItem: () => null,
      setItem: () => {
        throw new Error('cota esgotada')
      },
      removeItem: () => undefined,
    }
    const p = new Persistencia(recusa)
    expect(p.adicionarPreset(preset)).toBe(false)
    expect(p.salvarPreferencias({ a: 1 })).toBe(false)
  })

  it('limpa tudo', () => {
    const p = new Persistencia(new ArmazenamentoMemoria())
    p.adicionarPreset(preset)
    p.salvarPreferencias({ tema: 'escuro' })
    p.limpar()
    expect(p.lerPresets()).toHaveLength(0)
    expect(p.lerPreferencias()).toEqual({})
  })

  it('ArmazenamentoMemoria implementa o contrato', () => {
    const a = new ArmazenamentoMemoria()
    expect(a.getItem('x')).toBeNull()
    a.setItem('x', '1')
    expect(a.getItem('x')).toBe('1')
    a.removeItem('x')
    expect(a.getItem('x')).toBeNull()
  })
})

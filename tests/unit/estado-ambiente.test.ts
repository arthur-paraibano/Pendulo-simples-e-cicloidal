/**
 * Caminhos que dependem do ambiente.
 *
 * O código roda em dois lugares — navegador e Node — e cada um exercita ramos
 * diferentes: `localStorage` e `btoa` existem em um e não no outro. Testar só
 * onde os testes rodam deixaria metade desses caminhos sem nenhuma prova.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { armazenamentoPadrao, ArmazenamentoMemoria, Persistencia } from '../../src/state/persist.js'
import { aplicarAoStore, serializar } from '../../src/state/url.js'
import { Store } from '../../src/state/store.js'
import { aplicarPreset, validarPreset } from '../../src/state/presets.js'

const global_ = globalThis as Record<string, unknown>

afterEach(() => {
  delete global_['localStorage']
})

describe('armazenamentoPadrao', () => {
  it('sem localStorage, cai para memória', () => {
    expect(armazenamentoPadrao()).toBeInstanceOf(ArmazenamentoMemoria)
  })

  it('com localStorage funcional, usa o do navegador', () => {
    const falso = new ArmazenamentoMemoria()
    global_['localStorage'] = falso
    expect(armazenamentoPadrao()).toBe(falso)
  })

  it('com localStorage que recusa escrita, cai para memória', () => {
    // É o que acontece em janela anônima e com cota esgotada: o objeto existe,
    // mas escrever lança.
    global_['localStorage'] = {
      getItem: () => null,
      setItem: () => {
        throw new Error('acesso negado')
      },
      removeItem: () => undefined,
    }
    expect(armazenamentoPadrao()).toBeInstanceOf(ArmazenamentoMemoria)
  })

  it('a persistência funciona sem receber armazenamento explícito', () => {
    const p = new Persistencia()
    expect(p.lerPresets()).toEqual([])
    expect(p.lerPreferencias()).toEqual({})
  })
})

describe('compressão do endereço nos dois ambientes', () => {
  function estadoGrande(): Store {
    const s = new Store()
    s.definirParametro('presetsUsuario', 'y'.repeat(2500))
    return s
  }

  it('usa btoa e atob quando existem, como no navegador', () => {
    expect(typeof global_['btoa']).toBe('function')
    const s = estadoGrande()
    const endereco = serializar(s)
    const volta = new Store()
    aplicarAoStore(volta, endereco)
    expect(volta.texto('presetsUsuario')).toBe('y'.repeat(2500))
  })

  it('cai para Buffer quando btoa e atob não existem', () => {
    const btoaOriginal = global_['btoa']
    const atobOriginal = global_['atob']
    delete global_['btoa']
    delete global_['atob']
    try {
      const s = estadoGrande()
      const endereco = serializar(s)
      expect(endereco).toContain('z=')
      const volta = new Store()
      aplicarAoStore(volta, endereco)
      expect(volta.texto('presetsUsuario')).toBe('y'.repeat(2500))
    } finally {
      global_['btoa'] = btoaOriginal
      global_['atob'] = atobOriginal
    }
  })
})

describe('conteúdo guardado com forma inesperada', () => {
  it('presets guardados como objeto, e não lista, devolvem lista vazia', () => {
    const arm = new ArmazenamentoMemoria()
    arm.setItem('pendulo:presets', JSON.stringify({ naoSouLista: true }))
    expect(new Persistencia(arm).lerPresets()).toEqual([])
  })

  it('preferências guardadas como valor simples devolvem objeto vazio', () => {
    const arm = new ArmazenamentoMemoria()
    arm.setItem('pendulo:preferencias', JSON.stringify(42))
    expect(new Persistencia(arm).lerPreferencias()).toEqual({})
  })

  it('preferências guardadas como nulo devolvem objeto vazio', () => {
    const arm = new ArmazenamentoMemoria()
    arm.setItem('pendulo:preferencias', 'null')
    expect(new Persistencia(arm).lerPreferencias()).toEqual({})
  })
})

describe('endereços com forma inesperada', () => {
  it('versão não numérica cai para a versão corrente', () => {
    const s = new Store()
    expect(() => aplicarAoStore(s, '#v=abc&alpha=30')).not.toThrow()
    expect(s.numero('alpha')).toBe(30)
  })

  it('múltipla escolha vazia atravessa a ida e volta', () => {
    const s = new Store()
    s.definirParametro('modelosExibidos', [])
    const endereco = serializar(s)
    expect(endereco).toContain('modelosExibidos=')
    const volta = new Store()
    aplicarAoStore(volta, endereco)
    expect(volta.bruto('modelosExibidos')).toEqual([])
  })

  it('a chave de compressão convive com as demais sem ser interpretada', () => {
    const s = new Store()
    expect(() => aplicarAoStore(s, '#v=1&z=&alpha=25')).not.toThrow()
  })
})

describe('ramos restantes de validação e escrita', () => {
  it('validarPreset recusa parâmetros vazios ou ausentes', () => {
    expect(validarPreset({ versaoEsquema: 1, id: 'x', nome: 'X' }).valido).toBe(false)
    expect(validarPreset({ versaoEsquema: 1, id: 'x', nome: 'X', parametros: null }).valido).toBe(
      false,
    )
    expect(validarPreset({ id: 'x', nome: 'X', parametros: {} }).valido).toBe(false)
  })

  it('validarPreset nomeia parâmetros desconhecidos', () => {
    const { valido, erros } = validarPreset({
      versaoEsquema: 1,
      id: 'x',
      nome: 'X',
      parametros: { naoExiste: 1 },
    })
    expect(valido).toBe(false)
    expect(erros.join(' ')).toContain('naoExiste')
  })

  it('aplicarPreset ignora parâmetros derivados sem reclamar', () => {
    const s = new Store()
    const { avisos } = aplicarPreset(s, {
      versaoEsquema: 1,
      id: 'com-derivado',
      nome: 'Com derivado',
      origem: 'arquivo',
      parametros: { alpha: 25, t: 99, Q: 5 },
    })
    expect(s.numero('alpha')).toBe(25)
    expect(avisos.join(' ')).not.toContain('t')
  })

  it('o store lê tipos não numéricos por conversão', () => {
    const s = new Store()
    expect(s.texto('N')).toBe('2')
    expect(s.booleano('N')).toBe(true)
    s.definirParametro('N', 0)
    expect(s.booleano('N')).toBe(false)
  })

  it('escreve e lê tipos compostos e de múltipla escolha', () => {
    const s = new Store()
    s.definirParametro('grade', { ligada: true, espacamento: 0.5 })
    expect(s.bruto('grade')).toEqual({ ligada: true, espacamento: 0.5 })

    s.definirParametro('modelosExibidos', ['T0', 'exato'])
    expect(s.bruto('modelosExibidos')).toEqual(['T0', 'exato'])

    // Valor único vira lista de um elemento.
    s.definirParametro('modelosExibidos', 'serie')
    expect(s.bruto('modelosExibidos')).toEqual(['serie'])
  })

  it('escreve tipos de texto e cor', () => {
    const s = new Store()
    s.definirParametro('coresPendulos', '#ff0000')
    expect(s.texto('coresPendulos')).toBe('#ff0000')
  })

  it('lotes aninhados produzem uma única notificação', () => {
    const s = new Store()
    let chamadas = 0
    s.assinar(null, () => {
      chamadas += 1
    })
    s.emLote(() => {
      s.definirParametro('alpha', 20)
      s.emLote(() => {
        s.definirParametro('L', 2)
        s.definirParametro('N', 4)
      })
    })
    expect(chamadas).toBe(1)
  })

  it('o limite dinâmico consegue estreitar o mínimo, não só o máximo', () => {
    // `faixaEfetiva` combina os dois lados; o mínimo dinâmico é o caminho
    // menos usado, mas precisa funcionar.
    const s = new Store()
    s.definirParametro('L', 1)
    const faixa = s.faixaEfetiva({
      codigo: 'X',
      id: 'alpha',
      simbolo: 'α',
      nome: 'teste',
      descricao: 'parâmetro sintético só para exercitar a combinação de faixas',
      tipo: 'numero',
      unidade: null,
      min: 0,
      max: 100,
      padrao: 0,
      grupo: 'modelo',
      nivel: 'basico',
      aliases: [],
      derivado: false,
      indexavel: false,
      aplicavelEm: ['simples'],
      afeta: ['cena'],
      limiteDinamico: () => ({ min: 20, max: 80 }),
    })
    expect(faixa.min).toBe(20)
    expect(faixa.max).toBe(80)
  })

  it('restaurarParametro recusa identificador desconhecido', () => {
    const s = new Store()
    expect(() => s.restaurarParametro('xyz')).toThrow(/desconhecido/)
  })
})

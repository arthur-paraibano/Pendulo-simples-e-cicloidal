import { describe, expect, it } from 'vitest'
import {
  analisarChave,
  chaveAcoplamento,
  chaveIndexada,
  ehChaveDeAcoplamento,
  resolverAlvo,
  rotuloIndexado,
  subscrito,
  validarIndice,
} from '../../src/state/indices.js'
import { PARAMETROS_INDEXAVEIS, POR_ID } from '../../src/state/schema.js'
import { Store } from '../../src/state/store.js'

describe('chaves de armazenamento', () => {
  it('vai e volta sem perder o identificador', () => {
    for (const p of PARAMETROS_INDEXAVEIS) {
      for (const i of [1, 2, 8]) {
        expect(analisarChave(chaveIndexada(p.id, i))).toEqual({ id: p.id, indice: i })
      }
    }
  })

  it('uma chave sem separador é o próprio valor base', () => {
    expect(analisarChave('L')).toEqual({ id: 'L', indice: null })
  })

  it('o separador não colide com nenhum identificador do catálogo', () => {
    // Se algum id contivesse '#', a análise devolveria o id truncado.
    for (const id of POR_ID.keys()) expect(id).not.toContain('#')
  })

  it('distingue a chave de acoplamento das demais', () => {
    expect(ehChaveDeAcoplamento(chaveAcoplamento('L'))).toBe(true)
    expect(ehChaveDeAcoplamento(chaveIndexada('L', 2))).toBe(false)
    expect(ehChaveDeAcoplamento('L')).toBe(false)
  })
})

describe('validarIndice', () => {
  it('aceita os índices existentes', () => {
    for (let i = 1; i <= 3; i++) expect(validarIndice(i, 3)).toBeNull()
  })

  it('nomeia o índice recebido e a faixa válida (RF-155)', () => {
    const mensagem = validarIndice(5, 3)!
    expect(mensagem).toContain('5')
    expect(mensagem).toContain('1 a 3')
  })

  it('com um único pêndulo, diz isso em vez de anunciar uma faixa de um só', () => {
    expect(validarIndice(2, 1)).toContain('apenas o pêndulo 1')
  })

  it('recusa zero, negativo e fracionário', () => {
    for (const i of [0, -1, 1.5]) expect(validarIndice(i, 3)).not.toBeNull()
  })
})

describe('resolverAlvo', () => {
  const ctx = (acoplado: boolean, numeroPendulos = 3, foco = 2) => ({
    simbolo: 'L',
    acoplado,
    numeroPendulos,
    foco,
  })

  it('sem índice e acoplado, escreve o valor compartilhado (RF-153)', () => {
    const alvo = resolverAlvo(null, ctx(true))
    expect(alvo.escreveBase).toBe(true)
    expect(alvo.indices).toEqual([])
    expect(alvo.desacopla).toBe(false)
    expect(alvo.explicacao).toContain('3 pêndulos')
  })

  it('sem índice e desacoplado, escreve só o pêndulo em foco (RF-153)', () => {
    const alvo = resolverAlvo(null, ctx(false))
    expect(alvo.escreveBase).toBe(false)
    expect(alvo.indices).toEqual([2])
    expect(alvo.explicacao).toContain('em foco')
  })

  it('com um pêndulo só, cala: não há interpretação a escolher', () => {
    expect(resolverAlvo(null, ctx(true, 1)).explicacao).toBe('')
  })

  it('com índice e acoplado, desacopla e avisa que desacoplou', () => {
    const alvo = resolverAlvo(2, ctx(true))
    expect(alvo.desacopla).toBe(true)
    expect(alvo.indices).toEqual([2])
    expect(alvo.escreveBase).toBe(false)
    expect(alvo.explicacao).toContain('desacoplado')
    expect(alvo.explicacao).toContain('L₂')
  })

  it('com índice e já desacoplado, escreve apenas aquele pêndulo', () => {
    const alvo = resolverAlvo(3, ctx(false))
    expect(alvo.desacopla).toBe(false)
    expect(alvo.indices).toEqual([3])
    expect(alvo.explicacao).toBe('L₃ aplicado ao pêndulo 3.')
  })

  it('toda interpretação vem acompanhada de explicação', () => {
    for (const acoplado of [true, false]) {
      for (const indice of [null, 1, 2]) {
        expect(resolverAlvo(indice, ctx(acoplado)).explicacao).not.toBe('')
      }
    }
  })
})

describe('notação subscrita (RF-156)', () => {
  it('converte os dígitos', () => {
    expect(subscrito(1)).toBe('₁')
    expect(subscrito(8)).toBe('₈')
    expect(subscrito(12)).toBe('₁₂')
  })

  it('o rótulo sem índice permanece o símbolo nu', () => {
    expect(rotuloIndexado('L', null)).toBe('L')
    expect(rotuloIndexado('α', 2)).toBe('α₂')
  })
})

describe('Store: valores por pêndulo (RF-151, RF-154)', () => {
  const comDois = (): Store => {
    const s = new Store()
    s.definirParametro('numeroPendulos', 2)
    return s
  }

  it('todo parâmetro indexável começa acoplado', () => {
    const s = new Store()
    for (const p of PARAMETROS_INDEXAVEIS) expect(s.acoplado(p.id)).toBe(true)
  })

  it('acoplado, todos os pêndulos leem o mesmo valor', () => {
    const s = comDois()
    s.definirParametro('L', 2)
    expect(s.numeroDoPendulo('L', 1)).toBe(2)
    expect(s.numeroDoPendulo('L', 2)).toBe(2)
  })

  it('desacoplar não muda valor nenhum, só o regime de edição', () => {
    const s = comDois()
    s.definirParametro('L', 2)
    s.definirAcoplamento('L', false)
    expect(s.numeroDoPendulo('L', 1)).toBe(2)
    expect(s.numeroDoPendulo('L', 2)).toBe(2)
  })

  it('desacoplado, os pêndulos ficam independentes', () => {
    const s = comDois()
    s.definirAcoplamento('L', false)
    s.definirIndexado('L', 2, 3)
    expect(s.numeroDoPendulo('L', 1)).toBe(1)
    expect(s.numeroDoPendulo('L', 2)).toBe(3)
  })

  it('reacoplar descarta as sobreposições e volta ao valor compartilhado', () => {
    const s = comDois()
    s.definirAcoplamento('L', false)
    s.definirIndexado('L', 2, 3)
    s.definirAcoplamento('L', true)
    expect(s.numeroDoPendulo('L', 2)).toBe(1)
  })

  it('escrever com índice estando acoplado desacopla e diz que desacoplou', () => {
    const s = comDois()
    const r = s.definirIndexado('L', 2, 3)
    expect(s.acoplado('L')).toBe(false)
    expect(r.explicacao).toContain('desacoplado')
    expect(s.numeroDoPendulo('L', 1)).toBe(1)
    expect(s.numeroDoPendulo('L', 2)).toBe(3)
  })

  it('sem índice e acoplado, alcança todos (RF-153)', () => {
    const s = comDois()
    const r = s.definirIndexado('L', null, 2)
    expect(r.explicacao).toContain('2 pêndulos')
    expect(s.numeroDoPendulo('L', 1)).toBe(2)
    expect(s.numeroDoPendulo('L', 2)).toBe(2)
  })

  it('sem índice e desacoplado, alcança só o pêndulo em foco (RF-153)', () => {
    const s = comDois()
    s.definirAcoplamento('L', false)
    s.definirParametro('penduloFoco', 2)
    const r = s.definirIndexado('L', null, 3)
    expect(r.explicacao).toContain('em foco')
    expect(s.numeroDoPendulo('L', 1)).toBe(1)
    expect(s.numeroDoPendulo('L', 2)).toBe(3)
  })

  it('índice fora da faixa não altera nada e nomeia a faixa (RF-155)', () => {
    const s = comDois()
    const r = s.definirIndexado('L', 5, 3)
    expect(r.aplicado).toBe(false)
    expect(r.mensagem).toContain('1 a 2')
    expect(s.numeroDoPendulo('L', 1)).toBe(1)
    expect(s.acoplado('L')).toBe(true)
  })

  it('parâmetro não indexável recusa índice', () => {
    const s = comDois()
    const r = s.definirIndexado('N', 2, 5)
    expect(r.aplicado).toBe(false)
    expect(r.mensagem).toContain('não existe por pêndulo')
  })

  it('parâmetro não indexável sem índice escreve normalmente', () => {
    const s = comDois()
    expect(s.definirIndexado('N', null, 5).aplicado).toBe(true)
    expect(s.numero('N')).toBe(5)
  })

  it('o foco nunca aponta para um pêndulo inexistente', () => {
    const s = comDois()
    s.definirParametro('penduloFoco', 2)
    s.definirParametro('numeroPendulos', 1)
    expect(s.numero('penduloFoco')).toBe(1)
  })

  it('a sobreposição respeita a mesma validação do valor base', () => {
    const s = comDois()
    const r = s.definirIndexado('L', 2, 999)
    expect(r.limitadoDe).toBe(999)
    expect(s.numeroDoPendulo('L', 2)).toBe(10)
  })

  it('o instantâneo carrega as sobreposições, e o Store as reconstrói', () => {
    const s = comDois()
    s.definirIndexado('L', 2, 3)
    const restaurado = new Store(s.instantaneo())
    expect(restaurado.acoplado('L')).toBe(false)
    expect(restaurado.numeroDoPendulo('L', 2)).toBe(3)
  })
})

describe('Store: altura de largada por pêndulo (RF-157 a RF-159)', () => {
  it('cada pêndulo reconcilia o seu próprio trio', () => {
    const s = new Store()
    s.definirParametro('numeroPendulos', 3)
    s.definirAcoplamento('theta0', false)
    s.definirAcoplamento('h0', false)
    s.definirAcoplamento('alpha', false)

    s.definirIndexado('h0', 2, 0.5)
    // h = L(1 − cos α) com L = 1 devolve 60°.
    expect(s.numeroDoPendulo('alpha', 2)).toBeCloseTo(60, 6)
    expect(s.numeroDoPendulo('theta0', 2)).toBeCloseTo(60, 6)
    // Os demais não se movem: é essa independência que a tautocronia mostra.
    expect(s.numeroDoPendulo('alpha', 1)).toBeCloseTo(10, 6)
    expect(s.numeroDoPendulo('alpha', 3)).toBeCloseTo(10, 6)
  })

  it('alturas diferentes por pêndulo sobrevivem à leitura (RF-159)', () => {
    const s = new Store({ modo: 'cicloidal' })
    s.definirParametro('numeroPendulos', 3)
    for (const [i, h] of [[1, 0.05], [2, 0.2], [3, 0.45]] as const) {
      s.definirIndexado('h0', i, h)
    }
    expect(s.numeroDoPendulo('h0', 1)).toBeCloseTo(0.05, 9)
    expect(s.numeroDoPendulo('h0', 2)).toBeCloseTo(0.2, 9)
    expect(s.numeroDoPendulo('h0', 3)).toBeCloseTo(0.45, 9)
  })

  it('limita a altura de um pêndulo ao topo da face cicloidal (RF-160)', () => {
    const s = new Store({ modo: 'cicloidal' })
    s.definirParametro('numeroPendulos', 2)
    const r = s.definirIndexado('h0', 2, 5)
    expect(r.limitadoDe).toBe(5)
    expect(s.numeroDoPendulo('h0', 2)).toBeCloseTo(0.5, 9)
  })
})

describe('Store: guardas do endereçamento indexado', () => {
  it('perguntar acoplamento de parâmetro sem índice é erro de programação', () => {
    const s = new Store()
    expect(() => s.acoplado('N')).toThrow(/não existe por pêndulo/)
    expect(() => s.definirAcoplamento('N', false)).toThrow(/não existe por pêndulo/)
    expect(() => s.acoplado('naoExiste')).toThrow(/desconhecido/)
  })

  it('a reconciliação de um pêndulo escreve no valor compartilhado se acoplado', () => {
    // Com o trio acoplado, mexer no pêndulo 2 é mexer em todos: é o que
    // "acoplado" significa, e o resultado tem de ser idêntico ao da via base.
    const s = new Store()
    s.definirParametro('numeroPendulos', 2)
    s.definirParametro('L', 1)
    s.definirIndexado('alpha', null, 60)
    expect(s.numeroDoPendulo('h0', 1)).toBeCloseTo(0.5, 6)
    expect(s.numeroDoPendulo('h0', 2)).toBeCloseTo(0.5, 6)
    expect(s.acoplado('h0')).toBe(true)
  })

  it('ler um parâmetro não numérico por pêndulo é recusado', () => {
    const s = new Store()
    expect(() => s.numeroDoPendulo('coresPendulos', 1)).toThrow(/não é numérico/)
  })

  it('o estado indexado exportado ignora espelhos e parâmetros acoplados', () => {
    const s = new Store()
    s.definirParametro('numeroPendulos', 2)
    expect(s.estadoIndexadoNaoPadrao()).toEqual({})
    s.definirIndexado('theta0', 2, 40)
    const exportado = s.estadoIndexadoNaoPadrao()
    expect(Object.keys(exportado).some((c) => c.startsWith('theta0#'))).toBe(true)
    expect(Object.keys(exportado).some((c) => c.startsWith('h0#'))).toBe(false)
  })

  it('aplicar estado indexado ignora chaves que não descrevem pêndulo', () => {
    const s = new Store()
    s.definirParametro('numeroPendulos', 2)
    s.aplicarEstadoIndexado({ L: 5, 'naoExiste#2': 3, '#acoplado#naoExiste': false })
    expect(s.numero('L')).toBe(1)
    expect(s.acoplado('L')).toBe(true)
  })
})

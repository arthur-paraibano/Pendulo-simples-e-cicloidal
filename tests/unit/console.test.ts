import { describe, expect, it } from 'vitest'
import { executar, interpretar } from '../../src/state/console.js'
import { Store } from '../../src/state/store.js'

describe('α = 10 — o requisito que o usuário escreveu', () => {
  it.each([
    'α = 10',
    'α=10',
    'alpha = 10',
    'alpha=10',
    'alfa = 10',
    'a = 10',
    'amplitude 10',
    'A=10',
    '  α  =  10  ',
  ])('aceita a grafia "%s"', (linha) => {
    const s = new Store()
    s.definirParametro('alpha', 45)
    const r = executar(s, linha)
    expect(r.sucesso, r.erros.join('; ')).toBe(true)
    expect(s.numero('alpha')).toBe(10)
  })
})

describe('interpretação de números', () => {
  it('aceita vírgula como separador decimal', () => {
    const s = new Store()
    executar(s, 'L=1,5')
    expect(s.numero('L')).toBe(1.5)
  })

  it('aceita ponto como separador decimal', () => {
    const s = new Store()
    executar(s, 'g = 9.81')
    expect(s.numero('g')).toBe(9.81)
  })

  it('aceita sinal e notação científica', () => {
    const s = new Store()
    executar(s, 'theta0 = -45')
    expect(s.numero('theta0')).toBe(-45)
    executar(s, 'tolerancia = 1e-9')
    expect(s.numero('tolerancia')).toBeCloseTo(1e-9, 15)
  })

  it('ignora a unidade escrita depois do número', () => {
    const s = new Store()
    executar(s, 'alpha = 30 °')
    expect(s.numero('alpha')).toBe(30)
    executar(s, 'L = 2 m')
    expect(s.numero('L')).toBe(2)
  })

  it('aceita dois-pontos como separador', () => {
    const s = new Store()
    executar(s, 'alpha: 20')
    expect(s.numero('alpha')).toBe(20)
  })
})

describe('múltiplos comandos e atomicidade', () => {
  it('aplica os quatro parâmetros de uma vez', () => {
    const s = new Store()
    const r = executar(s, 'α=10; L=1; g=9.81; N=2')
    expect(r.sucesso).toBe(true)
    expect(r.atribuicoes).toHaveLength(4)
    expect(s.numero('alpha')).toBe(10)
    expect(s.numero('L')).toBe(1)
    expect(s.numero('g')).toBe(9.81)
    expect(s.numero('N')).toBe(2)
  })

  it('uma linha inválida não aplica NENHUMA das atribuições', () => {
    const s = new Store()
    const r = executar(s, 'alpha=45; xyz=3; L=2')
    expect(r.sucesso).toBe(false)
    expect(s.numero('alpha')).toBe(10)
    expect(s.numero('L')).toBe(1)
  })

  it('nomeia o parâmetro desconhecido no erro', () => {
    const s = new Store()
    const r = executar(s, 'xyz = 3')
    expect(r.erros[0]).toContain('xyz')
  })
})

describe('limitação e mensagens', () => {
  it('limita e informa, sem recusar o comando', () => {
    const s = new Store()
    const r = executar(s, 'α = 500')
    expect(s.numero('alpha')).toBe(179.9)
    expect(r.mensagens.join(' ')).toContain('179.9')
  })

  it('recusa texto onde se espera número', () => {
    const s = new Store()
    const r = executar(s, 'alpha = muito')
    expect(r.sucesso).toBe(false)
    expect(s.numero('alpha')).toBe(10)
  })

  it('recusa escrever em parâmetro derivado', () => {
    const s = new Store()
    const r = executar(s, 't = 5')
    expect(r.sucesso).toBe(false)
    expect(r.erros.join(' ')).toContain('calculado')
  })
})

describe('booleanos e enums', () => {
  it('aceita ligado e desligado em várias formas', () => {
    const s = new Store()
    executar(s, 'rastro = 0')
    expect(s.booleano('rastro')).toBe(false)
    executar(s, 'rastro = ligado')
    expect(s.booleano('rastro')).toBe(true)
    executar(s, 'rastro = nao')
    expect(s.booleano('rastro')).toBe(false)
    executar(s, 'rastro = sim')
    expect(s.booleano('rastro')).toBe(true)
  })

  it('recusa valor booleano que não reconhece', () => {
    const s = new Store()
    const r = executar(s, 'rastro = talvez')
    expect(r.sucesso).toBe(false)
  })

  it('define enums por texto', () => {
    const s = new Store()
    executar(s, 'modo = cicloidal')
    expect(s.texto('modo')).toBe('cicloidal')
  })
})

describe('notação indexada — as anotações L₁ e h₂ do esboço', () => {
  it('aceita as três grafias do índice', () => {
    for (const linha of ['L₁ = 2', 'L1 = 2', 'L_1 = 2']) {
      const r = interpretar(linha)
      expect(r.sucesso, `${linha}: ${r.erros.join('; ')}`).toBe(true)
      expect(r.atribuicoes[0]?.id).toBe('L')
      expect(r.atribuicoes[0]?.indice).toBe(1)
    }
  })

  it('lê o segundo pêndulo', () => {
    const r = interpretar('h₂ = 0.3')
    expect(r.atribuicoes[0]?.id).toBe('h0')
    expect(r.atribuicoes[0]?.indice).toBe(2)
  })

  it('sem índice, a atribuição não carrega índice', () => {
    const r = interpretar('L = 2')
    expect(r.atribuicoes[0]?.indice).toBeUndefined()
  })

  it('não mutila nomes que terminam em número por natureza', () => {
    // `theta0` e `omega0` são identificadores, não "theta com índice 0".
    const r = interpretar('theta0 = 30')
    expect(r.atribuicoes[0]?.id).toBe('theta0')
    expect(r.atribuicoes[0]?.indice).toBeUndefined()
  })

  it('recusa índice em parâmetro que não existe por pêndulo', () => {
    const r = interpretar('N₁ = 5')
    expect(r.sucesso).toBe(false)
    expect(r.erros.join(' ')).toContain('índice')
  })
})

describe('entradas malformadas', () => {
  it('recusa linha vazia', () => {
    expect(interpretar('').sucesso).toBe(false)
    expect(interpretar('   ').sucesso).toBe(false)
  })

  it('recusa termo solto sem valor', () => {
    const r = interpretar('alpha')
    expect(r.sucesso).toBe(false)
    expect(r.erros.join(' ')).toContain('α = 10')
  })

  it('ignora ponto e vírgula sobrando', () => {
    const s = new Store()
    const r = executar(s, 'alpha = 30;;')
    expect(r.sucesso).toBe(true)
    expect(s.numero('alpha')).toBe(30)
  })
})

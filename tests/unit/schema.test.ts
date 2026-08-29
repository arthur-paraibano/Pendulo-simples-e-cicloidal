import { describe, expect, it } from 'vitest'
import {
  encontrarParametro,
  normalizarChave,
  PARAMETROS,
  PARAMETROS_EDITAVEIS,
  PARAMETROS_INDEXAVEIS,
  POR_CODIGO,
  POR_ID,
  POR_TERMO,
  valoresPadrao,
} from '../../src/state/schema.js'

describe('cobertura do catálogo', () => {
  it('declara exatamente os 112 parâmetros da spec', () => {
    expect(PARAMETROS).toHaveLength(112)
  })

  it('cobre todos os códigos de P01 a P112, sem buracos', () => {
    for (let i = 1; i <= 112; i++) {
      const codigo = `P${String(i).padStart(2, '0')}`
      expect(POR_CODIGO.has(codigo), `faltando ${codigo}`).toBe(true)
    }
  })

  it('não tem código repetido', () => {
    const codigos = PARAMETROS.map((p) => p.codigo)
    expect(new Set(codigos).size).toBe(codigos.length)
  })

  it('não tem identificador repetido', () => {
    const ids = PARAMETROS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('invariantes de cada parâmetro', () => {
  it('respeita min ≤ padrão ≤ max em todo numérico', () => {
    for (const p of PARAMETROS) {
      if (p.tipo !== 'numero' && p.tipo !== 'inteiro') continue
      expect(typeof p.padrao, `${p.codigo} ${p.id}`).toBe('number')
      const padrao = p.padrao as number
      expect(p.min, `${p.codigo} sem mínimo`).toBeDefined()
      expect(p.max, `${p.codigo} sem máximo`).toBeDefined()
      expect(p.min!, `${p.codigo}: min > max`).toBeLessThanOrEqual(p.max!)
      expect(padrao, `${p.codigo}: padrão abaixo do mínimo`).toBeGreaterThanOrEqual(p.min!)
      expect(padrao, `${p.codigo}: padrão acima do máximo`).toBeLessThanOrEqual(p.max!)
    }
  })

  it('tem passo positivo em todo numérico', () => {
    for (const p of PARAMETROS) {
      if (p.tipo !== 'numero' && p.tipo !== 'inteiro') continue
      expect(p.passo, `${p.codigo}`).toBeGreaterThan(0)
    }
  })

  it('tem nome, símbolo e descrição preenchidos', () => {
    for (const p of PARAMETROS) {
      expect(p.simbolo.trim(), `${p.codigo}`).not.toBe('')
      expect(p.nome.trim(), `${p.codigo}`).not.toBe('')
      expect(p.descricao.trim().length, `${p.codigo} sem descrição útil`).toBeGreaterThan(10)
    }
  })

  it('todo enum tem opções e o padrão está entre elas', () => {
    for (const p of PARAMETROS) {
      if (p.tipo !== 'enum') continue
      expect(p.opcoes, `${p.codigo}`).toBeDefined()
      expect(p.opcoes!.length, `${p.codigo}`).toBeGreaterThan(1)
      const valores = p.opcoes!.map((o) => o.valor)
      expect(valores, `${p.codigo}: padrão fora das opções`).toContain(p.padrao)
      expect(new Set(valores).size, `${p.codigo}: opção repetida`).toBe(valores.length)
    }
  })

  it('declara ao menos um efeito', () => {
    for (const p of PARAMETROS) {
      expect(p.afeta.length, `${p.codigo}`).toBeGreaterThan(0)
    }
  })

  it('declara os modos em que se aplica', () => {
    for (const p of PARAMETROS) {
      expect(p.aplicavelEm.length, `${p.codigo}`).toBeGreaterThan(0)
    }
  })
})

describe('termos de busca do console', () => {
  it('nenhum termo colide entre parâmetros diferentes', () => {
    // Uma colisão faria "α = 10" escrever no parâmetro errado — silenciosamente.
    const vistos = new Map<string, string>()
    for (const p of PARAMETROS) {
      for (const termo of [p.id, p.simbolo, p.nome, ...p.aliases]) {
        const chave = normalizarChave(termo)
        if (chave === '') continue
        const dono = vistos.get(chave)
        if (dono !== undefined && dono !== p.id) {
          throw new Error(`Termo "${termo}" é ambíguo entre "${dono}" e "${p.id}".`)
        }
        vistos.set(chave, p.id)
      }
    }
    expect(vistos.size).toBeGreaterThan(112)
  })

  it('encontra os parâmetros centrais por várias grafias', () => {
    expect(encontrarParametro('α')?.id).toBe('alpha')
    expect(encontrarParametro('alpha')?.id).toBe('alpha')
    expect(encontrarParametro('alfa')?.id).toBe('alpha')
    expect(encontrarParametro('a')?.id).toBe('alpha')
    expect(encontrarParametro('amplitude')?.id).toBe('alpha')
    expect(encontrarParametro('L')?.id).toBe('L')
    expect(encontrarParametro('comprimento')?.id).toBe('L')
    expect(encontrarParametro('g')?.id).toBe('g')
    expect(encontrarParametro('gravidade')?.id).toBe('g')
    expect(encontrarParametro('N')?.id).toBe('N')
  })

  it('ignora caixa, acento e espaço nas bordas', () => {
    expect(encontrarParametro('  GRAVIDADE  ')?.id).toBe('g')
    expect(encontrarParametro('Amplitude Angular Inicial')?.id).toBe('alpha')
  })

  it('devolve indefinido para termo desconhecido', () => {
    expect(encontrarParametro('xyz')).toBeUndefined()
    expect(encontrarParametro('')).toBeUndefined()
  })

  it('o índice de termos cobre todos os identificadores', () => {
    for (const p of PARAMETROS) {
      expect(POR_TERMO.get(normalizarChave(p.id)), `${p.codigo}`).toBe(p.id)
    }
  })
})

describe('parâmetros centrais têm os valores da spec', () => {
  it.each([
    ['alpha', 'α', '°', 0, 179.9, 10],
    ['L', 'L', 'm', 0.05, 10, 1],
    ['g', 'g', 'm/s²', 0.01, 300, 9.81],
  ])('%s tem faixa e padrão corretos', (id, simbolo, unidade, min, max, padrao) => {
    const p = POR_ID.get(id)!
    expect(p.simbolo).toBe(simbolo)
    expect(p.unidade).toBe(unidade)
    expect(p.min).toBe(min)
    expect(p.max).toBe(max)
    expect(p.padrao).toBe(padrao)
  })

  it('N tem padrão 2 — a fórmula entregue pelo usuário', () => {
    const N = POR_ID.get('N')!
    expect(N.padrao).toBe(2)
    expect(N.min).toBe(0)
    expect(N.max).toBe(50)
  })

  it('o modo padrão é simples', () => {
    expect(POR_ID.get('modo')!.padrao).toBe('simples')
  })

  it('o painel da fórmula vem ligado — é a interface', () => {
    expect(POR_ID.get('painelFormula')!.padrao).toBe(true)
  })
})

describe('classificações', () => {
  it('separa editáveis de derivados', () => {
    expect(PARAMETROS_EDITAVEIS.length).toBeLessThan(PARAMETROS.length)
    for (const p of PARAMETROS_EDITAVEIS) expect(p.derivado).toBe(false)
  })

  it('marca como indexáveis os que existem por pêndulo', () => {
    const ids = PARAMETROS_INDEXAVEIS.map((p) => p.id)
    // Origem: as anotações L₁ e h₂ do esboço do usuário.
    expect(ids).toContain('L')
    expect(ids).toContain('alpha')
    expect(ids).toContain('g')
    expect(ids).toContain('h0')
    expect(ids).toContain('m')
  })

  it('distribui os parâmetros entre todos os grupos', () => {
    const grupos = new Set(PARAMETROS.map((p) => p.grupo))
    expect(grupos.size).toBe(10)
  })

  it('tem mais parâmetros básicos que avançados na cena principal', () => {
    const basicos = PARAMETROS.filter((p) => p.nivel === 'basico')
    expect(basicos.length).toBeGreaterThan(30)
  })
})

describe('o padrão declarado sobrevive à própria validação', () => {
  it('nenhum padrão numérico muda ao passar pela quantização', async () => {
    // Se o padrão declarado não for representável na precisão declarada, ele
    // apareceria eternamente como "não padrão" — e a ida e volta pela URL
    // nunca fecharia. Foi assim que h₀ e Δt foram pegos.
    const { Store } = await import('../../src/state/store.js')
    const s = new Store()
    for (const p of PARAMETROS) {
      if (p.derivado) continue
      if (p.tipo !== 'numero' && p.tipo !== 'inteiro') continue
      const r = s.definirParametro(p.id, p.padrao)
      expect(r.valor, `${p.codigo} ${p.id} (precisão ${String(p.precisao)})`).toBe(p.padrao)
    }
  })
})

describe('valoresPadrao', () => {
  it('devolve um valor para cada parâmetro', () => {
    const padroes = valoresPadrao()
    expect(Object.keys(padroes)).toHaveLength(112)
    for (const p of PARAMETROS) {
      expect(padroes[p.id], `${p.codigo}`).toEqual(p.padrao)
    }
  })

  it('devolve cópias independentes a cada chamada', () => {
    const a = valoresPadrao()
    const b = valoresPadrao()
    a['alpha'] = 45
    expect(b['alpha']).toBe(10)
  })
})

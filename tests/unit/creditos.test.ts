import { describe, expect, it } from 'vitest'
import {
  AFIRMACOES,
  afirmacoesSemFonte,
  buscarFonte,
  FONTES,
  fontesDaCategoria,
  ORDEM_CATEGORIAS,
  ROTULO_CATEGORIA,
} from '../../src/state/creditos.js'
import { MODELOS_APROXIMACAO } from '../../src/physics/approximations.js'
import {
  G_JUPITER,
  G_LUA,
  G_PLANETA_X,
  G_TERRA,
  LIMIAR_CONFIANCA_BOA_GRAUS,
  LIMIAR_CONFIANCA_EXCELENTE_GRAUS,
  LIMIAR_CONFIANCA_LIMITADA_GRAUS,
  SATURACAO_N2,
} from '../../src/physics/constants.js'

const valorDe = (id: string): string => {
  const afirmacao = AFIRMACOES.find((a) => a.id === id)
  expect(afirmacao, `afirmação ausente: ${id}`).toBeDefined()
  return afirmacao!.valor
}

describe('Créditos — catálogo de fontes (RF-125)', () => {
  it('não repete identificadores', () => {
    const ids = FONTES.map((fonte) => fonte.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('dá título e detalhe a toda fonte, para que alguém encontre o original', () => {
    for (const fonte of FONTES) {
      expect(fonte.titulo.length, fonte.id).toBeGreaterThan(0)
      expect(fonte.detalhe.length, fonte.id).toBeGreaterThan(0)
    }
  })

  it('cita os três materiais que originaram o produto', () => {
    const materiais = fontesDaCategoria('material')
    const detalhes = materiais.map((fonte) => fonte.detalhe).join(' ')
    expect(detalhes).toContain('formula simples.jpeg')
    expect(detalhes).toContain('formula completa.jpeg')
    expect(detalhes).toContain('formula geral.jpeg')
    expect(detalhes).toContain('mhd_zykloidenpendel.pdf')
  })

  it('cita as duas simulações de referência com endereço', () => {
    const simulacoes = fontesDaCategoria('simulacao')
    expect(simulacoes.map((fonte) => fonte.id).sort()).toEqual(['geogebra', 'phet'])
    for (const fonte of simulacoes) expect(fonte.url).toMatch(/^https:\/\//)
  })

  it('distribui toda fonte por uma categoria apresentável', () => {
    const agrupadas = ORDEM_CATEGORIAS.flatMap((categoria) => fontesDaCategoria(categoria))
    expect(agrupadas.length).toBe(FONTES.length)
    for (const categoria of ORDEM_CATEGORIAS) {
      expect(ROTULO_CATEGORIA[categoria].length).toBeGreaterThan(0)
    }
  })

  it('devolve indefinido para fonte inexistente, em vez de inventar uma', () => {
    expect(buscarFonte('fonte-que-nao-existe')).toBeUndefined()
  })
})

describe('Créditos — rastreabilidade numérica (RNF-021)', () => {
  it('não deixa nenhuma afirmação sem fonte', () => {
    // Este é o portão do RNF-021. Lista vazia é a única saída aceitável.
    expect(afirmacoesSemFonte().map((a) => a.id)).toEqual([])
  })

  it('não repete identificadores de afirmação', () => {
    const ids = AFIRMACOES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('mostra os valores de gravidade que a aplicação de fato usa', () => {
    // Duas casas em todos, inclusive no 14,2 do Planeta X: a coluna fica
    // alinhada e ninguém lê precisão diferente onde não há.
    const comoExibido = (g: number): string => `${g.toFixed(2).replace('.', ',')} m/s²`
    expect(valorDe('gravidade-lua')).toBe(comoExibido(G_LUA))
    expect(valorDe('gravidade-terra')).toBe(comoExibido(G_TERRA))
    expect(valorDe('gravidade-jupiter')).toBe(comoExibido(G_JUPITER))
    expect(valorDe('gravidade-planeta-x')).toBe(comoExibido(G_PLANETA_X))
    expect(valorDe('gravidade-planeta-x')).toBe('14,20 m/s²')
  })

  it('atribui os valores de gravidade ao PhET, de onde vieram', () => {
    for (const id of ['gravidade-lua', 'gravidade-terra', 'gravidade-jupiter', 'gravidade-planeta-x']) {
      expect(AFIRMACOES.find((a) => a.id === id)?.fonte, id).toBe('phet')
    }
  })

  it('mostra os limiares de confiança com as três casas que os distinguem', () => {
    expect(valorDe('limiar-excelente')).toBe(
      `${LIMIAR_CONFIANCA_EXCELENTE_GRAUS.toFixed(3).replace('.', ',')}°`,
    )
    expect(valorDe('limiar-boa')).toBe(
      `${LIMIAR_CONFIANCA_BOA_GRAUS.toFixed(3).replace('.', ',')}°`,
    )
    expect(valorDe('limiar-limitada')).toBe(
      `${LIMIAR_CONFIANCA_LIMITADA_GRAUS.toFixed(3).replace('.', ',')}°`,
    )
  })

  it('mostra a saturação de N = 2 pelo valor exato de 89/64', () => {
    expect(SATURACAO_N2).toBe(89 / 64)
    expect(valorDe('saturacao-n2')).toBe('1,390625')
  })

  it('usa vírgula decimal, como o resto da interface (RNF-018)', () => {
    for (const afirmacao of AFIRMACOES) {
      // A exceção são as fórmulas em LaTeX, onde não há número decimal a formatar.
      if (afirmacao.latex === true) continue
      expect(afirmacao.valor, afirmacao.id).not.toMatch(/\d\.\d/)
    }
  })

  it('credita cada aproximação selecionável à sua referência bibliográfica', () => {
    // O vínculo é derivado, não digitado: um modelo novo aparece aqui sozinho.
    // É isto que impede uma aproximação de entrar no produto sem procedência.
    for (const modelo of MODELOS_APROXIMACAO) {
      const afirmacao = AFIRMACOES.find((a) => a.id === `formula:${modelo.id}`)
      expect(afirmacao, modelo.id).toBeDefined()
      expect(afirmacao!.valor).toBe(modelo.latex)
      // Sem esta marca a interface mostraria o LaTeX cru na célula.
      expect(afirmacao!.latex, modelo.id).toBe(true)

      const fonte = buscarFonte(afirmacao!.fonte)
      expect(fonte, modelo.id).toBeDefined()
      expect(fonte!.categoria).toBe('bibliografia')
      expect(fonte!.detalhe).toBe(modelo.fonte)
    }
  })

  it('diz o sentido do desvio de cada aproximação', () => {
    const notas = MODELOS_APROXIMACAO.map(
      (modelo) => AFIRMACOES.find((a) => a.id === `formula:${modelo.id}`)?.nota ?? '',
    )
    expect(notas.some((nota) => nota.startsWith('Superestima'))).toBe(true)
    expect(notas.some((nota) => nota.startsWith('Subestima'))).toBe(true)
  })

  it('credita a Huygens o vínculo geométrico do modo cicloidal', () => {
    expect(valorDe('fio-por-raio')).toBe('L = 4r')
    expect(AFIRMACOES.find((a) => a.id === 'fio-por-raio')?.fonte).toBe('huygens')
    expect(valorDe('amplitude-maxima-cicloidal')).toBe('90°')
  })
})

import { describe, expect, it } from 'vitest'
import { formatarNumero, formatarUnidade, obterDicionario, t } from '../../src/i18n/index.js'
import { ptBR } from '../../src/i18n/pt-BR.js'
import { en } from '../../src/i18n/en.js'
import { de } from '../../src/i18n/de.js'
import { Store } from '../../src/state/store.js'

function extrairCaminhosChaves(obj: Record<string, unknown>, prefixo = ''): string[] {
  const chaves: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const caminho = prefixo ? `${prefixo}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      chaves.push(...extrairCaminhosChaves(v as Record<string, unknown>, caminho))
    } else {
      chaves.push(caminho)
    }
  }
  return chaves.sort()
}

describe('i18n: Paridade de dicionários (T115 e T116)', () => {
  const chavesPt = extrairCaminhosChaves(ptBR as unknown as Record<string, unknown>)
  const chavesEn = extrairCaminhosChaves(en as unknown as Record<string, unknown>)
  const chavesDe = extrairCaminhosChaves(de as unknown as Record<string, unknown>)

  it('dicionário pt-BR possui chaves essenciais', () => {
    expect(chavesPt.length).toBeGreaterThan(50)
    expect(ptBR.geral.titulo).toBe('Pêndulo — Fórmula Completa')
    expect(ptBR.modos.simples).toBe('Simples')
    expect(ptBR.modos.cicloidal).toBe('Cicloidal')
    expect(ptBR.modos.ambos).toBe('Ambos')
  })

  it('dicionário en possui 100% de paridade com pt-BR', () => {
    const faltando = chavesPt.filter((c) => !chavesEn.includes(c))
    const sobrando = chavesEn.filter((c) => !chavesPt.includes(c))
    expect(faltando, `Chaves faltando em 'en': ${faltando.join(', ')}`).toEqual([])
    expect(sobrando, `Chaves sobrando em 'en': ${sobrando.join(', ')}`).toEqual([])
  })

  it('dicionário de possui 100% de paridade com pt-BR', () => {
    const faltando = chavesPt.filter((c) => !chavesDe.includes(c))
    const sobrando = chavesDe.filter((c) => !chavesPt.includes(c))
    expect(faltando, `Chaves faltando em 'de': ${faltando.join(', ')}`).toEqual([])
    expect(sobrando, `Chaves sobrando em 'de': ${sobrando.join(', ')}`).toEqual([])
  })

  it('obterDicionario devolve dicionário correto ou pt-BR por fallback', () => {
    expect(obterDicionario('pt-BR')).toBe(ptBR)
    expect(obterDicionario('en')).toBe(en)
    expect(obterDicionario('de')).toBe(de)
    expect(obterDicionario('es')).toBe(ptBR)
  })
})

describe('i18n: Função de tradução t()', () => {
  it('traduz chaves com interpolação de parâmetros', () => {
    expect(t('modos.simples', undefined, 'pt-BR')).toBe('Simples')
    expect(t('modos.simples', undefined, 'en')).toBe('Simple')
    expect(t('modos.simples', undefined, 'de')).toBe('Einfach')
  })

  it('interpola parâmetros nomeados {parametro}', () => {
    const textoPt = t('acoes.restaurarParametro', { simbolo: 'α' }, 'pt-BR')
    expect(textoPt).toContain('α')
    const textoEn = t('acoes.restaurarParametro', { simbolo: 'α' }, 'en')
    expect(textoEn).toContain('α')
  })
})

describe('i18n: Formatação numérica e de unidades por localidade', () => {
  it('formata separador decimal conforme o idioma', () => {
    expect(formatarNumero(9.81, 'pt-BR', 2)).toBe('9,81')
    expect(formatarNumero(9.81, 'en', 2)).toBe('9.81')
    expect(formatarNumero(9.81, 'de', 2)).toBe('9,81')
  })

  it('formata unidades nos três idiomas', () => {
    expect(formatarUnidade('m', 'pt-BR')).toBe('metros')
    expect(formatarUnidade('m', 'en')).toBe('meters')
    expect(formatarUnidade('m', 'de')).toBe('Meter')

    expect(formatarUnidade('s', 'pt-BR')).toBe('segundos')
    expect(formatarUnidade('s', 'en')).toBe('seconds')
    expect(formatarUnidade('s', 'de')).toBe('Sekunden')

    expect(formatarUnidade('°', 'pt-BR')).toBe('graus')
    expect(formatarUnidade('°', 'en')).toBe('degrees')
    expect(formatarUnidade('°', 'de')).toBe('Grad')
  })
})

describe('i18n: Integração com Store (RF-115)', () => {
  it('trocar idioma no store preserva todos os outros parâmetros', () => {
    const s = new Store({ alpha: 45, L: 1.5, g: 9.81, N: 3 })
    expect(s.texto('idioma')).toBe('pt-BR')
    expect(s.numero('alpha')).toBe(45)

    s.definirParametro('idioma', 'en')
    expect(s.texto('idioma')).toBe('en')
    expect(s.numero('alpha')).toBe(45)
    expect(s.numero('L')).toBe(1.5)
    expect(s.numero('g')).toBe(9.81)
    expect(s.numero('N')).toBe(3)

    s.definirParametro('idioma', 'de')
    expect(s.texto('idioma')).toBe('de')
    expect(s.numero('alpha')).toBe(45)
  })
})

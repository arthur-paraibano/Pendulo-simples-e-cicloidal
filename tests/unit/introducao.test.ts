import { describe, expect, it } from 'vitest'
import {
  CHAVE_INTRODUCAO_VISTA,
  deveMostrarIntroducao,
  marcarIntroducaoVista,
  TITULO_INTRODUCAO,
  TRECHOS_INTRODUCAO,
} from '../../src/state/introducao.js'
import { ArmazenamentoMemoria, Persistencia } from '../../src/state/persist.js'

describe('Orientação de primeiro uso (RF-126)', () => {
  it('aparece quando não há preferência nenhuma gravada', () => {
    expect(deveMostrarIntroducao({})).toBe(true)
  })

  it('não volta depois de dispensada', () => {
    const depois = marcarIntroducaoVista({})
    expect(deveMostrarIntroducao(depois)).toBe(false)
  })

  it('não altera as preferências que recebe', () => {
    const antes: Record<string, unknown> = { tema: 'escuro' }
    const depois = marcarIntroducaoVista(antes)
    expect(antes[CHAVE_INTRODUCAO_VISTA]).toBeUndefined()
    expect(depois['tema']).toBe('escuro')
  })

  it('ignora marcador de outro tipo, em vez de aceitá-lo como dispensa', () => {
    // Preferências vêm de JSON gravado por versões antigas ou por mão alheia.
    // Só o booleano verdadeiro conta como dispensada; qualquer outra coisa
    // erra a favor de mostrar a orientação, que é o dano menor.
    expect(deveMostrarIntroducao({ [CHAVE_INTRODUCAO_VISTA]: 'sim' })).toBe(true)
    expect(deveMostrarIntroducao({ [CHAVE_INTRODUCAO_VISTA]: 1 })).toBe(true)
    expect(deveMostrarIntroducao({ [CHAVE_INTRODUCAO_VISTA]: false })).toBe(true)
  })

  it('sobrevive à ida e volta pelo armazenamento', () => {
    const persistencia = new Persistencia(new ArmazenamentoMemoria())
    expect(deveMostrarIntroducao(persistencia.lerPreferencias())).toBe(true)

    persistencia.salvarPreferencias(marcarIntroducaoVista(persistencia.lerPreferencias()))
    expect(deveMostrarIntroducao(persistencia.lerPreferencias())).toBe(false)
  })

  it('preserva as demais preferências ao gravar a dispensa', () => {
    const persistencia = new Persistencia(new ArmazenamentoMemoria())
    persistencia.salvarPreferencias({ tema: 'escuro' })
    persistencia.salvarPreferencias(marcarIntroducaoVista(persistencia.lerPreferencias()))
    expect(persistencia.lerPreferencias()['tema']).toBe('escuro')
  })

  it('mantém a orientação curta o bastante para ser lida na abertura', () => {
    expect(TITULO_INTRODUCAO.length).toBeGreaterThan(0)
    expect(TRECHOS_INTRODUCAO.length).toBeGreaterThan(0)
    expect(TRECHOS_INTRODUCAO.length).toBeLessThanOrEqual(4)
    for (const trecho of TRECHOS_INTRODUCAO) {
      expect(trecho.titulo.length, trecho.titulo).toBeGreaterThan(0)
      expect(trecho.texto.length, trecho.titulo).toBeLessThanOrEqual(260)
    }
  })
})

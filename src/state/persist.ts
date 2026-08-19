/**
 * Persistência local de presets e preferências.
 *
 * O armazenamento entra por **injeção**, não por acesso direto a
 * `localStorage`: assim a camada é testável no Node e o comportamento fica
 * definido quando o navegador nega o acesso — o que acontece de verdade em
 * janelas anônimas e com cota esgotada.
 */

import type { Preset } from './presets.js'
import { validarPreset } from './presets.js'

export interface Armazenamento {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

const CHAVE_PRESETS = 'pendulo:presets'
const CHAVE_PREFERENCIAS = 'pendulo:preferencias'

/** Armazenamento em memória — o padrão quando não há `localStorage`. */
export class ArmazenamentoMemoria implements Armazenamento {
  private readonly dados = new Map<string, string>()

  getItem(chave: string): string | null {
    return this.dados.get(chave) ?? null
  }

  setItem(chave: string, valor: string): void {
    this.dados.set(chave, valor)
  }

  removeItem(chave: string): void {
    this.dados.delete(chave)
  }
}

/** Devolve o `localStorage` quando existir e estiver acessível. */
export function armazenamentoPadrao(): Armazenamento {
  const g = globalThis as { localStorage?: Armazenamento }
  const local = g.localStorage
  if (local === undefined) return new ArmazenamentoMemoria()
  try {
    // Janela anônima pode expor o objeto e recusar a escrita.
    local.setItem('pendulo:teste', '1')
    local.removeItem('pendulo:teste')
    return local
  } catch {
    return new ArmazenamentoMemoria()
  }
}

export class Persistencia {
  constructor(private readonly armazenamento: Armazenamento = armazenamentoPadrao()) {}

  /** Presets do usuário guardados localmente. Formato corrompido devolve lista vazia. */
  lerPresets(): Preset[] {
    const bruto = this.armazenamento.getItem(CHAVE_PRESETS)
    if (bruto === null) return []
    try {
      const analisado: unknown = JSON.parse(bruto)
      if (!Array.isArray(analisado)) return []
      return analisado.filter((p) => validarPreset(p).valido) as Preset[]
    } catch {
      return []
    }
  }

  salvarPresets(presets: readonly Preset[]): boolean {
    try {
      this.armazenamento.setItem(CHAVE_PRESETS, JSON.stringify(presets))
      return true
    } catch {
      // Cota esgotada: a interface avisa, e a sessão continua funcionando.
      return false
    }
  }

  adicionarPreset(preset: Preset): boolean {
    const atuais = this.lerPresets().filter((p) => p.id !== preset.id)
    atuais.push(preset)
    return this.salvarPresets(atuais)
  }

  removerPreset(id: string): boolean {
    return this.salvarPresets(this.lerPresets().filter((p) => p.id !== id))
  }

  lerPreferencias(): Record<string, unknown> {
    const bruto = this.armazenamento.getItem(CHAVE_PREFERENCIAS)
    if (bruto === null) return {}
    try {
      const analisado: unknown = JSON.parse(bruto)
      return typeof analisado === 'object' && analisado !== null
        ? (analisado as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }

  salvarPreferencias(preferencias: Readonly<Record<string, unknown>>): boolean {
    try {
      this.armazenamento.setItem(CHAVE_PREFERENCIAS, JSON.stringify(preferencias))
      return true
    } catch {
      return false
    }
  }

  limpar(): void {
    this.armazenamento.removeItem(CHAVE_PRESETS)
    this.armazenamento.removeItem(CHAVE_PREFERENCIAS)
  }
}

/**
 * A série de Bernoulli/Legendre — o coração do produto.
 *
 *     T / T₀ = Σ_{n=0..∞} a_n · sen^{2n}(α/2)      a_n = [C(2n,n)/4ⁿ]²
 *            = 1 + ¼·sen²(α/2) + (9/64)·sen⁴(α/2) + …
 *
 * Truncada em `N = 2`, é exatamente a fórmula entregue pelo usuário.
 *
 * O fator `χ(n, modo)` é o Princípio IV em código: uma única expressão, dois
 * regimes. No modo cicloidal os termos de n ≥ 1 são identicamente nulos — não
 * por truque algébrico, mas porque a restrição geométrica torna o movimento
 * harmônico exato.
 */

import { N_MAXIMO } from './constants.js'
import { razaoPeriodoExata } from './elliptic.js'
import type { ModoPendulo, TermoSerie } from './types.js'
import { exigirInteiroNaFaixa, segundo, type Rad, type Segundo } from './units.js'

/**
 * χ(n, modo) — quais termos estão acesos.
 *
 * Simples: todos. Cicloidal: apenas n = 0.
 */
export function fatorModo(n: number, modo: ModoPendulo): 0 | 1 {
  if (modo === 'cicloidal') return n === 0 ? 1 : 0
  return 1
}

/**
 * a_n = [C(2n,n)/4ⁿ]², por **recorrência**:
 *
 *     a₀ = 1        a_n = a_{n−1} · ((2n−1)/(2n))²
 *
 * A recorrência é obrigatória (constituição, Princípio I, regra 2): calcular
 * por fatoriais estoura o `double` a partir de n = 86, e escrever os valores
 * como literais avulsos é justamente o que a regra proíbe.
 */
export function coeficienteSerie(n: number): number {
  exigirInteiroNaFaixa('n', n, 0, N_MAXIMO)
  let a = 1
  for (let i = 1; i <= n; i++) {
    const razao = (2 * i - 1) / (2 * i)
    a *= razao * razao
  }
  return a
}

/** Forma exata do coeficiente, para exibição: `coeficienteSerieFracao(2) === '9/64'`. */
export function coeficienteSerieFracao(n: number): string {
  exigirInteiroNaFaixa('n', n, 0, N_MAXIMO)
  let num = 1n
  let den = 1n
  for (let i = 1n; i <= BigInt(n); i++) {
    num *= (2n * i - 1n) ** 2n
    den *= (2n * i) ** 2n
  }
  const divisor = mdc(num, den)
  num /= divisor
  den /= divisor
  return den === 1n ? `${num}` : `${num}/${den}`
}

/** Máximo divisor comum. Só recebe positivos: numerador e denominador são quadrados. */
function mdc(a: bigint, b: bigint): bigint {
  let x = a
  let y = b
  while (y) [x, y] = [y, x % y]
  return x
}

/**
 * S(α, N, modo) = Σ_{n=0..N} a_n · sen^{2n}(α/2) · χ(n, modo).
 *
 * Vale `1` exatamente quando N = 0, quando α = 0, ou em todo o modo cicloidal.
 */
export function somatorioSerie(alpha: Rad, N: number, modo: ModoPendulo): number {
  exigirInteiroNaFaixa('N', N, 0, N_MAXIMO)
  if (modo === 'cicloidal') return 1

  const k = Math.sin(Math.abs(alpha) / 2)
  const k2 = k * k
  let soma = 0
  let potencia = 1 // sen^{2n}(α/2)
  for (let n = 0; n <= N; n++) {
    soma += coeficienteSerie(n) * potencia
    potencia *= k2
  }
  return soma
}

/** Decomposição termo a termo, para o painel da fórmula (RF-133). */
export function termosSerie(
  alpha: Rad,
  N: number,
  modo: ModoPendulo,
  T0: Segundo = segundo(1),
): TermoSerie[] {
  exigirInteiroNaFaixa('N', N, 0, N_MAXIMO)

  const k = Math.sin(Math.abs(alpha) / 2)
  const k2 = k * k
  const termos: TermoSerie[] = []
  let fatorSeno = 1

  for (let n = 0; n <= N; n++) {
    const ativo = fatorModo(n, modo) === 1
    const coeficiente = coeficienteSerie(n)
    const contribuicao = ativo ? coeficiente * fatorSeno : 0
    termos.push({
      n,
      coeficiente,
      coeficienteFracao: coeficienteSerieFracao(n),
      fatorSeno,
      contribuicao,
      contribuicaoTempo: segundo(T0 * contribuicao),
      ativo,
      idSlot: `termo-${n}`,
    })
    fatorSeno *= k2
  }
  return termos
}

/**
 * Limite de S quando α → 180°, isto é Σ_{n≤N} a_n.
 *
 * Com N = 2 vale 89/64 ≈ 1,390625: a série truncada **satura** enquanto o
 * período real diverge (RF-008). A truncagem não apenas erra — erra de forma
 * qualitativamente diferente do fenômeno, e isso precisa ficar visível.
 */
export function saturacaoSerie(N: number): number {
  exigirInteiroNaFaixa('N', N, 0, N_MAXIMO)
  let soma = 0
  for (let n = 0; n <= N; n++) soma += coeficienteSerie(n)
  return soma
}

/**
 * Menor N cujo erro relativo em relação ao valor exato fica abaixo de `erroAlvo`.
 *
 * @returns o N mínimo, ou `-1` se não convergir dentro do teto de busca.
 */
export function termosNecessarios(alpha: Rad, erroAlvo: number, tetoN = 500): number {
  if (!Number.isFinite(erroAlvo) || erroAlvo <= 0 || erroAlvo >= 1) {
    throw new ErroAlvoInvalido(erroAlvo)
  }
  const exato = razaoPeriodoExata(alpha)
  const k = Math.sin(Math.abs(alpha) / 2)
  const k2 = k * k

  let soma = 0
  let potencia = 1
  let a = 1
  for (let n = 0; n <= tetoN; n++) {
    if (n > 0) {
      const razao = (2 * n - 1) / (2 * n)
      a *= razao * razao
    }
    soma += a * potencia
    potencia *= k2
    if (Math.abs(soma - exato) / exato < erroAlvo) return n
  }
  return -1
}

class ErroAlvoInvalido extends Error {
  constructor(valor: number) {
    super(`Erro alvo deve estar em (0, 1); recebido ${valor}.`)
    this.name = 'ErroAlvoInvalido'
  }
}

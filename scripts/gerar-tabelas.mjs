#!/usr/bin/env node
/**
 * Gerador das tabelas-ouro (T011).
 *
 * IMPORTANTE — este script NÃO importa nada de `src/`. Ele reimplementa a
 * matemática por caminho diferente do usado no motor, de propósito:
 *
 *   - os coeficientes saem de binomiais em BigInt (o motor usa recorrência);
 *   - a razão exata sai do AGM, e é conferida contra quadratura numérica da
 *     integral elíptica, que é um caminho totalmente distinto.
 *
 * Uma tabela-ouro gerada pelo mesmo código que ela deveria auditar não prova
 * nada. Os valores aqui produzidos foram ainda conferidos em Python, em
 * `research.md`, antes de virarem teste.
 *
 * Uso: node scripts/gerar-tabelas.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs'

const SAIDA = 'tests/golden/periodo.snap.json'

// ── Coeficientes por binomial exato em BigInt ────────────────────────────────
function fatorial(n) {
  let r = 1n
  for (let i = 2n; i <= BigInt(n); i++) r *= i
  return r
}

function mdc(a, b) {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) [a, b] = [b, a % b]
  return a
}

/** a_n = [C(2n,n) / 4^n]^2, em fração exata reduzida. */
function coeficienteFracao(n) {
  const central = fatorial(2 * n) / (fatorial(n) * fatorial(n))
  const quatroN = 4n ** BigInt(n)
  const g1 = mdc(central, quatroN)
  const num = (central / g1) ** 2n
  const den = (quatroN / g1) ** 2n
  const g2 = mdc(num, den)
  return { num: num / g2, den: den / g2 }
}

function coeficiente(n) {
  const { num, den } = coeficienteFracao(n)
  return Number(num) / Number(den)
}

// ── Série truncada ───────────────────────────────────────────────────────────
function somatorio(alphaGraus, N) {
  const k = Math.sin((alphaGraus * Math.PI) / 180 / 2)
  let soma = 0
  for (let n = 0; n <= N; n++) soma += coeficiente(n) * k ** (2 * n)
  return soma
}

// ── Razão exata: caminho A, média aritmético-geométrica ──────────────────────
function agm(a, b) {
  for (let i = 0; i < 60; i++) {
    if (Math.abs(a - b) < 1e-17) break
    ;[a, b] = [(a + b) / 2, Math.sqrt(a * b)]
  }
  return a
}

function razaoExataAgm(alphaGraus) {
  return 1 / agm(1, Math.cos((alphaGraus * Math.PI) / 180 / 2))
}

// ── Razão exata: caminho B, quadratura da integral elíptica ──────────────────
// T/T0 = (2/π)·K(k). Substituição sen φ = sen(α/2)·sen u remove a
// singularidade da borda e deixa a quadratura de Simpson bem-comportada.
function razaoExataQuadratura(alphaGraus, subdivisoes = 200_000) {
  const k = Math.sin((alphaGraus * Math.PI) / 180 / 2)
  const f = (u) => 1 / Math.sqrt(1 - k * k * Math.sin(u) * Math.sin(u))
  const a = 0
  const b = Math.PI / 2
  const h = (b - a) / subdivisoes
  let soma = f(a) + f(b)
  for (let i = 1; i < subdivisoes; i++) {
    soma += f(a + i * h) * (i % 2 === 0 ? 2 : 4)
  }
  const K = (h / 3) * soma
  return (2 / Math.PI) * K
}

// ── Montagem ─────────────────────────────────────────────────────────────────
const AMPLITUDES = [1, 2, 5, 10, 15, 20, 25, 30, 45, 60, 75, 90, 120, 150, 170, 179]
const TERMOS = [0, 1, 2, 3, 5, 10]
const L = 1
const G = 9.81
const T0 = 2 * Math.PI * Math.sqrt(L / G)

const coeficientes = []
for (let n = 0; n <= 10; n++) {
  const { num, den } = coeficienteFracao(n)
  // Fração reduzida a inteiro não leva denominador: a_0 é "1", nunca "1/1".
  coeficientes.push({ n, fracao: den === 1n ? `${num}` : `${num}/${den}`, valor: coeficiente(n) })
}

const linhas = []
let maiorDivergencia = 0
for (const alpha of AMPLITUDES) {
  const exato = razaoExataAgm(alpha)
  const serie = {}
  for (const N of TERMOS) serie[`N${N}`] = somatorio(alpha, N)

  // Confronto dos dois caminhos independentes. Perto de 180° a quadratura
  // degrada (o integrando quase estoura), então só se exige acordo até 150°.
  let divergencia = null
  if (alpha <= 150) {
    const quad = razaoExataQuadratura(alpha)
    divergencia = Math.abs(quad - exato) / exato
    maiorDivergencia = Math.max(maiorDivergencia, divergencia)
  }

  linhas.push({
    alphaGraus: alpha,
    serie,
    exato,
    periodoSerieN2: T0 * serie.N2,
    periodoExato: T0 * exato,
    erroRelativoN2: (serie.N2 - exato) / exato,
    divergenciaEntreCaminhos: divergencia,
  })
}

// ── Aproximações de forma fechada ────────────────────────────────────────────
const aproximacoes = AMPLITUDES.filter((a) => a <= 179).map((alpha) => {
  const c = Math.cos((alpha * Math.PI) / 180 / 2)
  return {
    alphaGraus: alpha,
    kiddFogg: 1 / Math.sqrt(c),
    limaArun: -Math.log(c) / (1 - c),
    duasIteracoes: 4 / (1 + Math.sqrt(c)) ** 2,
  }
})

// ── Geometria cicloidal ──────────────────────────────────────────────────────
// Comprimento de arco da trajetória obtido por quadratura da curva paramétrica,
// para conferir contra a forma fechada s = L·sen θ.
function arcoTrajetoriaPorQuadratura(r, thetaGraus, subdivisoes = 200_000) {
  const theta = (thetaGraus * Math.PI) / 180
  const h = theta / subdivisoes
  // |velocidade| = 4r·cos(t) para x = r(2t + sen 2t), y = r(1 − cos 2t)
  const f = (t) => {
    const dx = 2 * r * (1 + Math.cos(2 * t))
    const dy = 2 * r * Math.sin(2 * t)
    return Math.sqrt(dx * dx + dy * dy)
  }
  let soma = f(0) + f(theta)
  for (let i = 1; i < subdivisoes; i++) soma += f(i * h) * (i % 2 === 0 ? 2 : 4)
  return (h / 3) * soma
}

const rGerador = L / 4
const cicloide = [0, 10, 30, 45, 60, 90].map((thetaGraus) => {
  const t = (thetaGraus * Math.PI) / 180
  return {
    thetaGraus,
    x: rGerador * (2 * t + Math.sin(2 * t)),
    y: rGerador * (1 - Math.cos(2 * t)),
    arcoFormaFechada: L * Math.sin(t),
    arcoPorQuadratura: arcoTrajetoriaPorQuadratura(rGerador, thetaGraus),
    comprimentoLivre: L * Math.cos(t),
    alturaDeLargada: (L * Math.sin(t) ** 2) / 2,
  }
})

const tabela = {
  gerado: 'scripts/gerar-tabelas.mjs',
  aviso: 'NÃO editar à mão. Regenerar com: node scripts/gerar-tabelas.mjs',
  base: { L, g: G, T0 },
  maiorDivergenciaEntreCaminhos: maiorDivergencia,
  coeficientes,
  saturacao: { N2: 1 + 1 / 4 + 9 / 64, fracao: '89/64' },
  linhas,
  aproximacoes,
  cicloide,
}

mkdirSync('tests/golden', { recursive: true })
writeFileSync(SAIDA, JSON.stringify(tabela, null, 2) + '\n', 'utf8')

console.log(`✓ ${SAIDA} gerado`)
console.log(`  T0 (L=1, g=9,81) = ${T0.toFixed(9)} s`)
console.log(`  coeficientes: ${coeficientes.slice(0, 6).map((c) => c.fracao).join(', ')}`)
console.log(
  `  maior divergência AGM × quadratura (α ≤ 150°): ${maiorDivergencia.toExponential(3)}`,
)
if (maiorDivergencia > 1e-10) {
  console.error('✗ Os dois caminhos independentes divergiram além do aceitável.')
  process.exit(1)
}

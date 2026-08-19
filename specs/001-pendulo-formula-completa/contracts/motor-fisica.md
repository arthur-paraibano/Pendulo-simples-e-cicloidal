# Contrato: Motor de Física (`src/physics/`)

**Versão**: 1.0 · **Data**: 2026-08-17
**Camada**: núcleo puro — **zero DOM, zero `window`, zero `document`, zero `performance`**
**Consumidores**: `src/state/`, testes unitários, geradores de tabela-ouro no Node

Este contrato é **normativo**: os testes da Fase 1 e da Fase 2 do plano são escritos a partir dele,
**antes** da implementação (Princípio IX). Todos os exemplos numéricos vêm das tabelas verificadas
de [research.md](../research.md).

---

## 0. Convenções Gerais

| Aspecto | Regra |
|---|---|
| Unidades | **Sempre SI e radianos** na fronteira do módulo. Conversão de grau é responsabilidade do chamador |
| Tipos nominais | `Rad`, `Deg`, `Metro`, `Kg`, `Segundo`, `MPorS2` — `number` marcado, para impedir mistura |
| Pureza | Toda função é determinística e livre de efeitos; mesma entrada ⇒ mesma saída, sempre |
| Erros | Entrada inválida lança `ErroDeDominio` com `{ parametro, valorRecebido, restricao }`. Nunca retorna `NaN` silencioso |
| Tolerância | Funções de forma fechada: `1×10⁻¹²` relativo. Integração numérica: `1×10⁻⁶` |
| Convenção elíptica | **`k = sen(α/2)`** em todo o código — módulo, nunca parâmetro `m = k²` (RF-012) |

---

## 1. `series.ts` — Série de Bernoulli/Legendre

### `coeficienteSerie(n: number): number`

Retorna `a_n = [C(2n,n)/4ⁿ]²`.

- **Pré**: `n` inteiro, `0 ≤ n ≤ 50`.
- **Pós**: `> 0`; estritamente decrescente em `n`.
- **Erros**: `n` não inteiro ou fora da faixa ⇒ `ErroDeDominio`.

| `n` | retorno | forma exata |
|---|---|---|
| 0 | `1` | 1 |
| 1 | `0.25` | 1/4 |
| 2 | `0.140625` | 9/64 |
| 3 | `0.09765625` | 25/256 |
| 4 | `0.074768066406250` | 1225/16384 |
| 5 | `0.060562133789063` | 3969/65536 |

> Implementar por **recorrência** `a_n = a_{n−1}·((2n−1)/(2n))²`, nunca por fatoriais diretos:
> `(2n)!` estoura o `double` a partir de `n = 86`, e a recorrência é exata em ponto flutuante
> para toda a faixa admitida.

### `coeficienteSerieFracao(n: number): string`

Retorna a forma exata para exibição. `coeficienteSerieFracao(2) === "9/64"`.

### `somatorioSerie(alpha: Rad, N: number, modo: ModoPendulo): number`

Retorna `S(α,N,modo) = Σ_{n=0..N} a_n·sen^{2n}(α/2)·χ(n,modo)`, com
`χ(n,'simples') = 1` e `χ(n,'cicloidal') = (n === 0 ? 1 : 0)`.

- **Pré**: `0 ≤ alpha < π`; `N` inteiro em `[0,50]`.
- **Pós**: `≥ 1`; crescente em `α` e em `N` no modo simples; **exatamente `1`** no modo cicloidal.
- **Casos**: `N = 0` ⇒ `1`. `alpha = 0` ⇒ `1`. `modo = 'cicloidal'` ⇒ `1`, para todo `α` e `N`.

| `α` | `N` | modo | retorno |
|---|---|---|---|
| 10° | 2 | simples | `1.001907` |
| 45° | 2 | simples | `1.039628` |
| 90° | 2 | simples | `1.160156` |
| 90° | 10 | simples | `1.180315` |
| 90° | 2 | **cicloidal** | `1.000000` |
| 179° | 2 | simples | `1.390585` |

### `termosSerie(alpha: Rad, N: number, modo: ModoPendulo): TermoSerie[]`

Retorna `N+1` termos, um por `n`, conforme a entidade `TermoSerie` do
[data-model.md](../data-model.md#41-termoserie).

- **Pós**: `termos.length === N+1`; `Σ contribuicao === somatorioSerie(...)` dentro de `1×10⁻¹⁵`;
  no modo cicloidal, `ativo === false` e `contribuicao === 0` para todo `n ≥ 1`.

### `saturacaoSerie(N: number): number`

Retorna o limite de `S` quando `α → 180°`, isto é `Σ_{n≤N} a_n`.

- `saturacaoSerie(2) === 1.390625` (`= 89/64`) — base do RF-008.

### `termosNecessarios(alpha: Rad, erroAlvo: number): number`

Menor `N` cujo erro relativo em relação ao valor exato é inferior a `erroAlvo`.

- **Pré**: `0 < erroAlvo < 1`.
- **Pós**: inteiro `≥ 0`; retorna `-1` se não converge em `N = 500`.

| `α` | `erroAlvo` | retorno |
|---|---|---|
| 10° | 0,001 | `1` |
| 45° | 0,001 | `2` |
| 90° | 0,001 | `6` |
| 90° | 0,0001 | `9` |
| 150° | 0,001 | `53` |

---

## 2. `elliptic.ts` — AGM e período exato

### `agm(a: number, b: number): number`

Média aritmético-geométrica.

- **Pré**: `a > 0`, `b > 0`.
- **Pós**: `min(a,b) ≤ retorno ≤ max(a,b)`; simétrica; convergência quadrática.
- **Implementação**: iterar `(a,b) ← ((a+b)/2, √(ab))` até `|a−b| < 1×10⁻¹⁷` ou 60 iterações.
- Exemplo: `agm(1, 1) === 1`; `agm(1, 0.7071067811865476) ≈ 0.847213`.

### `integralElipticaK(k: number): number`

`K(k) = π/(2·AGM(1, √(1−k²)))`.

- **Pré**: `0 ≤ k < 1`.
- **Pós**: `≥ π/2`; crescente; `K(0) === π/2`.
- **Erros**: `k ≥ 1` ⇒ `ErroDeDominio` (divergência).

---

## 3. `period.ts` — Período

### `periodoPequenaAmplitude(L: Metro, g: MPorS2): Segundo`

`T₀ = 2π√(L/g)`.

- **Pré**: `L > 0`, `g > 0`.
- **Erros**: `g ≤ 0` ⇒ `ErroDeDominio` com restrição `"g > 0"`. O chamador traduz para
  "sem oscilação" na interface (RF do caso-limite `g = 0`).
- Exemplo: `periodoPequenaAmplitude(1, 9.81) === 2.006067` (6 casas).

### `periodoSerie(L, g, alpha: Rad, N: number, modo: ModoPendulo): Segundo`

`T = T₀ · S(α,N,modo)`.

| `L` | `g` | `α` | `N` | modo | retorno (s) |
|---|---|---|---|---|---|
| 1 | 9,81 | 10° | 2 | simples | `2.009893` |
| 1 | 9,81 | 20° | 2 | simples | `2.021446` |
| 1 | 9,81 | 45° | 2 | simples | `2.085562` |
| 1 | 9,81 | 90° | 2 | simples | `2.327351` |
| 1 | 9,81 | 90° | 2 | **cicloidal** | `2.006067` |
| 1 | 9,81 | 5° | 2 | **cicloidal** | `2.006067` |

> As duas últimas linhas são o teste da isocronia: **período idêntico em amplitudes diferentes**.

### `periodoExato(L, g, alpha: Rad, modo: ModoPendulo): Segundo`

Modo simples: `T₀/AGM(1, cos(α/2))`. Modo cicloidal: **`T₀`**, exato por definição.

- **Pré**: `0 ≤ alpha ≤ 179.9°` em radianos.
- **Pós**: `≥ T₀`; crescente em `α` no modo simples; constante no cicloidal.

| `L` | `g` | `α` | modo | retorno (s) |
|---|---|---|---|---|
| 1 | 9,81 | 10° | simples | `2.009893` |
| 1 | 9,81 | 45° | simples | `2.086256` |
| 1 | 9,81 | 90° | simples | `2.367842` |
| 1 | 9,81 | 179° | simples | `7.825797` |
| 1 | 9,81 | 90° | cicloidal | `2.006067` |

### `razaoPeriodo(alpha: Rad, N, modo): number`

`T/T₀`. Independe de `L` e `g` — propriedade verificável por teste.

### `resultadoPeriodo(params): ResultadoPeriodo`

Função de fachada que devolve a entidade completa do
[data-model.md](../data-model.md#42-resultadoperiodo), incluindo termos, erros, faixa de confiança e
`N` necessário. É a única função que a camada de estado precisa chamar para alimentar o painel da
fórmula.

- **Pós**: `faixaConfianca` obedece aos limiares `0,1 %` / `1 %` / `5 %`, que para `N = 2` ocorrem
  em `54,373°`, `81,603°` e `110,164°`;
  `erroRelativo ≤ 0` sempre (toda truncagem subestima);
  `modo === 'cicloidal'` ⇒ `T === T0 === Texato` e `erroRelativo === 0`.

### `classificarConfianca(erroRelativo: number): FaixaConfianca`

`|erro| < 0,001` ⇒ `'excelente'`; `< 0,01` ⇒ `'boa'`; `< 0,05` ⇒ `'limitada'`; senão `'inadequada'`.

---

## 4. `approximations.ts` — Aproximações de forma fechada

Todas recebem `(L, g, alpha: Rad)` e retornam `Segundo`. Cada uma **deve** expor
`fonteBibliografica` não vazia (RF-011).

| Função | Fórmula (`c = cos(α/2)`) | Fonte |
|---|---|---|
| `periodoKiddFogg` | `T₀/√c` | Kidd & Fogg, *The Physics Teacher* 40 (2002) |
| `periodoLimaArun` | `T₀·(−ln c)/(1−c)` | Lima & Arun, *Am. J. Phys.* 74 (2006) |
| `periodoDuasIteracoes` | `4T₀/(1+√c)²` | Carvalhaes & Suppes, *Am. J. Phys.* 76 (2008) |

Erro relativo em relação ao exato, para conferência:

| `α` | Kidd–Fogg | Lima–Arun | duas iterações |
|---|---|---|---|
| 45° | `+0.0392 %` | `+0.0131 %` | `−0.00000 %` |
| 90° | `+0.7512 %` | `+0.2487 %` | `−0.00139 %` |
| 150° | `+11.5439 %` | `+3.4847 %` | `−0.28200 %` |

- **Pré comum**: `0 ≤ alpha < π`. `α → π` ⇒ `c → 0` ⇒ `ErroDeDominio` para Kidd–Fogg e Lima–Arun.
- **Pós**: Kidd–Fogg e Lima–Arun **superestimam**; duas iterações **subestima** ligeiramente.

---

## 5. `ode.ts` e `integrators.ts` — Dinâmica

### `aceleracaoAngular(estado, params): number`

```
θ̈ = −(g/L)·sen θ  −  (b/m)·θ̇  −  c_q·θ̇·|θ̇|  +  A_d·cos(ω_d·t + ϕ_d)
```

Modo cicloidal: `s̈ = −(g/L)·s`, **exatamente harmônico**, sem aproximação.

- **Pós**: `θ = 0` e sem forçamento ⇒ retorno `0`. Sinal sempre restaurador para `|θ| < π`.

### `velocityVerlet(estado, h, params): EstadoDinamico`
### `rk4(estado, h, params): EstadoDinamico`

- **Pré**: `h > 0`, `h ≤ 0,02`.
- **Pós (conservativo)**: sem atrito nem forçamento, `velocityVerlet` mantém
  `|E(t) − E(0)|/E(0) < 1×10⁻³` ao longo de **1000 períodos** com `h = 1/600` — critério de aceite
  da Fase 2.
- **Pós (concordância)**: com `h = 1/2400` e sem dissipação, o período medido concorda com
  `periodoExato` dentro de `1×10⁻⁴` relativo.

---

## 6. `cycloid.ts` — Geometria cicloidal

### `pontoCicloide(r: Metro, phi: Rad): {x: Metro, y: Metro}`

`x = r(φ − sen φ)`, `y = −r(1 − cos φ)`.

- `pontoCicloide(r, 0) === {x: 0, y: 0}` — a cúspide.
- `pontoCicloide(r, π) === {x: rπ, y: −2r}` — o ponto mais baixo.

### `raioGerador(L: Metro): Metro` — `L/4`. · `comprimentoDoFio(r: Metro): Metro` — `4r`.

- **Invariante**: `comprimentoDoFio(raioGerador(L)) === L`.

### `trajetoriaMassa(r, theta: Rad): {x, y, s, comprimentoLivre, comprimentoEnrolado}`

- **Pós — invariante geométrico central**:
  `comprimentoLivre + comprimentoEnrolado === L`, para **todo** `θ`, dentro de `1×10⁻¹⁰`.
  É este teste de propriedade que impede uma geometria "plausível mas errada".
- `comprimentoLivre === L·cos θ`; `s === L·sen θ`.
- `θ = 0` ⇒ `comprimentoLivre === L`, `comprimentoEnrolado === 0`, posição no **ponto zero**.

### `pontoZero(r: Metro): {x, y}`

Ponto mais baixo da trajetória, onde o `SensorZero` é fixado (RF-135). Comum a todas as
trajetórias, qualquer que seja a amplitude de largada.

### `amplitudeMaximaCicloidal(): Rad` — `π/2` (90°), pois `s = L·sen θ` e `|s| ≤ L` (RF-025).

---

## 7. `sensor.ts` — Detecção de passagem

### `detectarCruzamento(anterior, atual, h, t): EventoPassagem | null`

Detecta mudança de sinal de `θ` e **interpola** o instante:

```
t_cruz = t + h · θ_ant / (θ_ant − θ_atual)
```

- **Pré**: `anterior` e `atual` separados por exatamente um passo `h`.
- **Pós**: retorna `null` se `θ_ant · θ_atual > 0`. Se retorna evento,
  `t ≤ t_cruz ≤ t + h` e `sentido === Math.sign(omega)`.
- **Precisão exigida**: erro em `t_cruz` inferior a `1×10⁻⁴ s` — sem isso, o efeito de +3,826 ms a
  `α = 10°` fica afogado na discretização.
- **Anti-repique**: não emite dois eventos consecutivos de mesmo sentido sem uma inversão entre eles.

### `periodoDeEventos(eventos: EventoPassagem[], modo: ModoContagem): Segundo | null`

- `'meioPeriodo'` ⇒ diferença entre as **duas últimas** passagens.
- `'periodoCompleto'` ⇒ diferença entre as duas últimas de **mesmo sentido**.
- Retorna `null` com eventos insuficientes.

**Teste de aceite integrado**: com `L = 1`, `g = 9,81`, `α = 10°`, sem atrito, o período obtido do
sensor deve concordar com `periodoExato` dentro de `1×10⁻⁴` relativo — ou seja, `2.009893 s` com
erro inferior a 0,2 ms. Com `α = 20°`, `2.021451 s`; a **diferença** entre os dois casos
(`+11,56 ms`) deve ser reproduzida com erro inferior a 0,1 ms.

---

## 8. `inference.ts` — Inferência de gravidade

### `inferirGravidade(T: Segundo, L: Metro, alpha: Rad, N: number, pendulo: ModoPendulo): MPorS2`

```
cicloidal:  g = 4π²·L / T²
simples:    g = 4π²·L·S(α,N)² / T²
```

### `inferirGravidadeIngenua(T: Segundo, L: Metro): MPorS2` — `4π²·L/T²`, sempre.

- **Pré**: `T > 0`, `L > 0`.
- **Pós**: `pendulo === 'cicloidal'` ⇒ as duas funções coincidem exatamente.
- **Pós (ida-e-volta)**: `inferirGravidade(periodoSerie(L,g,α,N,modo), L, α, N, modo) === g`
  dentro de `1×10⁻¹⁰` — teste de inversão obrigatório.

Exemplos com `L = 1 m`, `g` verdadeiro `9,81`, `T` = período **real**:

| `α` | `T` (s) | `inferirGravidadeIngenua` | erro | `inferirGravidade` (N=2) |
|---|---|---|---|---|
| 5° | 2,007022 | `9.800664` | −0,0952 % | `9.810000` |
| 10° | 2,009893 | `9.772688` | −0,3803 % | `9.809999` |
| 20° | 2,021451 | `9.661247` | −1,5163 % | `9.809947` |
| 45° | 2,086256 | `9.070361` | −7,5396 % | `9.803478` |
| 90° | 2,367842 | `7.041324` | −28,2230 % | `9.477358` |

> A coluna do meio é a razão de existir da tabela de coleta: o erro é de **modelo**, não de
> instrumento. Nenhum cronômetro melhor o corrige.

---

## 9. `energy.ts` e `analysis.ts`

### `energias(m, L, g, theta, omega, modo, termica?): Energias`

`E_c = ½mL²ω²` · `E_p = m·g·h` · `E_total = E_c + E_p + E_termica`.

**A altura depende do regime** — usar a fórmula errada é um erro silencioso:

| Modo | Altura acima do ponto zero |
|---|---|
| `simples` | `h = L·(1 − cos θ)` |
| `cicloidal` | `h = L·sen²θ / 2` |

As duas coincidem em pequenos ângulos (ambas → `L·θ²/2`) e divergem por um fator 2 em θ = 90°,
onde a simples dá `L` e a cicloidal dá `L/2 = 2r` — que é exatamente a altura da face cicloidal.

- **Pós**: `θ = 0` e `ω = 0` ⇒ tudo zero. Sem dissipação, `E_total` constante dentro da tolerância
  do integrador. Referência de `E_p`: ponto mais baixo da trajetória.
- `alturaAcimaDoPontoZero(L, theta, modo)` expõe a altura isoladamente.
- `energiaDeLargada(m, L, g, alpha, modo)` dá a energia total de um pêndulo solto do repouso —
  a referência contra a qual se mede a deriva do integrador.

### `varreduraPeriodoPorAmplitude(L, g, N, modo, deAlpha, ateAlpha, passos): Ponto[]`

Alimenta a curva `T(α)`. **Pós**: modo cicloidal ⇒ todos os `y` iguais a `T₀` (reta horizontal — a
assinatura visual da isocronia).

### `secaoPoincare(amostras, omegaForcamento): Ponto[]`
### `deteccaoAmplitudeCorrente(amostras): Rad`

Amplitude do ciclo corrente, para acompanhar o decaimento sob atrito.

---

## 10. Matriz de Rastreabilidade

| Módulo | Funções | Requisitos |
|---|---|---|
| `series.ts` | coeficientes, somatório, termos, saturação, termos necessários | RF-001 a RF-004, RF-008, RF-009 |
| `elliptic.ts` | AGM, `K(k)` | RF-005, RF-012 |
| `period.ts` | `T₀`, série, exato, razão, fachada, confiança | RF-001 a RF-014, RF-021 a RF-023 |
| `approximations.ts` | Kidd–Fogg, Lima–Arun, duas iterações | RF-010, RF-011 |
| `ode.ts`, `integrators.ts` | aceleração, Verlet, RK4 | RF-113, RNF-013 |
| `cycloid.ts` | cicloide, `L = 4r`, trajetória, ponto zero | RF-026, RF-027, RF-029, RF-135 |
| `sensor.ts` | cruzamento, período por eventos | RF-134, RF-136, RF-137 |
| `inference.ts` | `g` inferido e ingênuo | RF-142 a RF-144 |
| `energy.ts`, `analysis.ts` | energias, varreduras, Poincaré | RF-079, RF-104 |

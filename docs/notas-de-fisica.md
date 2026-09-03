# Notas de física

O que o simulador calcula, por que calcula assim, e de onde vem cada número.

Toda afirmação numérica aqui é rastreável (RNF-021): ou sai de uma fonte listada em
[referencias.md](referencias.md), ou é derivada nesta página a partir das definições. Os valores
foram conferidos por via independente e estão congelados nas tabelas de
[research.md](../specs/001-pendulo-formula-completa/research.md) e nos testes de `tests/golden/`.

Convenções, válidas em todo o texto:

| Símbolo | Significado |
|---|---|
| `L` | comprimento do fio |
| `g` | aceleração da gravidade |
| `α` | amplitude angular (o ângulo de largada) |
| `θ` | ângulo do trecho livre do fio com a vertical |
| `T₀` | período de pequenas oscilações, `2π√(L/g)` |
| `k` | módulo da integral elíptica, **sempre** `k = sen(α/2)` |

---

## 1. Uma fórmula, dois regimes

O produto inteiro gira em torno de uma única expressão:

```
T = 2π·√(L/g) · Σ  χ(n, modo) · a_n · sen^(2n)(α/2)
                n=0..N
```

O fator `χ(n, modo)` vale 1 para todo `n` no **modo simples**, e vale 1 apenas em `n = 0` no **modo
cicloidal**. Não há duas fórmulas nem duas funções de período: o pêndulo cicloidal é o caso em que
os termos de correção se anulam, e é por isso que `T = T₀` lá dentro sem nenhuma aproximação.

Truncada em `N = 2`, a expressão é exatamente a fórmula das imagens entregues pelo usuário:

```
T = 2π√(L/g) · ( 1 + ¼·sen²(α/2) + 9/64·sen⁴(α/2) )
```

Implementação: [`src/physics/series.ts`](../src/physics/series.ts) (`fatorModo`, `somatorioSerie`) e
[`src/physics/period.ts`](../src/physics/period.ts) (`periodoSerie`).

---

## 2. A série de Bernoulli/Legendre

Os coeficientes são

```
a_n = [ C(2n,n) / 4ⁿ ]²        a₀ = 1,  a₁ = 1/4,  a₂ = 9/64,  a₃ = 25/256, …
```

e o código os calcula **por recorrência**, `a_n = a_{n−1}·((2n−1)/(2n))²`, nunca por fatoriais.
A razão é prática: `C(2n,n)` estoura o `double` a partir de `n = 86`, e a recorrência é estável em
toda a faixa. Escrever os coeficientes como literais avulsos seria pior ainda — a fórmula deixaria
de ser uma fórmula.

Duas propriedades importam para a leitura da tela:

**Toda truncagem subestima o período.** Todos os `a_n` são positivos, então cortar a soma só pode
tirar valor. O erro exibido pela interface é sempre negativo, e isso não é acaso nem bug.

**A série truncada satura; o período real, não.** Com `N = 2`, quando `α → 180°`:

```
T/T₀ → 1 + 1/4 + 9/64 = 89/64 = 1,390625
```

enquanto o período exato **diverge** — um pêndulo largado exatamente na vertical invertida nunca
completa a oscilação. A série truncada não erra apenas de tamanho: erra de forma qualitativamente
diferente do fenômeno. Mostrar isso é o objetivo do RF-008.

---

## 3. O período exato, e por que ele é a referência

O valor contra o qual toda aproximação é comparada vem da integral elíptica completa de primeira
espécie, calculada pela média aritmético-geométrica:

```
T/T₀ = (2/π)·K(k) = 1 / AGM(1, cos(α/2))
```

A AGM converge quadraticamente — cinco iterações bastam para a precisão de um `double` —, e o
critério de parada é por **tolerância relativa com teto de iterações**. Comparar por igualdade
estrita de ponto flutuante entra em ciclo-limite justamente em `α = 90°` e `α = 179°`, que são os
casos que mais interessam.

A convenção é fixa em todo o projeto: `k = sen(α/2)` é o **módulo**, nunca o parâmetro `m = k²`.
Trocar um pelo outro produz curvas plausíveis e falsas, que é a pior espécie de erro neste domínio.

Implementação: [`src/physics/elliptic.ts`](../src/physics/elliptic.ts).

---

## 4. Até onde a fórmula de `N = 2` serve

Erro relativo da série truncada em `N = 2` contra o valor exato:

| α | Erro de `N = 2` | Leitura |
|---|---|---|
| 10° | −0,0000 % | indistinguível |
| 30° | −0,0030 % | excelente |
| 45° | −0,0332 % | excelente |
| 60° | −0,1764 % | boa |
| 90° | −1,7100 % | limitada |
| 120° | −7,7413 % | inadequada |
| 150° | −23,0697 % | inadequada |
| 179° | −64,3537 % | inadequada |

As amplitudes em que cada limiar é cruzado — os números que a interface usa para classificar a
confiança (RF-013):

| Erro atingido | Amplitude |
|---|---|
| 0,1 % | **54,373°** |
| 1 % | **81,603°** |
| 5 % | **110,164°** |

Para comparar: a fórmula de pequenos ângulos — `N = 0`, isto é, `T = T₀` — erra **−3,84 % a 45°** e
**−27,16 % a 120°**. O erro no `g` inferido é praticamente o dobro, porque `g` depende de `T²`:
−7,54 % a 45°, −46,94 % a 120°. É esse número que a coluna do `g` ingênuo expõe na tabela de coleta.

---

## 5. Aproximações de forma fechada

Três aproximações entram como modelos selecionáveis, cada uma com procedência (RF-011). Em todas,
`c = cos(α/2)`:

| Modelo | Expressão | Sentido do desvio |
|---|---|---|
| Kidd–Fogg | `T ≈ T₀/√c` | superestima |
| Lima–Arun | `T ≈ T₀·(−ln c)/(1 − c)` | superestima |
| AGM, duas iterações | `T ≈ 4T₀/(1 + √c)²` | subestima |

Erro relativo contra o exato:

| α | Kidd–Fogg | Lima–Arun | Duas iterações | Série `N = 2` |
|---|---|---|---|---|
| 45° | +0,0392 % | +0,0131 % | −0,00000 % | −0,0332 % |
| 90° | +0,7512 % | +0,2487 % | −0,00139 % | −1,7100 % |
| 120° | +3,0107 % | +0,9771 % | −0,02167 % | −7,7413 % |
| 170° | +38,8595 % | +9,5790 % | −2,25478 % | −43,1574 % |

O AGM interrompido na segunda iteração é o melhor negócio da tabela: erro abaixo de 0,002 % até 90°
a custo praticamente nulo — cerca de mil vezes melhor que a série em `N = 2` nessa amplitude.

O sinal negativo na fórmula de Lima–Arun é essencial e costuma sumir em reproduções secundárias;
sem ele o período dá negativo.

Aproximações de Padé foram deliberadamente deixadas de fora: não houve fonte confirmável, e a
constituição do projeto não admite número sem procedência.

Fontes completas em [referencias.md](referencias.md). Implementação:
[`src/physics/approximations.ts`](../src/physics/approximations.ts).

---

## 6. O pêndulo cicloidal, e por que ele é isócrono

Duas curvas, ambas cicloides congruentes de raio gerador `r = L/4`:

- as **faces** (evoluta), sobre as quais o fio se enrola;
- a **trajetória da massa** (involuta), gerada pelo fio ao desenrolar.

Com `θ` medido a partir da vertical, e `s` o deslocamento ao longo do arco a partir do ponto mais
baixo:

```
s = L·sen θ        ℓ = L·cos θ        s² + ℓ² = L²
```

O trecho livre do fio **encurta** como `L·cos θ`, e é esse encurtamento que compensa exatamente o
efeito que, no pêndulo simples, faria o período crescer com a amplitude. A equação do movimento em
`s` é

```
s̈ = −(g/L)·s
```

harmônica **exata**, sem aproximação de ângulo pequeno em lugar nenhum. Daí a tautocronia: massas
largadas de alturas diferentes chegam ao ponto zero ao mesmo tempo, e o período é `T₀` para
qualquer amplitude.

O vínculo `L = 4r` vem de Huygens. A amplitude máxima do modo cicloidal é **90°**, e não é uma
escolha de produto: `s = L·sen θ` com `|s| ≤ L` não admite mais que isso.

Implementação: [`src/physics/cycloid.ts`](../src/physics/cycloid.ts).

---

## 7. A altura de largada depende do regime

Este ponto rendeu um defeito real durante o desenvolvimento, e vale registrar. A altura `h` de onde
a massa é largada **não** tem a mesma expressão nos dois modos:

| Modo | Altura em função da amplitude |
|---|---|
| Simples | `h = L·(1 − cos α)` |
| Cicloidal | `h = L·sen²α / 2` |

A do modo cicloidal sai da geometria da própria curva: com `h = s²/(8r)` e `r = L/4`, tem-se
`h = s²/(2L)`, e com `s = L·sen α` chega-se a `h = L·sen²α/2`.

A diferença é grande onde importa: a 90° com `L = 1 m`, o pêndulo simples parte de **1 m** de altura
e o cicloidal de **0,5 m**. Usar a fórmula cicloidal nos dois modos — que era o que o código fazia —
mostrava o pêndulo simples largando do lugar errado (RF-158).

Amplitude, ângulo inicial e altura formam um trio espelhado: mexer em qualquer um reconcilia os
outros dois, e o valor canônico é `θ₀`.

---

## 8. Integração numérica

O padrão é **velocity-Verlet**, com passo fixo de `1/600 s` — dez sub-passos por quadro a 60 fps.

A escolha não é por precisão bruta: RK4 tem erro local menor por passo. É que o Verlet é
**simplético**, então o erro de energia fica *limitado e oscilante* por tempos longos, enquanto o
RK4 dissipa energia de forma monotônica. Como a aplicação exibe um gráfico de energia, uma deriva
sistemática seria lida pelo estudante como física, e não como artefato do método.

O RK4 continua disponível como opção comparativa, e a diferença entre os dois é conteúdo didático
(RF-113).

Implementação: [`src/physics/integrators.ts`](../src/physics/integrators.ts).

---

## 9. O erro de modelo, que é o ponto de tudo

Quem mede um pêndulo simples de 1 m largado a 45° obtém `T = 2,0863 s`. Inferindo a gravidade pela
fórmula de pequenos ângulos, `g = 4π²L/T²`:

```
g = 4π²·1 / 2,0863² = 9,07 m/s²
```

em vez de 9,81 — erro de 7,5 % que **nenhum instrumento melhor corrige**, porque não é erro de
medida: é erro de modelo. No pêndulo cicloidal, a mesma medição devolve 9,81 em qualquer amplitude.

A tabela de coleta do simulador mostra as duas colunas lado a lado, linha a linha, e é aí que a
fórmula geral deixa de ser decoração e vira consequência.

---

## 10. De onde vem cada número

A aplicação carrega essa tabela dentro de si, no painel **Créditos e fontes** → *De onde vem cada
número*, gerada a partir de [`src/state/creditos.ts`](../src/state/creditos.ts). O vínculo entre o
número e a fonte é estrutural: uma afirmação sem fonte reprova no teste unitário
(`afirmacoesSemFonte()`), e uma aproximação sem referência bibliográfica não compila.

| Afirmação | Valor | Fonte |
|---|---|---|
| Coeficientes `a₁`, `a₂` | 1/4, 9/64 | imagens de fórmula do usuário |
| Gravidade — Lua, Terra, Júpiter, Planeta X | 1,62 · 9,81 · 24,79 · 14,20 m/s² | PhET Pendulum Lab |
| Limiares de confiança de `N = 2` | 54,373° · 81,603° · 110,164° | tabelas do projeto, verificadas |
| Saturação de `N = 2` | 1,390625 | derivada: 1 + 1/4 + 9/64 |
| Vínculo cicloidal | `L = 4r` | Huygens, *Horologium oscillatorium* |
| Amplitude máxima cicloidal | 90° | derivada de `s = L·sen θ`, `\|s\| ≤ L` |
| Aproximações de forma fechada | ver §5 | Kidd–Fogg; Lima–Arun; Carvalhaes–Suppes |

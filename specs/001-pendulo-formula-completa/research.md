# Registro de Pesquisa: Pêndulo — Fórmula Completa

**Funcionalidade**: `001-pendulo-formula-completa`
**Data**: 2026-08-17
**Status**: Concluído — todas as decisões resolvidas

Este documento registra as questões que precisavam de resposta antes do planejamento, a decisão
tomada em cada uma, as alternativas descartadas e a fonte. As **tabelas numéricas da Seção 2 são a
fonte de verdade dos testes** — foram calculadas por via independente e conferidas; nenhum valor
aqui é estimativa.

---

## 1. Fundamentação da Fórmula-Motor

### Q1 — De onde vêm os coeficientes 1, ¼ e 9/64 da fórmula entregue pelo usuário?

**Decisão**: a fórmula das imagens é a **série de Bernoulli/Legendre** do período exato do pêndulo,
truncada no termo `n = 2`. A dedução parte da conservação de energia:

```
½·L²·θ̇² = g·L·(cos θ − cos α)   ⇒   T = 4·√(L/g)·K(k),  k = sen(α/2)
```

onde `K(k) = ∫₀^{π/2} dφ/√(1 − k²·sen²φ)` é a integral elíptica completa de primeira espécie.
Expandindo o integrando pela série binomial e integrando termo a termo com a fórmula de Wallis:

```
T = 2π·√(L/g) · Σ_{n=0..∞} a_n · sen^{2n}(α/2)      com   a_n = [ (2n)! / (2^{2n}·(n!)²) ]² = [ C(2n,n)/4ⁿ ]²
```

Coeficientes exatos, conferidos em aritmética racional:

| n | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| `a_n` (fração) | 1 | 1/4 | 9/64 | 25/256 | 1225/16384 | 3969/65536 | 53361/1048576 |
| `a_n` (decimal) | 1,000000 | 0,250000 | 0,140625 | 0,097656 | 0,074768 | 0,060562 | 0,050889 |

Os três primeiros são exatamente os que aparecem em `formula geral.jpeg` e `formula completa.jpeg`.

**Alternativas consideradas**: expansão em potências de `α` em radianos
(`T/T₀ = 1 + α²/16 + 11α⁴/3072 + …`) — descartada como forma principal porque **não** é a que o
usuário entregou e converge pior; fica disponível apenas como visualização comparativa.

**Fonte**: `formula geral.jpeg`, `formula completa.jpeg`, `formula simples.jpeg`;
`mhd_zykloidenpendel.pdf` (série de Taylor do seno); verificação numérica em `tests/golden/`.

### Q2 — Por que truncar em `N = 2` por padrão?

**Decisão**: `N = 2` é o padrão, **por fidelidade ao material entregue pelo usuário**, com `N`
ajustável de 0 a 50. `N = 0` reproduz exatamente `T₀ = 2π√(L/g)`, tornando a aproximação de pequenos
ângulos um caso particular da mesma fórmula, e não uma fórmula concorrente.

**Justificativa adicional**: `N = 2` é uma escolha honesta para o domínio de uso escolar — mantém
erro abaixo de 0,1 % até **α ≈ 54,4°** e abaixo de 1 % até **α ≈ 81,6°**. Acima disso a aplicação
precisa avisar, o que é o Princípio X em ação.

**Limiares calculados** (erro da série `N = 2` em relação ao valor exato):

| Erro | Amplitude em que é atingido |
|---|---|
| 0,1 % | 54,373° |
| 1 % | 81,603° |
| 5 % | 110,164° |

**Fato importante para a interface**: com `N = 2`, quando `α → 180°` a razão `T/T₀` **satura** em
`1 + ¼ + 9/64 = 89/64 = 1,390625`, enquanto o período real **diverge**. A série truncada não apenas
erra: ela erra de forma qualitativamente diferente do fenômeno. Isso deve ser mostrado (RF-008).

---

## 2. Tabelas Numéricas de Referência *(fonte de verdade dos testes)*

Base: `L = 1 m`, `g = 9,81 m/s²` ⇒ `T₀ = 2,006067 s`.
Tolerância de aceite: `1×10⁻¹²` relativo para as funções de forma fechada.

### Tabela A — Razão `T/T₀` por número de termos e período resultante

| α (°) | N=1 | N=2 | N=3 | N=5 | N=10 | exato (AGM) | T com N=2 (s) | T exato (s) | erro de N=2 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1,000019 | 1,000019 | 1,000019 | 1,000019 | 1,000019 | 1,000019 | 2,006105 | 2,006105 | −0,0000 % |
| 2 | 1,000076 | 1,000076 | 1,000076 | 1,000076 | 1,000076 | 1,000076 | 2,006219 | 2,006219 | −0,0000 % |
| 5 | 1,000476 | 1,000476 | 1,000476 | 1,000476 | 1,000476 | 1,000476 | 2,007022 | 2,007022 | −0,0000 % |
| 10 | 1,001899 | 1,001907 | 1,001907 | 1,001907 | 1,001907 | 1,001907 | 2,009893 | 2,009893 | −0,0000 % |
| 15 | 1,004259 | 1,004300 | 1,004301 | 1,004301 | 1,004301 | 1,004301 | 2,014693 | 2,014694 | −0,0000 % |
| 20 | 1,007538 | 1,007666 | 1,007669 | 1,007669 | 1,007669 | 1,007669 | 2,021446 | 2,021451 | −0,0003 % |
| 25 | 1,011712 | 1,012020 | 1,012030 | 1,012031 | 1,012031 | 1,012031 | 2,030180 | 2,030201 | −0,0010 % |
| 30 | 1,016747 | 1,017378 | 1,017407 | 1,017409 | 1,017409 | 1,017409 | 2,040928 | 2,040990 | −0,0030 % |
| 45 | 1,036612 | 1,039628 | 1,039934 | 1,039973 | 1,039973 | 1,039973 | 2,085562 | 2,086256 | −0,0332 % |
| 60 | 1,062500 | 1,071289 | 1,072815 | 1,073166 | 1,073182 | 1,073182 | 2,149077 | 2,152875 | −0,1764 % |
| 75 | 1,092648 | 1,111961 | 1,116931 | 1,118765 | 1,118958 | 1,118959 | 2,230667 | 2,244706 | −0,6254 % |
| 90 | 1,125000 | 1,160156 | 1,172363 | 1,178929 | 1,180315 | 1,180341 | 2,327351 | 2,367842 | −1,7100 % |
| 120 | 1,187500 | 1,266602 | 1,307800 | 1,345829 | 1,368935 | 1,372881 | 2,540887 | 2,754090 | −7,7413 % |
| 150 | 1,233253 | 1,355669 | 1,434985 | 1,534463 | 1,651136 | 1,762204 | 2,719562 | 3,535098 | −23,0697 % |
| 170 | 1,248101 | 1,386598 | 1,482045 | 1,612864 | 1,800243 | 2,439363 | 2,781607 | 4,893524 | −43,1574 % |
| 179 | 1,249981 | 1,390585 | 1,488218 | 1,623503 | 1,822163 | 3,901065 | 2,789605 | 7,825797 | −64,3537 % |

Observe que **toda truncagem subestima** o período — o erro é sempre negativo. É uma propriedade da
série (todos os `a_n` são positivos) e deve ser comunicada na interface (RF-007).

### Tabela B — Aproximações de forma fechada (erro relativo em relação ao exato)

| α (°) | Kidd–Fogg | Lima–Arun | Duas iterações | Série `N = 2` |
|---|---|---|---|---|
| 10 | +0,0001 % | +0,0000 % | −0,00000 % | −0,0000 % |
| 30 | +0,0075 % | +0,0025 % | −0,00000 % | −0,0030 % |
| 45 | +0,0392 % | +0,0131 % | −0,00000 % | −0,0332 % |
| 60 | +0,1293 % | +0,0431 % | −0,00004 % | −0,1764 % |
| 90 | +0,7512 % | +0,2487 % | −0,00139 % | −1,7100 % |
| 120 | +3,0107 % | +0,9771 % | −0,02167 % | −7,7413 % |
| 150 | +11,5439 % | +3,4847 % | −0,28200 % | −23,0697 % |
| 170 | +38,8595 % | +9,5790 % | −2,25478 % | −43,1574 % |
| 179 | +174,4074 % | +22,6108 % | −14,23581 % | −64,3537 % |

Fórmulas, com `c = cos(α/2)`:

- **Kidd–Fogg**: `T ≈ T₀ / √c` — superestima; simples e memorizável.
- **Lima–Arun**: `T ≈ T₀ · (−ln c)/(1 − c)` — superestima; melhor que Kidd–Fogg em toda a faixa.
- **Duas iterações do AGM**: `T ≈ 4·T₀/(1 + √c)²` — precisão excepcional (erro < 0,002 % até 90°)
  a custo praticamente nulo; é o AGM interrompido no segundo passo.

**Decisão**: as três entram como modelos selecionáveis (RF-010), sempre com a fonte citada na
própria aplicação (RF-011). O valor de referência exato continua sendo o AGM completo.

### Tabela C — Termos necessários para uma precisão alvo

| α (°) | `N` mínimo para erro < 0,1 % | `N` mínimo para erro < 0,01 % |
|---|---|---|
| 10 | 1 | 1 |
| 30 | 1 | 2 |
| 45 | 2 | 3 |
| 60 | 3 | 4 |
| 90 | 6 | 9 |
| 120 | 13 | 20 |
| 150 | 53 | 81 |

Base do RF-009. A explosão do custo perto de 180° é, ela própria, conteúdo didático.

### Tabela D — Gravidade inferida a partir do período *(o cerne da tabela de coleta)*

`L = 1 m`, gravidade verdadeira `9,81 m/s²`, período medido igual ao período **real**:

| α (°) | T real (s) | `g` pela fórmula ingênua `4π²L/T²` | erro em `g` | `g` com correção `N = 2` |
|---|---|---|---|---|
| 5 | 2,007022 | 9,800664 | −0,0952 % | 9,810000 |
| 10 | 2,009893 | 9,772688 | −0,3803 % | 9,809999 |
| 20 | 2,021451 | 9,661247 | −1,5163 % | 9,809947 |
| 45 | 2,086256 | 9,070361 | −7,5396 % | 9,803478 |
| 60 | 2,152875 | 8,517698 | −13,1733 % | 9,775424 |
| 90 | 2,367842 | 7,041324 | −28,2230 % | 9,477358 |

**Este é o resultado que justifica a coluna `g` da tabela de coleta** (RF-142 a RF-144). Quem mede
um pêndulo simples a 45° e aplica a fórmula de pequenos ângulos obtém `g = 9,07` em vez de `9,81` —
um erro de 7,5 % que nenhuma melhoria de instrumento corrige, porque é erro de **modelo**. No
pêndulo cicloidal, a mesma medição devolve `9,81` em qualquer amplitude. A tabela torna esse
contraste visível linha a linha.

### Tabela E — Meio período medido pelo sensor *(reprodução do roteiro alemão)*

`L = 1 m`. A barreira de luz do roteiro mede **meio período**.

| α (°) | T exato (s) | meio período (s) | diferença em relação a α → 0 (ms) |
|---|---|---|---|
| 1 | 2,006105 | 1,003052 | +0,038 |
| 5 | 2,007022 | 1,003511 | +0,955 |
| 10 | 2,009893 | 1,004946 | +3,826 |
| 15 | 2,014694 | 1,007347 | +8,627 |
| 20 | 2,021451 | 1,010726 | +15,385 |
| 30 | 2,040990 | 1,020495 | +34,923 |

Confirma quantitativamente a afirmação do roteiro alemão de que, com amplitudes maiores, o período
aumenta em "alguns milissegundos" e a dependência é "da ordem de porcentagem". A resolução exigida
do sensor simulado — ~0,1 ms — é o que obriga a interpolação do instante de cruzamento (ver Q8).

---

## 3. Os Dois Regimes

### Q3 — Como o pêndulo cicloidal se encaixa na mesma fórmula-motor?

**Decisão**: o modo cicloidal é modelado como o caso em que **todos os termos de `n ≥ 1` são
identicamente nulos**, restando `T = 2π√(L/g)` para qualquer amplitude.

**Justificativa física — e a interface deve apresentá-la assim, não como truque algébrico**: quando
a massa é obrigada a percorrer uma cicloide, o comprimento livre do fio encurta como `L·cos θ`
conforme o ângulo cresce. O deslocamento ao longo do arco passa a ser `s = L·sen θ`, e a equação do
movimento em termos de `s` torna-se **exatamente** harmônica:

```
s̈ = −(g/L)·s      ⇒      T = 2π√(L/g),  exato, para qualquer amplitude
```

O encurtamento compensa precisamente o efeito que, no pêndulo simples, faz o período crescer. É a
**tautocronia** de Huygens. O roteiro alemão descreve exatamente esta compensação: "com maior
deslocamento o comprimento efetivo do pêndulo diminui".

**Geometria necessária para desenhar**: faces cicloidais de raio gerador `r = L/4`; a evoluta de uma
cicloide é uma cicloide congruente, e a trajetória da massa é a involuta gerada pelo fio de
comprimento `L = 4r` desenrolando sobre as faces. Parametrização da tautócrona, com a cúspide para
cima:

```
x = r·(φ − sen φ)        y = −r·(1 − cos φ)
```

**Restrição de amplitude**: como `s = L·sen θ` e `|s| ≤ L`, o modo cicloidal admite `α ≤ 90°`
(RF-025). Ultrapassar isso significaria desenrolar mais fio do que existe.

**Teste de propriedade decorrente**: comprimento do trecho enrolado + comprimento do trecho livre
`= L`, constante, para todo θ. É a verificação que impede uma geometria "plausível mas errada".

**Fonte**: `mhd_zykloidenpendel.pdf`; applet GeoGebra de Rafael Losada Liste; Huygens,
*Horologium oscillatorium* (1673).

### Q4 — Tautócrona e braquistócrona são a mesma coisa?

**Decisão**: **não**, e a aplicação deve distingui-las explicitamente (RF-033). A cicloide tem as
duas propriedades, o que causa confusão frequente:

- **Tautócrona**: o tempo de descida até o ponto mais baixo é o mesmo, **qualquer que seja o ponto
  de partida** sobre a curva. É esta a propriedade que produz o pêndulo isócrono.
- **Braquistócrona**: entre dois pontos dados, a cicloide é a curva de **menor tempo** de descida.

O roteiro alemão cita ambas em sequência; a aplicação deve apresentá-las separadamente para não
fundi-las. O apelido histórico "Helena dos Geômetras" vem justamente do acúmulo de propriedades
notáveis.

---

## 4. Métodos Numéricos

### Q5 — Como calcular o período exato de referência?

**Decisão**: `T_exato = T₀ / AGM(1, cos(α/2))`, usando a média aritmético-geométrica.

**Justificativa**: da identidade `K(k) = π/(2·AGM(1, k'))` com `k' = √(1−k²) = cos(α/2)`, segue
diretamente `T = 4√(L/g)·K(k) = T₀/AGM(1, cos(α/2))`. O AGM converge **quadraticamente** — cerca de
5 iterações bastam para a precisão de um `double` —, é numericamente estável e tem implementação de
seis linhas.

**Alternativas**: quadratura de Gauss–Legendre sobre a integral elíptica (mais código, mais lento);
séries de Legendre com muitos termos (convergência lenta perto de 180°); bibliotecas externas
(violam o Princípio VII).

### Q6 — Qual integrador usar na animação?

**Decisão**: **velocity-Verlet** como padrão, **RK4** como opção comparativa selecionável.

**Justificativa**: velocity-Verlet é simplético — mantém o erro de energia **limitado e oscilante**
por tempos longos, em vez de acumular deriva. Como a aplicação exibe um gráfico de energia, qualquer
deriva sistemática seria lida pelo estudante como erro de física, não do integrador. RK4 tem erro
local menor por passo, porém dissipa energia de forma monotônica.

**Alternativas**: Euler explícito — instável, ganha energia, descartado exceto como demonstração
didática de mau integrador; Euler semi-implícito — aceitável, porém inferior ao Verlet pelo mesmo
custo.

**Passo de tempo**: `h = 1/600 s` fixo (10 sub-passos por quadro a 60 fps), com acumulador e teto
anti-espiral de 0,25 s. Critério de aceite: deriva de energia < 0,1 % em 1000 períodos.

### Q7 — Passo fixo ou passo variável?

**Decisão**: **passo fixo com acumulador**, jamais `deltaTime` cru do quadro.

**Justificativa**: o Princípio V exige que o mesmo estado produza o mesmo resultado. Passo variável
torna a trajetória dependente da carga da máquina, quebrando testes e o compartilhamento de estado
por URL. Câmera lenta é escala do tempo simulado, não redução da taxa de quadros.

### Q8 — Como o sensor mede o período com resolução de milissegundos?

**Decisão**: detectar a **mudança de sinal de θ** entre dois passos consecutivos e **interpolar
linearmente** o instante do cruzamento.

**Justificativa**: sem interpolação, a resolução do período fica limitada ao passo de integração
(1/600 s ≈ 1,7 ms), o que é da mesma ordem da diferença que se quer demonstrar (+3,8 ms a 10°,
Tabela E) — o efeito ficaria afogado no ruído de discretização. Com interpolação linear, o erro cai
para a ordem de `h²`, muito abaixo de 0,1 ms.

**Convenção adotada** (RF-137): passagens **consecutivas** ⇒ meio período; passagens no **mesmo
sentido** ⇒ período completo. A interface sempre rotula qual das duas está exibindo, porque o
roteiro alemão mede meio período e a confusão entre as duas grandezas é o erro mais comum ao
reproduzir o experimento.

---

## 5. Decisões de Produto e Tecnologia

| Questão | Decisão | Alternativas descartadas | Justificativa resumida |
|---|---|---|---|
| Q9 — Stack | Vite + TypeScript, sem framework | Vanilla sem build; React; Svelte | Tela única com estado pequeno e muito numérico; TS obrigatório pelas unidades; Princípio VII |
| Q10 — Cena | Canvas 2D em 3 camadas + overlay HTML | SVG; WebGL; canvas único | Rastro acumulativo isolado; rótulos em HTML resolvem a11y e i18n |
| Q11 — Gráficos | uPlot + `XYPlot` próprio | Chart.js; Plotly; D3 | uPlot é leve e rápido, mas exige eixo x monotônico; retrato de fase é paramétrico |
| Q12 — Fórmulas | KaTeX, `htmlAndMathml`, `\htmlClass`/`\htmlId` | MathJax; MathML nativo; SVG | Render **síncrono** evita cintilação a cada mudança de parâmetro; MathML nativo ainda irregular |
| Q13 — Parâmetros | `<input type="range">` + `<input type="number">` nativos, gerados por esquema | Widget `role="slider"` custom | Princípio III exige digitação; nativo já entrega teclado e leitor de tela |
| Q14 — Estado/URL | Store próprio; hash legível `#L=1&alpha=10&v=1` | nanostores; Redux; base64 comprimido | Auditável a olho; professor monta o link à mão |
| Q15 — Pastas | `physics ← state ← render/ui`, imposto por ESLint | Convenção informal | Física pura permite testar no Node e gerar tabelas-ouro |
| Q16 — Entrega | `dist/` para Pages **e** arquivo único offline | Só Pages | Sala de aula sem internet confiável; Princípio VII |

---

## 6. Referências de Mercado

### PhET Pendulum Lab

Telas Intro, Energy e Lab. Expõe: comprimento e massa de **dois** pêndulos independentes; gravidade
com presets (Lua, Terra, Júpiter, Planeta X, Custom); atrito de "None" a "Lots"; vetores de
velocidade e aceleração; gráfico de energia com cinética, potencial, térmica e total; **Period
Timer**, **Period Trace**, cronômetro e régua; câmera lenta; e o desafio "What is the value of
gravity?". A descrição oficial menciona explicitamente o "comportamento anarmônico em grandes
amplitudes".

**Lacuna que aproveitamos**: o PhET **mostra** que o período depende da amplitude, mas **não
apresenta a fórmula** que descreve essa dependência, nem permite manipular seus termos. Não há
modo cicloidal.

### GeoGebra — Cycloidal Pendulum (Rafael Losada Liste)

Pêndulo cicloidal de Huygens em tempo real, sem atrito, integrado por física vetorial via script.
Demonstra a tautocronia com duas massas soltas de posições diferentes chegando juntas. Mostra o fio
de comprimento `4r` enrolando na evoluta e a relação evoluta/involuta, com opção de círculo osculador.
Controles: Play, pontos M e A reposicionáveis, checkbox do círculo osculador.

**Lacuna que aproveitamos**: praticamente **nenhum parâmetro físico é configurável** — não há
`L`, `g`, massa, atrito nem entrada numérica. É uma demonstração geométrica, não um laboratório.

### Posicionamento

Nenhuma das duas referências reúne (a) a fórmula geral visível e manipulável termo a termo,
(b) os dois regimes derivados da mesma expressão, e (c) um catálogo amplo de parâmetros com entrada
numérica nomeada. Essa interseção é o produto.

---

## 7. O Roteiro Alemão como Cenário de Validação

O `mhd_zykloidenpendel.pdf` fornece um experimento real, com números, que serve de teste de aceite
do simulador: pêndulo de comprimento efetivo **1 m**, barreira de luz medindo **meio período**,
osciloscópio registrando variações "na faixa de porcentagem" e aumento de "alguns milissegundos"
com amplitudes maiores. A Tabela E reproduz esses números.

O roteiro também registra os erros da aproximação `sen α ≈ α` **no ângulo** — 0,5 % a 10° e 2 % a
20°. Conferido: `sen(0,17453) = 0,17365` ⇒ 0,51 %; `sen(0,34907) = 0,34202` ⇒ 2,06 %. **Atenção:
esses percentuais são do ângulo, não do período** — os do período são 0,19 % e 0,77 %
(Tabela A). A aplicação deve apresentar as duas grandezas separadamente; confundi-las é um erro
comum ao ler o roteiro.

---

## 8. Riscos Numéricos e Casos-Limite

| Caso | Comportamento definido |
|---|---|
| `α = 0` | `T = T₀`; sistema em repouso; sensor não dispara; nenhuma linha coletada |
| `α → 180°` | Período real diverge; série `N = 2` satura em `89/64`; interface avisa e limita em 179,9° |
| `α > 90°` no modo cicloidal | Proibido por geometria (`\|s\| ≤ L`); valor ajustado e mudança comunicada (RF-025) |
| `g = 0` | Sem oscilação; período indefinido; interface exibe "sem oscilação" em vez de infinito ou NaN |
| `L = 0` | Rejeitado pela faixa do parâmetro; mínimo positivo declarado no esquema |
| `N = 0` | Reduz exatamente a `T₀`; caminho de código idêntico, sem ramificação especial |
| `k → 1` no AGM | `cos(α/2) → 0`; convergência degrada; limitação em 179,9° mantém a estabilidade |
| Atrito muito alto | Regime superamortecido sem cruzamento de zero; sensor não dispara; interface explica |
| Passo grande com RK4 | Deriva de energia visível — mantido intencionalmente como demonstração (RF-113) |

---

## 9. Questões em Aberto

1. **Vídeo animado (WebM/GIF)** — a exportação de vídeo depende de `MediaRecorder`, cujo suporte
   varia entre navegadores. Mantida como requisito opcional; decidir na Fase 7 se entra ou vira
   sequência de PNGs.
2. **Sonificação** (RF-123) — o desenho sonoro que torne audível a simultaneidade das passagens no
   modo cicloidal ainda não está definido; requisito é opcional e não bloqueia o MVP.

---

## 10. Fontes Consultadas

**Materiais do usuário**
- `formula simples.jpeg`, `formula completa.jpeg`, `formula geral.jpeg`
- `mhd_zykloidenpendel.pdf` — "Zykloidenpendel", roteiro de experimento
- `doc.txt`

**Simulações de referência**
- PhET Pendulum Lab — https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html
- Página oficial da simulação — https://phet.colorado.edu/en/simulations/pendulum-lab
- Arquivo de strings oficial — repositório `phetsims/pendulum-lab`
- GeoGebra, "Cycloidal Pendulum", Rafael Losada Liste — https://www.geogebra.org/m/ymbbprbw

**Físico-matemáticas**
- Huygens, C. *Horologium oscillatorium* (1673) — tautocronia e faces cicloidais
- Kidd, R. B.; Fogg, S. L. "A simple formula for the large-angle pendulum period",
  *The Physics Teacher* 40 (2002)
- Lima, F. M. S.; Arun, P. "An accurate formula for the period of a simple pendulum oscillating
  beyond the small-angle regime", *American Journal of Physics* 74 (2006)
- Carvalhaes, C. G.; Suppes, P. "Approximations for the period of the simple pendulum based on the
  arithmetic-geometric mean", *American Journal of Physics* 76 (2008)

**Verificação numérica**
- Tabelas A–E geradas e conferidas por cálculo independente; congeladas em `tests/golden/`

# Tarefas: Pêndulo — Fórmula Completa

**Funcionalidade**: `001-pendulo-formula-completa` · **Data**: 2026-08-17
**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md) · [data-model.md](./data-model.md) ·
[contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Total**: 134 tarefas · **Marcador `[P]`**: pode rodar em paralelo com as demais `[P]` do mesmo lote
(arquivos distintos, sem dependência mútua).

**Regra de ouro (Princípio IX)**: em cada fase, as tarefas de teste vêm **antes** das de
implementação e **devem falhar** antes do código existir. Uma tarefa só está concluída quando seu
critério de conclusão é verificável por comando.

---

## Fase 0 — Fundação (T001–T010) ✅ CONCLUÍDA

> Executada em 2026-08-18. Portão de saída verificado: `npm run verificar` termina com código 0
> (lint, tipos, 30 testes com 100 % de cobertura em `physics/`, os dois builds e o orçamento de tamanho).
> Duas tarefas de teste foram antecipadas da Fase 1 — `tests/unit/units.test.ts` e
> `tests/unit/constants.test.ts` — porque o limiar de cobertura de 95 % em `physics/` é parte do
> portão e não poderia ser satisfeito de outro modo.

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T001 | Inicializar projeto npm com Vite e TypeScript em modo estrito | `package.json`, `tsconfig.json`, `vite.config.ts` | — | `npm run build` conclui sem erro | — |
| T002 | Criar a árvore de pastas de `src/` conforme o plano | `src/**/.gitkeep` | — | Estrutura idêntica à do plan.md §Estrutura | T001 |
| T003 | [P] Configurar ESLint com `no-restricted-imports` impondo `physics ← state ← render/ui` | `eslint.config.js` (config plana; ESLint 10 removeu `.eslintrc`) | — | Import proibido em `physics/` quebra o lint | T002 |
| T004 | [P] Configurar Vitest com cobertura e limiar de 95 % em `physics/` | `vitest.config.ts` | — | `npm test` roda e reporta cobertura | T001 |
| T005 | [P] Configurar o alvo de arquivo único com `vite-plugin-singlefile` | `vite.config.singlefile.ts` | RNF-011 | `npm run build:single` gera HTML autocontido | T001 |
| T006 | [P] Configurar Playwright para os testes de ponta a ponta | `playwright.config.ts` | — | `npm run test:e2e` executa em navegador | T001 |
| T007 | [P] Definir tipos nominais de unidades | `src/physics/units.ts` | RNF-022 | Somar `Rad` com `Deg` é erro de compilação | T002 |
| T008 | [P] Definir constantes físicas e gravidades planetárias | `src/physics/constants.ts` | RF-038 | Lua 1,62 · Terra 9,81 · Júpiter 24,79 conferidos | T007 |
| T009 | [P] Criar tokens de estilo e temas claro, escuro e alto contraste | `src/styles/tokens.css` | RF-069 | Trocar `data-tema` altera toda a paleta | T002 |
| T010 | Configurar CI: lint, testes, build e limite de tamanho do pacote | `.github/workflows/pages.yml`, `scripts/verificar-tamanho.mjs`, `scripts/gerar-arquivo-unico.mjs` | RNF-012 | Pipeline verde; build quebra se exceder o orçamento | T001–T006 |

**Portão de saída**: `npm run lint`, `npm test` e `npm run build` verdes em CI.

---

## Fase 1 — Núcleo de Física: fórmula e período (T011–T030) ✅ CONCLUÍDA

> Executada em 2026-08-18. Portão de saída verificado: **245 testes**, tabelas-ouro batendo em
> 1×10⁻¹², e **100 % de cobertura** em `physics/` (statements, branches, functions e lines).
>
> As tabelas-ouro foram geradas por três caminhos independentes que concordaram: binomiais em
> BigInt e AGM (`scripts/gerar-tabelas.mjs`), quadratura de Simpson da integral elíptica
> (divergência máxima 1,8×10⁻¹⁴), e conferência final em Python.
>
> Dois trechos de **código morto** foram removidos ao perseguir a cobertura: a guarda
> `cos(α/2) ≤ 0` em `approximations.ts`, inalcançável porque `|α| < π` já garante o sinal, e o
> tratamento de negativos no `mdc` de `series.ts`, que só recebe quadrados.

### Testes primeiro

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T011 | [P] Gerar as tabelas-ouro por via independente e congelá-las | `tests/golden/periodo.snap.json`, `scripts/gerar-tabelas.mjs` | RF-001 | Valores conferem com as Tabelas A–E de `research.md` em 1×10⁻¹² | T007 |
| T012 | [P] Testes dos coeficientes da série | `tests/unit/series.test.ts` | RF-001 | Falham; cobrem `a₀..a₅` e a recorrência | T011 |
| T013 | [P] Testes do somatório e dos termos, incluindo `χ` do modo cicloidal | `tests/unit/series.test.ts` | RF-002 a RF-004, RF-023 | Falham; cobrem `N=0`, cicloidal e a Tabela A | T011 |
| T014 | [P] Testes do AGM e da integral elíptica | `tests/unit/elliptic.test.ts` | RF-005 | Falham; cobrem `K(0) = π/2` e a convergência | T011 |
| T015 | [P] Testes do período por modo e da razão `T/T₀` | `tests/unit/period.test.ts` | RF-014, RF-021 a RF-023 | Falham; incluem a isocronia do cicloidal | T011 |
| T016 | [P] Testes das aproximações de forma fechada | `tests/unit/approximations.test.ts` | RF-010, RF-011 | Falham; conferem a Tabela B | T011 |
| T017 | [P] Testes da geometria cicloidal, com o invariante de comprimento do fio | `tests/unit/cycloid.test.ts` | RF-026, RF-027, RF-029 | Falham; propriedade `livre + enrolado = L` | T011 |

### Implementação

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T018 | Implementar coeficientes por recorrência e forma fracionária | `src/physics/series.ts` | RF-001 | T012 passa; sem estouro até `N = 50` | T012 |
| T019 | Implementar somatório, termos e `χ(n, modo)` | `src/physics/series.ts` | RF-002 a RF-004, RF-023 | T013 passa | T018 |
| T020 | Implementar saturação da série e termos necessários | `src/physics/series.ts` | RF-008, RF-009 | `saturacaoSerie(2) === 89/64` | T019 |
| T021 | Implementar AGM e integral elíptica completa | `src/physics/elliptic.ts` | RF-005 | T014 passa | T014 |
| T022 | Implementar `T₀`, período por série e período exato por modo | `src/physics/period.ts` | RF-014, RF-021 a RF-023 | T015 passa | T019, T021 |
| T023 | Implementar erros, sinal do erro e classificação de confiança | `src/physics/period.ts` | RF-006, RF-007, RF-013 | Limiares em 54,373° / 81,603° / 110,164° | T022 |
| T024 | Implementar a fachada `resultadoPeriodo` | `src/physics/period.ts` | RF-001 a RF-014 | Devolve a entidade completa do data-model | T023 |
| T025 | Implementar Kidd–Fogg, Lima–Arun e duas iterações, com fonte obrigatória | `src/physics/approximations.ts` | RF-010, RF-011 | T016 passa; modelo sem fonte não compila | T016, T022 |
| T026 | Implementar geometria da cicloide, `L = 4r` e ponto zero | `src/physics/cycloid.ts` | RF-026, RF-029, RF-135 | T017 passa | T017 |
| T027 | Implementar trajetória da massa, comprimento livre e enrolado | `src/physics/cycloid.ts` | RF-027 | Invariante mantido para todo `θ` | T026 |
| T028 | Implementar a restrição `α ≤ 90°` do modo cicloidal | `src/physics/cycloid.ts` | RF-025 | Justificativa geométrica documentada no código | T027 |
| T029 | [P] Implementar energias | `src/physics/energy.ts` | RF-076, RF-077 | Referência de `E_p` no ponto mais baixo | T007 |
| T030 | [P] Implementar varredura `T(α)` e análises auxiliares | `src/physics/analysis.ts` | RF-079, RF-083 | Cicloidal produz reta horizontal | T022 |

**Portão de saída**: tabelas-ouro batendo em 1×10⁻¹²; cobertura de `physics/` ≥ 95 %.

---

## Fase 2 — Motor Dinâmico e Sensor (T031–T044) ✅ CONCLUÍDA

> Executada em 2026-08-18. Portão de saída verificado: **338 testes**, **100 % de cobertura** em
> `physics/`, período medido pelo sensor concordando com o analítico em melhor que 1×10⁻⁴, e deriva
> de energia abaixo de 0,1 % em **mil períodos** — medida tanto no cicloidal quanto no simples a 90°.
>
> **Decisão de projeto acrescentada ao plano**: o motor integra uma *coordenada generalizada* `q`,
> que é `θ` no modo simples e `s/L = sen θ` no cicloidal. A equação fica `q̈ = −ω₀²·sen q` contra
> `q̈ = −ω₀²·q`, e a única diferença entre os regimes passa a ser `sen q` contra `q`. A velocidade da
> massa vale `L·q̇` nos dois casos, o que uniformiza a energia cinética. Isso torna o Princípio IV
> literal no código e evita duas equações de movimento paralelas.
>
> O critério de aceite mais exigente — reproduzir a **diferença** de 11,56 ms entre α = 10° e
> α = 20° com erro abaixo de 0,1 ms — é o que justifica a interpolação do instante de cruzamento:
> sem ela a resolução ficaria presa ao passo de 1,7 ms, e o efeito do roteiro alemão sumiria no
> ruído de discretização.

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T031 | [P] Testes dos integradores e da conservação de energia | `tests/unit/integrators.test.ts` | RNF-007, RNF-008 | Falham; deriva < 0,1 % em 1000 períodos | T029 |
| T032 | [P] Testes do sensor: interpolação, anti-repique, meio e pleno período | `tests/unit/sensor.test.ts` | RF-136, RF-137 | Falham; erro do instante < 1×10⁻⁴ s | T011 |
| T033 | [P] Testes da inferência de `g`, incluindo a inversão | `tests/unit/inference.test.ts` | RF-142 a RF-144 | Falham; conferem a Tabela D | T011 |
| T034 | Implementar a equação do movimento com atrito e forçamento | `src/physics/ode.ts` | US14; P27–P37 | Sinal restaurador para `\|θ\| < π` | T007 |
| T035 | Implementar velocity-Verlet e RK4 | `src/physics/integrators.ts` | RNF-007, RNF-008 | T031 passa | T031, T034 |
| T036 | Implementar o motor de passo fixo com acumulador e teto anti-espiral | `src/physics/engine.ts` | RNF-008 | Avanço só por múltiplos de `h` | T035 |
| T037 | Implementar *ring buffers* de trajetória com memória constante | `src/physics/engine.ts` | RNF-020 | 3600 amostras; descarte do mais antigo | T036 |
| T038 | Implementar a dinâmica cicloidal `s̈ = −(g/L)·s` | `src/physics/engine.ts` | RF-023, RNF-006 | Período medido igual a `T₀` em qualquer amplitude | T036, T027 |
| T039 | Implementar a detecção de cruzamento com interpolação linear | `src/physics/sensor.ts` | RF-136 | T032 passa | T032, T036 |
| T040 | Implementar o cálculo de período por eventos, meio e completo | `src/physics/sensor.ts` | RF-137 | Ambas as convenções corretas | T039 |
| T041 | Implementar a fixação do sensor no ponto zero, sem arrasto | `src/physics/sensor.ts` | RF-134, RF-135 | Posição constante; cúspide no modo cicloidal | T039, T026 |
| T042 | Implementar inferência de `g` correta e ingênua | `src/physics/inference.ts` | RF-142 a RF-144 | T033 passa; inversão exata em 1×10⁻¹⁰ | T033, T022 |
| T043 | Implementar detecção de amplitude corrente sob atrito | `src/physics/analysis.ts` | US14 | Decaimento acompanhado corretamente | T037 |
| T044 | Teste de integração: período do sensor contra o analítico | `tests/unit/engine.test.ts` | RF-137, RNF-009 | `α=10°` ⇒ `2,009893 s` ± 0,2 ms; Δ(10°→20°) ± 0,1 ms | T040, T022 |

**Portão de saída**: período medido concorda com o analítico em 1×10⁻⁴; deriva de energia < 0,1 %.

---

## Fase 3 — Estado (T045–T058) ✅ CONCLUÍDA

> Executada em 2026-08-18. Portão de saída verificado: **537 testes**, ida e volta pela URL
> preservando **todos os 112 parâmetros** com o endereço reproduzido caractere a caractere, e
> undo/redo estável com agrupamento (arrastar um slider 200 vezes = um passo de desfazer).
>
> Cobertura estendida a `src/state/**` com o mesmo limiar da física: 99,2 % de statements e
> 95,9 % de branches, todos os arquivos acima do piso.
>
> **Ajuste de arquitetura**: o *interpretador* do console ficou em `src/state/console.ts`, e não em
> `src/ui/param-console.ts` como o plano previa. O parser é lógica pura, testável sem DOM; a T080
> passa a montar apenas o widget sobre ele.
>
> **Três defeitos reais encontrados pelos testes**:
> 1. Colisão de símbolos: `dec` (P51, casas decimais) e `DEC` (P63, decompor aceleração)
>    normalizavam para o mesmo termo — digitar `dec = 3` escreveria no parâmetro errado, em
>    silêncio. P63 passou a `DECOMP`, na spec e no código.
> 2. Os padrões declarados de `h₀` e `Δt` não sobreviviam à própria quantização, e por isso
>    apareceriam eternamente como "não padrão" — a ida e volta pela URL nunca fecharia. Virou
>    invariante permanente de teste.
> 3. `1/600 s` não tem representação decimal finita: o padrão de `Δt` é declarado já arredondado à
>    precisão exibida.

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T045 | [P] Testes do esquema: `min ≤ padrao ≤ max`, unicidade, colisão de aliases | `tests/unit/schema.test.ts` | RF-034, RF-035 | Falham; varrem os 112 parâmetros | T007 |
| T046 | [P] Testes de ida e volta do endereço compartilhável | `tests/unit/url.test.ts` | RF-106, RF-107 | Falham; 12 casos do contrato | T045 |
| T047 | [P] Testes do interpretador do console | `tests/unit/console.test.ts` | RF-055 a RF-058 | Falham; incluem `α = 10` e a atomicidade | T045 |
| T048 | Transcrever os 112 parâmetros `P01–P112` para o esquema | `src/state/schema.ts` | RF-034 a RF-044 | T045 passa; todo código da spec tem entrada | T045 |
| T049 | Implementar o store com assinatura por chave e agrupamento por quadro | `src/state/store.ts` | RNF-003 | N alterações no quadro ⇒ uma notificação | T048 |
| T050 | Implementar validação, limitação e mensagem de limite | `src/state/store.ts` | RF-051 a RF-054, RNF-023 | Mensagem nomeia parâmetro, valor e limite | T049 |
| T051 | Implementar limites dinâmicos e restrições cruzadas | `src/state/store.ts` | RF-025, RF-160 | `R_b ≤ L/4`; `α ≤ 90°` no cicloidal/comparação | T050 |
| T052 | Implementar o grafo de derivações em ordem topológica | `src/state/store.ts` | RF-037 | Sem ciclos; lado mestre explícito | T051, T024 |
| T053 | Implementar serialização e desserialização do endereço | `src/state/url.ts` | RF-106 a RF-108 | T046 passa | T046, T048 |
| T054 | Implementar o núcleo de presets de fábrica e do usuário | `src/state/presets.ts` | RF-097 a RF-099 | Validação e ida-e-volta cobertas por testes; UI fica em T107–T109 | T048 |
| T055 | Implementar histórico com desfazer e refazer agrupados | `src/state/history.ts` | RF-061, RF-062 | Arrastar slider é um passo de desfazer | T049 |
| T056 | Implementar a coleção de medições e as estatísticas | `src/state/measurements.ts` | RF-094, RF-147 | Desvio padrão amostral; `null` com `n < 2` | T042 |
| T057 | Implementar persistência local de presets e preferências | `src/state/persist.ts` | RF-098 | Sobrevive a recarregar a página | T054 |
| T058 | Implementar a máquina de estados da execução | `src/state/execucao.ts` | RF-063 | Parâmetro estrutural pausa e informa o motivo | T049 |

**Portão de saída**: ida e volta pela URL preserva todos os 112 parâmetros; undo/redo estável.

---

## Fase 4 — Cena (T059–T072) ✅ CONCLUÍDA

> Executada em 2026-08-19. A cena usa três bitmaps Canvas coordenados por
> `ResizeObserver`, cada um ajustado ao `devicePixelRatio` com teto explícito
> de 2× e detecção de mudança: geometria estática,
> rastro incremental e conteúdo dinâmico. A transformação metro ↔ pixel é
> reversível e a visualização comparativa compartilha origem vertical e escala.
>
> A verificação corretiva elevou o projeto a **603 testes unitários em 24 arquivos**, incluindo
> `src/render/**` e os módulos extraídos de `src/app/**` no gate **por arquivo**. O conjunto alcança
> 99,02% de statements, 94,66% de branches, 99,44% de funções e 99,47% de linhas.
> Há 14 cenários E2E, totalizando **28 execuções** em Chromium e Firefox: DPR, controles,
> comparação e limites, URL adversária, bfcache, pixels reais, tema/teclado,
> rejeição de modelo incompleto e orçamento de quadro. O smoke visual cobriu a
> comparação com cicloide, instrumentos, régua reposicionável, estroboscópio,
> rastro de período e fantasma `T₀`, sem erro de console.
>
> O invariante do fio (`L = trecho enrolado + trecho livre`, com `r = L/4`) é
> verificado em quatro amplitudes, inclusive 89°. Lint, tipos, cobertura,
> builds e tamanho passam; os artefatos medem **26,8 KB gzip** no alvo Pages e
> **82,5 KB** no HTML offline. As 28 execuções E2E (14 em cada navegador) passam.
> A CI instala explicitamente Chromium e Firefox antes de
> executar o Playwright.
>
> O ensaio executado nesta fase é um gate curto de regressão, não a comprovação
> integral do RNF-001/P95 por 60 segundos. Essa comprovação continua corretamente
> escopada em T121, após os gráficos da Fase 7. O histórico disponível contém
> apenas o commit inicial e não registra a sequência teste-falhando → implementação;
> portanto G2 não pode ser comprovado retroativamente, embora os testes atuais
> sejam executáveis e todos os gates passem.

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T059 | Implementar as três camadas de canvas com DPI e redimensionamento | `src/render/layers.ts` | RNF-001 | Nítido em telas de alta densidade | T009 |
| T060 | [P] Implementar a transformação mundo ↔ tela com zoom | `src/render/transform.ts` | RF-077, RF-089 | Régua e cena concordam na escala | T059 |
| T061 | [P] Implementar a paleta a partir dos tokens, com invalidação no tema | `src/render/palette.ts` | RF-121, RNF-015 | Trocar tema redesenha a camada estática | T009 |
| T062 | Desenhar a cena do pêndulo simples: pivô, fio, massa | `src/render/scene.ts` | RF-063, RF-070 | Gate curto sustenta a animação; P95/60 s fica em T121 | T060, T036 |
| T063 | Desenhar as faces cicloidais, trecho enrolado, livre e ponto de contato | `src/render/cycloid-face.ts` | RF-026, RF-027 | Geometria coerente com `L = 4r` | T060, T027 |
| T064 | Desenhar a trajetória da massa e a evoluta | `src/render/cycloid-face.ts` | RF-026 | Involuta e evoluta distinguíveis | T063 |
| T065 | Implementar o rastro incremental com duração ajustável | `src/render/trace.ts` | RF-071 | Camada nunca limpa por inteiro | T059 |
| T066 | Desenhar o marcador do sensor no ponto zero, com realce de disparo | `src/render/sensor-marker.ts` | RF-134, RF-138 | Visível, não arrastável, pisca a cada passagem | T041, T062 |
| T067 | Desenhar vetores de velocidade, aceleração e forças, com escala | `src/render/instruments.ts` | RF-072, RF-073 | Decomposição tangencial e centrípeta correta | T062 |
| T068 | Desenhar transferidor, régua, linha vertical e arco de amplitude | `src/render/instruments.ts` | RF-088, RF-089 | Leituras coerentes com o estado | T060 |
| T069 | [P] Implementar o estroboscópio | `src/render/scene.ts` | RF-074 | Intervalo e número de imagens configuráveis | T065 |
| T070 | Implementar a cena dupla da visualização "Ambos" com eixo e escala comuns | `src/render/scene.ts` | RF-128, RF-130 | Duas cenas alinhadas verticalmente sem reiniciar ao alternar | T062, T063 |
| T071 | Implementar o pêndulo fantasma de referência com `T₀` | `src/render/scene.ts` | RF-075 | Defasagem visível em relação ao real | T062 |
| T072 | Implementar o laço de animação com orçamento de quadro e diagnóstico | `src/main.ts`, `src/app/runtime.ts` | RNF-001 | Painel a 1 Hz mostra fps e tempo por camada; gate integral em T121 | T059–T071 |

**Portão de saída da fase**: smoke curto ≥55 fps com rastro ligado; invariante
geométrico do fio verificado em cena. O portão integral RNF-001 permanece T121.

**Dependências deliberadamente futuras**: a sonificação opcional do disparo em
RF-138 pertence a P109/T119 (Fase 9); T066 entrega nesta fase o realce visual.
O desacoplamento individual de `L`, `g` e `alpha` em RF-129 depende do modelo
indexado T125–T128 (Fase 5b); T070 entrega a comparação acoplada por padrão e a
preservação de dinâmica exigida por RF-130.
O cenário E2E desta fase verifica a cena comparativa com rastro acima de 55 fps
e abaixo de 16,7 ms por quadro; o ensaio integral de RNF-001 por 60 segundos,
com três gráficos ativos, depende de T097 e do gate de desempenho T121.

---

## Fase 5 — Fórmula e Parâmetros (T073–T086) ✅ CONCLUÍDA

> **Status de verificação (2026-08-24):** T073–T086 concluídas. A entrega inclui
> seletor Simples/Cicloidal/Ambos sem recriar o runtime, controles gerados pelo
> esquema com precisão interna e passo fino, console com aliases, expressões,
> unidades e aplicação atômica documentada, painel completo de derivados e a
> fórmula viva em KaTeX 0.18.4 com saída `htmlAndMathml`, comparação empilhada,
> destaque acessível e métricas observáveis em até 100 ms.
>
> A certificação independente aprovou lint, tipos, **653/653 testes** e cobertura
> por arquivo de **99,10% statements, 94,76% branches, 99,47% funções e 99,56%
> linhas**. Os **10/10 cenários Chromium** da Fase 5 passaram. O build Pages mede
> **370,3 kB comprimidos** (limite 400 kB) e o HTML único offline **734,9 KiB**
> (limite 1.536 KiB), ambos sem requisições externas.
>
> **Atualização (revalidação de 2026-08-24):** o Firefox voltou a executar
> localmente e passou **24/24** cenários; a suíte de ponta a ponta mede **48/48**
> somando Chromium e Firefox. A falha de `browserContext.newPage` registrada antes
> não se reproduz mais, e o gate nos dois navegadores está verificado localmente.
>
> O portão desta fase cobre somente os passos dos Cenários 1, 2 e 4 atribuíveis a
> T073–T086. A tabela de coleta completa e o gráfico `T(α)` permanecem, de forma
> deliberada, nas Fases 6 e 7.

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T073 | Implementar o seletor de visualização Simples · Cicloidal · Ambos | `src/ui/view-selector.ts` | RF-127, RF-128 | Trocar **não** reinicia nem limpa a tabela | T058 |
| T074 | Garantir preservação de estado e medições na troca de visualização | `src/ui/view-selector.ts`, `src/state/store.ts` | RF-130 | Tempo e dinâmica preservados | T073, T056 |
| T075 | Implementar o componente `ParamControl` gerado pelo esquema | `src/ui/param-control.ts` | RF-034, RF-036 | Rótulo, número, unidade, slider e reset | T048 |
| T076 | Implementar a sincronização sem salto de cursor entre número e slider | `src/ui/param-control.ts` | RF-045 | Digitar `10` não limita o `1` intermediário | T075 |
| T077 | Implementar passo fino, teclado e restauração de padrão | `src/ui/param-control.ts` | RF-046 | Setas, PageUp/Down e modificador de precisão | T076 |
| T078 | Implementar divulgação progressiva de básico e avançado | `src/ui/panels/parametros.ts` | RF-036 | Avançados a no máximo dois passos | T075 |
| T079 | Implementar exibição de parâmetros derivados como somente-leitura | `src/ui/panels/parametros.ts` | RF-037 | Identificados como derivados | T052 |
| T080 | Implementar o interpretador do console de parâmetros | `src/ui/param-console.ts` | RF-045 a RF-047 | T047 passa; `α = 10` funciona em todas as formas | T047, T050 |
| T081 | Renderizar a fórmula com KaTeX, com âncoras por termo | `src/ui/formula.ts` | RF-131, RF-132 | Saída `htmlAndMathml`; um `id` por termo | T024 |
| T082 | Injetar valores numéricos vivos nos *slots* da fórmula | `src/ui/formula.ts` | RF-133 | Valor e contribuição por termo, em tempo real | T081 |
| T083 | Implementar o destaque termo a termo, por cursor e por teclado | `src/ui/formula.ts` | RF-073 | Realce sincronizado com a explicação | T082 |
| T084 | Implementar a transição de modo apagando e reacendendo os termos | `src/ui/formula.ts` | RF-024, RF-132 | **Mesma** expressão; nunca substituída por outra | T083, T073 |
| T085 | Implementar a fórmula dupla empilhada da visualização "Ambos" | `src/ui/formula.ts` | RF-132 | Alinhadas pelo sinal de igual | T084 |
| T086 | Exibir `T₀`, `T`, `T/T₀`, erro e faixa de confiança sob a fórmula | `src/ui/formula.ts` | RF-014, RF-006, RF-013 | Todos atualizados em ≤ 100 ms | T082 |

**Portão de saída**: Cenários 1, 2 e 4 do quickstart passando.

---

## Fase 6 — Tabela de Coleta (T087–T096) ✅ CONCLUÍDA

> Executada em 2026-08-25. Portão de saída verificado: **Cenário 6 do quickstart passando por
> completo**, com **669 testes unitários** e **60/60 cenários de ponta a ponta em Chromium e
> Firefox**. Cobertura por arquivo em 99,03 % de statements e 94,47 % de branches.
>
> A tabela reproduz os números de referência do cenário, incluindo o contraste que justifica a
> coluna: a 45° no pêndulo simples, `g` inferido **9,8035** contra `g` ingênuo **9,0704**; no
> cicloidal, as duas colunas coincidem em **9,8100** para qualquer amplitude.
>
> **Correção de rigor no quickstart**: o passo 6.8 passou a distinguir o período **medido pelo
> sensor** (exato, `2,0863 s`) do período **teórico da série truncada** em `N = 2` (`2,0856 s`).
> São grandezas diferentes e a tabela exibe as duas — confundi-las mascararia justamente o erro de
> modelo que a fase existe para mostrar.
>
> **Defeito corrigido na validação**: um cenário exigia que a rolagem horizontal permanecesse em
> 180 px depois de mover o foco para um botão fora da área visível. O Firefox rola para revelar o
> elemento focado — comportamento nativo e correto de acessibilidade, que suprimir seria regressão.
> A aplicação já preservava a rolagem no re-render (`preventScroll` na restauração de foco); a
> premissa do teste é que estava errada. A rolagem de referência passou a ser estabelecida **depois**
> do foco, medindo o que de fato importa.


| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T087 | [P] Testes de ponta a ponta da coleta e das colunas | `tests/e2e/tabela.spec.ts` | RF-140, RF-141 | Falham; cobrem o Cenário 6 | T006 |
| T088 | Renderizar a tabela como tabela semântica sob a fórmula | `src/ui/data-table.ts` | RF-140, RF-149 | `<table>` com cabeçalhos associados | T086 |
| T089 | Implementar as colunas obrigatórias `#`, pêndulo, `T`, `g`, `α`, `L`, erro | `src/ui/data-table.ts` | RF-140, RF-141 | Ordem e unidades conforme o contrato | T088 |
| T090 | Implementar a coleta automática por período detectado | `src/ui/data-table.ts`, `src/state/measurements.ts` | RF-145 | Uma linha por período completo | T089, T040 |
| T091 | Implementar a coleta manual sob comando | `src/ui/data-table.ts` | RF-145 | Registra imediatamente, marcada como manual | T090 |
| T092 | Exibir `g` inferido ao lado do ingênuo e do configurado | `src/ui/data-table.ts` | RF-142 a RF-144 | Contraste visível: 9,803 × 9,070 a 45° | T042, T089 |
| T093 | Implementar pausar, excluir linha, limpar com confirmação e ordenar | `src/ui/data-table.ts` | RF-146, RF-105 | Limpar **exige** confirmação | T089 |
| T094 | Implementar o rodapé de estatísticas de `T` e `g` | `src/ui/data-table.ts` | RF-147 | `n < 2` exibe "—", nunca zero | T056 |
| T095 | Identificar o pêndulo de origem na visualização "Ambos" | `src/ui/data-table.ts` | RF-139 | Um sensor por cena; linhas rotuladas | T070, T091 |
| T096 | Unificar a tabela de coleta com o caderno de laboratório | `src/state/measurements.ts` | RF-150, RF-102 | Coleção única, sem registro duplicado | T094 |

**Portão de saída**: Cenário 6 do quickstart passando por completo.

---

## Fase 7 — Gráficos e Instrumentos (T097–T106) ✅ CONCLUÍDA

Por AD-03 não há uPlot: um renderizador próprio cobre os sete gráficos, e as
colunas de arquivo abaixo refletem isso — o `timeseries.ts` previsto na versão
original destas tarefas nunca chegou a existir.

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T097 | ✅ Painel de gráficos com redesenho a 20 Hz e canvas único | `src/ui/panels/graficos.ts` | RNF-002 | Não viola o orçamento de quadro | T072 |
| T098 | ✅ Gráficos `θ(t)`, `ω(t)` e `a(t)` | `src/state/charts.ts` | RF-075 | Séries distinguíveis por traço e cor | T097 |
| T099 | ✅ Energia cinética, potencial, térmica e total | `src/state/charts.ts` | RF-078 | Soma constante sem dissipação | T029, T097 |
| T100 | ✅ Curva `T(α)` com os modelos sobrepostos | `src/state/charts.ts` | RF-079, RF-081 | Cicloidal aparece como reta horizontal | T030, T097 |
| T101 | ✅ Gráfico de erro em escala linear e logarítmica | `src/state/charts.ts`, `src/render/charts/escala.ts` | RF-080 | Erro sempre negativo para série truncada | T023, T097 |
| T102 | ✅ Convergência por número de termos, com o custo em `N` | `src/state/charts.ts`, `src/physics/analysis.ts` | RF-084, RF-013 | Confere com o Cenário 9 | T020, T097 |
| T103 | ✅ `XYPlot` próprio para retrato de fase e Poincaré | `src/render/charts/xyplot.ts` | RF-076, RF-077, RF-086 | Trajetória paramétrica correta | T072 |
| T104 | ✅ Cronômetro manual e contagem de `n` períodos | `src/state/instrumentos.ts`, `src/ui/panels/medicoes.ts` | RF-090, RF-093 | Período médio exibido | T040 |
| T105 | ✅ Fotoporta móvel como instrumento adicional distinto | `src/state/instrumentos.ts`, `src/ui/panels/medicoes.ts` | RF-091, RF-092 | Rotulada distintamente do sensor fixo | T104, T041 |
| T106 | ✅ Ruído de medição com semente reprodutível | `src/state/instrumentos.ts` | RF-094 | Mesma semente ⇒ mesma sequência | T056 |

**Portão de saída**: ✅ Cenários 3 e 9 do quickstart passando (`tests/e2e/graficos.spec.ts`);
RNF-001 mantido com gráfico temporal ativo; 836 testes unitários e 86 e2e verdes.

**Achados registrados nesta fase**

- O quickstart 9.8 prometia ler `N ≥ 53` a 150°, acima do teto `N ≤ 50` de P42.
  A busca passa a devolver *nulo* nesse caso, e a interface diz "mais de 50
  termos" — a impossibilidade é o próprio ponto pedagógico.
- Com `FONTE = fórmula` (o padrão) o motor não integra, e os quatro gráficos
  temporais ficariam vazios sem explicação. Cada um passa a declarar qual fonte
  precisa, em vez de aparentar defeito.

---

## Fase 8 — Presets, Roteiros e Exportação (T107–T114) ✅ CONCLUÍDA

Os presets e roteiros vivem em módulos TypeScript, e não nos `.json` previstos
na redação original: assim os identificadores de parâmetro são conferidos pelo
compilador, em vez de só falharem ao carregar.

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T107 | ✅ Presets de fábrica, incluindo o do roteiro alemão | `src/state/presets.ts` | RF-097 | Todos com ids de parâmetro existentes, verificado por teste | T054 |
| T108 | ✅ Salvar, carregar, renomear e excluir presets | `src/ui/panels/cenarios.ts` | RF-098 | Persistem entre sessões | T107 |
| T109 | ✅ Importar e exportar arquivo de cenário | `src/ui/panels/cenarios.ts` | RF-099 | Ida e volta restaura estado idêntico, com o estado indexado junto | T108 |
| T110 | ✅ Roteiros guiados com avançar, voltar e sair | `src/state/roteiros.ts`, `src/ui/panels/cenarios.ts` | RF-100, RF-101 | Alterar parâmetro não encerra o roteiro | T108 |
| T111 | ✅ Desafio "Planeta X" com gravidade oculta | `src/state/roteiros.ts`, `src/ui/panels/cenarios.ts` | RF-104 | Comparação só após submissão | T110, T042 |
| T112 | ✅ Exportação CSV conforme o contrato, e o endereço compartilhável publicado | `src/export/csv.ts`, `src/state/endereco.ts` | RF-106, RF-109, RF-148 | BOM UTF-8; os 10 testes do contrato passam | T096 |
| T113 | ✅ Exportação de imagem da cena, carimbada | `src/export/png.ts`, `src/render/layers.ts` | RF-110 | PNG com os parâmetros e a fórmula impressos | T072 |
| T114 | ✅ Medições projetadas sobre a curva teórica | `src/state/charts.ts` | RF-103 | Pontos medidos sobre a curva `T(α)` | T100, T096 |

**Portão de saída**: ✅ Cenários 7, 8 e 10 passando (`tests/e2e/cenarios.spec.ts`);
955 testes unitários e 126 de ponta a ponta verdes.

**Achados registrados nesta fase**

- **O exemplo do Cenário 10.4 era anterior à Área M.** Prometia
  `#v=1&alpha=45&...`, mas desde que θ₀ virou o canônico da largada os espelhos
  não entram no endereço (RF-166) — o que sai é `theta0=45`, e α se reconstrói
  dele ao abrir.
- **O preset da tautócrona não fazia nada.** Pedia `massasTautocrona: 3` (P18),
  um parâmetro que descreve a mesma coisa que `n_p` e nunca é lido. Passa a usar
  `numeroPendulos` com as três alturas independentes que a Fase 5b tornou
  possíveis, e P18 fica no catálogo como redundância conhecida.
- **Presets não carregavam o estado por pêndulo.** `capturarPreset` só guardava
  o catálogo, de modo que a ida e volta de RF-099 devolvia três massas na mesma
  altura. O estado indexado passa a viajar junto.
- **P114 acrescentado**: RF-104 condiciona a revelação de `g` à submissão da
  estimativa, mas nada registrava se a submissão ocorrera.
- **Publicar o endereço quebrava fora do navegador.** O fallback era
  `globalThis`, que existe em qualquer ambiente mas só traz `location` no
  navegador; a guarda conferia o objeto em vez do recurso.

---

## Fase 9 — Idioma, Acessibilidade e Desempenho (T115–T121)

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T115 | Implementar a infraestrutura de i18n e o dicionário pt-BR | `src/i18n/index.ts`, `src/i18n/pt-BR.ts` | RF-115 | Trocar idioma preserva o estado | T048 |
| T116 | [P] Traduzir para inglês e alemão | `src/i18n/en.ts`, `src/i18n/de.ts`, `src/i18n/glossario.md` | RF-115 | Nenhuma chave faltando | T115 |
| T117 | Implementar navegação por teclado e ordem de foco | `src/ui/a11y.ts` | RF-116 a RF-120 | Cenário 11 passa por completo | T088, T077 |
| T118 | Implementar regiões dinâmicas e descrições para leitor de tela | `src/ui/a11y.ts` | RF-119, RF-124 | Fórmula lida via MathML | T117, T081 |
| T119 | [P] Implementar movimento reduzido, paleta segura e redundância de cor | `src/ui/a11y.ts`, `src/styles/tokens.css` | RF-121, RF-122 | Inicia pausado com movimento reduzido | T009 |
| T120 | Implementar o painel de diagnóstico de desempenho | `src/ui/panels/diagnostico.ts` | RNF-001 | fps, passos por quadro, tempo por camada | T072 |
| T121 | Criar o teste automatizado de desempenho no CI | `tests/e2e/desempenho.spec.ts` | RNF-001 | P95 de fps ≥ 55 em 60 s | T120 |

**Portão de saída**: auditoria WCAG 2.1 AA sem violação bloqueante; RNF-001 verificado em CI.

---

## Fase 10 — Documentação e Entrega (T122–T124)

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T122 | Escrever as notas de física e a página de créditos com todas as fontes | `docs/notas-de-fisica.md`, `docs/referencias.md`, `src/ui/panels/creditos.ts` | RF-125, RNF-021 | Toda afirmação numérica rastreável | T025 |
| T123 | Implementar a orientação de primeiro uso, dispensável em um clique | `src/ui/panels/introducao.ts` | RF-126 | Não reaparece automaticamente | T115 |
| T124 | Gerar e versionar `dist/` e `pendulo-simulador.html`; publicar | `dist/`, `pendulo-simulador.html`, `.github/workflows/pages.yml` | RNF-011 | Arquivo único abre offline com duplo clique e funciona por completo | T005, T121 |

---

## Fase 3b — Coerência da posição de largada (T131–T134) ✅ CONCLUÍDA

> Acrescentada em 2026-08-26, depois da Área M da spec. Numerada após as demais por
> ter surgido de defeito observado na aplicação em execução: com `α = 45°` e
> `θ₀ = 10°`, o painel anunciava `T = 2,085562 s` enquanto a tabela media
> `2,0099 s` para o mesmo pêndulo.

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T131 | Declarar `espelhoDe` no esquema e marcar `α` e `h` como espelhos de `θ₀` | `src/state/tipos.ts`, `src/state/schema.ts` | RF-161, RF-162 | `PARAMETROS_ESPELHO` lista os dois; faixa de `α` admite zero | T048 |
| T132 | Reconciliar o trio a cada escrita, com `θ₀` canônico | `src/state/store.ts` | RF-163 a RF-165 | Editar qualquer um dos três deixa os outros coerentes; lado preservado | T131 |
| T133 | Excluir espelhos do endereço e dos presets, e serializar valor exato | `src/state/store.ts`, `src/state/url.ts` | RF-166, RF-167 | Ida e volta preserva o estado, inclusive os espelhos | T132 |
| T134 | Cobrir a regressão | `tests/unit/store.test.ts` | RF-161 a RF-168 | Sete casos: trio, lado, limite cicloidal, `θ₀ = 0`, ausência de ruído | T133 |

**Portão de saída**: impossível montar estado em que a fórmula descreva um movimento
diferente do simulado. Verificado na aplicação em execução.

---

## Fase 5b — Parâmetros Indexados e Altura de Largada (T125–T130) ✅ CONCLUÍDA

Deriva da Área L da spec (anotações `L₁ = 0` e `h₂ = 3` do esboço). Numerada após as demais por ter
sido acrescentada em revisão posterior; executa junto com a Fase 5.

| ID | Tarefa | Arquivos | Req. | Conclusão | Dep. |
|---|---|---|---|---|---|
| T125 | ✅ Testes do endereçamento indexado e da relação `h ↔ α` | `tests/unit/indices.test.ts` | RF-151 a RF-160 | Cobrem as três grafias e as duas geometrias | T047 |
| T126 | ✅ Modelo puro de índice e acoplamento, e valores por pêndulo no Store | `src/state/indices.ts`, `src/state/store.ts`, `src/state/schema.ts` | RF-151, RF-156 | `L₁`, `α₂`, `h₁` resolvem para o pêndulo certo | T125, T048 |
| T127 | ✅ Console honra o índice nas três grafias, e diz o que alcançou | `src/state/console.ts` | RF-152, RF-153, RF-155 | Índice inválido nomeia a faixa válida | T126, T080 |
| T128 | ✅ Acoplar e desacoplar por parâmetro, com estado e rótulo visíveis | `src/ui/param-control.ts` | RF-154 | Desacoplado, `L₁` e `L₂` ficam independentes | T126, T075 |
| T129 | ✅ `hᵢ` com vínculo bidirecional a `αᵢ`, por modo e por pêndulo | `src/state/store.ts` | RF-157, RF-158, RF-160 | `L(1−cos α)` no simples; `L·sen²θ/2` no cicloidal; limite em `2r` | T125, T052 |
| T130 | ✅ N pêndulos simulados e desenhados, com alturas independentes | `src/app/runtime.ts`, `src/render/scene.ts`, `src/render/palette.ts` | RF-159 | Massas com `h₁`, `h₂`, … chegam juntas ao ponto zero | T129, T063 |

**Portão de saída**: ✅ Cenário 4 executável pela altura (`tests/e2e/indices.spec.ts`);
899 testes unitários e 106 de ponta a ponta verdes.

**Achados registrados nesta fase**

- **`h` usava a geometria errada no modo simples.** A reconciliação aplicava
  `h = L·sen²θ/2` — a relação da face cicloidal — em qualquer modo. RF-158 pede
  `h = L(1 − cos α)` no simples, e a 90° com `L = 1` a diferença é entre 0,5 m e
  1 m. O padrão de `h₀` e a faixa de P15 vinham do mesmo engano.
- **`n_p` (P10) estava declarado e nunca lido.** Nenhum segundo pêndulo era
  simulado nem desenhado: a cena tinha uma vista por modo e parava no primeiro
  estado daquele modo. Sem isso a tautocronia de RF-159 não tinha como existir.
- **O trio da largada precisa acoplar junto.** Soltar só `h` deixava `h₂`
  reconciliar o `α` *compartilhado*, e o último pêndulo escrito impunha o seu
  ângulo a todos os outros — os três apareciam sobrepostos.
- **P113 acrescentado.** RF-153 fala do "pêndulo em foco", que o catálogo não
  declarava em lugar nenhum.
- **O mobiliário do painel era redesenhado por pêndulo**, empilhando grades e
  rótulos de ângulo; e o diagnóstico anunciava `FPS 1000000,0` ao dividir por um
  intervalo nulo com a simulação pausada.

**Fora do escopo desta fase**: a escrita do endereço compartilhável na barra do
navegador e o cabeçalho indexado do arquivo exportado ficam para a Fase 8, junto
com a exportação (T112). A serialização do estado indexado já existe e está
coberta; o que falta é a aplicação publicá-la.

---

## Grafo de Dependências

```
Fase 0 ──▶ Fase 1 ──▶ Fase 2 ──▶ Fase 3 ──┬─▶ Fase 4 ──▶ Fase 5 ──▶ Fase 5b ──▶ Fase 6 ──▶ Fase 8
                                           │                  │
                                           └──────────────────┴─▶ Fase 7 ──▶ Fase 9 ──▶ Fase 10
```

Caminho crítico: **T001 → T011 → T018 → T022 → T036 → T039 → T048 → T059 → T075 → T081 → T090 → T112 → T124**

---

## Exemplos de Execução Paralela

| Lote | Tarefas | Observação |
|---|---|---|
| L1 | T003, T004, T005, T006, T007, T008, T009 | Configuração; arquivos independentes |
| L2 | T011 → T012, T013, T014, T015, T016, T017 | Todos os testes da Fase 1, após as tabelas-ouro |
| L3 | T029, T030 | Energia e análises, independentes do período |
| L4 | T031, T032, T033 | Testes da Fase 2 |
| L5 | T045, T046, T047 | Testes da Fase 3 |
| L6 | T060, T061 | Transformação e paleta |
| L7 | T098, T099, T100, T101, T102 | Gráficos, sobre o renderizador próprio (AD-03) |
| L8 | T113, T116, T119 | Exportação de imagem, traduções e acessibilidade visual |
| L9 | T125 → T126, T129 | Testes de índice primeiro; esquema e altura em seguida |

---

## Matriz de Rastreabilidade

Todos os 168 requisitos funcionais e 23 não funcionais têm cobertura. **Nenhum requisito órfão.**

| Requisitos | Área | Tarefas |
|---|---|---|
| RF-001 a RF-004 | Fórmula-motor e termos | T011–T013, T018, T019 |
| RF-005 a RF-009 | Valor exato, erro e convergência | T014, T020, T021, T023, T102 |
| RF-010 a RF-013 | Aproximações e confiança | T016, T023, T025, T101 |
| RF-014 a RF-020 | Derivados e leitura da fórmula | T022, T024, T064, T086 |
| RF-021 a RF-025 | Modos e restrição cicloidal | T015, T019, T022, T028, T051, T084 |
| RF-026 a RF-029 | Geometria cicloidal | T017, T026, T027, T038, T063 |
| RF-030 a RF-033 | Comparação e contexto histórico | T070, T085, T122 |
| RF-034 a RF-044 | Catálogo de parâmetros | T045, T048, T075, T078 |
| RF-045 a RF-062 | Entrada, validação, console, manipulação e histórico | T047, T050, T051, T055, T075–T080 |
| RF-063 a RF-077 | Execução, cena, vetores e apresentação | T034–T036, T058–T072, T083 |
| RF-078 a RF-087 | Gráficos | T037, T043, T097–T103 |
| RF-088 a RF-096 | Instrumentos de medição | T068, T104, T105, T106 |
| RF-097 a RF-105 | Presets, roteiros e caderno | T093, T107–T111 |
| RF-106 a RF-114 | Estado, URL e exportação | T046, T053, T112, T113 |
| RF-115 a RF-126 | Idioma, acessibilidade e apoio | T115–T119, T122, T123 |
| **RF-127 a RF-133** | **Visualizações e fórmula sob a cena** | **T073, T074, T081–T086, T070** |
| **RF-134 a RF-139** | **Sensor fixo no ponto zero** | **T032, T039, T041, T066, T095, T105** |
| **RF-140 a RF-150** | **Tabela de coleta de `T` e `g`** | **T033, T042, T087–T096, T112, T114** |
| **RF-151 a RF-160** | **Parâmetros indexados e altura de largada** | **T125–T130** |
| **RF-161 a RF-168** | **Coerência da posição de largada** | **T131–T134** |
| RNF-001 a RNF-005 | Desempenho | T059, T072, T097, T120, T121 |
| RNF-006 a RNF-010 | Precisão, energia e determinismo numérico | T018, T021, T031, T035, T036, T038, T044 |
| RNF-011 a RNF-015 | Entrega, navegadores, layout e contraste | T005, T010, T059, T061, T121, T124 |
| RNF-016 a RNF-023 | Acessibilidade, memória, fontes e mensagens | T037, T050, T061, T068, T117–T119, T122 |

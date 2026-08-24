# Plano de Implementação: Pêndulo — Fórmula Completa

**Funcionalidade**: `001-pendulo-formula-completa`
**Especificação**: [spec.md](./spec.md)
**Constituição**: [../../.specify/memory/constitution.md](../../.specify/memory/constitution.md)
**Pesquisa**: [research.md](./research.md)
**Data**: 2026-08-17
**Status**: Plano aprovado — pronto para gerar tarefas

---

## Resumo Técnico

Aplicação web de página única, sem framework, que demonstra visualmente a fórmula-motor

```
T = 2π·√(L/g) · Σ_{n=0..N} a_n · sen^{2n}(α/2)        a_n = [C(2n,n)/4ⁿ]²
```

em dois regimes — **pêndulo simples** (termos de correção ativos) e **pêndulo cicloidal**
(termos anulados pela restrição geométrica, `T = 2π√(L/g)` exato) — com um catálogo amplo de
parâmetros configuráveis por valor digitado, um sensor fixo no ponto zero que alimenta uma tabela
de coleta de `T` e `g`, e instrumentação didática completa.

A arquitetura gira em torno de **um núcleo de física puro** (sem DOM, testável no Node, gerador das
tabelas-ouro) e de **uma fonte única de verdade dos parâmetros** (`state/schema.ts`), da qual são
derivados os controles da interface, o console de texto, o endereço compartilhável, os presets e a
validação. Essa dupla decisão é o que torna executáveis os princípios I, III e V da constituição.

---

## Contexto Técnico

| Item | Definição |
|---|---|
| Linguagem | TypeScript **5.9.x** em modo `strict`, alvo ES2022 — fixado em 5.x porque `typescript-eslint@8` exige `typescript <6.1.0`; adotar TS 7 quebraria o portão de lint |
| Runtime | Navegador; Node 20+ apenas para build e testes |
| Build | **Vite 8** (o plano previa Vite 5; o ecossistema já está em 8 e todos os pares são compatíveis) |
| Framework de UI | **Nenhum** — DOM direto, componentes como funções de fábrica |
| Dependências de runtime | KaTeX (fórmulas), uPlot (séries temporais). Nada mais. |
| Dependências de desenvolvimento | Vite 8, TypeScript 5.9, Vitest 4, Playwright 1.62, ESLint 10 (config plana), typescript-eslint 8, `vite-plugin-singlefile` 2 |
| Alvos de entrega | `dist/` para GitHub Pages **e** `pendulo-simulador.html` na raiz (arquivo único offline, gerado por `npm run build:single`) |
| Plataformas | Chrome/Edge 111+, Firefox 113+, Safari 16.4+; desktop e tablet |
| Desempenho | 60 fps com dois pêndulos, três gráficos e rastro (RNF-001); resposta a parâmetro ≤ 100 ms (RNF-003) |
| Precisão | Erro relativo ≤ 1×10⁻¹² entre o motor e as tabelas-ouro (Princípio I) |
| Tamanho | ≤ 400 KB comprimido no alvo Pages; ≤ 1,5 MB no arquivo único |
| Escala | 1 usuário local, sem servidor, sem persistência remota |
| Idiomas | pt-BR (padrão), en, de |

---

## Constitution Check

Verificação obrigatória antes de gerar tarefas. Cada princípio da constituição é confrontado com o
que este plano de fato prevê.

| Princípio | Como este plano cumpre | Evidência verificável |
|---|---|---|
| **I. Rigor físico verificável** | `physics/` puro, testado contra tabelas-ouro geradas independentemente e conferidas com Python; nenhuma fórmula entra sem fonte | `tests/golden/*.snap.json`, `docs/notas-de-fisica.md`, T011–T025, T122 |
| **II. A fórmula é a interface** | `ui/formula.ts` renderiza a fórmula-motor com KaTeX e *slots* de valor vivos, com destaque termo-a-termo; a fórmula fica sob a cena e nunca é substituída, apenas acesa/apagada | RF-131 a RF-133, T081–T086 |
| **III. Parâmetro nomeado e digitável** | `state/schema.ts` é a fonte única; `ParamControl` gera `<input type="number">` + `<input type="range">` a partir dela; `param-console.ts` aceita `α = 10` | RF-034, RF-045, T045, T048, T075–T080 |
| **IV. Uma fórmula-motor, dois regimes** | `physics/period.ts` expõe uma única função de período parametrizada pelo modo; o cicloidal é o caso `n ≥ 1 ⇒ 0`, não outra função | RF-021 a RF-024, T019, T022, T028, T038, T084 |
| **V. Determinismo e reprodutibilidade** | Passo de tempo fixo com acumulador (nunca `deltaTime` cru); ruído com semente; estado inteiro serializável no hash da URL | RNF-013, T036, T046, T053 |
| **VI. Acessibilidade e didática** | Controles nativos com rótulo e `aria-describedby`; tabela semântica; `prefers-reduced-motion`; foco visível; contraste AA | RF-116 a RF-124, RF-149, T088, T117–T119 |
| **VII. Zero dependência oculta / offline** | Duas dependências de runtime, ambas auto-hospedadas, fontes KaTeX em `public/`; alvo de arquivo único que abre com duplo clique | RNF-011, T005, T124 |
| **VIII. Desempenho com orçamento** | Canvas em 3 camadas; só a camada dinâmica é limpa por quadro; gráficos a 20 Hz desacoplados dos 60 Hz da cena; orçamento de 16,7 ms medido em teste | RNF-001, RNF-002, T059, T072, T097, T120, T121 |
| **IX. Testes antes da implementação** | Cada fase de implementação abre com as tarefas de teste correspondentes, que devem falhar antes do código | Ordenação de `tasks.md` |
| **X. Honestidade pedagógica** | Erro em relação ao valor exato sempre exibido, com sinal; faixas de confiança em 0,1 %/1 %/5 %; saturação de `N = 2` em `89/64` exposta | RF-006 a RF-013, T020, T023, T086, T101, T102 |

**Desvios registrados (Complexity Tracking)**: nenhum. Nenhuma exceção à constituição foi
necessária para este plano.

---

## Decisões de Arquitetura

### AD-01 — Vite + TypeScript sem framework

- **Decisão**: aplicação em TypeScript compilada por Vite, sem React/Svelte/Vue.
- **Alternativas**: (a) HTML/JS vanilla sem build; (b) React + Vite; (c) Svelte 5.
- **Justificativa**: o produto é uma tela única com estado global pequeno e altamente numérico —
  o custo de um framework não se paga, e o princípio VII pede o mínimo de dependências. O
  TypeScript é inegociável porque o domínio é cheio de unidades (rad × grau, metro × pixel) que
  precisam de tipos nominais. Vite entrega o alvo de arquivo único offline sem esforço extra.
- **Consequências**: o painel de parâmetros precisa de disciplina para não virar manipulação de DOM
  espalhada — mitigado por gerar todos os controles a partir de `state/schema.ts`.
- **Plano B**: migrar apenas a camada `ui/` para Svelte 5 se o painel se tornar ingovernável; o
  núcleo de física e o estado não seriam afetados, por serem independentes de DOM.

### AD-02 — Canvas 2D em três camadas

- **Decisão**: três elementos `<canvas>` empilhados — estática (faces cicloidais, eixos, réguas),
  rastro (acumulativo, nunca limpo integralmente), dinâmica (fio, massa, vetores, sensor) — com um
  overlay HTML para rótulos e alças focáveis.
- **Alternativas**: SVG puro; WebGL; canvas único.
- **Justificativa**: o rastro é acumulativo e caro de refazer; separá-lo elimina a maior fonte de
  trabalho por quadro. Rótulos em HTML resolvem acessibilidade e i18n de graça, que em canvas
  seriam retrabalho. WebGL é desproporcional para dois pêndulos.
- **Consequências**: é preciso gerenciar `devicePixelRatio` e `ResizeObserver` para as três camadas
  de forma coordenada — concentrado em `render/layers.ts`.

### AD-03 — Gráficos híbridos: uPlot + `XYPlot` próprio

- **Decisão**: uPlot para séries temporais e curvas monotônicas (θ(t), ω(t), energia, T×α, erro,
  convergência); renderizador próprio em canvas para retrato de fase e seção de Poincaré.
- **Alternativas**: Chart.js para tudo; Plotly; D3; tudo próprio.
- **Justificativa**: uPlot é pequeno (~45 KB) e rápido em streaming, mas é orientado a séries com
  eixo x monotônico — o retrato de fase é uma trajetória paramétrica que o violaria. Escrever
  ~200 linhas de `XYPlot` custa menos que forçar uma biblioteca fora do seu paradigma.
- **Consequências**: dois estilos de gráfico para manter coerentes — resolvido por `render/charts/ticks.ts`
  e pela paleta compartilhada em `render/palette.ts`.

### AD-04 — KaTeX com destaque termo-a-termo

- **Decisão**: KaTeX com `output: 'htmlAndMathml'`; cada termo da série envolvido em
  `\htmlClass{termo}{\htmlId{termo-n}{…}}`, permitindo realce por CSS e injeção de valores em
  *slots* nomeados.
- **Alternativas**: MathJax 3; MathML nativo; SVG estático.
- **Justificativa**: KaTeX é síncrono — indispensável, porque a fórmula é reescrita a cada mudança
  de parâmetro e um render assíncrono causaria cintilação. A saída `htmlAndMathml` entrega
  acessibilidade sem esforço adicional. MathML nativo ainda tem lacunas de renderização.
- **Consequências**: fontes KaTeX precisam ser auto-hospedadas e embutidas no alvo de arquivo único.

### AD-05 — Controles nativos gerados por esquema

- **Decisão**: cada parâmetro é um `role="group"` contendo `<input type="range">` e
  `<input type="number">` nativos, sincronizados bidirecionalmente, gerados a partir de
  `state/schema.ts`.
- **Alternativas**: widget `role="slider"` customizado; biblioteca de componentes.
- **Justificativa**: o princípio III exige entrada digitada; o `<input type="number">` já entrega
  teclado, leitores de tela, incremento por seta e validação nativa. Reimplementar isso em widget
  custom é regressão de acessibilidade garantida.
- **Consequências**: a estilização fica limitada ao que os controles nativos permitem — aceitável.
  Widget custom fica restrito à alça arrastável dentro da cena, onde não há equivalente nativo.
  Na implementação de T075–T077, o campo digitável usa `type="text"` com
  `inputmode="decimal"`, mantendo o slider como `type="range"` nativo. Essa é uma
  exceção deliberada à literalidade do AD-05: RF-050 exige expressões (`2*pi`) e
  unidades (`150 cm`), entradas que `type="number"` rejeita antes de o parser do
  domínio recebê-las. Rótulo, descrição, teclado, validação anunciada e semântica
  de edição continuam nativos; o avaliador é fechado e não executa JavaScript.

### AD-06 — Estado próprio com serialização no hash

- **Decisão**: store próprio (~120 linhas) com assinatura por chave; estado completo no hash da URL
  em pares nome-valor legíveis (`#modo=cicloidal&L=1&alpha=10&g=9.81&N=2&v=1`).
- **Alternativas**: nanostores; Redux; query string; estado comprimido em base64.
- **Justificativa**: o hash legível serve ao princípio V e é auditável a olho — um professor pode
  montar o link à mão. Compressão só entra se o endereço estourar o limite prático.
- **Consequências**: exige versionamento explícito do formato (`v=1`) e regra de migração.

### AD-07 — Passo de tempo fixo com acumulador

- **Decisão**: integração com passo fixo `h = 1/600 s` e acumulador; o quadro consome tantos passos
  quantos couberem no tempo decorrido, com teto anti-espiral.
- **Alternativas**: passo variável igual ao `deltaTime` do quadro.
- **Justificativa**: passo variável quebra o determinismo (princípio V) e torna irreproduzíveis
  tanto os testes quanto os estados compartilhados por URL.
- **Consequências**: câmera lenta é implementada como escala do tempo simulado, nunca como redução
  da taxa de quadros.

### AD-08 — Velocity-Verlet como integrador padrão

- **Decisão**: velocity-Verlet (simplético) como padrão; RK4 disponível como opção comparativa.
- **Alternativas**: RK4 padrão; Euler.
- **Justificativa**: o simplético mantém a energia limitada por longos intervalos, o que importa
  porque a aplicação exibe um gráfico de energia — deriva visível seria lida como erro de física.
  RK4 é mais preciso por passo, mas dissipa energia sistematicamente.
- **Consequências**: expor a escolha ao usuário vira conteúdo didático (RF-113), com o gráfico de
  deriva de energia como evidência.

---

## Estrutura do Código-Fonte

```
Danilo/
├─ index.html                        # casca: seletor de visualização, cena, fórmula, tabela
├─ package.json · tsconfig.json · .eslintrc.cjs
├─ vite.config.ts                    # alvo "pages"
├─ vite.config.singlefile.ts         # alvo "arquivo único offline"
├─ .github/workflows/pages.yml       # build + testes + publicação
├─ public/fontes-katex/              # WOFF2 auto-hospedadas
├─ dist/                             # COMMITADO — permite usar sem Node
├─ pendulo-simulador.html            # COMMITADO — arquivo único para a sala de aula
│
├─ src/
│  ├─ main.ts                        # composição: store → motor → renderers → UI
│  │
│  ├─ physics/                       # ★ PURO: zero DOM, zero window, zero import de UI
│  │   ├─ units.ts                   # tipos nominais Rad / Deg / Metro / Segundo / Kg
│  │   ├─ constants.ts               # g planetários, π, tolerâncias
│  │   ├─ series.ts                  # a_n = [C(2n,n)/4ⁿ]² ; somatório truncado em N
│  │   ├─ elliptic.ts                # AGM, K(k), T_exato = T₀ / AGM(1, cos(α/2))
│  │   ├─ period.ts                  # T₀, T por modo, razão T/T₀, erros, limiares
│  │   ├─ approximations.ts          # Kidd–Fogg, Lima–Arun, duas iterações (RF-010)
│  │   ├─ ode.ts                     # θ̈ = −(g/L)·sen θ + atrito + forçamento
│  │   ├─ integrators.ts             # velocityVerlet, rk4
│  │   ├─ cycloid.ts                 # cicloide, evoluta/involuta, L = 4r, ponto zero
│  │   ├─ energy.ts                  # E = ½mL²θ̇² + mgL(1 − cos θ)
│  │   ├─ engine.ts                  # passo fixo + acumulador + ring buffers
│  │   ├─ sensor.ts                  # detecção de passagem por θ = 0, meio/pleno período
│  │   ├─ inference.ts               # g inferido a partir de T (RF-142 a RF-144)
│  │   └─ analysis.ts                # cruzamento de zero, Poincaré, varredura T×α
│  │
│  ├─ state/
│  │   ├─ schema.ts                  # ★ FONTE ÚNICA de cada parâmetro
│  │   ├─ store.ts · history.ts      # estado + undo/redo
│  │   ├─ url.ts · presets.ts · persist.ts
│  │   └─ measurements.ts            # linhas coletadas, estatísticas, caderno
│  │
│  ├─ render/
│  │   ├─ layers.ts · transform.ts · palette.ts
│  │   ├─ scene.ts · trace.ts · cycloid-face.ts · instruments.ts · sensor-marker.ts
│  │   └─ charts/ timeseries.ts (uPlot) · xyplot.ts (próprio) · ticks.ts
│  │
│  ├─ ui/
│  │   ├─ view-selector.ts           # Simples | Cicloidal | Ambos (RF-127)
│  │   ├─ param-control.ts · param-console.ts
│  │   ├─ formula.ts                 # KaTeX, slots, destaque termo-a-termo
│  │   ├─ data-table.ts              # tabela de coleta T e g (RF-140)
│  │   ├─ panels/ modo · presets · exportacao · camadas · medicoes · roteiros
│  │   └─ a11y.ts
│  │
│  ├─ export/ csv.ts · png.ts · video.ts
│  ├─ i18n/   index.ts · pt-BR.ts · en.ts · de.ts · glossario.md
│  ├─ data/   presets.json · roteiros.json
│  └─ styles/ tokens.css · layout.css · controls.css · katex-overrides.css
│
├─ tests/
│  ├─ unit/    series · elliptic · period · approximations · integrators · cycloid
│  │           · sensor · inference · url · console · schema
│  ├─ golden/  *.snap.json           # tabelas-ouro geradas e conferidas
│  ├─ e2e/     *.spec.ts             # Playwright: fluxos do quickstart
│  └─ visual/  __screenshots__/
│
└─ docs/ notas-de-fisica.md · referencias.md
```

### Regra de dependência (imposta por ESLint, não por disciplina)

```
        ui ──┐
             ├──▶ state ──▶ physics
     render ─┘
```

- `src/physics/**` **não pode** importar de `render/`, `ui/` ou `state/`, nem tocar em `window`,
  `document` ou `performance`. É isso que torna os testes triviais, permite gerar as tabelas-ouro
  no Node e deixa aberta a migração para Web Worker sem refatoração.
- `render/**` **lê** o estado; nunca escreve.
- `ui/**` escreve **apenas** por ações do store; nunca chama o motor diretamente.
- Imposição mecânica via `no-restricted-imports`.

---

## Arquitetura do Motor de Física

### Fórmula-motor e os dois regimes

Uma única função de período, parametrizada pelo modo — o cicloidal **não** é outra função:

```
periodo(L, g, α, N, modo) = T₀(L, g) · S(α, N, modo)

S(α, N, modo) = Σ_{n=0..N} a_n · sen^{2n}(α/2) · χ(n, modo)

χ(n, 'simples')  = 1                     ← todos os termos ativos
χ(n, 'cicloidal') = 1 se n = 0, senão 0  ← termos de correção anulados
```

O fator `χ` é o coração do princípio IV: a mesma expressão, com os termos de `n ≥ 1` acesos ou
apagados. A interface anima exatamente essa transição (RF-024, RF-132). A anulação é consequência
física da restrição cicloidal — o comprimento livre do fio encurta como `L·cos θ`, tornando o
movimento harmônico exato — e a interface deve apresentá-la assim, nunca como truque algébrico
(Princípio I e X).

### Valor de referência exato

`T_exato = T₀ / AGM(1, cos(α/2))`, com a média aritmético-geométrica convergindo quadraticamente
(≈ 5 iterações para precisão de `double`). É contra este valor que toda truncagem é comparada
(RF-005, RF-006). Para o modo cicloidal, o valor exato é `T₀` — a série truncada e o exato coincidem
em qualquer amplitude, e a interface deve deixar essa coincidência visível.

### Laço de animação e orçamento de quadro

```
requestAnimationFrame
  └─ acumulador += min(dtReal, 0,25 s)          ← teto anti-espiral
     enquanto acumulador ≥ h:                    h = 1/600 s fixo
        engine.passo(h)                          ← velocity-Verlet
        sensor.verificarPassagem()               ← cruzamento de θ = 0 com interpolação
        acumulador −= h
     render.dinamica()                           ← todo quadro   (~6 ms)
     render.rastro()                             ← incremental   (~1 ms)
     charts.talvezAtualizar()                    ← 20 Hz         (~3 ms)
     formula.talvezAtualizar()                   ← só se mudou   (~1 ms)
```

Orçamento total: 16,7 ms por quadro. A camada estática só é redesenhada em mudança de geometria,
tema ou tamanho.

### Detecção de passagem pelo sensor

O sensor fixo em `θ = 0` (RF-134) detecta a **mudança de sinal de θ** entre dois passos e
**interpola linearmente** o instante exato do cruzamento — sem interpolação, a resolução do período
ficaria limitada ao passo de integração, o que arruinaria a precisão de milissegundos exigida para
reproduzir o experimento do roteiro alemão. Duas passagens consecutivas ⇒ meio período; duas
passagens no mesmo sentido ⇒ período completo (RF-137).

---

## Arquitetura da Interface

### Layout da tela principal

A disposição vertical abaixo é requisito de produto (RF-127, RF-131, RF-140), derivada do esboço
entregue pelo usuário: seletor no topo, cena, fórmula sob a cena, tabela sob a fórmula.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Pêndulo — Fórmula Completa            [pt-BR ▾] [tema] [ajuda] [créditos]   │
├──────────────────────────────────────────────────────────────────────────────┤
│   ( • ) Simples      (   ) Cicloidal      (   ) Ambos          ← RF-127      │
├───────────────────────────────────────────────┬──────────────────────────────┤
│                                               │  PARÂMETROS                  │
│              C E N A   (canvas ×3)            │  ┌────────────────────────┐  │
│                                               │  │ α  Amplitude           │  │
│         ╱│╲                                   │  │ [   10.0 ] °  ◄──────► │  │
│        ╱ │ ╲        ← faces cicloidais        │  │ L  Comprimento         │  │
│       ╱  │  ╲         (só nos modos           │  │ [    1.00 ] m ◄──────► │  │
│          ●            Cicloidal e Ambos)      │  │ g  Gravidade           │  │
│          ▲                                    │  │ [    9.81 ] m/s² ◄───► │  │
│      [SENSOR θ=0]   ← fixo, não arrastável    │  │ N  Termos da série     │  │
│                        RF-134, RF-135         │  │ [       2 ]   ◄──────► │  │
│                                               │  │ … m, atrito, forçamento│  │
│   ▶ ⏸ ⟲   [ Normal | Lenta ]   t = 12,340 s   │  │   ar, integrador, dt…  │  │
│                                               │  └────────────────────────┘  │
├───────────────────────────────────────────────┤  › Console:  α = 10          │
│  F Ó R M U L A   (KaTeX, valores vivos)       │  › Presets  › Camadas        │
│                                    ← RF-131   │  › Gráficos › Roteiros       │
│      T = 2π√(L/g) · ( 1 + ¼sen²(α/2)          │                              │
│                          + 9/64 sen⁴(α/2) )   │                              │
│          ↑ 1,000000  ↑ 0,001899  ↑ 0,000008   │                              │
│      T = 2,009893 s      T/T₀ = 1,001907      │                              │
│      T₀ = 2,006067 s     erro vs exato: −0,00 %│                             │
├───────────────────────────────────────────────┴──────────────────────────────┤
│  T A B E L A   D E   C O L E T A                              ← RF-140       │
│  [● coletando] [manual] [pausar] [limpar] [exportar CSV]                     │
│  ┌────┬───────────┬──────────┬───────────┬────────┬────────┬───────────────┐ │
│  │ #  │ Pêndulo   │  T (s)   │ g (m/s²)  │ α (°)  │ L (m)  │ erro vs teoria│ │
│  ├────┼───────────┼──────────┼───────────┼────────┼────────┼───────────────┤ │
│  │ 1  │ simples   │ 2,009893 │  9,810000 │  10,0  │ 1,000  │    +0,000 %   │ │
│  │ 2  │ simples   │ 2,086256 │  9,810000 │  45,0  │ 1,000  │    +0,033 %   │ │
│  │ 3  │ cicloidal │ 2,006067 │  9,810000 │  45,0  │ 1,000  │     0,000 %   │ │
│  └────┴───────────┴──────────┴───────────┴────────┴────────┴───────────────┘ │
│  n = 3   T̄ = 2,034 s   s = 0,046 s        ḡ = 9,810 m/s²   s = 0,000 m/s²   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Abaixo de 1024 px de largura, a coluna de parâmetros desce para baixo da tabela e a cena ocupa a
largura total. A ordem vertical seletor → cena → fórmula → tabela é preservada em toda largura.

### O componente `ParamControl`

Gerado a partir de `state/schema.ts`, um por parâmetro:

```html
<div role="group" aria-labelledby="p-alpha-lbl" class="param">
  <label id="p-alpha-lbl" for="p-alpha-num">
    <span class="simbolo">α</span> <span class="nome">Amplitude inicial</span>
  </label>
  <input id="p-alpha-num" type="number" min="0" max="179" step="0.1" value="10"
         aria-describedby="p-alpha-hint p-alpha-unid">
  <span id="p-alpha-unid" class="unidade">°</span>
  <input type="range" min="0" max="179" step="0.1" value="10"
         aria-labelledby="p-alpha-lbl" aria-describedby="p-alpha-hint">
  <button type="button" class="reset" aria-label="Restaurar padrão de α (10°)">⟲</button>
  <p id="p-alpha-hint" class="hint">Ângulo máximo de afastamento da vertical. 0 a 179°.</p>
</div>
```

Regra de sincronização (evita o clássico salto do cursor): o `number` só reescreve seu próprio
`value` quando **não** está com o foco; a validação/limitação ocorre em `change` e `blur`, não em
`input` — assim o usuário consegue digitar `10` sem que `1` seja limitado a `1` no meio da digitação.

### Console de parâmetros

Aceita `α = 10`, `alpha=10`, `L=1.5`, `g = 9,81`, múltiplos comandos por linha separados por `;`,
com aliases por símbolo, por nome e por identificador. Vírgula e ponto são ambos aceitos como
separador decimal. Erros informam parâmetro, valor recusado e limite aplicado (RNF-023).

---

## Estratégia de Dados e Testes

**Três camadas**, na ordem em que devem falhar:

1. **Unitários (Vitest)** sobre `physics/**` — puros, rápidos, sem DOM. Cobrem coeficientes da
   série, AGM, período por modo, aproximações de forma fechada, integradores, geometria da cicloide,
   detecção de passagem no sensor e inferência de `g`.
2. **Tabelas-ouro (`tests/golden/`)** — valores de referência congelados em JSON, conferidos por
   cálculo independente. Tolerância: `1×10⁻¹²` relativo para funções fechadas; `1×10⁻⁶` para
   resultados de integração numérica.
3. **E2E (Playwright)** — cada cenário do [quickstart.md](./quickstart.md) vira um teste, incluindo
   navegação exclusivamente por teclado e ida-e-volta do estado pela URL.

Fixtures principais (extraídas de [research.md](./research.md)):

| α (°) | T/T₀ com N = 2 | T/T₀ exato | T (s) com L = 1, g = 9,81 |
|---|---|---|---|
| 10 | 1,001907 | 1,001907 | 2,009893 |
| 20 | 1,007666 | 1,007669 | 2,021446 |
| 45 | 1,039628 | 1,039973 | 2,085562 |
| 90 | 1,160156 | 1,180341 | 2,327351 |

---

## Fases de Implementação

| Fase | Conteúdo | Portão de saída |
|---|---|---|
| **0. Fundação** | Vite, TS estrito, ESLint com regra de dependência, CI, esqueleto de pastas | `npm run build` e `npm test` verdes em CI |
| **1. Núcleo de física** | `series`, `elliptic`, `period`, `approximations`, `cycloid`, `energy` | Tabelas-ouro batendo em 1×10⁻¹²; cobertura ≥ 95 % em `physics/` |
| **2. Motor dinâmico** | `ode`, `integrators`, `engine`, `sensor`, `inference` | Período medido pelo sensor bate com o período analítico em 1×10⁻⁴; deriva de energia < 0,1 % em 1000 períodos |
| **3. Estado** | `schema`, `store`, `url`, `presets`, `history`, `measurements` | Ida-e-volta pela URL preserva todos os parâmetros; undo/redo estável |
| **4. Cena** | camadas, transformação, cena simples, faces cicloidais, rastro, sensor | 60 fps com rastro ligado; geometria `L = 4r` coerente |
| **5. Fórmula e parâmetros** | `formula.ts`, `ParamControl`, console, seletor de visualização | Digitar `α = 10` atualiza fórmula, cena e derivados em ≤ 100 ms |
| **6. Tabela de coleta** | `data-table.ts`, coleta automática e manual, estatísticas, CSV | Cenários de coleta do quickstart passando |
| **7. Gráficos e instrumentos** | uPlot, `XYPlot`, transferidor, régua, cronômetro, fotoporta | Gráficos a 20 Hz sem violar RNF-001 |
| **8. Roteiros e presets** | presets de fábrica, roteiros guiados, desafio do Planeta X | Roteiro do experimento alemão executável de ponta a ponta |
| **9. i18n e acessibilidade** | pt-BR/en/de, teclado, leitores de tela, contraste, movimento reduzido | Auditoria WCAG 2.1 AA sem violação bloqueante |
| **10. Entrega** | build Pages, arquivo único, `dist/` commitado, documentação | Arquivo único abre offline com duplo clique e funciona por completo |

---

## Riscos Técnicos e Mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Fixtures numéricas erradas envenenam toda a implementação | Crítico | Tabelas-ouro geradas por duas vias independentes (motor TS e script Python) e comparadas antes de virar teste |
| Painel de parâmetros vira DOM espalhado e ingovernável | Alto | Todos os controles gerados a partir de `state/schema.ts`; nenhum controle escrito à mão no HTML |
| Perda de 60 fps ao ligar rastro e gráficos juntos | Alto | Camadas separadas, gráficos a 20 Hz, teste de desempenho automatizado no CI |
| Geometria cicloidal desenhada de forma plausível mas incorreta | Alto | Teste de propriedade: comprimento de arco do trecho enrolado + trecho livre = `L` constante, para todo θ |
| Confusão entre meio período e período completo nas medições | Médio | Grandeza sempre rotulada na interface e na coluna do CSV; teste E2E cobrindo os dois modos |
| Arquivo único estourar o orçamento de tamanho | Médio | Subset das fontes KaTeX; medição de tamanho no CI com limite que quebra o build |
| Deriva de rad × grau entre camadas | Médio | Tipos nominais em `physics/units.ts`; internamente tudo em radianos, conversão só na borda da UI |

---

## Conformidade Constitucional

Este plano foi verificado contra a constituição do projeto na seção **Constitution Check** acima,
princípio por princípio, sem desvios registrados.

**Constituição vigente**: versão **1.0.0**, ratificada em 2026-08-17, última emenda em 2026-08-17.

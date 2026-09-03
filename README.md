# Pêndulo — Fórmula Completa

Spec Kit de um simulador web didático que demonstra **visualmente** a fórmula geral do período do
pêndulo, com um catálogo amplo de parâmetros configuráveis por valor digitado.

```
                        ⎛       1        ⎛ α ⎞      9       ⎛ α ⎞ ⎞
        T  =  2π √(L/g) ⎜ 1  +  ─ · sen² ⎜ ─ ⎟  +  ──  sen⁴ ⎜ ─ ⎟ ⎟
                        ⎝       4        ⎝ 2 ⎠     64       ⎝ 2 ⎠ ⎠
```

$$T = 2\pi\sqrt{\frac{L}{g}}\left(1 + \frac{1}{4}\operatorname{sen}^2\left(\frac{\alpha}{2}\right) + \frac{9}{64}\operatorname{sen}^4\left(\frac{\alpha}{2}\right)\right)$$

---

## A ideia central: uma fórmula, dois pêndulos

A mesma expressão gera os dois regimes — muda apenas se os termos de correção estão acesos:

| | Pêndulo **simples** | Pêndulo **cicloidal** |
|---|---|---|
| Termos com `n ≥ 1` | **ativos** | **anulados** |
| Período | cresce com a amplitude | `T = 2π√(L/g)`, constante |
| Com `L = 1 m` e `α = 10°` | `2,009893 s` | `2,006067 s` |
| Com `L = 1 m` e `α = 45°` | `2,085562 s` | `2,006067 s` |
| Com `L = 1 m` e `α = 90°` | `2,327351 s` | `2,006067 s` |
| Propriedade | anarmônico | **isócrono / tautócrono** |

No pêndulo cicloidal, a massa é obrigada a percorrer uma cicloide: o comprimento livre do fio
encurta como `L·cos θ` e compensa exatamente o efeito que faria o período crescer. É a tautocronia
de Huygens — e é o que o roteiro experimental alemão demonstra na bancada.

**A consequência prática**, que a tabela de coleta do simulador torna visível linha a linha: quem
mede um pêndulo simples a 45° e infere a gravidade pela fórmula de pequenos ângulos obtém
`g = 9,07` em vez de `9,81` — erro de 7,5 % que **nenhum instrumento melhor corrige**, porque é erro
de modelo. No pêndulo cicloidal, a mesma medição devolve `9,81` em qualquer amplitude.

---

## O que o simulador faz

- **Três visualizações**: Simples · Cicloidal · Ambos lado a lado.
- **A fórmula sob a cena**, viva: cada termo mostra seu valor e sua contribuição em tempo real,
  acendendo e apagando conforme o modo.
- **Tabela de coleta sob a fórmula**, alimentada por um **sensor fixo no ponto zero**, registrando
  o **período `T`** e a **gravidade `g`** inferida — com a coluna do `g` ingênuo ao lado, para
  expor o erro de modelo.
- **112 parâmetros configuráveis**, cada um com símbolo, campo numérico editável, unidade, faixa,
  passo, slider e reset — mais um console onde se digita `α = 10` diretamente, com notação
  indexada por pêndulo (`L₁`, `h₂`) quando há mais de um corpo em cena.
- Instrumentos de medição, gráficos científicos, presets, roteiros guiados, exportação em CSV e
  estado compartilhável por endereço.

---

## Índice do Spec Kit

| Artefato | Conteúdo |
|---|---|
| [.specify/memory/constitution.md](.specify/memory/constitution.md) | Os 10 princípios inegociáveis, restrições técnicas, portões de qualidade e governança |
| [specs/001-pendulo-formula-completa/spec.md](specs/001-pendulo-formula-completa/spec.md) | **O QUE e POR QUÊ**: 16 histórias de usuário, 160 requisitos funcionais, 23 não funcionais, catálogo de 112 parâmetros |
| [specs/001-pendulo-formula-completa/plan.md](specs/001-pendulo-formula-completa/plan.md) | **COMO**: stack, decisões de arquitetura, estrutura de código, wireframe da tela, fases |
| [specs/001-pendulo-formula-completa/research.md](specs/001-pendulo-formula-completa/research.md) | Dedução da fórmula, **tabelas numéricas de referência verificadas**, teardown do PhET e do GeoGebra |
| [specs/001-pendulo-formula-completa/data-model.md](specs/001-pendulo-formula-completa/data-model.md) | Entidades, invariantes, máquina de estados, regras de derivação e serialização |
| [specs/001-pendulo-formula-completa/contracts/](specs/001-pendulo-formula-completa/contracts/) | Contratos do motor de física, do estado, do preset (JSON Schema), da URL e do CSV |
| [specs/001-pendulo-formula-completa/quickstart.md](specs/001-pendulo-formula-completa/quickstart.md) | Como rodar e **12 cenários de validação com os números esperados** |
| [specs/001-pendulo-formula-completa/tasks.md](specs/001-pendulo-formula-completa/tasks.md) | **130 tarefas** numeradas, com dependências, paralelismo e rastreabilidade |

### Incremento planejado

| Artefato | Conteúdo |
|---|---|
| [specs/002-integracao-arduino/spec.md](specs/002-integracao-arduino/spec.md) | 🕓 **Adiado** — leitura de um pêndulo **real** por Arduino com barreira óptica, alimentando a mesma tabela de coleta. 17 requisitos, protocolo serial e análise das rotas possíveis. |

---

## Fontes originais

**Materiais fornecidos**

| Arquivo | Conteúdo |
|---|---|
| `formula simples.jpeg` | `T = 2π√(L/g)` — aproximação de pequenos ângulos |
| `formula completa.jpeg` | `T/T₀ = 1 + ¼sen²(α/2) + (9/64)sen⁴(α/2)` — a razão adimensional |
| `formula geral.jpeg` | A fórmula-motor completa, que gera os dois pêndulos |
| `mhd_zykloidenpendel.pdf` | Roteiro de experimento (alemão): pêndulo de 1 m, perfil cicloidal, barreira de luz medindo meio período, osciloscópio |

**Simulações de referência analisadas**

- [PhET Pendulum Lab](https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html)
  — telas Intro/Energy/Lab, dois pêndulos, presets planetários, atrito, gráfico de energia,
  Period Timer, Period Trace. **Não mostra a fórmula.**
- [GeoGebra — Cycloidal Pendulum](https://www.geogebra.org/m/ymbbprbw), de Rafael Losada Liste
  — tautocronia de Huygens, fio de comprimento `4r` enrolando na evoluta, círculo osculador.
  **Quase nenhum parâmetro configurável.**

A interseção que nenhuma das duas cobre — fórmula visível e manipulável, os dois regimes na mesma
expressão, e parâmetros amplamente configuráveis — é este produto.

---

## Fluxo de desenvolvimento

```
constitution ──▶ specify ──▶ plan ──▶ tasks ──▶ implement
     ✅            ✅          ✅        ✅          🔨
```

**Estado atual**: documentação do Spec Kit **concluída**; implementação **em andamento**.

| Fase | Entrega | Estado |
|---|---|---|
| 0 · Fundação | Vite, TypeScript estrito, regra de dependência no lint, CI | ✅ |
| 1 · Núcleo de física | Série, AGM, período, aproximações, cicloide, energia | ✅ |
| 2 · Motor dinâmico | Integradores, sensor do ponto zero, inferência de `g` | ✅ |
| 3 · Estado | Os 112 parâmetros, store, URL, presets, console | ✅ |
| 4 · Cena | Canvas em três camadas, faces cicloidais, instrumentos | ✅ |
| 5 · Fórmula e parâmetros | Fórmula viva em KaTeX, controles, painel de derivados | ✅ |
| 5b · Parâmetros indexados | `L₁`, `h₂`, acoplar/desacoplar, alturas independentes | ✅ |
| 6 · Tabela de coleta | A tabela de `T` e `g` sob a fórmula | ✅ |
| 7 · Gráficos e instrumentos | Sete gráficos, cronômetro e fotoporta móvel | ✅ |
| 8–10 | Presets, roteiros, exportação, i18n, acessibilidade, entrega | ⬜ |

**Como está verificado hoje**: 899 testes unitários (98,5 % de instruções, 93,2 % de ramos); 106
cenários de ponta a ponta em Chromium, Firefox e WebKit; build comprimido para Pages e arquivo único
offline dentro do orçamento, ambos sem requisição externa.

Para prosseguir, execute as tarefas de [tasks.md](specs/001-pendulo-formula-completa/tasks.md) a
partir da Fase 8. Cada fase tem um portão de saída verificável, e as tarefas de teste precedem as de
implementação — as tabelas numéricas de
[research.md](specs/001-pendulo-formula-completa/research.md) são a fonte de verdade das fixtures.

# Guia de Início e Validação: Pêndulo — Fórmula Completa

**Funcionalidade**: `001-pendulo-formula-completa` · **Data**: 2026-08-17

Este documento serve a dois propósitos: colocar a aplicação para rodar e **provar que ela está
correta**. Cada cenário da Seção 3 traz os números esperados, extraídos das tabelas verificadas de
[research.md](./research.md), e vira um teste automatizado em `tests/e2e/`.

---

## 1. Pré-requisitos e Instalação

**Necessário**: Node.js 20 LTS ou superior e um navegador atual (Chrome/Edge 111+, Firefox 113+,
Safari 16.4+).

Comandos no PowerShell, a partir da pasta do projeto:

```powershell
node --version      # deve mostrar v20 ou superior
npm --version

npm install
```

> **Sem Node?** A pasta `dist/` e o arquivo `pendulo-simulador.html` são versionados no repositório.
> Basta abrir `pendulo-simulador.html` com duplo clique — a aplicação funciona por completo,
> offline. É o caminho recomendado para a sala de aula.

---

## 2. Executar

```powershell
npm run dev            # desenvolvimento, com recarga automática — http://localhost:5173
npm run build          # build de produção em dist/
npm run build:single   # gera pendulo-simulador.html, arquivo único offline
npm run preview        # serve o build de produção
npm test               # testes unitários (Vitest)
npm run test:e2e       # testes de ponta a ponta (Playwright)
npm run test:golden    # confere o motor contra as tabelas-ouro
npm run lint           # ESLint, inclusive a regra de dependência entre camadas
```

**Verificação de fumaça**: após `npm run dev`, a página deve abrir já com o seletor de visualização
no topo, a cena do pêndulo simples, a fórmula logo abaixo e a tabela de coleta vazia sob a fórmula,
com `α = 10,0°`, `L = 1,000 m`, `g = 9,81 m/s²` e `N = 2`.

> **Portão da Fase 5:** esta fase valida somente T073–T086: seletor, controles,
> console, fórmula viva, comparação e métricas dos Cenários 1, 2 e 4 que pertencem
> a esse intervalo. A tabela de coleta completa é entrega da Fase 6 e os gráficos
> completos (inclusive `T(α)`) são entrega da Fase 7; portanto, os passos do
> roteiro que dependem desses componentes não bloqueiam o encerramento da Fase 5.

---

## 3. Roteiro de Validação

Formato: **Passo · Ação · Resultado esperado**. Salvo indicação contrária, comece com o estado
padrão (botão "Restaurar tudo"). Tolerância de leitura: as casas decimais exibidas.

### Cenário 1 — Estado inicial e a fórmula viva
*(RF-001, RF-002, RF-131 a RF-133 · História 1)*

| # | Ação | Resultado esperado |
|---|---|---|
| 1.1 | Abrir a aplicação | Seletor com **Simples** selecionado; cena; fórmula abaixo; tabela abaixo da fórmula |
| 1.2 | Ler a fórmula | `T = 2π√(L/g)·(1 + ¼·sen²(α/2) + (9/64)·sen⁴(α/2))` |
| 1.3 | Ler os valores dos parâmetros | `α = 10,0°` · `L = 1,000 m` · `g = 9,81 m/s²` · `N = 2` |
| 1.4 | Ler os derivados | `T₀ = 2,006067 s` · **`T = 2,009893 s`** · `T/T₀ = 1,001907` |
| 1.5 | Ler as contribuições dos termos | `n=0: 1,000000` · `n=1: 0,001899` · `n=2: 0,000008` |
| 1.6 | Ler o erro | Erro em relação ao exato ≈ `0,0000 %`; faixa de confiança **excelente** |
| 1.7 | Passar o cursor sobre o termo `n=1` | O termo é realçado na fórmula e sua contribuição em segundos é exibida |

### Cenário 2 — Digitar `α = 10` *(o requisito explícito)*
*(RF-034, RF-045, RF-127 · História 5)*

| # | Ação | Resultado esperado |
|---|---|---|
| 2.1 | Clicar no campo numérico de `α`, apagar, digitar `45`, pressionar Tab | `α = 45,0°`; o slider acompanha |
| 2.2 | Ler `T` | **`T = 2,085562 s`** · `T/T₀ = 1,039628` |
| 2.3 | Abrir o console e digitar `α = 10` | `α` volta a `10,0°`; `T = 2,009893 s` |
| 2.4 | Digitar `alpha=10` e depois `a = 10` | Mesmo efeito — aliases funcionam |
| 2.5 | Digitar `L=1,5` (vírgula decimal) | `L = 1,500 m`; `T₀ = 2,456920 s` |
| 2.6 | Digitar `α=10; L=1; g=9.81; N=2` | Os quatro aplicados de uma vez; estado do Cenário 1 restaurado |
| 2.7 | Digitar `α = 500` | `α` limitado a `179,9°` **com mensagem** dizendo parâmetro, valor recusado e limite |
| 2.8 | Digitar `xyz = 3` | Erro nomeando o parâmetro desconhecido; **nenhum** parâmetro alterado |
| 2.9 | Medir o tempo entre a digitação e a atualização da cena | ≤ 100 ms (RNF-003) |

### Cenário 3 — O período cresce com a amplitude
*(RF-003 a RF-009, RF-013 · História 3)*

| # | `α` | `T` esperado (s) | `T/T₀` | Faixa de confiança |
|---|---|---|---|---|
| 3.1 | 10° | `2,009893` | `1,001907` | excelente |
| 3.2 | 20° | `2,021446` | `1,007666` | excelente |
| 3.3 | 45° | `2,085562` | `1,039628` | excelente |
| 3.4 | 60° | `2,149077` | `1,071289` | boa |
| 3.5 | 90° | `2,327351` | `1,160156` | **limitada** (erro −1,71 %) |
| 3.6 | 120° | `2,540887` | `1,266602` | **inadequada** (erro −7,74 %) |

| # | Ação | Resultado esperado |
|---|---|---|
| 3.7 | Com `α = 90°`, ler o período exato | `2,367842 s` — a série **subestima** em 1,71 % |
| 3.8 | Ler quantos termos seriam necessários | `N ≥ 6` para 0,1 %; `N ≥ 9` para 0,01 % |
| 3.9 | Aumentar `N` para 10 | `T → 2,367790 s`, aproximando-se do exato |
| 3.10 | Levar `α` a 179,9° com `N = 2` | `T/T₀` satura em **`1,390625`** (= 89/64) enquanto o exato dispara |

### Cenário 4 — O pêndulo cicloidal é isócrono
*(RF-021 a RF-029, RF-132 · Histórias 2 e 4)*

| # | Ação | Resultado esperado |
|---|---|---|
| 4.1 | Selecionar a visualização **Cicloidal** | Cena com as faces cicloidais; a simulação **não** reinicia (RF-130) |
| 4.2 | Ler a fórmula | Mesma expressão, com os termos de `n ≥ 1` **visivelmente apagados**, reduzida a `T = 2π√(L/g)` |
| 4.3 | Com `α = 10°`, ler `T` | **`2,006067 s`** |
| 4.4 | Mudar `α` para 45° | `T` continua **`2,006067 s`** — inalterado |
| 4.5 | Mudar `α` para 90° | `T` continua **`2,006067 s`** |
| 4.6 | Ler o erro em relação ao exato | `0,0000 %` em todas as amplitudes |
| 4.7 | Tentar `α = 120°` | Limitado a `90°`, com explicação de que a restrição é geométrica (`\|s\| ≤ L`) |
| 4.8 | Ler o raio gerador | `r = 0,250 m`, com `L = 4r` visível |
| 4.9 | Ativar 3 massas e soltá-las de posições diferentes | As três chegam ao ponto zero **simultaneamente** (tautocronia) |
| 4.10 | Observar o comprimento livre do fio ao longo do movimento | Encurta como `L·cos θ`, exibido numericamente |
| 4.11 | Abrir o gráfico `T(α)` | Reta **horizontal** — a assinatura visual da isocronia |

### Cenário 5 — Comparação lado a lado
*(RF-030, RF-128, RF-129, RF-132 · História 2)*

| # | Ação | Resultado esperado |
|---|---|---|
| 5.1 | Selecionar **Ambos** | Duas cenas lado a lado, com eixo vertical e escala comuns |
| 5.2 | Ler a fórmula | **Duas** expressões empilhadas, alinhadas pelo sinal de igual |
| 5.3 | Com `α = 45°`, `L = 1`, `g = 9,81`, reproduzir | Simples: `2,085562 s`. Cicloidal: `2,006067 s` |
| 5.4 | Observar a defasagem | Cresce continuamente; exibida em tempo e em número de oscilações |
| 5.5 | Após ~25 oscilações do cicloidal | A defasagem acumulada chega a cerca de um período inteiro |
| 5.6 | Reduzir `α` para 5° | A defasagem passa a crescer muito mais devagar |

### Cenário 6 — Sensor no ponto zero e tabela de coleta
*(RF-134 a RF-150 · Histórias 6 e 10)*

| # | Ação | Resultado esperado |
|---|---|---|
| 6.1 | Localizar o sensor | Marcado no **ponto mais baixo**, no centro da cena; **não** é arrastável |
| 6.2 | Na visualização Cicloidal, verificar a posição | Coincide com a cúspide inferior da cicloide |
| 6.3 | Reproduzir com `α = 10°`, `L = 1`, `g = 9,81`, modo simples | O sensor pisca a cada passagem |
| 6.4 | Ativar coleta automática e aguardar 3 períodos | Três linhas na tabela |
| 6.5 | Ler a coluna `T` | `2,0099 s` (± 0,0002 s) |
| 6.6 | Ler a coluna `g` | `9,8100 m/s²` (± 0,0005) |
| 6.7 | Exibir a coluna de `g` ingênuo | **`9,7727 m/s²`** — erro de −0,38 % por ignorar os termos |
| 6.8 | Mudar `α` para 45° e coletar | Período exato medido `T = 2,0863 s`; `g` inferido `9,8035`; `g` ingênuo **`9,0704`** (−7,54 %). `2,0856 s` é a aproximação da série truncada em `N = 2`, exibida separadamente como `T` teórico |
| 6.9 | Trocar para Cicloidal com `α = 45°` e coletar | `T = 2,0061 s`; `g = 9,8100`; **`g` ingênuo também `9,8100`** |
| 6.10 | Ler o rodapé | Contagem, média, desvio padrão e erro padrão de `T` completo normalizado e de `g` |
| 6.11 | Alternar o sensor para **meio período** | A nova linha registra `1,0049 s` com `α = 10°` e a coluna **Grandeza** identifica “Meio período”; linhas anteriores mantêm o próprio rótulo |
| 6.12 | Excluir uma linha | Estatísticas recalculadas |
| 6.13 | Limpar a tabela | **Pede confirmação** antes de descartar |
| 6.14 | Trocar de visualização | As linhas coletadas **permanecem** (RF-130) |

> Os passos 6.7 a 6.9 são o coração do produto: mesma medição, mesmo instrumento, **modelos
> diferentes**. O erro é de modelo, não de instrumento.

### Cenário 7 — Reproduzir o experimento do roteiro alemão
*(RF-097, RF-137 · História 7)*

| # | Ação | Resultado esperado |
|---|---|---|
| 7.1 | Carregar o preset "Experimento do roteiro alemão" | `L = 1 m`; sensor em **meio período**; tabela ligada |
| 7.2 | Com `α = 1°`, coletar | Meio período ≈ `1,003052 s` |
| 7.3 | Com `α = 10°`, coletar | Meio período ≈ `1,004946 s` |
| 7.4 | Com `α = 20°`, coletar | Meio período ≈ `1,010726 s` |
| 7.5 | Comparar 7.2 e 7.4 | Diferença de **≈ 15,3 ms** no período completo — os "alguns milissegundos" do roteiro |
| 7.6 | Ler o desvio percentual | 0,19 % a 10° e 0,77 % a 20° — "na faixa de porcentagem" |
| 7.7 | Abrir a nota sobre a aproximação `sen α ≈ α` | Distingue o erro **no ângulo** (0,5 % e 2 %) do erro **no período** (0,19 % e 0,77 %) |
| 7.8 | Encostar o pêndulo no perfil (modo cicloidal) e repetir 7.2–7.4 | Meio período `1,003033 s` em **todas** as amplitudes |

### Cenário 8 — Descobrir a gravidade do Planeta X
*(RF-104 · História 8)*

| # | Ação | Resultado esperado |
|---|---|---|
| 8.1 | Ativar o desafio "Planeta X" | Valor de `g` fica **oculto** |
| 8.2 | Com `L = 1 m` e `α = 5°`, coletar 5 períodos | Tabela preenchida; `g` inferido consistente |
| 8.3 | Submeter a estimativa | Comparação com o valor verdadeiro é revelada |
| 8.4 | Repetir com `α = 60°` **sem** os termos de correção | Estimativa erra ≈ 13 % — evidencia o erro de modelo |
| 8.5 | Repetir com `α = 60°` no modo cicloidal | Estimativa correta mesmo com amplitude grande |

### Cenário 9 — Convergência da série
*(RF-009, RF-084 · História 9)*

| # | `α` | `N` | `T/T₀` esperado |
|---|---|---|---|
| 9.1 | 90° | 1 | `1,125000` |
| 9.2 | 90° | 2 | `1,160156` |
| 9.3 | 90° | 3 | `1,172363` |
| 9.4 | 90° | 5 | `1,178929` |
| 9.5 | 90° | 10 | `1,180315` |
| 9.6 | 90° | exato | `1,180341` |

| # | Ação | Resultado esperado |
|---|---|---|
| 9.7 | Observar o gráfico de erro em escala logarítmica | Decaimento monotônico com `N`; **erro sempre negativo** |
| 9.8 | Levar `α` a 150° e ver `N` necessário | `N ≥ 53` para 0,1 % — a explosão do custo perto de 180° |
| 9.9 | Ativar Kidd–Fogg, Lima–Arun e duas iterações a `α = 90°` | Erros `+0,7512 %`, `+0,2487 %` e `−0,00139 %` |
| 9.10 | Abrir os créditos de cada aproximação | Cada uma exibe sua fonte bibliográfica |

### Cenário 10 — Exportar e compartilhar
*(RF-106 a RF-110, RF-148)*

| # | Ação | Resultado esperado |
|---|---|---|
| 10.1 | Exportar a tabela em CSV | Arquivo com BOM UTF-8, metadados em `#`, colunas `n;pendulo;T_s;g_inferido_m_s2;alpha_graus;L_m;erro_relativo_pct` |
| 10.2 | Abrir no Excel em português | Colunas separadas corretamente, sem assistente de importação |
| 10.3 | Conferir uma linha de `α = 45°`, modo simples | `T_s = 2,085562`; `g_inferido_m_s2 = 9,803478` |
| 10.4 | Copiar o endereço compartilhável | Formato `#v=1&alpha=45&L=1&g=9.81&N=2&vis=ambos` |
| 10.5 | Abrir o endereço em outra aba | Estado idêntico restaurado |
| 10.6 | Reserializar | Endereço **idêntico**, caractere a caractere |
| 10.7 | Exportar imagem da cena | PNG legível, com os valores dos parâmetros impressos |

### Cenário 11 — Operação por teclado
*(RF-116 a RF-122, RF-149 · História 12)*

| # | Ação | Resultado esperado |
|---|---|---|
| 11.1 | Percorrer a página só com Tab | Ordem de foco lógica: seletor → cena → fórmula → tabela → parâmetros |
| 11.2 | Foco no seletor, usar as setas | Alterna entre Simples, Cicloidal e Ambos |
| 11.3 | Foco no slider de `α`, seta direita | Incrementa `0,1°`; PageUp incrementa passo maior |
| 11.4 | Foco no campo numérico de `α`, digitar `10` | Aceita a digitação **sem** limitar o `1` intermediário |
| 11.5 | Navegar a tabela com as setas | Move célula a célula; cabeçalhos anunciados |
| 11.6 | Verificar o indicador de foco em todos os temas | Sempre visível, contraste suficiente |
| 11.7 | Ativar movimento reduzido no sistema | A aplicação inicia **pausada** |
| 11.8 | Executar um leitor de tela sobre a fórmula | Expressão lida corretamente via MathML |

### Cenário 12 — Casos-limite
*(Seção de casos de borda da spec)*

| # | Ação | Resultado esperado |
|---|---|---|
| 12.1 | `α = 0` | `T = T₀`; sem oscilação; sensor não dispara; nenhuma linha coletada |
| 12.2 | `g = 0` | Mensagem "sem oscilação"; **nunca** `NaN` nem `∞` na interface |
| 12.3 | `N = 0` | `T = T₀ = 2,006067 s` exatamente |
| 12.4 | `α = 179,9°`, `N = 2` | `T/T₀ = 1,390625` (saturado); exato muito maior, com aviso |
| 12.5 | Atrito muito alto | Regime superamortecido; sem cruzamento de zero; sensor não dispara, com explicação |
| 12.6 | Deixar rodando 1 hora | Memória não cresce mais que 20 % (RNF-020) |

---

## 4. Fixtures de Aceite *(conferência rápida)*

`L = 1 m`, `g = 9,81 m/s²`, `T₀ = 2,006067 s`, `N = 2`.

| `α` | `T` simples (s) | `T` exato (s) | `T` cicloidal (s) | `g` inferido | `g` ingênuo |
|---|---|---|---|---|---|
| 5° | 2,007022 | 2,007022 | 2,006067 | 9,810000 | 9,800664 |
| 10° | 2,009893 | 2,009893 | 2,006067 | 9,809999 | 9,772688 |
| 20° | 2,021446 | 2,021451 | 2,006067 | 9,809947 | 9,661247 |
| 45° | 2,085562 | 2,086256 | 2,006067 | 9,803478 | 9,070361 |
| 60° | 2,149077 | 2,152875 | 2,006067 | 9,775424 | 8,517698 |
| 90° | 2,327351 | 2,367842 | 2,006067 | 9,477358 | 7,041324 |

---

## 5. Solução de Problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Fórmula aparece como texto cru | Fontes KaTeX não carregadas | Conferir `public/fontes-katex/`; no arquivo único, devem estar embutidas |
| Animação travando | Muitas camadas ativas ou `n_sub` alto | Reduzir rastro e gráficos; conferir o painel de diagnóstico |
| Período medido difere do teórico | Passo de tempo grande ou atrito ligado | Reduzir `Δt`; conferir que o modelo de atrito é "nenhum" |
| CSV com acentos corrompidos no Excel | BOM ausente | Confirmar UTF-8 **com** BOM na exportação |
| Endereço compartilhado não restaura tudo | Versão de formato distinta | Ler o aviso exibido; conferir `v=1` |
| Sensor não dispara | `α = 0`, `g = 0` ou regime superamortecido | Ver Cenário 12; a interface explica cada caso |
| `npm install` falha | Node abaixo de 20 | Atualizar o Node, ou usar `pendulo-simulador.html` diretamente |

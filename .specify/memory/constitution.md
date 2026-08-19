<!--
SYNC IMPACT REPORT
Mudança de versão: 0.0.0 → 1.0.0 (ratificação inicial)
Princípios modificados: nenhum (ratificação inicial — todos os princípios são novos)
Seções adicionadas:
  - Escopo e Propósito
  - Princípios Fundamentais (I a X)
  - Restrições Técnicas Obrigatórias
  - Fluxo de Desenvolvimento e Portões de Qualidade
  - Governança
Seções removidas: nenhuma
Artefatos dependentes a alinhar nesta rodada:
  - specs/001-pendulo-formula-completa/spec.md ....... a criar (/specify)
  - specs/001-pendulo-formula-completa/plan.md ....... a criar (/plan) — a "Verificação da
    Constituição" DEVE conter um item por princípio I..X desta versão
  - specs/001-pendulo-formula-completa/research.md ... a criar (/plan, Fase 0)
  - specs/001-pendulo-formula-completa/data-model.md . a criar (/plan, Fase 1)
  - specs/001-pendulo-formula-completa/contracts/ .... a criar (/plan, Fase 1)
  - specs/001-pendulo-formula-completa/quickstart.md . a criar (/plan, Fase 1)
  - specs/001-pendulo-formula-completa/tasks.md ...... a criar (/tasks, Fase 2)
  - README.md (raiz) ................................ a criar
TODOs pendentes: nenhum
-->

# Constituição do Projeto "Pêndulo: Fórmula Completa"

## Escopo e Propósito

Este documento é a lei suprema do projeto **"Pêndulo: Fórmula Completa"** — uma aplicação web
didática, interativa e offline que torna visível, manipulável e verificável a fórmula entregue pelo
usuário como fonte primária do projeto:

```
T = 2π·√(L/g) · ( 1 + (1/4)·sen²(α/2) + (9/64)·sen⁴(α/2) )
```

**Propósito do produto.** Demonstrar, com rigor e de forma visual, que o período de um pêndulo
**depende da amplitude** (regime anarmônico do pêndulo simples) e que essa dependência **desaparece
identicamente** quando o pêndulo é restringido por faces cicloidais (tautócrona de Huygens). Uma
única fórmula-motor, dois regimes, contraste visível lado a lado. Esse contraste é o produto.

**Público-alvo.** Professores e estudantes de Física do ensino médio e da graduação, em sala de aula,
frequentemente sem rede disponível e frequentemente projetando a tela.

**A quem esta constituição se aplica.** A todo artefato do spec kit (`spec.md`, `plan.md`,
`research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`, `README.md`), a todo
código-fonte, a todo teste e a toda revisão. Em caso de conflito entre esta constituição e qualquer
outro documento, prática, preferência estilística ou conveniência de cronograma, **esta constituição
prevalece**.

**O que este projeto NÃO é.** Não é um motor de física de propósito geral, não é um clone de nenhum
simulador de referência, não é um caderno de laboratório e não é um serviço com backend. É um
instrumento pedagógico construído em torno de uma fórmula específica.

---

## Princípios Fundamentais

> Os dez princípios abaixo são vinculantes. Os marcados **(NÃO NEGOCIÁVEL)** são *portões
> bloqueantes*: sua violação impede a mesclagem do trabalho e não pode ser compensada por
> justificativa, prazo ou preferência — apenas por emenda formal desta constituição.

### I. Rigor Físico e Matemático Verificável (NÃO NEGOCIÁVEL)

Toda grandeza física exibida na tela DEVE ser rastreável a uma fonte verificável e DEVE ser coberta
por um teste numérico automatizado com valor de referência e tolerância declarada.

Regras:

1. Toda fórmula exibida DEVE ter, no código, referência explícita à sua origem (arquivo do usuário,
   documento de laboratório, artigo identificado, ou derivação registrada em `research.md`).
2. Os coeficientes da série de Bernoulli/Legendre DEVEM ser gerados por recorrência
   `a₀ = 1`, `a_n = a_(n−1)·((2n−1)/(2n))²`, equivalente a `[C(2n,n)/4ⁿ]²`, e NÃO DEVEM ser
   escritos como literais avulsos nem calculados por fatoriais. Valores esperados nos testes:
   `1`, `1/4`, `9/64`, `25/256`, `1225/16384`, `3969/65536`.
3. O **default do produto é a fórmula do usuário, N = 2** (três termos: `n = 0, 1, 2`). Nenhuma
   configuração inicial, preset ou estado compartilhado pode alterar esse default silenciosamente.
4. A **referência de verdade** para todo cálculo de erro é o valor exato pela média
   aritmético-geométrica: `T_exato = T₀ / AGM(1, cos(α/2))`, com `T₀ = 2π·√(L/g)` e `k = sen(α/2)`
   fixado como **módulo** (nunca como parâmetro `k²`) em todo o projeto. Nenhuma aproximação de
   forma fechada pode ser usada como referência de erro.
5. A implementação do AGM DEVE usar **tolerância relativa mais teto de iterações**. NÃO DEVE usar
   comparação de igualdade de ponto flutuante como condição de parada — verificou-se que a condição
   de igualdade estrita entra em ciclo-limite e estoura o teto em α = 90° e α = 179°.
6. Nenhuma fórmula, coeficiente ou "aproximação conhecida" pode entrar no produto sem verificação em
   fonte primária. Especificamente: aproximações de **Padé** para o período do pêndulo NÃO DEVEM ser
   afirmadas nem implementadas neste projeto, por ausência de fonte confirmável. Aproximações
   verificadas e autorizadas: Kidd–Fogg `T₀/√(cos(α/2))`, Lima–Arun `−T₀·ln(a)/(1−a)` com
   `a = cos(α/2)` — **com o sinal negativo**, que reproduções secundárias omitem — e AGM de duas
   iterações `4·T₀/(1+√a)²`.
7. Ângulos DEVEM circular em **radianos** dentro do motor de física e ser convertidos para graus
   apenas na fronteira de entrada e de apresentação. Toda função pública que aceite ou devolva
   ângulo DEVE declarar a unidade no nome ou no tipo.

**Justificativa.** O produto ensina Física; um número errado na tela não é defeito estético, é
desinformação com a autoridade de uma tela projetada. A confusão radiano/grau e a troca
módulo/parâmetro são os dois erros mais prováveis e mais silenciosos deste domínio, e ambos produzem
gráficos plausíveis e falsos.

### II. A Fórmula É a Interface

A matemática DEVE estar visível e viva na tela principal. A fórmula NÃO DEVE ser enfeite estático nem
ficar escondida atrás de menu, aba ou botão de "saiba mais".

Regras:

1. A fórmula-motor DEVE estar renderizada em notação matemática legível na tela principal, sempre
   visível junto da cena animada.
2. Cada termo da fórmula DEVE exibir o **valor numérico corrente** correspondente ao estado atual dos
   parâmetros — o termo `(9/64)·sen⁴(α/2)` mostra quanto vale agora, não apenas seu símbolo.
3. Os termos DEVEM ser individualmente identificáveis e destacáveis. Levar o foco a um termo, por
   ponteiro ou por teclado, DEVE destacá-lo na fórmula e na leitura numérica associada.
4. NÃO DEVE existir na tela nenhum valor cuja origem o usuário não possa inspecionar: para todo
   número exibido DEVE haver um caminho de interface que mostre de qual expressão ele veio.
5. A troca de modo (simples ↔ cicloidal) DEVE ser expressa como **transformação da mesma fórmula**,
   com os termos se anulando visualmente, e NÃO DEVE substituir a fórmula por outra expressão
   independente.

**Justificativa.** O pedido do usuário é demonstrar a fórmula completa de forma visual. Um simulador
que anima uma bolinha e informa "T = 2,01 s" é uma caixa-preta: entrega o resultado e esconde a
Física. Aqui a equação é a interface, e a animação é a legenda da equação.

### III. Todo Parâmetro é Nomeado, Digitável e Declarado (NÃO NEGOCIÁVEL)

Todo parâmetro do modelo DEVE ser configurável por **valor digitado** e identificado por **símbolo e
nome**, no formato solicitado literalmente pelo usuário (`α = 10`). Controle deslizante é
complemento, nunca substituto.

Regras:

1. Todo parâmetro exposto DEVE possuir, obrigatoriamente: símbolo, nome por extenso, campo numérico
   editável, unidade, faixa válida, passo, controle deslizante acoplado e ação de restaurar o padrão.
2. DEVE existir um **console de parâmetros em texto** que aceite atribuições no formato `α = 10`,
   `L = 1`, `g = 9.81`, com aliases ASCII para os símbolos gregos (`a`, `alpha`, `α`). O mesmo
   formato DEVE servir como despejo copiável do estado corrente.
3. A entrada numérica DEVE aceitar vírgula e ponto como separador decimal. O ajuste ao limite
   (*clamp*) DEVE ocorrer apenas na confirmação (perda de foco, alteração confirmada ou Enter) e NÃO
   DEVE ocorrer a cada tecla digitada — clampar por tecla impede digitar "15" quando o mínimo é 5.
   Entrada fora de faixa DEVE ser sinalizada de forma acessível durante a digitação, sem reescrever o
   campo.
4. NÃO DEVE existir constante mágica no código. Toda constante física, faixa, passo, default,
   unidade ou tolerância DEVE viver em um **esquema de parâmetros único e declarativo**, do qual são
   derivados: controles de interface, validação, analisador do console, serialização de estado e
   presets.
5. O analisador de expressões do console NÃO DEVE usar avaliação dinâmica de código.

**Justificativa.** O usuário pediu isso em texto explícito, e há razão de fundo: em sala, o professor
precisa reproduzir *exatamente* α = 20° para casar com o roteiro do experimento — arrastar um
controle deslizante até "≈ 20" destrói a comparação numérica. Derivar tudo de um esquema único
elimina de forma estrutural a classe de bug "o controle aceita, mas a URL não" e "o console aceita,
mas a validação não".

### IV. Uma Fórmula-Motor, Dois Regimes (NÃO NEGOCIÁVEL)

O pêndulo simples e o pêndulo cicloidal DEVEM ser apresentados como **dois regimes da mesma
fórmula-motor**, e não como duas telas, dois módulos ou dois simuladores independentes.

Regras:

1. No **modo simples**, os termos de correção estão ativos: `T` cresce com `α` e o período depende da
   amplitude (comportamento anarmônico).
2. No **modo cicloidal**, os termos de correção se anulam identicamente: `T = 2π·√(L/g)` exato para
   qualquer amplitude admissível — isócrono e tautócrono.
3. A interface DEVE permitir observar os dois regimes em contraste direto, com a mesma fórmula na
   tela e os termos ligando e desligando conforme o modo.
4. O modo cicloidal DEVE respeitar o vínculo geométrico `α ≤ 90°`, decorrente de `s = L·sen θ` com
   `|s| ≤ L`. A faixa admissível do campo de amplitude DEVE mudar ao alternar de modo, e o valor
   corrente DEVE ser ajustado de forma visível e informada, nunca silenciosa.
5. O invariante `T_cicloidal(α) = T₀` para toda amplitude admissível DEVE ser coberto pelo teste mais
   forte do repositório, na forma de teste de propriedade sobre amostragem ampla do domínio. Sua
   falha caracteriza produto quebrado, não regressão menor.
6. NÃO DEVE ser acrescentado um terceiro "modo" que quebre a leitura de fórmula única sem emenda
   constitucional.

**Justificativa.** É a instrução explícita e posterior do usuário — a fórmula geral é a que deve
gerar tanto o pêndulo simples quanto o pêndulo cicloidal — e é a tese pedagógica do roteiro alemão do
Zykloidenpendel: o mesmo pêndulo, medido livre, tem período dependente da amplitude; aninhado ao
perfil cicloidal, não tem. Separar em dois simuladores destruiria exatamente aquilo que o produto
existe para mostrar.

### V. Determinismo e Reprodutibilidade

O mesmo estado de entrada DEVE produzir o mesmo resultado, em qualquer máquina e em qualquer taxa de
atualização de tela.

Regras:

1. A integração numérica DEVE usar **passo fixo com acumulador**, com limite superior de acúmulo por
   quadro, e NÃO DEVE usar o intervalo de tempo variável entregue pelo laço de animação do navegador.
   Telas de 60 Hz, 120 Hz e 144 Hz DEVEM produzir a mesma trajetória.
2. O estado completo dos parâmetros DEVE ser serializável e restaurável a partir de um endereço
   legível e versionado. Abrir esse endereço DEVE reconstruir exatamente a mesma configuração.
3. NÃO DEVE haver dependência de relógio de parede, de aleatoriedade não semeada ou de ordem de
   iteração não determinística em nada que afete resultado numérico.
4. Toda alteração de motor numérico DEVE ser acompanhada da atualização explícita e revisada dos
   instantâneos de regressão numérica; instantâneos NÃO DEVEM ser regravados automaticamente para
   "fazer o teste passar".

**Justificativa.** Sem passo fixo, a camada inteira de regressão numérica deixa de existir e o
simulador passa a dar respostas diferentes no notebook do professor e no projetor da escola. E sem
estado serializável não há como reproduzir a configuração exata de uma aula, de um slide ou de um
relato de defeito.

### VI. Acessibilidade e Didática Primeiro

O produto DEVE ser utilizável por teclado, por leitor de tela e por quem precisa de movimento
reduzido, em português do Brasil.

Regras:

1. A aplicação DEVE atender **WCAG 2.1 nível AA** nos critérios verificáveis automaticamente e nos
   percursos principais verificados manualmente.
2. Todo controle de parâmetro DEVE ser operável por teclado e DEVE expor um texto de valor acessível
   **com unidade** — não "10", mas "10,0 graus".
3. Informação NÃO DEVE ser codificada apenas por cor. Séries e objetos distintos DEVEM diferir também
   por traço, marcador ou rótulo.
4. Sob preferência de movimento reduzido, a aplicação DEVE iniciar pausada e DEVE desligar
   transições, pulsos de destaque e rastros com esmaecimento, mantendo o conteúdo legível. A
   simulação NÃO DEVE ser removida — ela é o conteúdo. DEVE existir também um controle próprio de
   redução de movimento, independente da configuração do sistema operacional.
5. O idioma padrão da interface DEVE ser **pt-BR**, com `sen` em prosa e `\operatorname{sen}` em
   notação matemática, de forma consistente. A arquitetura DEVE prever internacionalização com
   dicionários embutidos.
6. Números DEVEM ser formatados na convenção do idioma ativo (vírgula decimal em pt-BR), de forma
   coerente e simultânea na interface, na fórmula, no console de parâmetros e nas exportações.

**Justificativa.** O contexto de uso é sala de aula: teclado projetado, telas de qualidade variável,
daltonismo presente em qualquer turma e alunos sensíveis a movimento. Acessibilidade aqui não é
conformidade formal — é a diferença entre a aula funcionar e não funcionar.

### VII. Zero Dependência Oculta — Funciona Offline

A aplicação DEVE funcionar integralmente sem rede, incluindo abertura por duplo clique em um arquivo
local, sem servidor e sem instalação.

Regras:

1. NÃO DEVE haver, em tempo de execução, nenhuma requisição a rede externa: nada de rede de
   distribuição de conteúdo para scripts, folhas de estilo, fontes, dados ou telemetria.
2. DEVE ser entregue, além do pacote servível, **um único arquivo HTML autocontido** com todo o
   JavaScript, CSS, fontes e dados embutidos, verificado abrindo-o diretamente do sistema de
   arquivos.
3. Toda decisão de arquitetura DEVE respeitar as consequências verificadas do contexto de arquivo
   local: dicionários de idioma NÃO DEVEM ser carregados por requisição; fontes matemáticas DEVEM ser
   auto-hospedadas ou embutidas; recursos que exijam trabalhadores em segundo plano NÃO DEVEM ser
   requisito de funcionalidade essencial.
4. Toda dependência de terceiros DEVE ser justificada por escrito em `research.md`, ter licença
   permissiva compatível, ser fixada em versão exata e caber no orçamento de tamanho declarado no
   plano. Dependência sem justificativa registrada é violação.
5. NÃO DEVE haver backend, conta de usuário, coleta de dados pessoais ou persistência remota.

**Justificativa.** O ambiente-alvo é a escola: rede bloqueada, sem permissão de instalação, professor
com um pendrive. Verificou-se que a alternativa "sem etapa de construção" **não** cumpre esse
requisito — a origem nula de arquivos locais faz o navegador bloquear módulos e carregamentos por
política de origem cruzada. O empacotador é o que viabiliza o duplo clique, não o contrário.

### VIII. Desempenho com Orçamento Explícito

Fluidez é requisito funcional, não polimento. O orçamento DEVE ser declarado, medido e defendido.

Regras:

1. A cena animada DEVE sustentar **60 quadros por segundo** na máquina de referência declarada no
   plano, com orçamento de **16,6 ms por quadro** compartilhado entre física, cena e gráficos.
2. Os subsistemas DEVEM respeitar taxas de atualização distintas e declaradas: cena a 60 Hz, gráficos
   a 20–30 Hz, valores numéricos injetados na fórmula a 10–15 Hz. NÃO DEVE haver atualização de texto
   ou de gráfico a 60 Hz sem necessidade demonstrada.
3. A resolução de renderização DEVE ser limitada por um teto de densidade de pixels declarado, para
   não consumir o orçamento inteiro em telas de altíssima densidade sem ganho visual.
4. Séries temporais DEVEM usar estruturas pré-alocadas e circulares; NÃO DEVE haver alocação por
   quadro em caminho quente.
5. Regressão de desempenho mensurável abaixo da meta é **bloqueante**, no mesmo nível de um teste
   quebrado.

**Justificativa.** Quedas de quadro em uma animação de pêndulo não são cosméticas: alteram a
percepção do período, que é justamente a grandeza que a aula quer medir. Um simulador que engasga
ensina Física errada por via perceptual.

### IX. Testes Antes da Implementação (NÃO NEGOCIÁVEL)

O projeto adota TDD. O teste DEVE ser escrito primeiro, DEVE falhar, e só então a implementação é
escrita.

Regras:

1. Nenhuma tarefa de implementação pode começar antes de existir o teste correspondente **falhando**,
   com essa falha verificada e registrada.
2. Todo contrato declarado em `contracts/` DEVE ter teste de contrato; toda entidade de
   `data-model.md` DEVE ter teste de validação; toda história de usuário DEVE ter teste de
   integração.
3. Os testes de Física DEVEM usar **fixtures numéricas de referência** externas ao código sob teste,
   e nunca valores recalculados pela própria implementação. Conjunto mínimo obrigatório:
   coeficientes da série; `T/T₀ ≈ 1,0019` em α = 10° e `≈ 1,0077` em α = 20°;
   saturação exata em `89/64 = 1,390625` para N = 2 em α = 180°;
   limiares de erro da truncagem N = 2 (0,1 % a partir de α ≈ 54,373°; 1 % em α ≈ 81,603°;
   5 % em α ≈ 110,164°); convergência do AGM em no máximo 8 iterações até α = 179,99°;
   e `T_cicloidal(α) = T₀` em todo o domínio admissível.
4. Os invariantes estruturais DEVEM ser testados como propriedades, não como casos isolados:
   `serie(α, N=0) = 1` para todo α; monotonia `serie(α, N) ≤ serie(α, N+1) ≤ exato(α)`;
   `exato(α) ≥ 1` com igualdade apenas em α = 0; `exato` estritamente crescente em α;
   e a subestimação consciente do período pela série truncada em amplitudes grandes.
5. O motor de física DEVE ser testável sem interface: funções puras, sem acesso ao documento.
6. DEVE existir um **teste de fechamento de laço**: o período medido pela simulação numérica DEVE
   coincidir com o período da forma fechada dentro de tolerância declarada. Se esse teste falhar, o
   produto está contando duas histórias diferentes ao aluno.

**Justificativa.** Em software científico, o defeito caro não é o que quebra a tela — é o que produz
um número plausível e errado, que ninguém questiona porque "o gráfico parecia certo". A tabela de
valores de referência escrita antes do código é a única defesa contra isso.

### X. Honestidade Pedagógica — Mostrar o Erro, Nunca Escondê-lo

O desvio entre a fórmula truncada e o valor exato é **conteúdo do produto**, não defeito a ocultar.

Regras:

1. A aplicação DEVE exibir, de forma permanentemente acessível, o erro relativo entre a fórmula
   corrente (N configurável, default 2) e o valor exato por AGM.
2. A aplicação DEVE tornar observável que a série truncada **subestima** o período em amplitudes
   grandes, e que a fórmula com N = 2 satura em `89/64` enquanto o valor exato diverge quando
   α → 180°.
3. A aplicação NÃO DEVE limitar silenciosamente a amplitude, arredondar para dissimular
   discrepância, nem suprimir a exibição do erro nas faixas em que ele é grande.
4. A aplicação DEVE deixar claro em que faixa a fórmula do usuário é excelente — na faixa do
   experimento didático de referência, até 30°, o desvio é inferior a 0,001 ms para um pêndulo de
   1 m — antes de expor onde ela colapsa.
5. Toda aproximação alternativa oferecida DEVE ser exibida com seu erro medido contra a mesma
   referência exata e com atribuição de autoria.

**Justificativa.** O roteiro alemão constata que o período aumenta em alguns milissegundos com a
amplitude, e o applet de pêndulo mais difundido em sala declara textualmente que a dependência do
período com a amplitude foi *desprezada* nos cálculos. Este produto existe para ocupar exatamente
essa lacuna. Esconder o erro o tornaria mais um simulador que ensina a aproximação como se fosse a
verdade.

---

## Restrições Técnicas Obrigatórias

Restrições transversais que valem para todos os artefatos e para todo o código. Alterá-las exige
emenda desta constituição.

### Unidades, notação e domínios

- **Unidades internas**: Sistema Internacional. Comprimento em metros, massa em quilogramas,
  aceleração em m/s², tempo em segundos, ângulo em **radianos**.
- **Unidades de apresentação**: ângulo em graus, com conversão apenas na fronteira de entrada e
  saída.
- **Notação fixa**: `sen` em prosa e `\operatorname{sen}` em notação matemática; `α` = amplitude
  angular; `θ` = ângulo instantâneo; `T₀ = 2π·√(L/g)`; `k = sen(α/2)` sempre como **módulo**.
- **Limites de domínio obrigatórios**: `α ≤ 179,9°` no modo simples (o AGM degenera em 180°);
  `α ≤ 90°` no modo cicloidal (vínculo geométrico); `g ≥ 0,01 m/s²`; `L ≥ 0,05 m`; `m ≥ 0,01 kg`.
- **Grandeza derivada**: o raio gerador da cicloide é `r = L/4`, **somente leitura**. NÃO DEVE ser
  editável de forma independente de `L`, sob pena de quebrar a tautocronia.
- **Comprimento efetivo**: se o produto expuser o raio da massa, DEVE expor também o comprimento
  efetivo correspondente `L_ef = d + 2R²/(5d)`, porque esse efeito é da mesma ordem de grandeza da
  correção de amplitude que o produto ensina.

### Modelo numérico

- **Integrador padrão no regime conservativo**: velocity-Verlet, com sub-passos por quadro. A deriva
  relativa de energia DEVE permanecer limitada em simulações longas. Euler explícito NÃO DEVE ser
  oferecido como padrão em nenhuma circunstância.
- **Formas fechadas têm precedência** sobre integração numérica quando existirem e forem exatas: o
  modo cicloidal DEVE usar sua solução fechada `θ(t) = arcsen[sen(α)·cos(ω·t)]`, com `ω = √(g/L)`.
- **Atrito quadrático**, quando implementado, DEVE preservar o sinal da velocidade angular — termo
  proporcional a `θ̇·|θ̇|`, sempre oposto ao movimento. NÃO DEVE ser implementado como `θ̇²`, forma
  que injeta energia em meio ciclo.
- **Controles de amortecimento** DEVEM ter escala perceptualmente útil, concentrada na faixa em que o
  sistema ainda oscila.
- **Tolerâncias** DEVEM ser declaradas explicitamente em cada contrato numérico. NÃO DEVE haver
  comparação de igualdade de ponto flutuante em condição de parada, de convergência ou de teste.

### Interface e apresentação

- Controles de parâmetro DEVEM usar elementos nativos do navegador para faixa e valor numérico,
  agrupados semanticamente. Reimplementação de controle deslizante só é admitida onde não exista
  elemento nativo equivalente, como nas alças arrastáveis dentro da cena.
- A notação matemática DEVE ser renderizada de forma **síncrona**, sem exibição transitória do código
  da fórmula, e DEVE emitir também a representação acessível paralela para leitores de tela.
- Valores vivos DEVEM ser atualizados por substituição de texto em posições reservadas, com largura
  estabilizada e algarismos de largura fixa. A fórmula NÃO DEVE ser reconstruída a cada atualização
  de valor.
- A cena DEVE ser desenhada em camadas separadas por taxa de mudança (estática, rastro, dinâmica),
  de modo que o rastro não seja redesenhado a cada quadro.
- Conversões de coordenadas do mundo para a tela DEVEM ser funções puras. NÃO DEVE haver escala
  aplicada à transformação do contexto de desenho, porque isso corrompe espessura de linha, fontes e
  padrões tracejados.

### Dependências e entrega

- Política de dependências: mínima, permissiva, fixada e justificada. Cada adição exige registro em
  `research.md` com a alternativa rejeitada e o custo em bytes.
- Bibliotecas pesadas de gráficos ou de renderização vetorial em tempo real NÃO DEVEM ser adotadas se
  comprometerem o arquivo único ou o orçamento de quadro.
- A entrega DEVE incluir, versionados, tanto o pacote servível quanto o arquivo único autocontido,
  para uso sem ambiente de desenvolvimento instalado.
- Exportações de dados e de imagem DEVEM adotar a convenção regional ativa e DEVEM carimbar os
  parâmetros usados, para que qualquer figura extraída seja reproduzível.

### Documentação

- Todos os artefatos do spec kit DEVEM ser escritos em **pt-BR**.
- Datas DEVEM usar formato ISO `AAAA-MM-DD`.
- Identificadores DEVEM seguir os tokens fixados do projeto: `RF-###`, `RNF-###`, `CS-###`, `HU#`,
  `T###`, `[P]` e `[NECESSITA ESCLARECIMENTO: ...]`, com numeração de três dígitos, contínua, sem
  lacunas e sem reuso.
- Nenhum artefato entregue pode conter marcador de preenchimento, `TODO` órfão ou seção preenchida
  com "N/A": seção inaplicável DEVE ser removida por inteiro.

---

## Fluxo de Desenvolvimento e Portões de Qualidade

### Ordem obrigatória dos artefatos

O projeto segue Desenvolvimento Orientado por Especificação, nesta ordem:

```
/constitution → /specify → /clarify → /plan → /tasks → /analyze → /implement
```

Regras de fase:

1. Nenhum código de aplicação DEVE ser escrito antes de `spec.md`, `plan.md` e `tasks.md` existirem e
   estarem consistentes entre si.
2. `spec.md` descreve **o quê e por quê**; NÃO DEVE conter linguagem, biblioteca, estrutura de
   código ou algoritmo de implementação. A Física e as fórmulas **são domínio do produto** e podem
   aparecer; a tecnologia que as calcula, não.
3. `plan.md` descreve **como**; DEVE conter a Verificação da Constituição como portão, avaliada antes
   da Fase 0 e reavaliada após a Fase 1.
4. A Fase 0 (`research.md`) DEVE encerrar com zero itens `[NECESSITA ESCLARECIMENTO]` técnicos
   pendentes; caso contrário, a Fase 1 não começa.
5. `/plan` NÃO DEVE criar `tasks.md`; apenas descrever a estratégia de geração das tarefas.
6. Toda tarefa em `tasks.md` DEVE citar o caminho exato do arquivo que toca, e nenhuma tarefa marcada
   como paralelizável pode compartilhar arquivo com outra tarefa paralelizável.

### Portões de qualidade

Um trabalho só pode ser considerado concluído e mesclado quando **todos** os portões abaixo passam.
Portão reprovado bloqueia a entrega; NÃO DEVE ser contornado por exceção informal.

| Portão | O que verifica | Consequência da reprovação |
|---|---|---|
| **G1 — Constitucional** | Nenhum item de spec, plano, tarefas ou código conflita com um princípio DEVE; a Verificação da Constituição no `plan.md` cobre I a X | Crítico: ajustar o artefato, nunca diluir o princípio |
| **G2 — Testes primeiro** | Existe teste correspondente, que falhou antes da implementação | Bloqueia a mesclagem |
| **G3 — Fixtures numéricas** | Todos os valores de referência do Princípio IX passam dentro da tolerância declarada | Bloqueia a mesclagem |
| **G4 — Invariante cicloidal** | `T_cicloidal(α) = T₀` em todo o domínio admissível | Produto quebrado: reverter |
| **G5 — Determinismo** | Regressão numérica reproduz os instantâneos com passo fixo | Bloqueia a mesclagem |
| **G6 — Acessibilidade** | Verificação automática sem violações no painel e nos percursos principais; navegação completa por teclado | Bloqueia a mesclagem |
| **G7 — Offline e tamanho** | O arquivo único abre do sistema de arquivos, sem requisição externa, dentro do orçamento de tamanho | Bloqueia a mesclagem |
| **G8 — Desempenho** | 60 quadros por segundo na máquina de referência, com o orçamento de 16,6 ms respeitado | Bloqueia a mesclagem |
| **G9 — Rastreabilidade** | Todo `RF-###`/`RNF-###` tem ao menos uma tarefa; toda tarefa mapeia para requisito ou história; todo `CS-###` construível aparece em tarefas | Bloqueia a mesclagem |
| **G10 — Consistência documental** | Sem deriva terminológica entre artefatos; sem marcador de preenchimento; datas em ISO; rodapé de `plan.md` cita a versão vigente desta constituição | Bloqueia a mesclagem |

### Definição de pronto

Um item está pronto quando: o teste que o cobre existia e falhava antes; passa agora; os portões G1 a
G10 aplicáveis passam; a documentação afetada foi atualizada na mesma entrega; e a validação
correspondente do `quickstart.md` foi executada com o resultado esperado.

### Revisão

Toda revisão DEVE verificar explicitamente a conformidade constitucional, além da correção técnica.
Um comentário de revisão que aponte violação de princípio DEVE ser resolvido por correção do
trabalho, e NÃO DEVE ser resolvido por reinterpretação do princípio.

---

## Governança

**Supremacia.** Esta constituição supera todas as demais práticas, convenções, preferências pessoais
e documentos do projeto. Em análise de consistência cruzada, conflito com um princípio é classificado
automaticamente como **CRÍTICO** e exige ajustar `spec.md`, `plan.md` ou `tasks.md` — nunca diluir,
reinterpretar ou ignorar o princípio.

**Procedimento de emenda.**

1. A proposta de emenda DEVE ser registrada por escrito, contendo: o texto atual, o texto proposto, a
   justificativa e o impacto esperado sobre os artefatos existentes.
2. A emenda DEVE ser aprovada pelo responsável pelo projeto antes de qualquer alteração de código que
   dependa dela.
3. A emenda aprovada DEVE atualizar, na mesma entrega: o corpo desta constituição, o Sync Impact
   Report no topo do arquivo, a linha de versão do rodapé e todos os artefatos dependentes que a
   emenda torna desatualizados — em especial a Verificação da Constituição do `plan.md`.
4. Emenda que invalide trabalho já implementado DEVE vir acompanhada de plano de migração explícito.
5. Alterar um princípio para acomodar uma implementação já escrita NÃO DEVE ser aceito como
   justificativa suficiente por si só.

**Versionamento semântico desta constituição.**

- **MAJOR** — remoção ou redefinição incompatível de princípio ou de regra de governança.
- **MINOR** — novo princípio, nova seção, ou expansão material de orientação existente.
- **PATCH** — esclarecimento de redação, correção tipográfica ou refinamento não semântico.

**Revisão de conformidade.** A conformidade DEVE ser reavaliada a cada revisão de trabalho e sempre
que um artefato do spec kit for regerado. O rodapé de `plan.md` DEVE citar a mesma versão registrada
no rodapé deste arquivo; divergência entre as duas é reprovação do portão G10.

**Ratificação.** Esta constituição entra em vigor na data de ratificação abaixo e vincula todo
trabalho posterior no projeto.

**Versão**: 1.0.0 | **Ratificada em**: 2026-08-17 | **Última emenda**: 2026-08-17

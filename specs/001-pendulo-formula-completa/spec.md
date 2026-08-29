# Especificação de Funcionalidade: Pêndulo — Fórmula Completa

**Branch da funcionalidade**: `001-pendulo-formula-completa`
**Criada em**: 2026-08-17
**Status**: Rascunho
**Entrada**: Descrição do usuário:

> "Analise os sites [PhET Pendulum Lab e GeoGebra Cycloidal Pendulum] e Analise os arquivos
> `formula completa.jpeg` e `mhd_zykloidenpendel.pdf` pois quero que crie um spec kit completo
> aonde vamos demonstrar a fórmula completa em um site de forma visual aonde o usuário pode fazer
> diversas modificações, as mais variadas possível."
>
> "Analise a formula geral `formula geral.jpeg` para fazer o 'pendulo simples' e o 'pendulo Cycloidal'"
>
> "O programa tem que ter os parâmetros configuráveis, exemplo 'a = 10' (alfa)"

---

## Fluxo de Execução (principal)

```
1. Parsear a descrição do usuário na Entrada
   → se vazia: ERRO "Nenhuma descrição de funcionalidade fornecida"
2. Extrair conceitos-chave da descrição
   → Atores: professor de física, estudante, autodidata
   → Ações: exibir a fórmula geral, alternar modo simples/cicloidal, editar parâmetros por
     digitação, medir o período, comparar teoria e medição, exportar e compartilhar
   → Dados: parâmetros físicos, termos da série, modelos de período, medições, cenários
   → Restrições: fidelidade às três imagens de fórmula; fidelidade ao roteiro experimental
     do PDF alemão; paridade funcional com PhET e GeoGebra; máxima variedade de parâmetros
3. Para cada aspecto ambíguo
   → marcar [NECESSITA ESCLARECIMENTO: pergunta específica] (máximo 3 no documento)
   → onde houver default defensável, registrar em "Suposições" em vez de marcar
4. Preencher a seção Cenários de Usuário e Testes
   → se não houver fluxo de usuário claro: ERRO "Não é possível determinar os cenários"
5. Gerar Requisitos Funcionais e Não Funcionais
   → cada requisito DEVE ser testável e não ambíguo
   → marcar requisitos ambíguos com [NECESSITA ESCLARECIMENTO]
6. Identificar Entidades-Chave (a funcionalidade manipula dados de domínio)
7. Executar a Revisão e Checklist de Aceite
   → se houver [NECESSITA ESCLARECIMENTO] remanescente: AVISO "Spec com incertezas"
   → se houver detalhe de implementação (linguagem, biblioteca, arquivo-fonte): ERRO
     "Remover detalhes técnicos"
8. Retornar: SUCESSO (spec pronta para /clarify e /plan)
```

---

## ⚡ Diretrizes Rápidas

- ✅ Foco no **O QUE** o usuário precisa e no **POR QUÊ**.
- ❌ Evitar o **COMO** (linguagens, bibliotecas, frameworks, APIs, arquivos-fonte, estruturas
  de dados de implementação).
- 👥 Escrita para stakeholders — professores, coordenadores pedagógicos, revisores — não para
  desenvolvedores.

Regras de seção aplicadas neste documento:

- Seções obrigatórias sempre presentes e preenchidas.
- Seção que não se aplica é **removida por inteiro**, nunca preenchida com "N/A".
- A **física e as fórmulas** são o domínio do produto e, portanto, aparecem aqui. Métodos de
  implementação (algoritmos de renderização, integradores escolhidos, tecnologia de página)
  pertencem ao plano, não a esta especificação. Onde a física exige um método numérico como
  *comportamento observável* (por exemplo: "o valor exato de referência DEVE ter erro relativo
  abaixo de 1e-9"), o requisito é escrito como **resultado verificável**, não como técnica.

---

## Resumo Executivo

O produto é uma aplicação web didática, de página única, que transforma uma única fórmula — a
**série de Bernoulli/Legendre para o período do pêndulo**, entregue pelo usuário nas imagens
`formula simples.jpeg`, `formula completa.jpeg` e `formula geral.jpeg` —

```
T = 2π·√(L/g) · ( 1 + (1/4)·sen²(α/2) + (9/64)·sen⁴(α/2) + … )
```

em um instrumento visual manipulável. A mesma fórmula-motor gera **dois regimes**:

- **Pêndulo simples (livre)** — os termos de correção estão ativos; o período **cresce com a
  amplitude** (comportamento anarmônico);
- **Pêndulo cicloidal (Huygens)** — a restrição cicloidal anula identicamente todos os termos de
  correção; o período vale `2π·√(L/g)` **exatamente**, para qualquer amplitude (isocronia/tautocronia).

O usuário controla dezenas de parâmetros — **digitando valores exatos** (`a = 10`), arrastando
sliders acoplados ou escrevendo um bloco de texto de configuração — e observa simultaneamente:
a cena animada, a fórmula viva com os valores substituídos termo a termo, os gráficos de período
e de erro, e as medições feitas com instrumentos virtuais (cronômetro, fotoporta, régua,
transferidor) equivalentes aos do laboratório real descrito no PDF alemão.

## Cenário Motivador

O roteiro experimental `mhd_zykloidenpendel.pdf` ("Zykloidenpendel") descreve uma montagem de
laboratório: um perfil cicloidal sobre tripés, uma barreira de luz (fotoporta) ligada a um
osciloscópio e um pêndulo de **1 metro** de comprimento efetivo. O experimento tem duas partes:

1. O pêndulo oscila **livre**, deslocado perpendicularmente ao perfil, com amplitudes diferentes.
   A medição mostra que o período **depende da amplitude**, "na faixa de porcentagem": com
   amplitudes maiores o período aumenta em **alguns milissegundos**.
2. O pêndulo é então **aninhado ao perfil cicloidal** e novamente solto de amplitudes diferentes.
   Agora **o período é independente da amplitude** — intuitivamente, porque "com maior deslocamento
   o comprimento efetivo do pêndulo diminui".

A montagem é grande, cara e, segundo o próprio roteiro, precisa de câmera para ser apresentada a
uma turma. O efeito a demonstrar tem magnitude de **milissegundos** e exige alinhamento fino de
dois perfis. A maior parte das escolas nunca terá esse aparato.

As duas melhores simulações públicas disponíveis não fecham essa lacuna:

| Lacuna | PhET Pendulum Lab | GeoGebra Cycloidal Pendulum |
|---|---|---|
| Mostra a fórmula do período na tela | Não. Nenhuma string oficial da simulação contém uma equação. | Não. É premissa declarada do autor. |
| Permite estender/truncar a série e ver a convergência | Não | Não |
| Compara o período aproximado com o período exato | Não | Não |
| Traz o modo cicloidal | Não existe | Sim, mas isolado do pêndulo simples |
| Permite digitar um valor exato de parâmetro | Não. Só sliders com leitura. | Não. `g`, `r` e `m` não são ajustáveis. |
| Exibe o período numericamente | Sim (cronômetro/fotoporta) | Não |
| Une simples e cicloidal na mesma tela e na mesma fórmula | Não | Não |

Some-se a isso o fato, verificado, de que o applet de pêndulo mais usado em sala de aula
(Walter Fendt) declara textualmente que "a dependência do período de oscilação em relação à
amplitude foi desprezada nos cálculos" — ou seja: aceita a amplitude como parâmetro e ignora
justamente o efeito que este produto existe para ensinar.

**A lacuna que esta funcionalidade preenche**: não existe hoje um instrumento que mostre,
simultaneamente e na mesma tela, (a) a fórmula geral termo a termo com valores vivos,
(b) o pêndulo simples e o cicloidal derivados dessa mesma fórmula, e (c) a medição virtual do
período reproduzindo o procedimento do laboratório real — inclusive o detalhe, garantido gerador
de confusão em sala, de que **a barreira de luz mede meio período**.

## Personas e Público-Alvo

- **Professora de Física do Ensino Médio (persona primária — "Cláudia")**. Precisa demonstrar, em
  uma aula de 50 minutos e com projetor, por que "sen α ≈ α" funciona e onde deixa de funcionar.
  Não tem o aparato do PDF alemão. Quer clicar em um preset, projetar, e conduzir a discussão sem
  configurar nada. Valoriza: fórmula grande e legível na tela, contraste alto, um clique para
  alternar simples/cicloidal, números arredondados legíveis a 8 metros de distância.
- **Aluno de Ensino Médio / início de graduação (persona primária — "Rafael")**. Recebe uma tarefa:
  "determine `g` no Planeta X" ou "meça o período para cinco amplitudes e compare com a teoria".
  Precisa medir, anotar, tabelar e exportar. Valoriza: instrumentos que se parecem com os de
  laboratório, tabela de dados, exportação para planilha.
- **Estudante de graduação / autodidata (persona secundária — "Marina")**. Quer entender de onde
  vem o `9/64`, até onde a truncagem vale, o que é a integral elíptica e por que a cicloide é
  tautócrona. Valoriza: número de termos configurável, curva de erro, aproximações alternativas
  com referência bibliográfica, valores com muitas casas decimais.
- **Professor universitário / autor de material didático (persona secundária)**. Quer capturar
  figuras carimbadas com os parâmetros e compartilhar um estado exato por endereço (URL) com a
  turma. Valoriza: reprodutibilidade, exportação de imagem e de dados, permalink.

Ambiente de uso assumido: computador de sala de aula ou laboratório de informática, muitas vezes
**sem conexão de internet confiável**, projetor de baixa resolução, navegador desatualizado,
uso por teclado e por mouse. Ver **Suposições**.

---

## Cenários de Usuário e Testes *(obrigatória)*

### História de Usuário 1 — Ver a fórmula geral viva, termo a termo (Prioridade: P1)

Uma professora abre a aplicação e vê, em destaque, a fórmula geral do período com os valores
numéricos atuais substituídos em cada termo. Ela altera a amplitude e observa cada termo mudar de
valor em tempo real, além do total. Ela liga e desliga termos da série e vê o quanto cada um
contribui.

**Por que esta prioridade**: é a razão de existir do produto e a única coisa que nenhuma das duas
simulações de referência faz. Entregue sozinha, já constitui um instrumento de aula utilizável e
um MVP viável.

**Teste Independente**: abrir a aplicação com os valores padrão, alterar apenas a amplitude e
verificar que os três termos da fórmula e o período total se atualizam com os valores corretos —
sem usar nenhuma outra funcionalidade.

**Cenários de Aceite**:

1. **Dado** o estado inicial (modo simples, `L = 1 m`, `g = 9,81 m/s²`, `α = 10°`, `N = 2`),
   **Quando** a aplicação termina de carregar, **Então** o painel da fórmula exibe
   `T = 2π√(L/g)·(1 + ¼·sen²(α/2) + (9/64)·sen⁴(α/2))` com os valores substituídos e o período
   total `T = 2,0099 s` (quatro casas), e `T₀ = 2,0061 s`.
2. **Dado** o painel da fórmula visível, **Quando** o usuário altera `α` de 10° para 90°,
   **Então** o valor exibido do segundo termo passa de 0,001887 para 0,125000 e o do terceiro de
   0,000021 para 0,140625, e a razão `T/T₀` exibida passa de 1,001907 para 1,160156.
3. **Dado** `N = 2`, **Quando** o usuário aumenta `N` para 5, **Então** a fórmula ganha visualmente
   três termos adicionais, com coeficientes `25/256`, `1225/16384` e `3969/65536`, e a razão
   exibida em `α = 90°` passa de 1,160156 para 1,178929.
4. **Dado** qualquer amplitude, **Quando** o usuário define `N = 0`, **Então** a fórmula se reduz a
   `T = 2π√(L/g)` e o valor exibido é idêntico ao da aproximação de pequenos ângulos.
5. **Dado** o painel da fórmula, **Quando** o usuário aponta ou foca um termo específico,
   **Então** aquele termo é destacado visualmente e a aplicação informa a contribuição daquele
   termo, em segundos e em porcentagem do total.

---

### História de Usuário 2 — Alternar entre pêndulo simples e cicloidal na mesma fórmula (Prioridade: P1)

O usuário troca o modo de "simples" para "cicloidal" e vê, na mesma fórmula, os termos de correção
se apagarem, restando `T = 2π√(L/g)`. A cena muda de um arco de círculo para a trajetória cicloidal
com o fio enrolando nas faces, e o período exibido para de depender da amplitude.

**Por que esta prioridade**: é a interpretação canônica da instrução do usuário ("uma fórmula
geral que gera tanto o pêndulo simples quanto o cicloidal") e o contraste pedagógico central do
produto. Nenhuma referência existente faz isso.

**Teste Independente**: com `α = 60°` fixo, alternar o modo e verificar que o período exibido cai
de 2,1529 s para 2,0061 s e que os termos de correção aparecem visualmente anulados.

**Cenários de Aceite**:

1. **Dado** modo simples com `L = 1 m`, `g = 9,81 m/s²` e `α = 60°`, **Quando** o usuário seleciona
   o modo cicloidal, **Então** os termos com `n ≥ 1` são exibidos como anulados e o período passa a
   `2,0061 s`, igual a `T₀`.
2. **Dado** o modo cicloidal ativo, **Quando** o usuário varia `α` de 5° até 90°, **Então** o
   período exibido permanece constante em `2,0061 s` em todas as amplitudes.
3. **Dado** o modo simples ativo com `α = 150°`, **Quando** o usuário seleciona o modo cicloidal,
   **Então** a amplitude é reduzida automaticamente para o máximo geométrico de 90° e a aplicação
   informa que, no pêndulo cicloidal, `|θ| ≤ 90°` porque o deslocamento ao longo do arco satisfaz
   `s = L·sen θ` com `|s| ≤ L`.
4. **Dado** o modo cicloidal, **Quando** a cena está em movimento, **Então** são visíveis as duas
   faces cicloidais, o trecho de fio ainda enrolado, o trecho de fio livre e a trajetória
   percorrida pela massa; e a leitura do comprimento livre do fio vale `L·cos θ`.
5. **Dado** o modo comparação, **Quando** o usuário define uma amplitude, **Então** dois pêndulos
   partem simultaneamente — um simples e um cicloidal com o mesmo `L` e o mesmo `g` — e a
   aplicação exibe a defasagem acumulada entre eles em segundos e em número de oscilações.

---

### História de Usuário 3 — Descobrir que o período depende da amplitude (Prioridade: P1)

O usuário aumenta gradualmente a amplitude do pêndulo simples e acompanha o período crescendo, na
leitura numérica, na curva `T(α)` e no atraso visível em relação a um pêndulo de referência
oscilando com `T₀`.

**Por que esta prioridade**: é o objetivo de aprendizagem declarado tanto pelo PDF alemão quanto
pela simulação de referência ("notice the anharmonic behavior at large amplitude"), e a
justificativa para toda a série.

**Teste Independente**: variar `α` de 5° a 90° e verificar que a razão `T/T₀` exibida percorre a
tabela de referência com erro relativo menor que 1e-6.

**Cenários de Aceite**:

1. **Dado** o modo simples com `L = 1 m` e `g = 9,81 m/s²`, **Quando** o usuário define
   `α = 10°`, `20°`, `45°` e `90°`, **Então** a aplicação exibe `T/T₀` igual a
   1,001907, 1,007669, 1,039973 e 1,180341 (valores exatos de referência), respectivamente.
2. **Dado** o gráfico `T(α)` visível, **Quando** o usuário arrasta a amplitude, **Então** um cursor
   percorre simultaneamente as três curvas — `T₀` (reta horizontal), série truncada em `N` e
   período exato — e a leitura mostra os três valores no `α` corrente.
3. **Dado** `α = 90°`, **Quando** o usuário compara a leitura com a de `α = 5°`, **Então** a
   aplicação evidencia que o período aumentou 18,0 % e que a massa não influencia esse valor.
4. **Dado** o pêndulo de referência (fantasma) ativado com `T₀`, **Quando** a simulação roda por 20
   oscilações com `α = 45°`, **Então** o pêndulo real acumula visivelmente atraso em relação ao
   fantasma, e a aplicação exibe a defasagem acumulada em segundos.
5. **Dado** `α = 179,9°`, **Quando** o usuário tenta aumentar ainda mais a amplitude, **Então** o
   valor é travado em 179,9° e a aplicação explica que em 180° o pêndulo está em equilíbrio
   instável e o período tende a infinito.

---

### História de Usuário 4 — Comprovar a tautocronia com massas soltas de alturas diferentes (Prioridade: P1)

No modo cicloidal, o usuário solta duas ou mais massas de posições diferentes do arco, ao mesmo
tempo, e vê todas chegarem juntas ao ponto mais baixo — repetidamente.

**Por que esta prioridade**: é a demonstração visual que dá sentido ao modo cicloidal e o único
ponto de paridade direta com a referência de GeoGebra; sem ela, o modo cicloidal é apenas um número
que não muda.

**Teste Independente**: no modo cicloidal, soltar duas massas de deslocamentos iniciais diferentes
e verificar que os instantes de passagem pelo ponto mais baixo coincidem.

**Cenários de Aceite**:

1. **Dado** o modo cicloidal com duas massas em posições iniciais distintas, **Quando** o usuário
   inicia a simulação, **Então** ambas atingem o ponto mais baixo no mesmo instante, com diferença
   inferior a um milésimo do período.
2. **Dado** até oito massas em posições distintas, **Quando** a simulação roda por dez oscilações,
   **Então** todas continuam sincronizadas, sem acúmulo visível de defasagem.
3. **Dado** o mesmo arranjo em modo simples (arco de círculo), **Quando** a simulação roda,
   **Então** as massas se dessincronizam visivelmente, e a aplicação oferece a leitura da diferença
   de período entre elas.
4. **Dado** o modo cicloidal, **Quando** o usuário ativa a exibição da curva sobre a qual o fio
   enrola e da trajetória descrita pela massa, **Então** ambas são exibidas e identificadas, e a
   aplicação informa que uma é a evoluta da outra e que ambas são cicloides congruentes de raio
   gerador `r = L/4`.

---

### História de Usuário 5 — Digitar valores exatos dos parâmetros (Prioridade: P1)

O usuário quer o valor exato, não o que o slider alcançar. Ele digita `10` no campo da amplitude,
ou escreve `a = 10` no console de parâmetros, e o estado inteiro se atualiza.

**Por que esta prioridade**: pedido explícito e literal do usuário ("O programa tem que ter os
parâmetros configuráveis, exemplo 'a = 10' (alfa)"). Sem isso a aplicação não atende ao pedido,
por mais bonita que seja.

**Teste Independente**: digitar `a = 10` no console e verificar que a amplitude passa a 10°, que o
campo numérico e o slider da amplitude refletem o novo valor e que a cena e a fórmula se atualizam.

**Cenários de Aceite**:

1. **Dado** qualquer parâmetro numérico do catálogo, **Quando** o usuário o localiza na interface,
   **Então** vê símbolo, nome em português, campo numérico editável, unidade, faixa válida, passo,
   slider acoplado e botão de restaurar o padrão daquele parâmetro.
2. **Dado** o campo da amplitude com mínimo 0,1, **Quando** o usuário apaga o conteúdo e digita
   `15`, **Então** o dígito `1` **não** é reescrito para o mínimo durante a digitação, e o valor
   15 é aceito ao confirmar.
3. **Dado** o campo do comprimento, **Quando** o usuário digita `1,5` ou `1.5`, **Então** ambos são
   aceitos como 1,5 m.
4. **Dado** o campo da amplitude, **Quando** o usuário digita `pi/6 rad`, **Então** o valor é
   convertido e exibido como 30°.
5. **Dado** o campo da gravidade com máximo 300, **Quando** o usuário confirma o valor `500`,
   **Então** o valor é limitado a 300, o campo mostra o valor limitado e a aplicação informa qual
   limite foi aplicado.
6. **Dado** o console de parâmetros, **Quando** o usuário cola o bloco
   `# aula 1` / `modo = simples` / `a = 10 deg` / `L = 1 m` / `g = 9.81` / `N = 2`,
   **Então** todas as linhas válidas são aplicadas, os comentários são ignorados e o estado
   resultante é idêntico ao de configurar os mesmos valores pela interface.
7. **Dado** um bloco com uma linha inválida (`L = abacaxi`), **Quando** o usuário aplica,
   **Então** as demais linhas são aplicadas mesmo assim e a aplicação aponta a linha inválida e o
   motivo, sem descartar o lote.
8. **Dado** qualquer estado, **Quando** o usuário aciona "copiar parâmetros", **Então** obtém um
   bloco de texto no mesmo formato aceito pelo console, que ao ser colado de volta reproduz
   exatamente o mesmo estado.

---

### História de Usuário 6 — Medir o período com cronômetro e fotoporta (Prioridade: P2)

O usuário mede o período como se estivesse no laboratório: posiciona uma fotoporta no ponto mais
baixo, escolhe entre contar meio período ou período completo, e compara a medição com o valor
previsto pela fórmula.

**Por que esta prioridade**: é o procedimento experimental do PDF alemão e o objetivo de
aprendizagem oficial da simulação de referência ("use a fotoporta para determinar
quantitativamente a dependência do período"). Sem medição, a fórmula não é confrontada com nada.

**Teste Independente**: ativar a fotoporta em modo "meio período" com `L = 1 m` e `α = 10°` e
verificar que a leitura converge para 1,0049 s, metade do período teórico.

**Cenários de Aceite**:

1. **Dado** a fotoporta ativa em modo "período completo" com `L = 1 m`, `g = 9,81 m/s²` e
   `α = 10°`, **Quando** o pêndulo completa uma oscilação, **Então** a leitura exibida é
   2,0099 s, com desvio menor que 0,01 % em relação ao período teórico.
2. **Dado** a fotoporta em modo "meio período", **Quando** o pêndulo passa duas vezes consecutivas
   pela barreira, **Então** a leitura exibida é 1,0049 s e a aplicação identifica explicitamente
   que esse é **meio** período, como no experimento com barreira de luz do roteiro original.
3. **Dado** o cronômetro manual e a opção de contar `n` períodos, **Quando** o usuário cronometra
   10 oscilações, **Então** a aplicação exibe o tempo total e o período médio `t/n`.
4. **Dado** o ruído de medição simulado ajustado para 5 ms, **Quando** o usuário repete a medição
   cinco vezes, **Então** os valores diferem entre si dentro dessa ordem de grandeza e a aplicação
   exibe média e dispersão das medidas registradas.
5. **Dado** qualquer medição registrada, **Quando** ela entra na tabela de dados, **Então** a linha
   contém amplitude, período medido, período teórico pela série, período exato e o erro relativo
   entre eles.

---

### História de Usuário 7 — Reproduzir o experimento do pêndulo de 1 metro (Prioridade: P2)

O usuário carrega o preset "Experimento do roteiro alemão" e reencena as duas partes do
experimento: primeiro o pêndulo livre com várias amplitudes, depois o pêndulo aninhado ao perfil
cicloidal — obtendo os mesmos desvios de milissegundos descritos no roteiro.

**Por que esta prioridade**: é a fonte primária do projeto e a validação de que a simulação
reproduz um experimento real, não uma abstração.

**Teste Independente**: aplicar o preset e verificar que a leitura de meio período varia de
1,0030 s a 1,0067 s ao percorrer amplitudes de 5° a 45°, e que essa variação desaparece ao aninhar
o pêndulo ao perfil.

**Cenários de Aceite**:

1. **Dado** o preset do experimento (`L = 1 m`, `g = 9,81 m/s²`, fotoporta ligada em modo meio
   período), **Quando** o usuário mede em `α = 10°`, `20°` e `45°`, **Então** os desvios do período
   completo em relação a `T₀` são +3,8 ms, +15,4 ms e +80,2 ms, e as leituras de **meio** período
   diferem de `T₀/2` em +1,9 ms, +7,7 ms e +40,1 ms.
2. **Dado** o mesmo preset, **Quando** o usuário alterna para o modo cicloidal e repete as três
   medições, **Então** as três leituras são idênticas entre si dentro da precisão exibida.
3. **Dado** o preset ativo, **Quando** o usuário abre a explicação contextual, **Então** a
   aplicação apresenta a citação do roteiro original — período dependente da amplitude "na faixa de
   porcentagem", aumento de "alguns milissegundos", e a explicação intuitiva de que, no perfil
   cicloidal, "com maior deslocamento o comprimento efetivo do pêndulo diminui".
4. **Dado** o modo cicloidal ativo, **Quando** o usuário observa o trecho reto do fio,
   **Então** a aplicação exibe seu comprimento `L·cos θ` e evidencia que ele encurta conforme o
   ângulo aumenta — a formalização exata da frase do roteiro.

---

### História de Usuário 8 — Determinar a gravidade de um planeta desconhecido (Prioridade: P2)

O aluno recebe um desafio: o valor de `g` está oculto. Ele mede o período, usa a fórmula e deduz a
gravidade local, conferindo depois a resposta.

**Por que esta prioridade**: é o objetivo de aprendizagem mais citado da simulação de referência
("use the pendulum to find the value of g on Planet X") e transforma a fórmula de objeto de
contemplação em ferramenta de trabalho.

**Teste Independente**: ativar o desafio, medir o período com `L = 1 m`, calcular `g = 4π²L/T²` e
verificar que a resposta submetida é avaliada contra o valor oculto.

**Cenários de Aceite**:

1. **Dado** o desafio "Planeta X" ativo, **Quando** o usuário abre o painel de parâmetros,
   **Então** o valor de `g` está oculto e não é revelado por nenhuma leitura derivada, nem pelo
   endereço compartilhável, nem pela exportação de dados.
2. **Dado** o desafio ativo, **Quando** o usuário mede o período e submete uma estimativa de `g`,
   **Então** a aplicação informa se a estimativa está dentro da tolerância definida e só então
   revela o valor verdadeiro.
3. **Dado** o desafio ativo, **Quando** o usuário mede com amplitude grande sem corrigir pela
   série, **Então** a aplicação permite constatar que a estimativa de `g` fica sistematicamente
   abaixo do valor real, e oferece o caminho de correção pela fórmula.
4. **Dado** o modo normal (sem desafio), **Quando** o usuário escolhe um corpo celeste no seletor,
   **Então** `g` assume o valor tabelado correspondente e o período se ajusta imediatamente.

---

### História de Usuário 9 — Ver a série convergir e falhar (Prioridade: P2)

O usuário aumenta o número de termos e observa a curva da série se aproximar da curva exata; leva a
amplitude ao extremo e descobre que a fórmula truncada satura, enquanto o período real diverge.

**Por que esta prioridade**: é a lição matemática mais forte que o produto pode entregar e a
justificativa honesta para a existência de um valor "exato" de referência.

**Teste Independente**: fixar `α = 120°` e aumentar `N` de 2 até 20, verificando que o erro
relativo exibido cai de 7,74 % para menos de 0,3 %.

**Cenários de Aceite**:

1. **Dado** o gráfico de erro visível, **Quando** o usuário aumenta `N`, **Então** a curva de erro
   da série se aproxima monotonamente de zero em toda a faixa de amplitude.
2. **Dado** `α = 180°` como limite teórico, **Quando** o usuário observa a série com `N = 2`,
   **Então** a aplicação evidencia que a soma satura no valor exato `89/64 = 1,390625`, enquanto o
   período real tende a infinito.
3. **Dado** qualquer amplitude, **Quando** o usuário compara a série com o valor exato,
   **Então** a aplicação evidencia que **toda** truncagem subestima o período, exibindo o sinal do
   erro, e não apenas seu módulo.
4. **Dado** `α = 170°`, **Quando** o usuário busca erro abaixo de 0,1 % aumentando `N`, **Então** a
   aplicação informa que seriam necessários 449 termos e recomenda o uso do valor exato de
   referência em vez da série.
5. **Dado** o painel de aproximações alternativas, **Quando** o usuário ativa as aproximações de
   forma fechada disponíveis, **Então** cada uma é exibida com sua expressão, sua referência
   bibliográfica e seu erro relativo no `α` corrente.
6. **Dado** a faixa de amplitude corrente, **Quando** o erro da série truncada ultrapassa 0,1 %,
   1 % e 5 %, **Então** a aplicação sinaliza cada patamar com um indicador de confiança distinto,
   nos limiares de 54,373°, 81,603° e 110,164° para `N = 2`.

---

### História de Usuário 10 — Registrar medidas em um caderno de laboratório e exportar (Prioridade: P2)

O aluno acumula medições em uma tabela, como faria em papel, e exporta os dados para a planilha do
relatório.

**Por que esta prioridade**: fecha o ciclo experimental. Sem registro e exportação, a medição não
vira trabalho escolar.

**Teste Independente**: registrar cinco medições com amplitudes diferentes, exportar o arquivo de
dados e abri-lo em uma planilha com localidade pt-BR sem ajustes manuais.

**Cenários de Aceite**:

1. **Dado** uma medição concluída, **Quando** o usuário a registra, **Então** ela é acrescentada à
   tabela com todos os parâmetros relevantes do momento da medição, e não apenas com o resultado.
2. **Dado** a tabela com cinco ou mais linhas, **Quando** o usuário solicita a exportação de dados,
   **Então** obtém um arquivo de planilha que abre corretamente em ambiente pt-BR, com separador
   decimal vírgula e colunas separadas.
3. **Dado** a tabela preenchida, **Quando** o usuário solicita a análise, **Então** a aplicação
   exibe o gráfico dos pontos medidos sobre as curvas teóricas e a estimativa de `g` obtida por
   ajuste dos dados.
4. **Dado** qualquer estado da cena ou de um gráfico, **Quando** o usuário solicita a exportação de
   imagem, **Então** obtém uma imagem com os parâmetros e a fórmula ativa carimbados, utilizável
   como figura de relatório sem legenda adicional.
5. **Dado** a tabela preenchida, **Quando** o usuário limpa o caderno, **Então** a aplicação pede
   confirmação antes de descartar as medidas.

---

### História de Usuário 11 — Compartilhar um estado exato por endereço e por preset (Prioridade: P2)

A professora monta uma configuração, copia o endereço e cola no material da aula. O aluno abre o
endereço e vê exatamente a mesma cena.

**Por que esta prioridade**: é o que torna a aplicação utilizável como material didático
distribuível, e não apenas como demonstração ao vivo.

**Teste Independente**: alterar cinco parâmetros, copiar o endereço, abrir em uma nova janela e
verificar que os cinco valores foram restaurados.

**Cenários de Aceite**:

1. **Dado** qualquer configuração, **Quando** o usuário altera um parâmetro, **Então** o endereço
   compartilhável é atualizado e permanece legível, com pares nome-valor reconhecíveis.
2. **Dado** um endereço compartilhado, **Quando** ele é aberto em outro dispositivo,
   **Então** todos os parâmetros do catálogo são restaurados com exatidão, e o estado resultante é
   idêntico ao de origem.
3. **Dado** um endereço de uma versão anterior do formato, **Quando** ele é aberto,
   **Então** a aplicação restaura o que reconhece, aplica os padrões ao restante e informa que o
   estado foi migrado — sem falhar.
4. **Dado** uma configuração útil, **Quando** o usuário a salva como preset nomeado, **Então** ela
   passa a aparecer na lista de presets e pode ser renomeada, carregada e excluída.
5. **Dado** um preset do usuário, **Quando** ele é exportado como arquivo de cenário e importado de
   volta, **Então** o estado restaurado é idêntico ao original.

---

### História de Usuário 12 — Operar a aplicação inteiramente pelo teclado (Prioridade: P3)

Um usuário que não usa mouse — por deficiência motora, por preferência ou porque está projetando
para a turma — navega por todos os controles, ajusta valores com precisão e lê o estado por meio de
tecnologia assistiva.

**Por que esta prioridade**: é requisito de conformidade e de adoção em rede pública de ensino;
não altera a física, mas determina se a aplicação pode ser adotada institucionalmente.

**Teste Independente**: percorrer toda a interface apenas com Tab, setas, Home, End, Enter e Esc,
alterando ao menos cinco parâmetros e executando uma medição completa.

**Cenários de Aceite**:

1. **Dado** o foco em qualquer controle de parâmetro, **Quando** o usuário pressiona as setas,
   **Então** o valor muda em exatamente um passo; com a tecla Shift, em um décimo do passo; com
   Page Up/Page Down, em dez passos; com Home/End, vai ao mínimo/máximo.
2. **Dado** um campo numérico em edição, **Quando** o usuário pressiona Esc, **Então** o valor
   anterior válido é restaurado; **Quando** pressiona Enter, o valor é confirmado e propagado.
3. **Dado** qualquer elemento interativo, **Quando** ele recebe foco, **Então** o indicador de foco
   é claramente visível em todos os temas.
4. **Dado** um leitor de tela ativo, **Quando** o usuário navega até um controle com unidade,
   **Então** o valor é anunciado com a unidade por extenso (por exemplo, "10,0 graus"), e não como
   número solto.
5. **Dado** um leitor de tela ativo, **Quando** um valor calculado muda de forma relevante (período,
   erro, modo), **Então** a mudança é anunciada de forma não intrusiva.
6. **Dado** o sistema configurado para reduzir movimento, **Quando** a aplicação carrega,
   **Então** ela inicia pausada, sem animações decorativas, mantendo a simulação disponível sob
   comando explícito.

---

### História de Usuário 13 — Ler energia, vetores e gráficos do movimento (Prioridade: P3)

O usuário liga vetores de velocidade, aceleração e forças, acompanha as barras de energia e os
gráficos temporais, e relaciona o que vê na cena com o que vê nos gráficos.

**Por que esta prioridade**: é paridade com a simulação de referência e sustenta um objetivo de
aprendizagem inteiro (conservação de energia), mas não é o diferencial do produto.

**Teste Independente**: ativar o painel de energia sem atrito e verificar que a energia total
permanece constante enquanto cinética e potencial se alternam.

**Cenários de Aceite**:

1. **Dado** o modo conservativo, **Quando** a simulação roda por dez minutos simulados,
   **Então** a energia total exibida permanece constante dentro da precisão declarada, sem deriva
   visível no gráfico.
2. **Dado** o atrito ativado, **Quando** a simulação roda, **Então** surge a parcela de energia
   térmica, a soma das parcelas continua constante e a amplitude decai.
3. **Dado** os vetores ativados, **Quando** o pêndulo passa pelo ponto mais baixo, **Então** o
   vetor velocidade é máximo e tangente, e a aceleração aponta para o ponto de suspensão.
4. **Dado** a decomposição da aceleração ativada, **Quando** o pêndulo está em um extremo,
   **Então** a componente centrípeta é nula e a tangencial é máxima.
5. **Dado** o gráfico do espaço de fase ativado, **Quando** o movimento é conservativo, **Então** a
   órbita é fechada; com atrito, é uma espiral que converge para a origem.

---

### História de Usuário 14 — Explorar atrito, forçamento e escolhas numéricas (Prioridade: P3)

O usuário avançado altera o modelo de atrito, liga um forçamento externo, troca o método de cálculo
do movimento e observa as consequências.

**Por que esta prioridade**: atende ao pedido de "as mais variadas modificações possíveis" e ao
público autodidata, mas nada aqui é pré-requisito das histórias P1.

**Teste Independente**: ativar amortecimento moderado e verificar que a amplitude decai
exponencialmente e que a leitura de período muda para o período amortecido.

**Cenários de Aceite**:

1. **Dado** o seletor de modelo de atrito, **Quando** o usuário escolhe entre ausência de atrito,
   amortecimento viscoso linear e arrasto quadrático, **Então** apenas os parâmetros pertinentes ao
   modelo escolhido ficam ativos, e os demais são ocultados ou desabilitados.
2. **Dado** o amortecimento tão forte que não há oscilação, **Quando** o usuário observa a leitura
   de período, **Então** a aplicação suprime o valor e informa que não há oscilação nesse regime.
3. **Dado** o seletor de origem do movimento, **Quando** o usuário alterna entre "gerado pela
   fórmula fechada" e "obtido por integração numérica", **Então** a cena continua coerente e a
   aplicação exibe a diferença acumulada entre as duas trajetórias.
4. **Dado** o seletor de método numérico, **Quando** o usuário escolhe um método menos estável,
   **Então** o gráfico de energia evidencia a deriva correspondente, e a aplicação identifica isso
   como artefato numérico, não como física.
5. **Dado** o forçamento externo ativado, **Quando** os parâmetros correspondem a regime caótico,
   **Então** a aplicação disponibiliza a visualização de seção de Poincaré e alerta que o conceito
   de período único deixa de se aplicar.

---

### História de Usuário 15 — Seguir um roteiro guiado (Prioridade: P3)

O usuário iniciante escolhe um roteiro ("Por que sen α ≈ α?", "Huygens e o relógio", "Descubra g")
e é conduzido por passos curtos, cada um com uma pergunta e uma configuração aplicada
automaticamente.

**Por que esta prioridade**: reduz o custo de adoção por quem abre a aplicação sem contexto, mas
depende de todas as capacidades anteriores existirem.

**Teste Independente**: iniciar um roteiro e percorrê-lo até o fim, verificando que cada passo
aplica a configuração descrita e valida a resposta esperada.

**Cenários de Aceite**:

1. **Dado** a lista de roteiros, **Quando** o usuário inicia um deles, **Então** a configuração do
   primeiro passo é aplicada e o objetivo do passo é enunciado.
2. **Dado** um passo com pergunta, **Quando** o usuário responde, **Então** recebe retorno imediato
   e pode avançar, voltar ou sair do roteiro sem perder o estado anterior.
3. **Dado** um roteiro em andamento, **Quando** o usuário altera manualmente um parâmetro,
   **Então** o roteiro continua disponível e informa o desvio em relação à configuração sugerida.
4. **Dado** um roteiro concluído, **Quando** o usuário termina, **Então** recebe um resumo do que
   foi observado, com os valores que ele mesmo mediu.

---

### História de Usuário 16 — Ajustar idioma, unidades e apresentação (Prioridade: P3)

O usuário escolhe o idioma da interface, a unidade angular, o número de casas decimais e o tema
visual, adequando a aplicação ao projetor da sala ou à sua preferência.

**Por que esta prioridade**: amplia alcance e legibilidade, especialmente em projeção, mas nenhuma
capacidade central depende disso.

**Teste Independente**: alternar idioma e unidade angular e verificar que todos os rótulos,
leituras e a notação matemática acompanham a escolha.

**Cenários de Aceite**:

1. **Dado** o idioma português do Brasil, **Quando** a fórmula é exibida, **Então** a função seno é
   grafada `sen`, e o separador decimal é a vírgula em todas as leituras, inclusive dentro da
   fórmula.
2. **Dado** o seletor de unidade angular, **Quando** o usuário escolhe radianos, **Então** todos os
   campos e leituras angulares são convertidos e reexibidos, sem alterar o estado físico.
3. **Dado** o seletor de casas decimais, **Quando** o usuário escolhe seis casas, **Então** todas as
   leituras numéricas passam a exibir seis casas, sem alterar a precisão interna dos cálculos.
4. **Dado** o tema de alto contraste, **Quando** ele é ativado, **Então** cena, gráficos, fórmula e
   painéis adotam a paleta correspondente, mantendo legibilidade em projetor.
5. **Dado** a paleta segura para daltonismo ativada, **Quando** há mais de um pêndulo ou mais de
   uma curva, **Então** cada um é distinguível também por traço e marcador, e não apenas por cor.

---

### Casos de Borda

- O que acontece quando a amplitude tende a 180° no modo simples? A série satura em `89/64` para
  `N = 2` enquanto o período exato diverge; a aplicação trava o valor em 179,9° e explica o
  equilíbrio instável.
- O que acontece quando o usuário pede o modo cicloidal com amplitude maior que 90°? É
  geometricamente impossível (`s = L·sen θ`, `|s| ≤ L`); a aplicação limita a amplitude e explica
  a razão, sem tratar como erro do usuário.
- O que acontece com `g = 0`? Não há força restauradora e o período tende a infinito; o valor
  mínimo é limitado e a leitura de período é suprimida com explicação.
- O que acontece com `g` negativo? O equilíbrio se inverte; a entrada é rejeitada.
- O que acontece com comprimento ou massa tendendo a zero? Ambos são limitados por valores mínimos;
  a massa não afeta o período, e a aplicação deve deixar isso explícito em vez de esconder o
  parâmetro.
- O que acontece quando o usuário digita texto não numérico em um campo numérico? O campo sinaliza
  invalidez sem apagar o que foi digitado, e o valor anterior é preservado até uma entrada válida.
- O que acontece quando o usuário digita um valor fora da faixa e confirma? O valor é limitado ao
  extremo mais próximo, o campo é reescrito com o valor efetivo e a limitação é comunicada.
- O que acontece quando o usuário escreve, no console, um parâmetro que não existe ou uma unidade
  incompatível? A linha é reportada com posição e motivo, e as demais linhas do lote são aplicadas.
- O que acontece quando o número de termos é zero? A fórmula se reduz exatamente à aproximação de
  pequenos ângulos — comportamento esperado e verificável, não caso de erro.
- O que acontece com amplitudes onde a série precisaria de centenas de termos (acima de ~150°)?
  A aplicação informa a inviabilidade prática da série e mantém o valor exato de referência.
- O que acontece quando o amortecimento é tão grande que não há oscilação? A leitura de período é
  suprimida e o regime é rotulado.
- O que acontece se a simulação ficar aberta por horas? Os buffers de séries temporais são
  limitados e o mais antigo é descartado, sem degradar a taxa de quadros nem a conservação de
  energia exibida.
- O que acontece quando a janela é redimensionada, o painel é recolhido ou a aplicação é projetada
  em resolução muito diferente? O desenho se reajusta sem distorcer proporções nem escalas de
  medida.
- O que acontece quando dois usuários abrem o mesmo endereço compartilhado em máquinas diferentes?
  Ambos veem o mesmo estado inicial e a mesma trajetória para os mesmos parâmetros.
- O que acontece se o arquivo for aberto sem conexão de internet? Todas as funcionalidades
  permanecem disponíveis; nada é buscado na rede.
- O que acontece quando a taxa de quadros do dispositivo é 30, 60, 120 ou 144 por segundo? A
  trajetória simulada e os valores medidos são os mesmos; apenas a suavidade visual muda.
- O que acontece quando o usuário pede exportação de vídeo em um navegador que não suporta o
  recurso? A opção não é oferecida, em vez de falhar após o clique.
- O que acontece com o desafio de gravidade oculta quando o usuário exporta dados ou compartilha o
  endereço? O valor oculto não vaza por nenhum desses caminhos.

---

## Requisitos *(obrigatória)*

### Requisitos Funcionais

#### Área A — Motor de fórmula e período

- **RF-001**: O sistema DEVE calcular o período do pêndulo pela fórmula-motor
  `T = 2π·√(L/g) · Σ_{n=0..N} a_n · sen^{2n}(α/2)`, com coeficientes `a_n = [C(2n,n)/4^n]²`,
  cujos seis primeiros valores são `1`, `1/4`, `9/64`, `25/256`, `1225/16384` e `3969/65536`.
- **RF-002**: O sistema DEVE adotar `N = 2` como padrão, reproduzindo exatamente a fórmula entregue
  pelo usuário: `T = 2π√(L/g)·(1 + ¼·sen²(α/2) + (9/64)·sen⁴(α/2))`.
- **RF-003**: Os usuários DEVEM poder ajustar o número de termos `N` entre 0 e 50.
- **RF-004**: Com `N = 0`, o sistema DEVE produzir resultado idêntico à aproximação de pequenos
  ângulos `T₀ = 2π√(L/g)`.
- **RF-005**: O sistema DEVE disponibilizar um valor de período **exato** de referência, válido
  para toda amplitude até 179,9°, contra o qual todas as aproximações são comparadas.
- **RF-006**: O sistema DEVE exibir o erro de cada modelo de período em relação ao valor exato,
  tanto em porcentagem quanto em unidades de tempo.
- **RF-007**: O sistema DEVE exibir o **sinal** do erro, evidenciando que toda truncagem da série
  subestima o período.
- **RF-008**: O sistema DEVE evidenciar que, com `N = 2`, a razão `T/T₀` satura no valor exato
  `89/64 = 1,390625` quando a amplitude tende a 180°, enquanto o período real diverge.
- **RF-009**: O sistema DEVE informar quantos termos seriam necessários para atingir erro abaixo de
  0,1 % e de 0,01 % na amplitude corrente.
- **RF-010**: O sistema DEVE oferecer, como modelos de período selecionáveis e sobreponíveis:
  pequenos ângulos (`T₀`), série truncada em `N`, valor exato, e as aproximações de forma fechada
  Kidd–Fogg `T₀/√(cos(α/2))`, Lima–Arun `−T₀·ln(c)/(1−c)` com `c = cos(α/2)`, e a aproximação de
  duas iterações `4T₀/(1+√c)²`.
- **RF-011**: O sistema NÃO DEVE apresentar aproximações de período cuja fórmula não esteja
  verificada em fonte bibliográfica citada na própria aplicação.
- **RF-012**: O sistema DEVE adotar em toda a aplicação a convenção única `k = sen(α/2)`, sem
  alternar entre módulo e parâmetro elíptico.
- **RF-013**: O sistema DEVE classificar visualmente a confiança da série truncada corrente em
  quatro faixas, com limiares em 0,1 %, 1 % e 5 % de erro — que, para `N = 2`, ocorrem em
  54,373°, 81,603° e 110,164°.
- **RF-014**: O sistema DEVE exibir permanentemente `T₀ = 2π√(L/g)` como valor de referência, junto
  ao período do modelo corrente.
- **RF-015**: O sistema DEVE exibir as grandezas derivadas do período: frequência, frequência
  angular e razão `T/T₀`.
- **RF-016**: O sistema DEVE permitir constatar que o período independe da massa, mantendo o
  parâmetro de massa visível e editável mesmo sem efeito sobre o período.
- **RF-017**: O sistema DEVE exibir a tabela comparativa período simples × período cicloidal ×
  diferença absoluta × diferença percentual para um conjunto de amplitudes.
- **RF-018**: O sistema DEVE apresentar a série de Taylor do seno em torno de zero e o erro da
  aproximação `sen α ≈ α`, indicando os valores de referência do roteiro original: 0,5 % em 10° e
  2 % em 20°.
- **RF-019**: O sistema DEVE exibir os coeficientes da série em forma fracionária exata e explicar
  sua origem, incluindo a relação de recorrência `a_n = a_{n−1}·((2n−1)/(2n))²`.
- **RF-020**: O sistema DEVE distinguir claramente, na interface, o desvio devido à amplitude do
  desvio devido a qualquer outra correção ativada (comprimento efetivo, dilatação térmica,
  variação de `g`).

#### Área B — Modos: simples, cicloidal e comparação

- **RF-021**: O sistema DEVE oferecer três modos: **pêndulo simples**, **pêndulo cicloidal** e
  **comparação lado a lado**.
- **RF-022**: No modo simples, o sistema DEVE manter ativos todos os termos de correção da série.
- **RF-023**: No modo cicloidal, o sistema DEVE anular identicamente todos os termos com `n ≥ 1` e
  exibir `T = 2π√(L/g)` exato para qualquer amplitude admissível.
- **RF-024**: Ao alternar entre modos, o sistema DEVE apresentar a transição na **mesma** expressão
  da fórmula, com os termos sendo apagados ou reacendidos, e NÃO DEVE substituir a expressão por
  outra diferente.
- **RF-025**: No modo cicloidal, o sistema DEVE limitar a amplitude a 90° e explicar que a restrição
  é geométrica, decorrente de `s = L·sen θ` com `|s| ≤ L`; ao entrar no modo com amplitude maior, o
  valor DEVE ser ajustado e a mudança comunicada.
- **RF-026**: No modo cicloidal, o sistema DEVE desenhar as faces cicloidais, o trecho enrolado do
  fio, o trecho livre, o ponto de contato e a trajetória da massa, mantendo a coerência geométrica
  de que ambas as curvas são cicloides congruentes de raio gerador `r = L/4`.
- **RF-027**: No modo cicloidal, o sistema DEVE exibir o comprimento do trecho livre do fio como
  `L·cos θ` e evidenciar seu encurtamento com o aumento do ângulo.
- **RF-028**: No modo cicloidal, o sistema DEVE permitir soltar de 1 a 8 massas de posições
  iniciais distintas, simultaneamente, para demonstrar a tautocronia.
- **RF-029**: O sistema DEVE manter o vínculo `L = 4r` no modo cicloidal: editar um dos dois DEVE
  atualizar o outro, e a relação DEVE estar visível na interface.
- **RF-030**: No modo comparação, o sistema DEVE simular um pêndulo simples e um cicloidal com os
  mesmos `L`, `g` e amplitude, iniciados no mesmo instante, e exibir a defasagem acumulada entre
  eles em tempo e em número de oscilações.
- **RF-031**: Ao alternar de modo, o sistema DEVE preservar todos os parâmetros compatíveis e
  informar quais foram ajustados por incompatibilidade.
- **RF-032**: O sistema DEVE oferecer, como recursos opcionais do modo cicloidal, a exibição do
  círculo osculador / centros de curvatura e a animação do círculo gerador rolante que descreve a
  cicloide.
- **RF-033**: O sistema DEVE apresentar o contexto histórico do pêndulo cicloidal — Huygens,
  *Horologium oscillatorium* (1673) — e distinguir explicitamente a propriedade **tautócrona** da
  propriedade **braquistócrona**, sem fundi-las.

#### Área C — Catálogo de parâmetros configuráveis

- **RF-034**: Todo parâmetro numérico do sistema DEVE expor: símbolo, nome em português, campo
  numérico editável, unidade, faixa válida, passo, slider acoplado e ação de restaurar o padrão.
- **RF-035**: O sistema DEVE oferecer, no mínimo, os parâmetros das Tabelas C1 a C9 abaixo, com as
  faixas, padrões e passos indicados.
- **RF-036**: O sistema DEVE separar visualmente os parâmetros de nível básico dos de nível
  avançado, mantendo os avançados acessíveis em no máximo dois passos de navegação.
- **RF-037**: O sistema DEVE exibir os parâmetros **derivados** como somente-leitura, identificados
  como tais, incluindo no mínimo: `T₀`, `T`, `T/T₀`, frequência, frequência angular, raio gerador
  no modo cicloidal, comprimento efetivo e as parcelas de energia.
- **RF-038**: Os usuários DEVEM poder escolher a unidade de entrada e exibição angular entre grau,
  radiano, fração de π e grado, com conversão imediata e sem alteração do estado físico.
- **RF-039**: Os usuários DEVEM poder escolher o número de casas decimais exibidas, entre 0 e 8,
  sem que isso altere a precisão interna dos cálculos.
- **RF-040**: Para parâmetros de faixa muito ampla, o slider DEVE ter resolução útil em toda a
  faixa, sem que a maior parte do curso corresponda a valores sem interesse físico.
- **RF-041**: O sistema DEVE oferecer restauração de padrão por parâmetro individual e restauração
  global de todos os parâmetros.
- **RF-042**: O sistema DEVE oferecer presets de gravidade por corpo celeste, no mínimo:
  Lua 1,62; Terra 9,81; Júpiter 24,79; e um valor personalizado.
- **RF-043**: O sistema DEVE oferecer o desafio "Planeta X", em que o valor de `g` é ocultado da
  interface, das leituras derivadas, da exportação e do endereço compartilhável até que o usuário
  submeta sua estimativa.
- **RF-044**: O sistema PODE ajustar `g` por latitude e altitude, e, se o fizer, DEVE usar a
  fórmula internacional da gravidade `g(φ) = 9,780327·(1 + 0,0053024·sen²φ − 0,0000058·sen²(2φ))`
  e a correção de ar livre de −3,086×10⁻⁶ s⁻² por metro, citando a fonte.
- **RF-045**: O sistema PODE modelar a dilatação térmica do fio por `T(Θ) = T₀·√(1 + λ·ΔΘ)` e, se o
  fizer, DEVE exibir o desvio acumulado por dia, para permitir a comparação histórica entre
  materiais.
- **RF-046**: O sistema PODE modelar o comprimento efetivo de um pêndulo físico com massa esférica
  e, se o fizer, DEVE exibir `L_ef` como grandeza derivada, distinta de `L`.

##### Tabela C1 — Geometria do pêndulo simples

| ID | Símbolo | Nome | Unidade | Faixa | Padrão | Passo | Nível |
|---|---|---|---|---|---|---|---|
| P01 | `L` | Comprimento do fio | m | 0,05 – 10 | 1,000 | 0,001 | Básico |
| P02 | `α` | Amplitude angular inicial | ° (ou rad) | 0 – 179,9 (cicloidal: 0 – 90) · **espelho de θ₀** | 10,0 | 0,1 | Básico |
| P03 | `θ₀` | Ângulo inicial com sinal | ° | −179,9 – +179,9 · **canônico da largada** | +10,0 | 0,1 | Básico |
| P04 | `ω₀` | Velocidade angular inicial | rad/s | −20 – +20 | 0 | 0,01 | Avançado |
| P05 | `m` | Massa da esfera | kg | 0,01 – 10 | 1,000 | 0,01 | Básico |
| P06 | `R_b` | Raio da esfera | m | 0 – L/4 | 0 | 0,001 | Avançado |
| P07 | `MODL` | Modelo de comprimento efetivo | enum | massa pontual · fio + raio · esfera sólida | massa pontual | — | Avançado |
| P08 | `m_f` | Massa do fio | kg | 0 – 10 | 0 | 0,001 | Avançado |
| P09 | `x_p, y_p` | Posição do ponto de suspensão | m | dentro do palco | (0; 0) | 0,01 | Avançado |
| P10 | `n_p` | Número de pêndulos simultâneos | — | 1 – 8 | 1 | 1 | Básico (até 2) / Avançado (até 8) |

##### Tabela C2 — Geometria cicloidal (modo Huygens)

| ID | Símbolo | Nome | Unidade | Faixa | Padrão | Passo | Nível |
|---|---|---|---|---|---|---|---|
| P11 | `r` | Raio do círculo gerador | m | 0,0125 – 2,5 | 0,250 | 0,001 | Básico |
| P12 | `VINC` | Vínculo `L = 4r` | booleano | travado · destravado | travado | — | Básico |
| P13 | `φ` | Fase paramétrica da cicloide | rad | 0 – 2π | — | 0,01 | Avançado |
| P14 | `s₀` | Deslocamento inicial ao longo do arco | m | 0 – L | 0,5 | 0,01 | Básico |
| P15 | `h₀` | Altura inicial de largada | m | 0 – 2r · **espelho de θ₀** | — | 0,001 | Avançado |
| P16 | `ARC` | Abertura angular do arco desenhado | ° | 0 – 360 | 360 | 1 | Avançado |
| P17 | `e_f` | Espessura das faces cicloidais | mm | 0 – 20 | 2,0 | 0,5 | Avançado |
| P18 | `n_m` | Massas na demonstração de tautocronia | — | 1 – 8 | 2 | 1 | Básico |
| P19 | `EVO` | Exibir a curva de enrolamento (evoluta) | booleano | — | ligado | — | Básico |
| P20 | `INV` | Exibir a trajetória da massa (involuta) | booleano | — | ligado | — | Básico |
| P21 | `OSC` | Círculo osculador / centros de curvatura | booleano | — | desligado | — | Avançado |
| P22 | `GEN` | Círculo gerador rolante animado | booleano | — | desligado | — | Avançado |

##### Tabela C3 — Ambiente e dinâmica

| ID | Símbolo | Nome | Unidade | Faixa | Padrão | Passo | Nível |
|---|---|---|---|---|---|---|---|
| P23 | `g` | Aceleração da gravidade | m/s² | 0,01 – 300 | 9,81 | 0,01 | Básico |
| P24 | `BODY` | Corpo celeste (preset de `g`) | enum | Lua · Terra · Júpiter · Planeta X · Personalizado | Terra | — | Básico |
| P25 | `lat` | Latitude | ° | 0 – 90 | 45,0 | 0,1 | Avançado |
| P26 | `alt` | Altitude | m | 0 – 10 000 | 0 | 1 | Avançado |
| P27 | `MODF` | Modelo de atrito | enum | nenhum · viscoso linear · quadrático · atrito no pivô | nenhum | — | Básico |
| P28 | `ζ` | Amortecimento adimensional | — | 0 – 0,3 | 0 | fino perto de 0 | Básico |
| P29 | `b` | Coeficiente de amortecimento viscoso | kg/s | 0 – 10 | 0 | 0,001 | Avançado |
| P30 | `c_q` | Coeficiente de arrasto quadrático | s | 0 – 2 | 0 | fino perto de 0 | Básico |
| P31 | `Q` | Fator de qualidade (leitura acoplada) | — | 1 – 100 000 | — | 1 | Avançado |
| P32 | `ρ` | Densidade do ar | kg/m³ | 0 – 20 | 1,225 | 0,001 | Avançado |
| P33 | `C_d` | Coeficiente de arrasto | — | 0 – 2 | 0,47 | 0,01 | Avançado |
| P34 | `EMP` | Empuxo do ar | booleano | — | desligado | — | Avançado |
| P35 | `A_d` | Amplitude do forçamento externo | s⁻² | 0 – 5·(g/L) | 0 | 0,01 | Avançado |
| P36 | `ω_d` | Frequência angular do forçamento | rad/s | 0 – 5·ω₀ | ω₀ | 0,01 | Avançado |
| P37 | `ϕ_d` | Fase inicial do forçamento | rad | 0 – 2π | 0 | 0,01 | Avançado |
| P38 | `PIVO` | Movimento do ponto de suspensão | enum | fixo · oscilante vertical · oscilante horizontal | fixo | — | Avançado |
| P39 | `λ_t` | Coeficiente de dilatação térmica do fio | 1/K | 0 – 5×10⁻⁵ | 1,2×10⁻⁵ | 1×10⁻⁷ | Avançado |
| P40 | `Θ` | Temperatura | °C | −50 – +150 | 20,0 | 0,5 | Avançado |

##### Tabela C4 — Modelo matemático e numérico

| ID | Símbolo | Nome | Unidade | Faixa | Padrão | Passo | Nível |
|---|---|---|---|---|---|---|---|
| P41 | `MODO` | Modo do pêndulo | enum | simples · cicloidal · comparação | simples | — | Básico |
| P42 | `N` | Número de termos da série | — | 0 – 50 | **2** | 1 | Básico |
| P43 | `MOD` | Modelos de período exibidos | múltipla escolha | `T₀` · série(`N`) · exato · Kidd–Fogg · Lima–Arun · duas iterações | `T₀` + série(2) + exato | — | Básico |
| P44 | `FONTE` | Origem do movimento animado | enum | fórmula fechada · integração numérica | fórmula fechada | — | Básico |
| P45 | `INTEG` | Método numérico | enum | conservativo simplético · alta ordem · simples · elementar | conservativo simplético | — | Avançado |
| P46 | `Δt` | Passo de tempo do cálculo | s | 1×10⁻⁵ – 0,02 | 1/240 | 1×10⁻⁵ | Avançado |
| P47 | `n_sub` | Subdivisões por quadro | — | 1 – 64 | 4 | 1 | Avançado |
| P48 | `tol` | Tolerância do método adaptativo | — | 1×10⁻¹² – 1×10⁻⁴ | 1×10⁻⁹ | ×10 | Avançado |
| P49 | `n_ref` | Iterações do cálculo do valor exato | — | 3 – 20 | 8 | 1 | Avançado |
| P50 | `UNI_A` | Unidade angular | enum | grau · radiano · fração de π · grado | grau | — | Básico |
| P51 | `dec` | Casas decimais exibidas | — | 0 – 8 | 4 | 1 | Básico |
| P52 | `SEED` | Semente do ruído de medição | inteiro | 0 – 2 147 483 647 | 0 | 1 | Avançado |

##### Tabela C5 — Visualização da cena

| ID | Símbolo | Nome | Unidade | Faixa | Padrão | Passo | Nível |
|---|---|---|---|---|---|---|---|
| P53 | `zoom` | Zoom do palco | × | 0,2 – 5 | 1,00 | 0,05 | Básico |
| P54 | `TRAN` | Transferidor | booleano | — | ligado | — | Básico |
| P55 | `REG` | Régua | booleano | — | desligado | — | Básico |
| P56 | `VERT` | Linha vertical de referência | booleano | — | ligado | — | Básico |
| P57 | `ARCO` | Arco de amplitude | booleano | — | ligado | — | Básico |
| P58 | `RAST` | Rastro da massa | booleano | — | ligado | — | Básico |
| P59 | `t_r` | Duração do rastro | s | 0 – 60 | 4,0 | 0,1 | Avançado |
| P60 | `PT` | Rastro de período | booleano | — | desligado | — | Básico |
| P61 | `VEL` | Vetor velocidade | booleano | — | desligado | — | Básico |
| P62 | `ACE` | Vetor aceleração | booleano | — | desligado | — | Básico |
| P63 | `DECOMP` | Decompor aceleração (tangencial/centrípeta) | booleano | — | desligado | — | Avançado |
| P64 | `FOR` | Vetores de força (peso, tração, arrasto, resultante) | múltipla escolha | — | nenhum | — | Avançado |
| P65 | `k_v` | Escala dos vetores | × | 0,1 – 5 | 1,0 | 0,1 | Avançado |
| P66 | `ESTR` | Estroboscópio | booleano | — | desligado | — | Avançado |
| P67 | `Δt_e` | Intervalo do estroboscópio | s | 0,01 – 2 | 0,10 | 0,01 | Avançado |
| P68 | `n_e` | Número de imagens do estroboscópio | — | 1 – 60 | 12 | 1 | Avançado |
| P69 | `TEMA` | Tema visual | enum | claro · escuro · alto contraste | claro | — | Básico |
| P70 | `COR_i` | Cor de cada pêndulo | cor | paleta | automática | — | Básico |
| P71 | `GRID` | Grade métrica de fundo e espaçamento | booleano + m | 0,05 – 5 | desligada / 0,25 | 0,05 | Avançado |
| P72 | `FORM` | Painel da fórmula | booleano | — | **ligado** | — | Básico |
| P73 | `n_h` | Termo destacado da série | inteiro | 0 – N | — | 1 | Avançado |
| P74 | `FANT` | Pêndulo de referência com `T₀` | booleano | — | desligado | — | Avançado |

##### Tabela C6 — Gráficos e medição

| ID | Símbolo | Nome | Unidade | Faixa | Padrão | Passo | Nível |
|---|---|---|---|---|---|---|---|
| P75 | `GR_T` | Gráficos temporais `θ(t)`, `ω(t)`, `a(t)` | múltipla escolha | — | `θ(t)` | — | Básico |
| P76 | `GR_F` | Espaço de fase `θ × ω` | booleano | — | desligado | — | Avançado |
| P77 | `GR_P` | Seção de Poincaré | booleano | — | desligado | — | Avançado |
| P78 | `GR_E` | Barras de energia | booleano | — | ligado | — | Básico |
| P79 | `GR_Ta` | Curva `T(α)` | booleano | — | **ligada** | — | Básico |
| P80 | `GR_err` | Gráfico de erro relativo | booleano + escala | linear · logarítmica | ligado / logarítmica | — | Básico |
| P81 | `EIXO` | Eixos do gráfico escolhíveis | enum × 2 | qualquer grandeza exposta | `t × θ` | — | Avançado |
| P82 | `FOTO` | Fotoporta | booleano | — | ligada | — | Básico |
| P83 | `θ_g` | Posição angular da fotoporta | ° | −90 – +90 | 0,0 | 0,1 | Avançado |
| P84 | `MODT` | Modo de contagem da fotoporta | enum | meio período · período completo | período completo | — | Básico |
| P85 | `CRON` | Cronômetro manual | booleano | — | desligado | — | Básico |
| P86 | `n_T` | Períodos a cronometrar | — | 1 – 100 | 10 | 1 | Avançado |
| P87 | `σ_m` | Ruído de medição simulado | ms | 0 – 100 | 0 | 0,1 | Avançado |
| P88 | `TAB` | Caderno de laboratório (tabela de medidas) | booleano | — | desligado | — | Básico |
| P89 | `FFT` | Espectro de potência | booleano | — | desligado | — | Avançado |

##### Tabela C7 — Animação e tempo

| ID | Símbolo | Nome | Unidade | Faixa | Padrão | Passo | Nível |
|---|---|---|---|---|---|---|---|
| P90 | `PLAY` | Reproduzir · pausar · passo a passo · parar | ação | — | pausado | — | Básico |
| P91 | `k_t` | Fator de velocidade da animação | × | 0,02 – 4 | 1,00 | 0,01 | Básico |
| P92 | `fps` | Taxa de quadros alvo | quadros/s | 30 · 60 · 120 | 60 | — | Avançado |
| P93 | `t` | Tempo de simulação (leitura + zerar) | s | ≥ 0 | 0 | — | Básico |
| P94 | `REV` | Reverter o tempo (somente sem atrito) | booleano | — | desligado | — | Avançado |
| P95 | `LOOP` | Parar automaticamente após `n` períodos | inteiro | 0 – 100 | 0 (desligado) | 1 | Avançado |

##### Tabela C8 — Entrada, saída e presets

| ID | Símbolo | Nome | Tipo | Padrão | Nível |
|---|---|---|---|---|---|
| P96 | `CONS` | Console de parâmetros em texto | painel | ligado | Básico |
| P97 | `PRESET` | Presets nomeados do usuário (salvar, carregar, renomear, excluir) | lista | — | Básico |
| P98 | `FAB` | Presets de fábrica | enum | ver RF-097 | Básico |
| P99 | `URL` | Endereço compartilhável com o estado | ação | — | Básico |
| P100 | `CSV` | Exportar tabela de medidas | ação | — | Básico |
| P101 | `IMG` | Exportar imagem da cena ou do gráfico | ação | — | Básico |
| P102 | `VID` | Exportar animação em vídeo | ação | — | Avançado |
| P103 | `CEN` | Importar / exportar arquivo de cenário | ação | — | Avançado |
| P104 | `PX` | Desafio "Planeta X" (gravidade oculta) | booleano | desligado | Básico |
| P105 | `ROT` | Roteiros guiados | lista | — | Avançado |

##### Tabela C9 — Idioma e acessibilidade

| ID | Símbolo | Nome | Tipo | Padrão | Nível |
|---|---|---|---|---|---|
| P106 | `LANG` | Idioma da interface | enum | português do Brasil | Básico |
| P107 | `FS` | Tamanho de fonte / densidade da interface | enum | normal | Avançado |
| P108 | `DALT` | Paleta segura para daltonismo | booleano | desligada | Avançado |
| P109 | `SOM` | Sonificação do movimento | booleano | desligada | Avançado |
| P110 | `KBD` | Operação completa por teclado | booleano | ligada (não desativável) | Básico |
| P111 | `SR` | Descrições para leitor de tela | booleano | ligadas | Básico |
| P112 | `MOV` | Reduzir movimento | booleano | automático (segue o sistema) | Básico |

> Faixas, padrões e passos das Tabelas C1–C9 são **propostas de design** desta especificação,
> exceto onde derivam de restrição física verificada (`α ≤ 90°` no modo cicloidal; `L = 4r`;
> `N = 2` como padrão; limites que evitam divisão por zero). Devem ser ratificados no plano.

#### Área D — Entrada de valores, validação e console

- **RF-047**: Os usuários DEVEM poder definir qualquer parâmetro numérico **digitando** o valor,
  sem depender do slider.
- **RF-048**: O sistema DEVE aceitar tanto vírgula quanto ponto como separador decimal em todos os
  campos numéricos.
- **RF-049**: O sistema DEVE aceitar unidade escrita junto ao valor e converter automaticamente
  (por exemplo, `100 cm` para o comprimento, `0,5 rad` para o ângulo).
- **RF-050**: O sistema DEVE aceitar expressões numéricas simples nos campos, incluindo o uso de π
  e das quatro operações, e NÃO DEVE executar conteúdo arbitrário fornecido pelo usuário.
- **RF-051**: O sistema NÃO DEVE limitar o valor à faixa **enquanto** o usuário digita; a limitação
  DEVE ocorrer apenas na confirmação (perda de foco, tecla Enter ou equivalente).
- **RF-052**: Ao confirmar, o sistema DEVE limitar o valor à faixa, ajustá-lo ao passo, reescrever o
  campo com o valor efetivo e comunicar qualquer ajuste aplicado.
- **RF-053**: Durante a digitação de um valor inválido, o sistema DEVE sinalizar a invalidez sem
  apagar o texto digitado e sem propagar o valor.
- **RF-054**: O sistema DEVE permitir cancelar a edição de um campo, restaurando o último valor
  válido.
- **RF-055**: O sistema DEVE oferecer um console de parâmetros em texto que aceite uma atribuição
  por linha, no formato `chave = valor [unidade]`, com linhas de comentário e linhas em branco
  ignoradas.
- **RF-056**: O console DEVE aceitar aliases em caracteres latinos para todo símbolo grego,
  incluindo obrigatoriamente `a`, `alpha` e `α` para a amplitude, de modo que `a = 10` funcione
  exatamente como o usuário descreveu.
- **RF-057**: Uma linha inválida no console NÃO DEVE impedir a aplicação das demais; o sistema DEVE
  reportar a linha, a posição e o motivo de cada rejeição.
- **RF-058**: O sistema DEVE produzir, sob demanda, um bloco de texto no mesmo formato aceito pelo
  console, representando o estado corrente completo.
- **RF-059**: Todas as formas de entrada — campo, slider, console, endereço compartilhável, preset e
  manipulação direta na cena — DEVEM refletir o mesmo estado, sem divergência entre elas.
- **RF-060**: Os usuários DEVEM poder definir a amplitude arrastando a massa na cena, com o valor
  correspondente atualizado nos campos.
- **RF-061**: O sistema DEVE oferecer desfazer e refazer para alterações de parâmetros, agrupando
  um arrasto contínuo em uma única entrada de histórico, e NÃO DEVE rebobinar a simulação ao
  desfazer.
- **RF-062**: O sistema DEVE anunciar textualmente a ação desfeita ou refeita, indicando o
  parâmetro e os valores anterior e novo.

#### Área E — Cena animada e painel da fórmula

- **RF-063**: O sistema DEVE animar o pêndulo continuamente, com controles de reproduzir, pausar,
  avançar um passo, parar e zerar o tempo.
- **RF-064**: O sistema DEVE permitir escolher se o movimento animado é gerado pela **fórmula
  fechada** ou por **integração numérica**, e DEVE exibir a diferença acumulada entre as duas
  quando solicitado.
- **RF-065**: O sistema DEVE exibir a fórmula em notação matemática legível, com a função seno
  grafada `sen` em português.
- **RF-066**: O painel da fórmula DEVE exibir, para cada termo, o coeficiente exato, o valor
  numérico corrente do termo e sua contribuição relativa ao total.
- **RF-067**: O painel da fórmula DEVE atualizar os valores numéricos continuamente durante a
  simulação, sem que a expressão "salte" ou mude de tamanho a cada atualização.
- **RF-068**: O sistema DEVE permitir destacar um termo individual da série, realçando
  simultaneamente sua contribuição no gráfico correspondente.
- **RF-069**: O sistema DEVE exibir a substituição numérica passo a passo — dos parâmetros ao
  resultado — para o período do modelo corrente.
- **RF-070**: O sistema DEVE desenhar, no modo simples, o fio, a massa, o pivô, a vertical de
  referência e o arco de amplitude.
- **RF-071**: O sistema DEVE oferecer rastro da massa, com duração ajustável, e rastro de período.
- **RF-072**: O sistema DEVE oferecer vetores de velocidade e de aceleração, e opcionalmente a
  decomposição tangencial e centrípeta da aceleração.
- **RF-073**: O sistema DEVE oferecer vetores de força — peso, tração, arrasto e resultante — com
  legenda e escala ajustável, e a leitura numérica da tração no fio.
- **RF-074**: O sistema DEVE oferecer visualização estroboscópica com intervalo e número de imagens
  ajustáveis.
- **RF-075**: O sistema DEVE oferecer um pêndulo de referência translúcido oscilando com `T₀`, para
  tornar visível a defasagem acumulada.
- **RF-076**: O sistema DEVE suportar até 8 pêndulos simultâneos, distinguíveis por cor **e** por
  traço, com parâmetros independentes.
- **RF-077**: O sistema DEVE oferecer zoom e grade métrica opcional, mantendo a proporção correta
  entre a cena e os instrumentos de medida.

#### Área F — Gráficos

- **RF-078**: O sistema DEVE oferecer gráficos temporais de ângulo, velocidade angular e aceleração
  angular.
- **RF-079**: O sistema DEVE oferecer o gráfico do espaço de fase (ângulo × velocidade angular).
- **RF-080**: O sistema DEVE oferecer o gráfico de energia com as parcelas cinética, potencial,
  térmica (quando houver atrito) e total.
- **RF-081**: O sistema DEVE oferecer a curva `T(α)` com, no mínimo, três séries sobrepostas: `T₀`,
  série truncada em `N` e valor exato.
- **RF-082**: O sistema DEVE oferecer o gráfico de erro relativo de cada modelo em relação ao valor
  exato, com opção de escala logarítmica.
- **RF-083**: Todos os gráficos DEVEM oferecer leitura de valores no ponto apontado, com legenda
  identificando cada série.
- **RF-084**: O sistema DEVE marcar, nos gráficos, o valor corrente dos parâmetros, de modo que
  alterar um parâmetro mova o marcador correspondente.
- **RF-085**: O sistema PODE permitir escolher as grandezas dos eixos de um gráfico genérico.
- **RF-086**: O sistema PODE oferecer seção de Poincaré e espectro de potência, e, quando o
  forçamento externo estiver ativo, DEVE informar que a noção de período único deixa de se aplicar.
- **RF-087**: O sistema DEVE limitar a quantidade de dados retidos nos gráficos, descartando os
  mais antigos, sem degradar a fluidez da animação.

#### Área G — Ferramentas de medição

- **RF-088**: O sistema DEVE oferecer um transferidor sobre o ponto de suspensão, com escala em
  graus.
- **RF-089**: O sistema DEVE oferecer uma régua reposicionável, com escala métrica coerente com a
  cena.
- **RF-090**: O sistema DEVE oferecer um cronômetro manual com iniciar, parar e zerar.
- **RF-091**: O sistema DEVE oferecer uma fotoporta posicionável ao longo do arco, que registra as
  passagens da massa.
- **RF-092**: A fotoporta DEVE oferecer modo de **meio período** e de **período completo**, e DEVE
  identificar explicitamente qual grandeza está sendo exibida.
- **RF-093**: O sistema DEVE permitir cronometrar `n` períodos consecutivos e exibir o período médio
  resultante.
- **RF-094**: O sistema PODE aplicar ruído de medição simulado, com semente reprodutível, e, se o
  fizer, DEVE exibir média e dispersão das medições registradas.
- **RF-095**: O sistema DEVE comparar cada período medido com o período teórico da série e com o
  valor exato, exibindo os erros correspondentes.
- **RF-096**: As leituras dos instrumentos DEVEM ser consistentes entre si dentro da precisão
  declarada, para o mesmo estado.

#### Área H — Presets, roteiros e caderno de laboratório

- **RF-097**: O sistema DEVE oferecer presets de fábrica cobrindo, no mínimo: pequenas oscilações
  (`α = 5°`), regime anarmônico (`α = 90°`), experimento do roteiro alemão (`L = 1 m`, fotoporta em
  meio período), tautócrona de Huygens, presets planetários e regime amortecido.
- **RF-098**: Os usuários DEVEM poder salvar, carregar, renomear e excluir presets próprios.
- **RF-099**: Os usuários DEVEM poder exportar e importar um cenário completo como arquivo, e a
  ida-e-volta DEVE restaurar exatamente o mesmo estado.
- **RF-100**: O sistema DEVE oferecer roteiros guiados com passos curtos, cada um aplicando uma
  configuração e propondo uma pergunta.
- **RF-101**: Durante um roteiro, os usuários DEVEM poder avançar, voltar, sair e alterar
  parâmetros manualmente sem perder o progresso.
- **RF-102**: O sistema DEVE oferecer um caderno de laboratório onde cada medição registrada
  preserve amplitude, comprimento, gravidade, modo, período medido, período teórico e erro.
- **RF-103**: O sistema DEVE exibir os pontos medidos sobrepostos às curvas teóricas.
- **RF-104**: O sistema DEVE estimar `g` a partir das medições registradas e exibir a comparação com
  o valor configurado — exceto quando o desafio de gravidade oculta estiver ativo, caso em que a
  comparação só é revelada após a submissão.
- **RF-105**: O sistema DEVE pedir confirmação antes de descartar medições registradas.

#### Área I — Estado, compartilhamento e exportação

- **RF-106**: O sistema DEVE codificar o estado completo em um endereço compartilhável legível, com
  pares nome-valor reconhecíveis e uma indicação de versão do formato.
- **RF-107**: Abrir um endereço compartilhado DEVE restaurar exatamente o mesmo estado, para todos
  os parâmetros do catálogo.
- **RF-108**: Abrir um endereço de formato anterior DEVE restaurar o que for reconhecido, aplicar
  padrões ao restante e informar a migração, sem falhar.
- **RF-109**: O sistema DEVE exportar a tabela de medidas em formato de planilha compatível com
  ambiente pt-BR, sem exigir ajuste manual de separadores.
- **RF-110**: O sistema DEVE exportar imagem da cena e dos gráficos, carimbando os parâmetros e a
  fórmula ativa na própria imagem.
- **RF-111**: O sistema PODE exportar a animação em vídeo e, quando o ambiente não suportar o
  recurso, NÃO DEVE oferecer a opção.
- **RF-112**: O sistema DEVE preservar o estado corrente ao recarregar a página a partir do mesmo
  endereço.
- **RF-113**: O sistema NÃO DEVE enviar nenhum dado de uso, medição ou configuração para fora do
  dispositivo do usuário.

#### Área J — Idioma, acessibilidade e apoio ao aprendizado

- **RF-114**: A interface DEVE estar disponível em português do Brasil, com notação `sen`, separador
  decimal vírgula e terminologia física consistente.
- **RF-115**: O sistema DEVE permitir alternar o idioma da interface sem perder o estado corrente.
- **RF-116**: Todas as funcionalidades DEVEM ser operáveis exclusivamente por teclado.
- **RF-117**: Controles de valor DEVEM responder a setas (um passo), Shift+setas (passo fino),
  Page Up/Page Down (passo grosso) e Home/End (mínimo/máximo).
- **RF-118**: Todo controle com unidade DEVE anunciar seu valor com a unidade por extenso para
  tecnologias assistivas.
- **RF-119**: O sistema DEVE anunciar de forma não intrusiva as mudanças relevantes de estado
  (modo, período, faixa de confiança, erro de entrada).
- **RF-120**: O indicador de foco DEVE ser visível em todos os temas e em todos os controles.
- **RF-121**: O sistema NÃO DEVE codificar informação apenas por cor; cada série ou pêndulo DEVE ser
  distinguível também por traço, marcador ou rótulo.
- **RF-122**: O sistema DEVE respeitar a preferência de movimento reduzido do sistema operacional e
  oferecer um controle equivalente na própria interface; nesse modo DEVE iniciar pausado.
- **RF-123**: O sistema PODE oferecer sonificação do movimento e, se o fizer, DEVE tornar audível a
  simultaneidade das passagens no modo cicloidal.
- **RF-124**: O sistema DEVE oferecer explicação contextual para cada parâmetro e para cada termo da
  fórmula, acessível sem sair da tela.
- **RF-125**: O sistema DEVE citar suas fontes — as três imagens de fórmula do usuário, o roteiro
  experimental alemão, as simulações de referência e as referências bibliográficas das aproximações
  — em uma seção de créditos acessível a partir da interface.
- **RF-126**: O sistema DEVE apresentar, no primeiro uso, uma orientação curta sobre o que a
  aplicação demonstra, dispensável em um clique e não repetida automaticamente.

#### Área K — Layout de demonstração, sensor fixo e tabela de coleta

> Origem: esboço manuscrito entregue pelo usuário. Esta área fixa a **disposição vertical** da tela
> principal e o **fluxo de coleta de dados**, que são requisitos de produto e não meras sugestões
> de estilo. Ela refina — sem contradizer — as Áreas B, E e G.

**Seleção de visualização**

- **RF-127**: A tela principal DEVE apresentar, no topo, um seletor de **três visualizações**
  mutuamente exclusivas, nesta ordem: **Simples**, **Cicloidal** e **Ambos**.
- **RF-128**: A visualização **Simples** DEVE mostrar apenas a cena do pêndulo simples; a
  **Cicloidal**, apenas a cena do pêndulo cicloidal com suas faces; e **Ambos**, as duas cenas
  lado a lado, com eixo vertical e escala métrica comuns.
- **RF-129**: Na visualização **Ambos**, os dois pêndulos DEVEM compartilhar `L`, `g` e amplitude
  inicial por padrão, e o sistema DEVE permitir desacoplar cada um desses três parâmetros
  individualmente.
- **RF-130**: A troca de visualização NÃO DEVE reiniciar a simulação nem descartar as linhas já
  coletadas na tabela; o sistema DEVE preservar o tempo decorrido e o estado dinâmico dos pêndulos
  que permanecem em cena.

**Fórmula sob a cena**

- **RF-131**: Imediatamente **abaixo** da cena, o sistema DEVE exibir a fórmula correspondente à
  visualização selecionada, sempre visível sem rolagem em telas de 1366×768 ou maiores.
- **RF-132**: A fórmula exibida DEVE ser: na visualização Simples, a fórmula-motor com os termos de
  correção ativos; na Cicloidal, a mesma expressão com os termos de `n ≥ 1` visivelmente anulados,
  reduzida a `T = 2π√(L/g)`; na visualização Ambos, as duas expressões empilhadas e alinhadas pelo
  sinal de igualdade, para leitura comparativa direta.
- **RF-133**: Cada termo da fórmula exibida DEVE apresentar seu valor numérico corrente e sua
  contribuição para o período, atualizados em tempo real conforme os parâmetros mudam.

**Sensor fixo no ponto zero**

- **RF-134**: O sistema DEVE posicionar um **sensor fixo no ponto zero** — o ponto mais baixo da
  trajetória, no centro da cena, onde `θ = 0` — e este sensor NÃO DEVE ser arrastável; sua fixação
  é o que garante a comparabilidade das medições entre execuções.
- **RF-135**: No modo cicloidal, o ponto zero DEVE coincidir com a cúspide inferior da cicloide,
  ponto comum a todas as trajetórias independentemente da amplitude de solta.
- **RF-136**: O sensor DEVE registrar cada passagem da massa pelo ponto zero, com o instante da
  passagem e o sentido do movimento.
- **RF-137**: O sistema DEVE calcular o período a partir das passagens pelo sensor, adotando que o
  intervalo entre duas passagens **consecutivas** é **meio período** e que o intervalo entre duas
  passagens no **mesmo sentido** é um período completo, e DEVE exibir na interface qual das duas
  grandezas está sendo mostrada — em coerência com o roteiro experimental alemão, cuja barreira de
  luz mede meio período.
- **RF-138**: O sensor DEVE indicar visualmente cada disparo, com realce breve, e DEVE oferecer um
  indicador sonoro opcional.
- **RF-139**: Na visualização Ambos, cada cena DEVE ter seu próprio sensor no respectivo ponto zero,
  e as linhas coletadas DEVEM identificar de qual pêndulo vieram.

**Tabela de coleta de dados**

- **RF-140**: Imediatamente **abaixo da fórmula**, o sistema DEVE exibir uma **tabela de coleta de
  dados**, cujas colunas obrigatórias são o **período `T`** e a **gravidade `g`**.
- **RF-141**: A tabela DEVE conter, além de `T` e `g`, as colunas de contexto necessárias para
  tornar cada linha interpretável isoladamente: número da medição, pêndulo de origem
  (simples ou cicloidal), amplitude `α` no momento da coleta, comprimento `L`, período teórico
  correspondente e erro relativo entre medido e teórico.
- **RF-142**: A gravidade da tabela DEVE ser a **gravidade inferida a partir do período medido**,
  e não a mera repetição do parâmetro configurado; o sistema DEVE exibir também o valor configurado
  para permitir a comparação.
- **RF-143**: A inferência de `g` DEVE usar `g = 4π²L/T²` quando a linha for do pêndulo cicloidal, e
  `g = 4π²L·S(α)²/T²` — com `S(α)` igual ao somatório da série truncada em `N` — quando a linha for
  do pêndulo simples.
- **RF-144**: O sistema DEVE evidenciar o efeito didático central deste arranjo: no pêndulo simples,
  inferir `g` ignorando os termos de correção produz erro crescente com a amplitude, enquanto no
  pêndulo cicloidal a inferência permanece correta para qualquer amplitude. A tabela DEVE permitir
  exibir, lado a lado, o `g` inferido **com** e **sem** os termos de correção.
- **RF-145**: O sistema DEVE oferecer coleta **automática**, registrando uma linha a cada período
  completo detectado, e coleta **manual**, registrando uma linha sob comando do usuário.
- **RF-146**: Os usuários DEVEM poder pausar a coleta, excluir uma linha individual, limpar a tabela
  inteira mediante confirmação e ordenar as linhas por qualquer coluna.
- **RF-147**: A tabela DEVE exibir, em rodapé, as estatísticas das linhas coletadas: contagem,
  média, desvio padrão e erro padrão de `T` e de `g`.
- **RF-148**: A tabela DEVE ser exportável em CSV com as mesmas colunas exibidas, e suas linhas
  DEVEM poder ser projetadas como pontos sobre os gráficos teóricos, conforme RF-103.
- **RF-149**: A tabela DEVE ser navegável e operável por teclado, e DEVE ser anunciada a
  tecnologias assistivas como tabela de dados com cabeçalhos associados.
- **RF-150**: As linhas coletadas DEVEM integrar o caderno de laboratório da Área H, sem duplicação
  de registro: a tabela de coleta é a visão imediata do mesmo conjunto de medições.

#### Área L — Parâmetros indexados por pêndulo e altura de largada

> Origem: anotações `L₁ = 0` e `h₂ = 3` no rodapé do esboço manuscrito do usuário. Elas mostram a
> notação pretendida para os parâmetros: **símbolo com índice subscrito identificando de qual
> pêndulo ou massa se trata**. Esta área generaliza a exigência de parâmetros configuráveis
> (Área C e Área D) para os casos em que há mais de um corpo em cena.

**Endereçamento por índice**

- **RF-151**: Todo parâmetro que exista por pêndulo ou por massa DEVE ser endereçável por **índice
  subscrito**, no formato `símboloᵢ` — por exemplo `L₁`, `L₂`, `α₁`, `α₂`, `h₁`, `h₂`, `m₁`, `m₂` —
  tanto nos controles da interface quanto no console de parâmetros.
- **RF-152**: O console DEVE aceitar as três grafias equivalentes do índice: subscrito (`L₁`),
  algarismo comum (`L1`) e sublinhado (`L_1`), sem distinção.
- **RF-153**: Uma atribuição **sem índice** DEVE aplicar-se a todos os pêndulos cujo parâmetro
  esteja acoplado e, quando desacoplados, ao pêndulo em foco; o sistema DEVE indicar
  qual interpretação foi adotada.
- **RF-154**: O sistema DEVE permitir **acoplar e desacoplar** cada parâmetro indexado
  individualmente. Acoplado, editar `L` altera todos os pêndulos; desacoplado, `L₁` e `L₂` são
  independentes. O estado de acoplamento DEVE ser visível junto ao controle.
- **RF-155**: Índice fora do intervalo de pêndulos existentes DEVE produzir mensagem nomeando o
  índice recebido e a faixa válida, sem alterar nenhum parâmetro.
- **RF-156**: A notação indexada DEVE ser usada de forma consistente em toda a aplicação: rótulos
  dos controles, legendas das cenas e dos gráficos, coluna de origem da tabela de coleta, chaves do
  endereço compartilhável e cabeçalhos do arquivo exportado.

**Altura de largada**

- **RF-157**: O sistema DEVE expor a **altura de largada `hᵢ`** como parâmetro de primeiro nível de
  cada massa, ao lado da amplitude angular, permitindo definir a posição inicial pela altura em vez
  do ângulo — que é como o experimento é conduzido na bancada e como a tautocronia é demonstrada.
- **RF-158**: `hᵢ` e `αᵢ` DEVEM ser mutuamente determinados. No modo cicloidal a relação é
  `h = L·sen²(θ)/2`, equivalente a `h = s²/(2L)` com `s = L·sen θ`, cujo máximo é `h = L/2 = 2r` no
  topo da face cicloidal. No modo simples a relação é `h = L·(1 − cos α)`. A resolução do vínculo
  segue a Área M: `θ₀` é o canônico, e `h` e `α` são espelhos recalculados a partir dele.
- **RF-159**: Na demonstração de tautocronia, cada uma das massas DEVE ter sua própria altura de
  largada `h₁`, `h₂`, … editável numericamente, e o sistema DEVE evidenciar que, apesar das alturas
  diferentes, todas alcançam o ponto zero no mesmo instante.
- **RF-160**: O sistema DEVE recusar altura de largada acima do máximo geométrico admissível,
  limitando ao topo da face cicloidal e comunicando o ajuste.

#### Área M — Coerência da posição de largada

> **Origem**: defeito observado na aplicação em execução. Com `α = 45°` e
> `θ₀ = 10°`, o painel da fórmula anunciava `T = 2,085562 s` enquanto a tabela de
> coleta media `T = 2,0099 s` para o mesmo pêndulo. A fórmula descrevia um
> movimento diferente do que estava sendo simulado.
>
> A causa é que três parâmetros descrevem **um único fato físico** — de onde a
> massa é solta — e o estado permitia que discordassem entre si. Esta área
> elimina a possibilidade.

**O trio e o parâmetro canônico**

- **RF-161**: `θ₀` (P03), `α` (P02) e `h` (P15) DEVEM descrever sempre a mesma
  posição de largada. O sistema NÃO DEVE admitir estado em que discordem.
- **RF-162**: `θ₀` é o parâmetro **canônico** do trio, por ser o único que carrega
  a informação completa: magnitude **e** lado de onde a massa é solta. `α` e `h`
  são **espelhos**, sempre recalculados a partir dele.
- **RF-163**: Os três DEVEM permanecer **editáveis**. Editar um espelho escreve no
  canônico e recalcula os demais — o que preserva o RF-157, que exige poder
  definir a largada pela altura, como se faz na bancada.
- **RF-164**: Editar `α` NÃO DEVE trocar o lado de largada: o sinal corrente de
  `θ₀` é preservado. Jogar a massa para o outro lado exige pedir isso
  explicitamente, editando `θ₀`.
- **RF-165**: Os espelhos DEVEM ser recalculados a partir do valor **armazenado**
  do canônico, nunca guardados a partir do que foi digitado neles. Sem isso o
  estado manteria um `h` que não corresponde ao `α` exibido, e a incoerência
  voltaria pela porta dos fundos — apenas menor. O armazenamento guarda precisão
  plena: `precisao` governa a apresentação, e é o que permite o passo fino mexer
  em `α` por 0,01 com uma casa em tela.

**Consequência para o estado compartilhável**

- **RF-166**: Parâmetros espelho NÃO DEVEM ser incluídos no endereço
  compartilhável nem nos presets. O endereço DEVE carregar o valor **exato** do
  canônico, e não o arredondado para as casas de exibição: truncar degradaria o
  estado ao compartilhá-lo, devolvendo um pêndulo diferente do original. Incluí-los tornaria o resultado dependente da
  ordem de aplicação, violando o determinismo exigido pelo Princípio V: aplicar
  `α` e depois `θ₀` produziria estado diferente de aplicar `θ₀` e depois `α`.
- **RF-167**: Restaurar um endereço DEVE reconstruir os espelhos a partir do
  canônico, e o estado resultante DEVE ser idêntico ao original — inclusive nos
  valores dos espelhos.

**Correção de faixa decorrente**

- **RF-168**: A faixa de `α` DEVE admitir **zero**. A faixa anterior começava em
  `0,1°`, o que contradizia o caso de borda já especificado — `α = 0` significa
  repouso, com `T = T₀` e sensor sem disparo — e impedia o estado coerente
  correspondente a `θ₀ = 0`.

### Requisitos Não Funcionais

- **RNF-001**: A animação DEVE sustentar 60 quadros por segundo em um computador de escritório de
  linha média, com dois pêndulos, três gráficos ativos e rastro ligado; o percentil 95 da taxa de
  quadros ao longo de 60 segundos NÃO DEVE cair abaixo de 55 quadros por segundo.
- **RNF-002**: Os gráficos DEVEM ser atualizados no mínimo 20 vezes por segundo, sem prejudicar o
  requisito RNF-001.
- **RNF-003**: A resposta visual a qualquer alteração de parâmetro DEVE ocorrer em no máximo 100
  milissegundos.
- **RNF-004**: A razão `T/T₀` calculada pela série DEVE coincidir com os valores de referência da
  tabela de fixtures com erro relativo inferior a 1×10⁻⁹, para todas as amplitudes de 1° a 179° e
  todos os `N` de 0 a 10.
- **RNF-005**: O valor exato de referência DEVE ser obtido com erro relativo inferior a 1×10⁻¹² e
  convergir em no máximo 8 iterações para amplitudes até 179,9°.
- **RNF-006**: No modo cicloidal, o período calculado DEVE ser igual a `2π√(L/g)` com erro relativo
  inferior a 1×10⁻⁹ para toda amplitude no intervalo (0°; 90°].
- **RNF-007**: No modo conservativo, a energia total exibida NÃO DEVE variar mais que 0,01 % após
  3 600 segundos de tempo simulado.
- **RNF-008**: Para os mesmos parâmetros iniciais, a trajetória simulada DEVE ser idêntica dentro de
  1×10⁻⁹ independentemente da taxa de quadros do dispositivo (30, 60, 120 ou 144 quadros por
  segundo).
- **RNF-009**: O período obtido pelos instrumentos de medição DEVE concordar com o período teórico
  do modelo corrente dentro de 0,01 %, para amplitudes até 170°.
- **RNF-010**: Nenhuma combinação de valores admissíveis de parâmetros DEVE produzir valor
  indefinido, divisão por zero ou travamento; os casos-limite listados em **Casos de Borda** DEVEM
  ter comportamento definido e comunicado.
- **RNF-011**: A aplicação DEVE funcionar integralmente **sem conexão de rede**, aberta a partir de
  um arquivo local, sem servidor e sem instalação.
- **RNF-012**: O pacote entregue NÃO DEVE exceder 5 MB, e o carregamento até a primeira interação
  NÃO DEVE exceder 3 segundos em conexão local.
- **RNF-013**: A aplicação DEVE funcionar nas duas versões mais recentes dos navegadores de desktop
  de maior uso e em tablets, sem exigir extensões.
- **RNF-014**: A interface DEVE ser utilizável de 1024×768 pixels até resolução 4K, incluindo
  projetores de baixa resolução, sem rolagem horizontal e sem sobreposição de painéis.
- **RNF-015**: A aplicação DEVE atender ao nível AA das diretrizes WCAG 2.1, incluindo contraste
  mínimo de 4,5:1 para texto e 3:1 para elementos gráficos essenciais.
- **RNF-016**: Toda a funcionalidade DEVE ser alcançável por teclado, sem armadilhas de foco, com
  ordem de tabulação coerente com a leitura visual.
- **RNF-017**: Os textos da interface DEVEM estar separados da lógica, de modo que a adição de um
  novo idioma não exija alterar comportamento; o idioma padrão é português do Brasil.
- **RNF-018**: A formatação de números DEVE seguir a localidade ativa em toda a aplicação —
  interface, fórmula, gráficos e arquivos exportados — sem inconsistências entre elas.
- **RNF-019**: A aplicação NÃO DEVE coletar, armazenar remotamente nem transmitir dados pessoais ou
  de uso.
- **RNF-020**: O consumo de memória NÃO DEVE crescer indefinidamente com o tempo de execução; após
  uma hora de uso contínuo, o crescimento NÃO DEVE exceder 20 % da medida obtida no primeiro minuto.
- **RNF-021**: Toda afirmação numérica de referência apresentada na interface (coeficientes,
  limiares de erro, valores de gravidade, aproximações de forma fechada) DEVE ser rastreável a uma
  fonte citada na própria aplicação.
- **RNF-022**: A precisão interna dos cálculos NÃO DEVE depender do número de casas decimais
  escolhido para exibição.
- **RNF-023**: As mensagens de erro e de limitação de valor DEVEM indicar o parâmetro, o valor
  recusado e o limite aplicado, em linguagem compreensível para estudantes do Ensino Médio.

### Entidades-Chave

- **Parâmetro**: unidade elementar de configuração. Possui símbolo, nome, descrição, unidade,
  faixa válida, passo, valor padrão, valor corrente, nível (básico ou avançado), aliases de
  digitação e indicação de ser editável ou derivado. É a origem de todos os controles, do console,
  do endereço compartilhável e dos presets.
- **Conjunto de Parâmetros (Cenário)**: fotografia completa e nomeável de todos os parâmetros em um
  instante. É o que um preset guarda, o que o endereço compartilhável codifica e o que o arquivo de
  cenário transporta.
- **Modo do Pêndulo**: regime ativo — simples, cicloidal ou comparação. Determina quais termos da
  fórmula estão ativos, qual geometria é desenhada e qual faixa de amplitude é admissível.
- **Pêndulo**: instância animada, com sua própria geometria, condições iniciais, cor e identidade
  visual. Um cenário pode conter várias.
- **Termo da Série**: componente indexado por `n` da fórmula-motor, com coeficiente exato, valor
  numérico corrente, contribuição relativa e estado ativo ou anulado (o modo cicloidal anula todos
  os termos com `n ≥ 1`).
- **Modelo de Período**: forma de calcular o período — pequenos ângulos, série truncada, valor
  exato ou aproximação de forma fechada. Cada um tem nome, expressão, faixa de validade declarada,
  erro em relação ao exato e referência bibliográfica.
- **Instrumento de Medição**: transferidor, régua, cronômetro ou fotoporta. Tem estado de
  ativação, posição na cena, configuração própria (por exemplo, meio período ou período completo) e
  produz Medições.
- **Medição**: evento registrado com instante, instrumento de origem, grandeza medida, valor,
  incerteza e a cópia dos parâmetros vigentes no momento.
- **Caderno de Laboratório**: coleção ordenada de Medições, com estatísticas derivadas e capacidade
  de exportação.
- **Série Temporal**: histórico limitado de grandezas do movimento (ângulo, velocidade angular,
  aceleração, energias) usado pelos gráficos e pela exportação.
- **Preset**: Conjunto de Parâmetros nomeado, de fábrica ou do usuário, com descrição e finalidade
  didática.
- **Roteiro Guiado**: sequência ordenada de passos; cada passo tem enunciado, configuração aplicada,
  pergunta e critério de resposta esperada.
- **Desafio**: variante de cenário em que um parâmetro é ocultado (por exemplo, a gravidade do
  Planeta X), com tolerância de acerto e resposta revelada apenas após a submissão.
- **Preferências de Apresentação**: idioma, tema, unidade angular, casas decimais, paleta acessível
  e preferência de movimento reduzido.

---

## Critérios de Sucesso *(obrigatória)*

### Resultados Mensuráveis

- **CS-001**: Um professor sem treinamento prévio consegue, em até 3 minutos, exibir a fórmula com
  os três termos e demonstrar o desaparecimento dos termos de correção no modo cicloidal; ao menos
  4 de 5 participantes de teste concluem a tarefa na primeira tentativa.
- **CS-002**: Para as 13 amplitudes de referência (1°, 5°, 10°, 15°, 20°, 30°, 45°, 60°, 90°, 120°,
  150°, 170°, 179°) e para `N` de 0 a 10, os valores de `T/T₀` exibidos coincidem com a tabela de
  referência com erro relativo inferior a 1×10⁻⁹.
- **CS-003**: No modo cicloidal, o período exibido é constante em 7 amplitudes distintas entre 5° e
  90°, com variação relativa inferior a 1×10⁻⁹.
- **CS-004**: Para `L = 1 m` e `g = 9,81 m/s²`, os desvios do período em relação a `T₀` exibidos em
  10°, 20° e 45° são +3,8 ms, +15,4 ms e +80,2 ms, com tolerância de 0,05 ms; e as leituras da
  fotoporta em modo meio período são exatamente a metade desses desvios.
- **CS-005**: A aplicação demonstra, em uma única tela, a saturação da série truncada em
  `T/T₀ = 1,390625` e a divergência do período real quando a amplitude se aproxima de 180°.
- **CS-006**: 100 % dos parâmetros de nível básico do catálogo são editáveis por digitação direta e
  por console de texto.
- **CS-007**: Escrever `a = 10` no console altera a amplitude para 10°, e o campo, o slider, a cena,
  a fórmula e o endereço compartilhável refletem a alteração em menos de 100 milissegundos.
- **CS-008**: Com dois pêndulos, três gráficos e rastro ativos, o percentil 95 da taxa de quadros ao
  longo de 60 segundos permanece igual ou superior a 55 quadros por segundo em um computador de
  linha média.
- **CS-009**: Para 100 configurações aleatórias válidas, codificar o estado no endereço e
  restaurá-lo reproduz exatamente os mesmos valores em 100 % dos parâmetros.
- **CS-010**: Um estudante determina o valor de `g` do Planeta X com erro inferior a 2 % em até 10
  minutos, usando apenas os instrumentos da aplicação.
- **CS-011**: A reprodução do experimento do roteiro alemão (`L = 1 m`, fotoporta em meio período)
  produz leituras que concordam com o valor teórico de meio período dentro de 0,3 %, em cinco
  amplitudes distintas.
- **CS-012**: A aplicação apresenta zero violações em verificação automatizada de acessibilidade
  nível AA, e todas as tarefas das histórias P1 são concluíveis apenas com teclado.
- **CS-013**: A aplicação abre a partir de um arquivo local, sem rede e sem instalação, e fica
  interativa em até 3 segundos.
- **CS-014**: O arquivo de medidas exportado abre em planilha configurada para português do Brasil
  com colunas corretamente separadas e números reconhecidos como numéricos, sem ajuste manual.
- **CS-015**: Os dez invariantes físicos declarados (série monotônica em `N`, série sempre menor ou
  igual ao exato, saturação exata em `89/64`, período cicloidal constante, energia conservada,
  entre outros) são satisfeitos em verificação automatizada, sem exceção.
- **CS-016**: Ao menos 30 parâmetros distintos são alcançáveis e ajustáveis a partir da tela
  inicial em no máximo dois passos de navegação, atendendo ao pedido de "as mais variadas
  modificações possíveis".

---

## Suposições

1. **Amplitude padrão de 10°**: adotada por corresponder ao exemplo literal do usuário (`a = 10`) e
   ao primeiro caso de erro citado no roteiro alemão (erro de 0,5 % na aproximação `sen α ≈ α`).
2. **Gravidade padrão de 9,81 m/s²**: valor usado tanto pelo roteiro experimental quanto pela
   simulação de referência; o valor normativo 9,80665 é oferecido como preset alternativo.
3. **Número de termos padrão `N = 2`**: fidelidade estrita às imagens entregues pelo usuário, que
   mostram exatamente os termos `n = 0, 1, 2`.
4. **Faixa de comprimento 0,05 a 10 m**: mais ampla que a da simulação de referência (0,10 a
   1,00 m) para acomodar o pêndulo de 1 m do roteiro alemão sem ficar no extremo do controle, e o
   "pêndulo de segundos" de 0,994 m.
5. **Limite de amplitude em 179,9°**: 180° corresponde a equilíbrio instável, com período infinito;
   o limite evita um estado sem significado físico e sem valor calculável.
6. **Limite de amplitude em 90° no modo cicloidal**: consequência geométrica de `s = L·sen θ` com
   `|s| ≤ L`; é restrição do fenômeno, não escolha de produto.
7. **Vínculo `L = 4r`**: no pêndulo cicloidal de Huygens o fio tem comprimento igual a quatro vezes
   o raio gerador; tratar `r` como independente produziria uma cena geometricamente inconsistente.
8. **Massa não afeta o período**: o parâmetro permanece editável precisamente porque constatar sua
   irrelevância é um objetivo de aprendizagem.
9. **Público-alvo e ambiente**: uso predominante em sala de aula e em estudo individual, em
   computador com teclado e mouse, frequentemente sem internet; daí a exigência de funcionamento
   offline a partir de arquivo local.
10. **Escopo de referência**: paridade funcional é buscada com as duas simulações citadas pelo
    usuário; capacidades de outras simulações são incorporadas apenas quando servem à fórmula-motor.
11. **Número padrão de pêndulos**: a tela inicial apresenta um pêndulo; a comparação com até 8 é
    capacidade avançada, ativada explicitamente.
12. **Aproximações de forma fechada**: apenas expressões verificadas em fonte bibliográfica são
    oferecidas; aproximações racionais do tipo Padé não são incluídas por não haver fórmula
    explícita verificável para o período.
13. **Valor da gravidade do Planeta X**: mantido oculto na interface por ser a resposta do desafio.
14. **Roteiros guiados iniciais**: três roteiros são suficientes para a primeira versão — pequenos
    ângulos, Huygens e determinação de `g`.

---

## Fora de Escopo

- Pêndulo duplo, pêndulo cônico, ondas de pêndulos e demais sistemas que não derivam da fórmula-motor.
- Demonstração da propriedade braquistócrona como simulação interativa própria (é mencionada como
  contexto histórico, mas não simulada nesta versão).
- Contas de usuário, sincronização em nuvem, turmas, atribuição de tarefas e correção automática de
  atividades.
- Backend, banco de dados, telemetria e qualquer envio de dados para servidores.
- Aplicativo nativo para celular ou tablet publicado em loja de aplicativos.
- Realidade aumentada, realidade virtual e visualização tridimensional da cena.
- Editor visual de perfis de curva arbitrários (a cicloide é a única curva de vínculo suportada).
- Correções relativísticas, rotação da Terra (efeito Foucault), variação de `g` com a profundidade e
  demais efeitos de segunda ordem não citados nos requisitos.
- Impressão de relatórios formatados e geração automática de roteiros de aula em documento.
- Tradução para idiomas além dos definidos em **[NECESSITA ESCLARECIMENTO]** abaixo.
- **Aquisição de dados de hardware real (Arduino, barreira óptica física).** Especificada à parte,
  como incremento posterior, em [`002-integracao-arduino`](../002-integracao-arduino/spec.md). Nenhum requisito
  desta funcionalidade pode passar a depender de hardware externo.

---

## Dependências

- **Fontes primárias do usuário**: as imagens `formula simples.jpeg`, `formula completa.jpeg` e
  `formula geral.jpeg`, e o roteiro experimental `mhd_zykloidenpendel.pdf` ("Zykloidenpendel"),
  que definem, respectivamente, a fórmula-motor e o cenário experimental a reproduzir.
- **Simulações de referência**: PhET "Pendulum Lab" e GeoGebra "Cycloidal Pendulum" (Rafael Losada
  Liste), usadas como parâmetro de paridade funcional e de nomenclatura.
- **Referências bibliográficas das aproximações de período**: as publicações que estabelecem as
  formas fechadas oferecidas pela aplicação; cada expressão exibida depende de sua fonte estar
  citada nos créditos.
- **Tabela de valores de referência do período**: o conjunto de valores exatos por amplitude que
  serve de critério de aceite numérico para os requisitos RNF-004 a RNF-006.
- **Constantes físicas publicadas**: valores de gravidade por corpo celeste e a fórmula
  internacional da gravidade, quando os recursos correspondentes forem ativados.
- **Ambiente de execução**: navegador do usuário, sem dependência de rede em tempo de execução.

---

## Esclarecimentos Necessários

- **[NECESSITA ESCLARECIMENTO: quais idiomas a primeira versão deve oferecer? Português do Brasil é
  obrigatório; inglês amplia o alcance e alemão devolve o material à comunidade de origem do
  roteiro experimental — mas cada idioma adicional implica glossário físico revisado e teste de
  layout.]**
- **[NECESSITA ESCLARECIMENTO: presets e medições do caderno de laboratório devem persistir no
  dispositivo entre sessões, ou basta exportar e importar arquivos manualmente? A persistência
  automática melhora a experiência em laboratório de informática compartilhado, mas cria dados
  residuais na máquina.]**

---

## Revisão e Checklist de Aceite

### Qualidade do Conteúdo

- [x] Nenhum detalhe de implementação (linguagens, frameworks, bibliotecas, arquivos-fonte, APIs)
- [x] Focada em valor para o usuário e em necessidade pedagógica
- [x] Escrita para stakeholders não técnicos
- [x] Todas as seções obrigatórias estão completas
- [x] A física e as fórmulas presentes são domínio do produto, não técnica de implementação

### Completude dos Requisitos

- [ ] Nenhum marcador `[NECESSITA ESCLARECIMENTO]` remanescente — **2 marcadores abertos**, dentro
      do limite de 3, a resolver na etapa de esclarecimento
- [x] Requisitos testáveis e não ambíguos
- [x] Critérios de sucesso mensuráveis
- [x] Critérios de sucesso agnósticos de tecnologia
- [x] Todos os cenários de aceite estão definidos
- [x] Casos de borda identificados
- [x] Escopo claramente delimitado
- [x] Dependências e suposições identificadas

### Prontidão da Funcionalidade

- [x] Todo requisito funcional tem critério de aceite associado a pelo menos uma história
- [x] As histórias cobrem os fluxos primários das quatro personas
- [x] A funcionalidade atende aos Critérios de Sucesso declarados
- [x] A História de Usuário 1, isolada, constitui um MVP viável

---

## Status de Execução

- [x] Descrição do usuário parseada
- [x] Conceitos-chave extraídos
- [x] Ambiguidades marcadas (2 marcadores, dentro do limite)
- [x] Cenários de usuário definidos (16 histórias priorizadas)
- [x] Requisitos gerados (168 funcionais, 23 não funcionais)
- [x] Entidades identificadas (14 entidades conceituais)
- [ ] Checklist de revisão aprovada — pendente da resolução dos 2 esclarecimentos

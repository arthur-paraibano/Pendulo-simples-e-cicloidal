# Contrato: Estado da Aplicação (`src/state/`)

**Versão**: 1.0 · **Data**: 2026-08-17
**Camada**: intermediária — pode importar de `physics/`; **nunca** de `render/` ou `ui/`

---

## 1. Forma do Estado

```
EstadoAplicacao {
  versao: 1
  visualizacao: 'simples' | 'cicloidal' | 'ambos'      // RF-127
  parametros: Record<string, ValorParametro>            // chaveado pelo id do esquema
  pendulos: Pendulo[]                                   // 1 a 8
  relogio: RelogioSimulacao
  sensores: SensorZero[]                                // um por cena visível
  tabela: TabelaColeta
  presetAtivo: string | null
  roteiroAtivo: { id: string, passo: number } | null
  interface: { paineisAbertos: string[], termoDestacado: number | null, idioma: 'pt-BR'|'en'|'de' }
}
```

**Invariante global**: `EstadoAplicacao` é serializável em JSON e **totalmente reconstruível** a
partir do endereço compartilhável mais os padrões do esquema. Nenhum dado essencial vive fora dele.

---

## 2. Ações

Toda escrita passa por uma ação. `ui/` **nunca** altera o estado diretamente, e **nunca** chama o
motor de física.

### Parâmetros

| Ação | Assinatura | Comportamento |
|---|---|---|
| `definirParametro` | `(id, valor, origem?)` | Valida, limita, converte para unidade interna, aplica derivações, notifica |
| `definirVarios` | `(Record<id, valor>, origem?)` | Aplicação atômica: se **qualquer** id for desconhecido, nada é aplicado |
| `restaurarParametro` | `(id)` | Volta ao padrão do esquema |
| `restaurarTudo` | `()` | Volta todo o catálogo ao padrão; pede confirmação se houver medições |
| `aplicarTexto` | `(texto)` | Interpreta o console (`α = 10`); ver §5 |

### Visualização e simulação

| Ação | Assinatura | Comportamento |
|---|---|---|
| `definirVisualizacao` | `('simples'\|'cicloidal'\|'ambos')` | **Não** reinicia a simulação nem limpa a tabela (RF-130) |
| `reproduzir` / `pausar` / `parar` / `passoAPasso` | `()` | Transições da máquina de estados (data-model §3.5) |
| `zerarTempo` | `()` | `t ← 0`; preserva parâmetros e tabela |
| `definirEscalaTempo` | `(k)` | Câmera lenta como escala do tempo simulado, nunca de quadros |

### Medições

| Ação | Assinatura | Comportamento |
|---|---|---|
| `registrarPassagem` | `(EventoPassagem)` | Emitida pelo motor; consolida uma `Medicao` quando há eventos suficientes |
| `coletarManual` | `(idPendulo)` | Registra uma linha imediatamente (RF-145) |
| `definirColeta` | `(ativa: boolean)` | Liga/desliga a coleta automática |
| `removerMedicao` | `(n)` | Remove uma linha; recalcula estatísticas |
| `limparTabela` | `()` | **Exige confirmação** (RF-105, RF-146) |
| `ordenarTabela` | `(coluna, direcao)` | Ordena a exibição; não altera a ordem de inserção |

### Presets, histórico, roteiros

`salvarPreset(nome)` · `carregarPreset(id)` · `excluirPreset(id)` · `desfazer()` · `refazer()` ·
`iniciarRoteiro(id)` · `avancarPasso()` · `voltarPasso()` · `sairDoRoteiro()`

---

## 3. Validação e Limitação

Ordem obrigatória em `definirParametro`:

1. **Existência** — `id` desconhecido ⇒ `ErroDeParametro`, estado inalterado.
2. **Tipo** — incompatível ⇒ erro; nenhuma coerção silenciosa.
3. **Faixa estática** — fora de `[min,max]` ⇒ **limita** ao extremo e registra `limitadoDe`.
4. **Faixa dinâmica** — `limiteDinamico(estado)`, se houver. Ex.: `R_b ≤ L/4`; `α ≤ 90°` no cicloidal.
5. **Quantização** — arredonda ao múltiplo de `passo` mais próximo, respeitando `precisao`.
6. **Conversão** — unidade de exibição → unidade interna.
7. **Derivações** — propaga (`L` ⇒ `r`, `T₀`, `T`, …), em ordem topológica.
8. **Notificação** — assinantes das chaves afetadas.

**Regra de não-surpresa (RNF-023)**: toda limitação produz uma mensagem com parâmetro, valor
recusado e limite aplicado. Limitações silenciosas são proibidas.

**Regra de foco**: a validação ocorre em `change`/`blur`, **não** em `input` — assim o usuário
consegue digitar `10` sem que o `1` intermediário seja limitado.

---

## 4. Seletores

Puros, memorizados por assinatura de dependência:

| Seletor | Retorno |
|---|---|
| `selParametro(id)` | Valor em unidade de exibição |
| `selParametroInterno(id)` | Valor em unidade interna |
| `selResultadoPeriodo(idPendulo)` | `ResultadoPeriodo` completo |
| `selTermosFormula(idPendulo)` | `TermoSerie[]` para o painel da fórmula |
| `selCenasVisiveis()` | Cenas a desenhar, conforme a visualização |
| `selMedicoes()` | Linhas na ordem de exibição corrente |
| `selEstatisticas()` | Estatísticas de `T` e `g` |
| `selParametrosNaoPadrao()` | Base do endereço compartilhável |
| `selDiagnosticoDesempenho()` | fps, passos por quadro, tempo por camada |

---

## 5. Console de Parâmetros

Gramática aceita:

```
comando   := atribuicao (';' atribuicao)*
atribuicao:= alias ('=' | ':') numero unidade?
alias     := símbolo | id | nome | apelido      (sem distinção de maiúsculas/acentos)
numero    := [+-]? digitos (('.'|',') digitos)? ([eE][+-]?digitos)?
```

Casos que **devem** funcionar:

| Entrada | Efeito |
|---|---|
| `α = 10` | `alpha ← 10°` |
| `alpha=10` | idem |
| `a = 10` | idem, via apelido |
| `amplitude 10` | idem, sinal de igual opcional |
| `L=1,5` | `L ← 1,5 m` — vírgula decimal aceita |
| `g = 9.81` | `g ← 9,81 m/s²` |
| `α=10; L=1; g=9.81; N=2` | Aplicação **atômica** dos quatro |
| `alpha = 0.1745 rad` | Conversão explícita de unidade |
| `α = 500` | Limita a 179,9° **e informa** |
| `xyz = 3` | Erro nomeando o parâmetro desconhecido; nada é aplicado |

**Pós**: uma linha inválida **não aplica nenhuma** das atribuições daquela linha.

---

## 6. Assinatura e Notificação

`assinar(chaves: string[], callback)` retorna função de cancelamento.

- Notificação **agrupada** por quadro de animação: N alterações no mesmo quadro ⇒ **uma**
  notificação. Isso é o que sustenta o RNF-003 (resposta ≤ 100 ms) com 112 parâmetros.
- Chaves especiais: `'*'` (tudo), `'periodo'`, `'geometria'`, `'medicoes'`.
- **Proibido**: assinante que escreve no estado dentro do próprio callback — detectado e lançado
  como erro em desenvolvimento, para impedir laços de realimentação.

---

## 7. Histórico

- Pilha de até **50** estados; agrupa alterações do mesmo parâmetro em janela de 500 ms (arrastar um
  slider é **um** passo de desfazer, não duzentos).
- Ações **não** registradas: reproduzir/pausar, abrir painel, ordenar tabela.
- Ações registradas: qualquer alteração de parâmetro, carga de preset, limpeza da tabela.

# Contrato: Exportação CSV (`src/export/csv.ts`)

**Versão**: 1.0 · **Data**: 2026-08-17
**Origem dos dados**: `TabelaColeta` (RF-140, RF-148)

O CSV é a ponte entre o simulador e a planilha do laboratório. Ele precisa ser **autoexplicativo**:
quem abre o arquivo três meses depois deve conseguir reconstruir as condições da medição sem
recorrer à aplicação.

---

## 1. Formato do Arquivo

| Aspecto | Regra |
|---|---|
| Codificação | UTF-8 **com BOM** — sem o BOM, o Excel em português corrompe `α`, `²` e acentos |
| Separador de campo | `;` (ponto e vírgula) por padrão, escolhível como `,` ou tabulação |
| Separador decimal | **Vírgula** quando o separador de campo é `;`; **ponto** quando é `,` ou tabulação — nunca ambíguo |
| Fim de linha | `CRLF` |
| Aspas | Campos com separador, aspas ou quebra de linha entre `"`; aspas internas duplicadas |
| Nome do arquivo | `pendulo-medicoes-AAAA-MM-DD-HHMM.csv` |

---

## 2. Cabeçalho de Metadados

Precede a tabela; cada linha começa com `#`. Torna o arquivo autoexplicativo e reproduz as
condições do experimento.

```
# Simulador: Pêndulo — Fórmula Completa
# Versão do aplicativo: 1.0.0
# Versão do formato CSV: 1
# Exportado em: 2026-08-17T14:32:05-03:00
# Visualização: ambos
# Modelo de período: série truncada em N = 2
# Fórmula: T = 2*pi*raiz(L/g) * (1 + (1/4)*sen^2(alpha/2) + (9/64)*sen^4(alpha/2))
# Grandeza medida pelo sensor: período completo
# Sensor: fixo no ponto zero (theta = 0)
# Parâmetros não padrão: L=1; g=9.81; alpha=10; N=2
# Estado completo: https://<host>/#v=1&alpha=10&vis=ambos
#
```

A linha `# Estado completo` permite **reabrir exatamente** o estado que produziu os dados — é o
elo entre o CSV e o Princípio V.

---

## 3. Colunas

### Obrigatórias — sempre presentes, nesta ordem

| # | Cabeçalho | Unidade | Tipo | Descrição |
|---|---|---|---|---|
| 1 | `n` | — | inteiro | Número sequencial da medição |
| 2 | `pendulo` | — | texto | `simples` ou `cicloidal` |
| 3 | `T_s` | s | decimal (6) | **Período medido** |
| 4 | `g_inferido_m_s2` | m/s² | decimal (6) | **Gravidade inferida do período** |
| 5 | `alpha_graus` | ° | decimal (2) | Amplitude no instante da coleta |
| 6 | `L_m` | m | decimal (4) | Comprimento efetivo |
| 7 | `erro_relativo_pct` | % | decimal (4) | Desvio entre medido e teórico |

As colunas 3 e 4 são as exigidas pelo requisito (`T` e `g`). O sufixo de unidade no cabeçalho é
obrigatório — cabeçalho sem unidade é fonte recorrente de erro em relatório de laboratório.

### Opcionais — conforme as colunas visíveis

| Cabeçalho | Unidade | Descrição |
|---|---|---|
| `grandeza` | — | `meio_periodo` ou `periodo_completo` |
| `g_ingenuo_m_s2` | m/s² | `4π²L/T²`, sem termos de correção (RF-144) |
| `g_configurado_m_s2` | m/s² | Valor do parâmetro, para comparação |
| `T_teorico_s` | s | Período pela série com o `N` corrente |
| `T_exato_s` | s | Período exato pelo AGM |
| `N_termos` | — | Termos usados na inferência |
| `t_coleta_s` | s | Instante de simulação da coleta |
| `origem` | — | `automatica` ou `manual` |
| `massa_kg`, `atrito`, `modelo_periodo` | — | Contexto adicional |

---

## 4. Rodapé de Estatísticas

Anexado após uma linha em branco, quando há duas ou mais linhas (RF-147):

```
#
# Estatísticas (n = 12)
# T: média = 2,034567 s; desvio padrão = 0,000412 s; erro padrão = 0,000119 s
# g: média = 9,809876 m/s²; desvio padrão = 0,003210 m/s²; erro padrão = 0,000927 m/s²
```

Com `n < 2`, desvio padrão e erro padrão são exportados como campo **vazio**, jamais como `0`.

---

## 5. Exemplo Completo

```
# Simulador: Pêndulo — Fórmula Completa
# Versão do formato CSV: 1
# Grandeza medida pelo sensor: período completo
# Sensor: fixo no ponto zero (theta = 0)
# Estado completo: https://<host>/#v=1&alpha=45&vis=ambos
#
n;pendulo;T_s;g_inferido_m_s2;alpha_graus;L_m;erro_relativo_pct;g_ingenuo_m_s2
1;simples;2,086256;9,803478;45,00;1,0000;0,0332;9,070361
2;cicloidal;2,006067;9,810000;45,00;1,0000;0,0000;9,810000
3;simples;2,009893;9,809999;10,00;1,0000;0,0000;9,772688
4;cicloidal;2,006067;9,810000;10,00;1,0000;0,0000;9,810000
```

As linhas 1 e 2 são a demonstração inteira em duas linhas: **mesma amplitude de 45°**, o cicloidal
devolve `g = 9,810` e o simples só chega a `9,803` **porque usou os termos de correção** — enquanto
a coluna ingênua mostra o que aconteceria sem eles: `9,070`, um erro de 7,5 %.

---

## 6. Testes Obrigatórios

| # | Verificação |
|---|---|
| 1 | Arquivo começa com BOM UTF-8 (`EF BB BF`) |
| 2 | Colunas obrigatórias presentes, na ordem, com sufixo de unidade |
| 3 | Separador decimal coerente com o separador de campo, em todas as células |
| 4 | Abre corretamente no Excel pt-BR sem assistente de importação |
| 5 | Ida e volta: reimportar reproduz as mesmas linhas dentro da precisão exportada |
| 6 | Tabela vazia ⇒ arquivo só com metadados e cabeçalho, sem erro |
| 7 | 10 000 linhas exportam em menos de 2 s |
| 8 | Valores de `g_inferido` conferem com a Tabela D de `research.md` |
| 9 | Linha do modo cicloidal ⇒ `g_inferido === g_ingenuo` |
| 10 | Campo contendo o separador é corretamente delimitado por aspas |

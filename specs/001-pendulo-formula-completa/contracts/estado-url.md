# Contrato: Estado Serializado no Endereço (`src/state/url.ts`)

**Versão do formato**: `v=1` · **Data**: 2026-08-17

O endereço compartilhável é a materialização do Princípio V (determinismo e reprodutibilidade).
Ele deve ser **legível e auditável a olho**: um professor precisa conseguir montar o link à mão.

---

## 1. Formato

```
https://<host>/<caminho>#v=1&modo=simples&vis=ambos&L=1&alpha=10&g=9.81&N=2
```

- Vive no **fragmento** (`#`), nunca na query string — evita ida ao servidor e mantém o estado fora
  dos registros de acesso.
- Pares `chave=valor` separados por `&`, na **ordem canônica** do esquema.
- Codificação percentual apenas onde estritamente necessária.

---

## 2. Regras de Serialização

| Regra | Detalhe |
|---|---|
| Só o que difere | Apenas parâmetros cujo valor difere do padrão do esquema |
| Versão sempre | `v=1` é o **primeiro** par, sempre presente |
| Chaves | O `id` do esquema, sem abreviação. `alpha`, não `a` |
| Decimal | **Ponto**, nunca vírgula, independentemente do idioma da interface |
| Ângulos | Sempre em **graus**, independentemente da unidade de exibição escolhida |
| Precisão | `precisao` do esquema; zeros à direita removidos (`1.000` ⇒ `1`) |
| Booleanos | `1` e `0` |
| Múltipla escolha | Valores separados por vírgula: `mod=T0,serie,exato` |
| Derivados | **Nunca** aparecem |
| Determinismo | O mesmo estado gera **sempre** o mesmo endereço, caractere a caractere |
| Limite | Acima de 2000 caracteres, comprime tudo (menos `v`) em `z=<base64url>` |

**Chaves adicionais fora do catálogo de parâmetros**

| Chave | Valores | Significado |
|---|---|---|
| `v` | `1` | Versão do formato |
| `vis` | `simples` · `cicloidal` · `ambos` | Visualização (RF-127) |
| `t` | número | Tempo simulado a restaurar, em segundos |
| `run` | `1` · `0` | Iniciar reproduzindo |
| `roteiro` | `<id>:<passo>` | Roteiro e passo ativos |

---

## 3. Regras de Desserialização

Ordem obrigatória:

1. Partir dos **padrões** do esquema.
2. Ler `v`. Ausente ⇒ assume `1`. Maior que a versão suportada ⇒ **aviso visível**, segue adiante.
3. Aplicar as migrações da tabela de versões, se houver.
4. Para cada par: chave desconhecida ⇒ **ignora e registra**, nunca falha; valor inválido ⇒ usa o
   padrão e **avisa**; valor fora de faixa ⇒ **limita** e avisa.
5. Aplicar restrições cruzadas: `vis=cicloidal` com `alpha=120` ⇒ limita a `90` e informa (RF-025).
6. Recalcular derivados.

**Princípio geral**: um endereço malformado **nunca** deixa a aplicação em branco ou travada.
Carrega-se o que for reconhecível e o restante volta ao padrão, sempre com aviso.

---

## 4. Casos de Teste Obrigatórios

| # | Entrada | Resultado esperado |
|---|---|---|
| 1 | `#v=1&alpha=10` | `α = 10°`; todo o resto no padrão |
| 2 | Estado padrão | Endereço `#v=1` apenas |
| 3 | `#v=1&alpha=10&L=1&g=9.81&N=2` | Estado do exemplo canônico do quickstart |
| 4 | `#v=1&vis=cicloidal&alpha=120` | `α` limitado a `90°` com aviso |
| 5 | `#v=1&alpha=abc` | `α` no padrão `10°` com aviso |
| 6 | `#v=1&parametroInexistente=5` | Ignorado com registro; sem falha |
| 7 | `#v=99&alpha=10` | Aviso de versão futura; `α = 10°` aplicado |
| 8 | `#` vazio ou ausente | Estado inteiramente padrão |
| 9 | **Ida e volta** de todos os 112 parâmetros em valor não padrão | Estado idêntico; endereço idêntico ao gerar de novo |
| 10 | `#v=1&alpha=10.0000` | Normalizado para `alpha=10` ao reserializar |
| 11 | Estado que excede 2000 caracteres | Comprimido em `z=`; descomprime ao estado idêntico |
| 12 | `#v=1&alpha=179.9&N=50` | Aceito nos limites máximos |

**Teste de propriedade (obrigatório)**: para qualquer estado válido gerado aleatoriamente com
semente fixa, `desserializar(serializar(estado)) === estado` e
`serializar(desserializar(url)) === url`.

# KaTeX vendorizado

- Pacote upstream: `katex`
- Versão exata: `0.18.4`
- Licença: MIT, preservada em `LICENSE`
- Código-fonte/licença upstream: <https://github.com/KaTeX/KaTeX/tree/v0.18.4>
- Artefatos compilados transportados do espelho:
  `igormironchik/markdown-tools@c1813bb34c7d62c1cb33aad0aa48c348eba68c86`,
  diretório `src/editor/res/katex/`

O espelho foi usado somente como transporte do build que declara
`version: "0.18.4"`. O CSS foi podado localmente para remover fallbacks WOFF e
TTF não vendorizados; ele referencia somente as 20 fontes WOFF2 presentes.
A licença foi conferida com o tag upstream.

Integridade dos artefatos após essa poda:

- `katex.min.js` SHA-256:
  `403aa468599d531038314eeb0c40bd70f692ed8a62a87914ccd7584ad810f99f`
- `katex.min.css` SHA-256:
  `32930dabe9f203e70855e54837cb3993cc9863c43de1551da10d2b431d3068a9`

Os arquivos são empacotados pelo Vite. Não há carregamento por CDN ou rede em
tempo de execução; o alvo HTML único incorpora JavaScript, CSS e fontes.

## Subconjunto de fontes entregue (2026-08-25)

Os 20 arquivos WOFF2 continuam neste diretório, íntegros: **nada foi apagado**.
O que mudou é o que chega ao usuário.

`katex.min.css` permanece intacto como registro do upstream e **não é importado
pela aplicação**. Quem a aplicação importa é `katex.subset.css`, derivado dele
por `scripts/enxugar-katex.mjs`: mesmo conteúdo, menos os blocos `@font-face`
das fontes não entregues. Como o Vite só emite a fonte que algum `@font-face`
referencia, as 14 restantes custam **zero byte** no pacote e seguem disponíveis
caso a lista precise crescer.

Fontes entregues (6 de 20, 60,5 kB de 253,7 kB):

| Arquivo | Por quê |
|---|---|
| `KaTeX_Main-Regular.woff2` | Dígitos, parênteses e o operador `sen` |
| `KaTeX_Math-Italic.woff2` | As variáveis `L`, `g`, `α` e `π` |
| `KaTeX_Size1..4-Regular.woff2` | Delimitadores da raiz e dos parênteses, que crescem com a altura do conteúdo |

A lista não foi adivinhada: veio de medir no navegador qual família cada trecho
da fórmula resolve, nos modos Simples, Cicloidal e Ambos, e com `N` de 2 a 50.
`Size1` e `Size4` entram como folga deliberada — somam 10 kB e cobrem conteúdo
mais alto em fases futuras.

**Como isso é garantido**: `tests/e2e/fontes.spec.ts` confronta, em execução, o
que o layout exige contra o que a página entrega. Uma fonte faltando não gera
404 — sem `@font-face`, o navegador nem chega a pedir o arquivo, apenas cai para
uma fonte do sistema e a matemática fica sutilmente errada. Medir requisições ou
a largura da expressão não detecta isso; ambas foram testadas e descartadas. O
cenário reprova nos dois sentidos: fonte exigida e não entregue, e fonte
entregue sem uso.

Para alterar o conjunto, edite `MANTIDAS` em `scripts/enxugar-katex.mjs` e rode
`npm run katex:enxugar`. O `npm run verificar` executa `katex:verificar`, que
reprova se `katex.subset.css` estiver fora de sincronia com o original.

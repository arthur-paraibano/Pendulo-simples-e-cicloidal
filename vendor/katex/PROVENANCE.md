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

# Referências e créditos

Fontes de tudo que o simulador afirma. A mesma lista é apresentada dentro da aplicação, no painel
**Créditos e fontes** (RF-125), gerada a partir de [`src/state/creditos.ts`](../src/state/creditos.ts)
— este arquivo e aquele painel não podem divergir sem que um teste reclame.

---

## Materiais do usuário

Foram estes materiais que definiram o produto; tudo o mais é consequência deles.

- **`formula simples.jpeg`**, **`formula completa.jpeg`**, **`formula geral.jpeg`** — as três
  imagens de fórmula. Origem da fórmula-motor, dos coeficientes `1/4` e `9/64` e da decisão de
  exibir a expressão termo a termo. A fórmula truncada em `N = 2` é literalmente a da imagem.
- **`mhd_zykloidenpendel.pdf`** — *Zykloidenpendel*, roteiro de experimento em alemão: montagem,
  vínculo geométrico do fio e a tautocronia demonstrada em bancada. Serve de teste de aceite do
  modo cicloidal, com números medidos de verdade.
- **`doc.txt`** — endereços das simulações de referência consultadas.

## Simulações de referência

- **PhET Pendulum Lab** — University of Colorado Boulder.
  <https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html>
  Página da simulação: <https://phet.colorado.edu/en/simulations/pendulum-lab>

  Referência didática dos valores de gravidade dos presets planetários — Lua 1,62; Terra 9,81;
  Júpiter 24,79 — e do desafio "Planeta X", cuja gravidade oculta, 14,2 m/s², também vem daí.

  **A lacuna que este projeto ocupa**: o PhET *mostra* que o período depende da amplitude, mas não
  mostra *a fórmula* que descreve essa dependência, nem termo a termo.

- **Cycloidal Pendulum**, de Rafael Losada Liste (GeoGebra) — <https://www.geogebra.org/m/ymbbprbw>

  Referência do traçado: evoluta, involuta e o desenrolar do fio sobre as faces cicloidais.

## Referências físico-matemáticas

- **Huygens, C.** *Horologium oscillatorium* (1673).
  A tautocronia da cicloide e as faces cicloidais do relógio de pêndulo. Origem do vínculo `L = 4r`.

- **Kidd, R. B.; Fogg, S. L.** "A simple formula for the large-angle pendulum period",
  *The Physics Teacher* **40** (2002), p. 81.
  Aproximação `T ≈ T₀/√cos(α/2)`.

- **Lima, F. M. S.; Arun, P.** "An accurate formula for the period of a simple pendulum oscillating
  beyond the small-angle regime", *American Journal of Physics* **74** (2006), p. 892.
  Aproximação `T ≈ T₀·(−ln cos(α/2))/(1 − cos(α/2))`.

- **Carvalhaes, C. G.; Suppes, P.** "Approximations for the period of the simple pendulum based on
  the arithmetic-geometric mean", *American Journal of Physics* **76** (2008), p. 1150.
  Aproximação por AGM interrompido na segunda iteração, `T ≈ 4T₀/(1 + √cos(α/2))²`.

## Verificação numérica

- **Tabelas A–E** de [research.md](../specs/001-pendulo-formula-completa/research.md), calculadas
  por via independente e congeladas em `tests/golden/`. São a fonte de verdade dos testes, e não o
  contrário: quando código e tabela discordam, presume-se que o código esteja errado até prova
  numérica em contrário.

---

## O que ficou deliberadamente de fora

Registrar as ausências vale tanto quanto registrar as presenças.

- **Aproximações de Padé** para o período do pêndulo. Circulam em material secundário, mas não
  houve fonte primária confirmável. A constituição do projeto não admite número sem procedência, e
  a regra não abre exceção por conveniência.
- **Ferramenta automatizada de auditoria WCAG** (`axe-core` e semelhantes). Cada dependência de
  terceiros exige justificativa escrita em `research.md`; a verificação de acessibilidade que
  existe hoje é dirigida, item a item, em navegador real (`tests/e2e/a11y.spec.ts`). A auditoria
  formal de conformidade continua em aberto.

---

## Bibliotecas de terceiros no pacote entregue

- **KaTeX** — renderização das fórmulas. Vendorizado em `vendor/katex/` e **enxugado**: das 20
  fontes do pacote original, 6 são entregues. O corte é vigiado por teste
  (`tests/e2e/fontes.spec.ts`), porque fonte faltante não produz erro visível — o navegador cai
  numa fonte do sistema e a matemática fica sutilmente errada.

Nenhuma outra dependência de tempo de execução. Não há analytics, telemetria ou qualquer
transmissão de dados: a aplicação funciona inteira sem rede (RNF-011, RNF-019).

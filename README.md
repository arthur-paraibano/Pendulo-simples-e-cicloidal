# Pendulum — The Complete Formula

**An interactive simulator that makes the general pendulum period formula visible, term by term.**

*Read this in [Português (Brasil)](README.pt-BR.md).*

Most pendulum simulations show *that* the period grows with amplitude. This one shows **the formula
that says so** — live, under the scene, with every term contributing a number you can watch change.
The same expression drives both a simple pendulum and a cycloidal one; the only difference is
whether the correction terms are switched on.

```
                        ⎛       1        ⎛ α ⎞      9       ⎛ α ⎞ ⎞
        T  =  2π √(L/g) ⎜ 1  +  ─ · sin² ⎜ ─ ⎟  +  ──  sin⁴ ⎜ ─ ⎟ ⎟
                        ⎝       4        ⎝ 2 ⎠     64       ⎝ 2 ⎠ ⎠
```

$$T = 2\pi\sqrt{\frac{L}{g}}\left(1 + \frac{1}{4}\sin^2\left(\frac{\alpha}{2}\right) + \frac{9}{64}\sin^4\left(\frac{\alpha}{2}\right)\right)$$

> **Language note.** The application interface and the specification documents are written in
> Brazilian Portuguese, the language of the classroom this was built for. Dictionaries for English
> and German ship with the app; the header and scene controls switch language today, while the
> parameter catalogue and panels remain in Portuguese. See [Open items](#open-items).

---

## Try it

| How | Where |
|---|---|
| **In the browser** | <https://arthur-paraibano.github.io/Simple-and-cycloidal-pendulum/> |
| **Offline, in a classroom** | [`pendulo-simulador.html`](pendulo-simulador.html) — one 580 kB file. Download it, double-click it. No server, no network, no installation. |
| **From source** | `npm ci && npm run dev` (Node ≥ 22.12) |

---

## The idea: one formula, two pendulums

A single expression generates both regimes. What changes is whether the terms with `n ≥ 1` are
active:

| | **Simple** pendulum | **Cycloidal** pendulum |
|---|---|---|
| Terms with `n ≥ 1` | **active** | **cancelled** |
| Period | grows with amplitude | `T = 2π√(L/g)`, constant |
| At `L = 1 m`, `α = 10°` | `2.009893 s` | `2.006067 s` |
| At `L = 1 m`, `α = 45°` | `2.085562 s` | `2.006067 s` |
| At `L = 1 m`, `α = 90°` | `2.327351 s` | `2.006067 s` |
| Property | anharmonic | **isochronous / tautochronous** |

In the cycloidal pendulum the bob is constrained to a cycloid: the free length of the string
shortens as `L·cos θ`, compensating exactly for the effect that would otherwise make the period grow.
That is Huygens' tautochrone — the same result the German lab script demonstrates on a bench.

**Why it matters, and what the data table makes visible row by row:** measure a simple pendulum at
45°, infer gravity with the small-angle formula, and you get `g = 9.07` instead of `9.81`. That is a
7.5 % error **no better instrument can fix**, because it is not a measurement error — it is a model
error. The cycloidal pendulum returns `9.81` at any amplitude.

---

## What the simulator does

- **Three views** — Simple · Cycloidal · Both, side by side.
- **A live formula beneath the scene.** Each term displays its value and its contribution in real
  time, lighting up or going dark according to the regime.
- **A data table beneath the formula,** fed by a **fixed sensor at the lowest point**, recording the
  measured period `T` and the inferred gravity `g` — next to a column showing the naive `g`, so the
  model error is on screen rather than in a footnote.
- **114 configurable parameters**, each with a symbol, an editable numeric field, unit, range, step,
  slider and reset — plus a console where you type `α = 10` directly, with per-pendulum indexed
  notation (`L₁`, `h₂`) when more than one body is in the scene.
- Measurement instruments, scientific plots, presets, guided walkthroughs, CSV and PNG export, and
  shareable state encoded in the URL.
- Full source traceability: every reference number on screen — coefficients, error thresholds,
  gravity values, closed-form approximations — links to a cited source inside the application.

---

## Engineering

| | |
|---|---|
| **Stack** | TypeScript 5.9 (strict, `exactOptionalPropertyTypes`), Vite 8, Canvas 2D, KaTeX |
| **Runtime dependencies** | One: KaTeX, vendored and pruned from 20 font files to 6 |
| **Tests** | Vitest (unit, Node environment) · Playwright (end-to-end, Chromium + Firefox) |
| **Data collection** | None. No analytics, no telemetry, no network calls at runtime |

The source is organised in layers, and the direction of dependency is **enforced by lint** rather
than by discipline:

```
   ui ──┐
        ├──▶ state ──▶ physics
render ─┘
```

`src/physics/` is a pure core: no DOM, no browser globals, no `Date.now()`, no `Math.random()`. It
runs in Node, which is why the numerical claims can be tested directly.

### Verification gates

`npm run verificar` runs the full gate chain: lint → types → KaTeX pruning check → tests with
coverage → both builds → size budget.

| Gate | Status |
|---|---|
| Unit tests | **987 passing** — 98.9 % statements, 94.0 % branches, thresholds enforced per file |
| End-to-end | **176 passing** across Chromium and Firefox |
| Pages bundle | 208 kB of a 400 kB budget |
| Single-file build | 580 kB of a 1536 kB budget |
| Offline guarantee | The single file is opened over `file://` with every HTTP request aborted, and must still work |

The reference numbers in [`research.md`](specs/001-pendulo-formula-completa/research.md) were
computed independently and frozen as fixtures. When the code and a table disagree, the code is
presumed wrong until proven otherwise numerically.

---

## Documentation

This project was built specification-first. The documents below are not write-ups produced after the
fact — they are what the implementation was derived from.

| Document | Contents |
|---|---|
| [constitution.md](.specify/memory/constitution.md) | Ten non-negotiable principles, technical constraints, quality gates, governance |
| [spec.md](specs/001-pendulo-formula-completa/spec.md) | **What and why**: 16 user stories, 160 functional and 23 non-functional requirements, the parameter catalogue |
| [plan.md](specs/001-pendulo-formula-completa/plan.md) | **How**: stack, architectural decisions, code structure, screen wireframe, phases |
| [research.md](specs/001-pendulo-formula-completa/research.md) | Derivation of the formula, **verified reference tables**, teardown of PhET and GeoGebra |
| [data-model.md](specs/001-pendulo-formula-completa/data-model.md) | Entities, invariants, state machine, derivation and serialisation rules |
| [contracts/](specs/001-pendulo-formula-completa/contracts/) | Contracts for the physics engine, state, presets (JSON Schema), URL and CSV |
| [quickstart.md](specs/001-pendulo-formula-completa/quickstart.md) | How to run, plus **13 validation scenarios with expected numbers** |
| [tasks.md](specs/001-pendulo-formula-completa/tasks.md) | **130 numbered tasks** with dependencies, parallelism and traceability |
| [docs/notas-de-fisica.md](docs/notas-de-fisica.md) | The physics: series, AGM, tautochrone, integrators, model error |
| [docs/referencias.md](docs/referencias.md) | Every source the application relies on — and what was deliberately left out |

*Documents are in Brazilian Portuguese.*

### Planned increment

[specs/002-integracao-arduino/spec.md](specs/002-integracao-arduino/spec.md) — 🕓 **deferred.**
Reading a **physical** pendulum through an Arduino photogate into the same data table: 17
requirements, the serial protocol, and an analysis of the viable routes.

---

## Project status

```
constitution ──▶ specify ──▶ plan ──▶ tasks ──▶ implement
     ✅            ✅          ✅        ✅          ✅
```

All ten implementation phases are complete.

| Phase | Delivered |
|---|---|
| 0 · Foundation | Vite, strict TypeScript, layer rule in lint, CI |
| 1 · Physics core | Series, AGM, period, approximations, cycloid, energy |
| 2 · Dynamics engine | Integrators, zero-point sensor, inference of `g` |
| 3 · State | The parameter catalogue, store, URL, presets, console |
| 4 · Scene | Three-layer Canvas, cycloidal cheeks, instruments |
| 5 · Formula and parameters | Live KaTeX formula, controls, derived-values panel |
| 5b · Indexed parameters | `L₁`, `h₂`, coupling and decoupling, independent drop heights |
| 6 · Data table | The table of `T` and `g` beneath the formula |
| 7 · Plots and instruments | Seven plots, stopwatch, movable photogate |
| 8 · Presets and export | Scenarios, walkthroughs, challenge, CSV, image, shareable URL |
| 9 · Language and accessibility | pt-BR/en/de dictionaries, keyboard operation, reduced motion, diagnostics |
| 10 · Documentation and delivery | Physics notes, traceable credits, first-run orientation, offline artefact |

### Open items

Tracked in [tasks.md](specs/001-pendulo-formula-completa/tasks.md):

- **GitHub Pages deployment** requires enabling Pages for the repository under *Settings → Pages*
  with source "GitHub Actions". Until then the deploy job fails with HTTP 404 — every quality gate
  passes, but the destination does not exist.
- **Formal WCAG 2.1 AA audit.** What exists today is directed verification, item by item, in a real
  browser. No automated auditing tool has been adopted, because every third-party dependency
  requires written justification in [research.md](specs/001-pendulo-formula-completa/research.md).
- **Complete interface translation.** The header, scene controls and status text switch language;
  the parameter catalogue and panels are still Portuguese-only.

---

## Sources and prior art

**Source material**

| File | Contents |
|---|---|
| `formula simples.jpeg` | `T = 2π√(L/g)` — the small-angle approximation |
| `formula completa.jpeg` | `T/T₀ = 1 + ¼sin²(α/2) + (9/64)sin⁴(α/2)` — the dimensionless ratio |
| `formula geral.jpeg` | The complete driving formula, from which both pendulums follow |
| `mhd_zykloidenpendel.pdf` | German lab script: 1 m pendulum, cycloidal profile, light barrier measuring half a period, oscilloscope |

**Reference simulations analysed**

- [PhET Pendulum Lab](https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html)
  — Intro/Energy/Lab screens, two pendulums, planetary presets, friction, energy plot, Period Timer,
  Period Trace. **Does not show the formula.**
- [GeoGebra — Cycloidal Pendulum](https://www.geogebra.org/m/ymbbprbw) by Rafael Losada Liste
  — Huygens' tautochrone, a string of length `4r` wrapping the evolute, osculating circle.
  **Almost nothing is configurable.**

The intersection neither one covers — a visible, manipulable formula, both regimes in the same
expression, and parameters open to the user — is this project.

---

## License

**Code and documentation in this repository: [MIT](LICENSE).** Use it, adapt it, translate it,
project it in a classroom, publish your own version. Preserving the copyright notice is the only
requirement.

**What the license does not cover,** because it is not mine to license:

| Material | Status |
|---|---|
| `vendor/katex/` | KaTeX 0.18.4, © Khan Academy — MIT, preserved in [`vendor/katex/LICENSE`](vendor/katex/LICENSE), with provenance auditable in [`PROVENANCE.md`](vendor/katex/PROVENANCE.md) |
| `mhd_zykloidenpendel.pdf` | Third-party lab script, included as the acceptance source for the cycloidal mode. Rights belong to the original author. |
| `formula *.jpeg` | Formula images supplied as source material. Rights belong to whoever produced them. |

Planetary gravity values and the "Planet X" challenge follow the
[PhET Pendulum Lab](https://phet.colorado.edu/en/simulations/pendulum-lab) (University of Colorado
Boulder, CC BY 4.0); the evolute construction follows
[Rafael Losada Liste's applet](https://www.geogebra.org/m/ymbbprbw). The complete list lives in
[docs/referencias.md](docs/referencias.md) and in the application's own **Credits and sources**
panel.

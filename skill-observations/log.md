# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED (YYYY-MM-DD) = skill updated/created | DECLINED (YYYY-MM-DD) = user decided not to pursue — resolved statuses always carry their resolution date

---

### Observation 1: Triangulation prevents stale documentation from overstating project status
**Status:** OPEN
**Date:** 2026-08-19
**Session context:** Full audit of a scientific web application with specifications, task checklists, source code, generated artifacts, and executable quality gates.
**Skill:** New skill candidate: implementation-audit
**Type:** open-source
**Phase/Area:** Evidence collection and status classification
**Issue:** Status labels in the README, plan, and task checklist conflicted with the actual source tree and runnable product. Relying on any single source would have misclassified progress.
**Suggested improvement:** Define an audit workflow that cross-checks declared tasks, concrete artifacts, integration points, and executable gates, then labels each feature as documented, implemented, integrated, or validated.
**Principle:** Project progress is best measured by triangulating intent, implementation, and executable proof; no single status document is authoritative.

### Observation 2: Visual smoke tests expose layered-canvas failures that unit math tests miss
**Status:** OPEN
**Date:** 2026-08-19
**Session context:** Implementing and validating a three-layer Canvas scene with high-DPI backing stores and resize coordination.
**Skill:** browser:control-in-app-browser
**Type:** open-source
**Phase/Area:** Local web development visual verification
**Issue:** Type checking, linting, and unit tests all passed while two of three canvases retained the browser's default 300 x 150 bitmap because a short-circuiting collection method stopped after resizing the first layer. A browser screenshot immediately revealed that the static layer rendered but the dynamic pendulum was clipped away.
**Suggested improvement:** In the local-web-development guidance, add a layered-canvas check that compares every canvas's backing dimensions with its CSS dimensions and device-pixel ratio, followed by one screenshot containing both static and dynamic content.
**Principle:** For stacked rendering surfaces, validate every backing store independently and confirm their composition visually; a correct shared transform cannot compensate for one layer retaining a stale bitmap.

### Observation 3: Coverage gates must include the subsystem being delivered
**Status:** OPEN
**Date:** 2026-08-19
**Session context:** Independent verification of a newly delivered rendering phase with unit, browser, build, and coverage gates.
**Skill:** New skill candidate: implementation-audit
**Type:** open-source
**Phase/Area:** Quality-gate interpretation
**Issue:** The aggregate coverage command passed with very high percentages, but its include pattern excluded the newly delivered rendering code. Treating the green percentage as evidence for that phase would have hidden untested branches in the actual deliverable.
**Suggested improvement:** Add an audit step that compares the changed or in-scope source paths against coverage include/exclude patterns, and reports coverage as applicable, non-applicable, or incomplete for the deliverable.
**Principle:** A coverage percentage is evidence only for files inside its instrumentation scope; every phase gate should prove that the delivered subsystem is actually measured.

### Observation 4: Canvas code can receive meaningful unit coverage without a browser
**Status:** OPEN
**Date:** 2026-08-19
**Session context:** Corrective implementation of a layered Canvas subsystem while local Playwright browser binaries were unavailable.
**Skill:** New skill candidate: canvas-verification
**Type:** open-source
**Phase/Area:** Rendering test strategy
**Issue:** Pure geometry tests covered calculations but left composition, clipping, palette invalidation, layered resizing, cleanup and drawing branches unmeasured. A small stateful fake of CanvasRenderingContext2D and DOM observer surfaces exercised those contracts deterministically, raising renderer coverage above the declared gate without coupling unit tests to pixel snapshots.
**Suggested improvement:** Define a three-tier Canvas test method: pure geometry assertions, command-level tests with a recording 2D context and lifecycle fakes, then a small browser smoke suite for bitmap composition and interaction.
**Principle:** Test rendering logic at the command/lifecycle boundary and reserve browser tests for composition; this yields fast deterministic coverage without pretending that mocks replace visual verification.

### Observation 5: Extract the simulation runtime before testing browser lifecycle edge cases
**Status:** OPEN
**Date:** 2026-08-19
**Session context:** Correcting a Canvas animation phase that mixed physics engines, clock state, URL restoration, DOM updates and requestAnimationFrame in one entry point.
**Skill:** New skill candidate: canvas-verification
**Type:** open-source
**Phase/Area:** Runtime architecture and lifecycle verification
**Issue:** Mode transitions and physical-domain failures were difficult to prove while all orchestration lived in the DOM bootstrap. Extracting a DOM-free runtime made it possible to test independent engines, clock restoration, invalid-state isolation and non-resetting view changes, while browser tests focused on bfcache, pixels and accessibility.
**Suggested improvement:** Add a recommended boundary to the Canvas verification method: keep the entry point thin, place clock/engine/state orchestration in an injectable runtime, unit-test its transitions, and reserve E2E tests for actual browser lifecycle and composition.
**Principle:** Separate deterministic simulation orchestration from browser scheduling so physical invariants and lifecycle behavior can each be tested at the boundary where failures actually occur.

### Observation 6: Fragment-only navigation can silently skip application bootstrap in E2E tests
**Status:** OPEN
**Date:** 2026-08-19
**Session context:** Adding browser regressions for URL-restored state and paused Canvas interactions in an application that reads its fragment during bootstrap.
**Skill:** New skill candidate: canvas-verification
**Type:** open-source
**Phase/Area:** Browser regression design
**Issue:** Navigating from the same document URL to a new fragment changed the address but did not reload the page, so bootstrap-only URL restoration was never rerun. The test then observed default state and appeared to expose a runtime regression even though the unit contract was correct.
**Suggested improvement:** When testing bootstrap-time fragment parsing, begin from a fresh page or explicitly reload after changing only the fragment; separately test live `hashchange` support if the product promises it.
**Principle:** A changed URL is not proof of a new document lifecycle; browser tests must distinguish fragment navigation from bootstrap navigation.

- 2026-08-19 checkpoint after the sixth completed implementation item: no additional observations beyond Observations 2–6.

### Observation 7: Commit planning must distinguish the index from the working tree
**Status:** OPEN
**Date:** 2026-08-19
**Session context:** Reviewing local changes to propose atomic commits and exact staging commands.
**Skill:** New skill candidate: commit-slicing
**Type:** open-source
**Phase/Area:** Change discovery and commit grouping
**Issue:** The request referred to files in the commit area, but the Git index was empty while the working tree contained the entire change set. Treating `git status` output as staged content would have produced misleading commit instructions.
**Suggested improvement:** Begin commit planning by separately listing staged, modified, deleted, and untracked paths; state the interpreted scope before grouping, and use `git add -A` for groups containing renamed or hash-generated artifacts so deletions are not omitted.
**Principle:** Atomic commit advice is reliable only when it is based on the exact Git layer being reviewed and accounts for both additions and deletions.

### Observation 8: Phase audits must resolve requirement-number drift against normative text
**Status:** OPEN
**Date:** 2026-08-24
**Session context:** Independent read-only audit of a phased implementation whose task table cited requirement identifiers that no longer matched the specification text.
**Skill:** New skill candidate: implementation-audit
**Type:** open-source
**Phase/Area:** Traceability and acceptance-semantics verification
**Issue:** A phase task cited a shifted requirement range, while the corresponding normative acceptance text required materially different error-handling behavior. Checking only the task row would have certified an implementation that contradicted the detailed specification.
**Suggested improvement:** Add a traceability step that resolves every task's cited identifiers to their current normative text, detects numbering drift, and gives explicit precedence to acceptance scenarios or records the ambiguity before certification.
**Principle:** Requirement IDs are pointers, not evidence; phase certification must compare implementation behavior with the current normative text and acceptance scenarios.

### Observation 9: Green regression tests can encode the defect they should detect
**Status:** OPEN
**Date:** 2026-08-24
**Session context:** Independent code review of a parameter UI whose keyboard and mode-transition tests passed while asserting behavior contrary to the normative acceptance criteria.
**Skill:** New skill candidate: implementation-audit
**Type:** open-source
**Phase/Area:** Test-semantic review
**Issue:** Tests confirmed that a precision modifier produced no observable value change and that switching modes preserved a value outside the destination domain. The suite was green because those regressions had been written as expected behavior.
**Suggested improvement:** Add an audit step that translates each normative criterion into an observable postcondition and compares that postcondition with the test assertion, flagging assertions that merely preserve current behavior or invert the requirement.
**Principle:** Passing tests prove conformance only when their asserted outcomes independently match the requirement; regression tests can otherwise institutionalize defects.

### Observation 10: Latency tests must observe the final consumer
**Status:** OPEN
**Date:** 2026-08-24
**Session context:** Certifying a parameter console whose synchronous Store and formula updates completed quickly while a throttled accessible scene description remained stale.
**Skill:** New skill candidate: implementation-audit
**Type:** open-source
**Phase/Area:** End-to-end latency verification
**Issue:** Measuring only the duration of the command handler proved internal write latency but missed the next animation frame and a slower downstream accessibility update. The reported sub-100 ms result therefore did not establish the product-level response promised to the user.
**Suggested improvement:** For latency requirements, start timing at the user action and stop only after every named observable consumer has changed, including rendered values, scene state and accessible descriptions; assert the elapsed wall time in the browser.
**Principle:** A latency budget belongs to the visible contract, not the fastest synchronous stage in its pipeline.

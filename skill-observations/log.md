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

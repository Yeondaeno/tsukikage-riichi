# Code-quality review: v3.2 Three.js integration (final update)

## Verdict

- `codeQualityStatus`: WATCH
- `recommendation`: APPROVE
- `blockers`: None

No CRITICAL or HIGH finding remains. The updated public view contains public river/meld IDs and `handCount`, never CPU hand IDs. It uses a public-only `tileName` callback instead of materializing all 136 tile names. The renderer now includes `aka` and tile theme in its rebuild signature and texture keys; its late texture completion is rejected during context loss, and failed loads delete their cache entry for retry.

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

1. `src/table-3d.js:1-330` remains a 297-pure-LOC renderer with rendering, asset conversion/caching, public-state projection, fallback, lifecycle, diagnostics, and geometry interaction in one file. The user has explicitly chosen the cohesive-module/YAGNI exception, so this is not a requested split or approval blocker. Record the ceiling and the trigger for reconsideration in a first-five-lines `SIZE_OK` rationale or the engineering report; otherwise the next reviewer cannot distinguish the deliberate exception from accidental growth.

### LOW

None.

## Evidence independently inspected

- Reviewed the current working-tree integration, including `src/table-3d.js`, `src/app.js`, `src/table-3d.css`, `tests/three_checks.py`, local vendor workflow, lockfile, and `docs/THREE-REPORT.md`.
- `git diff --check` found no whitespace error; only line-ending conversion warnings were emitted.
- Saved browser evidence in `tests/results/three/three-checks.json` reports 58/58 checks at 2026-10-02 18:06:33 +09:00. The report covers all four target sizes, public-only renderer diagnostics, raw face bounds/control centers, chi/pon/minkan, ankan's two inner faces, red-five/aka pixel change, all three skins with unchanged game snapshot, cancelled drag, context loss/restoration, missing-WebGL fallback, stable resources, DPR cap, and offline `file:` execution.
- The final engineering report records separate existing evidence: 91/91 browser regressions, 46/46 rule/v3 checks, 100 simulated hands, and six full matches. These counts are supported by the saved result files but were not re-executed in this read-only final pass.
- Visual evidence inspected earlier: `tests/results/three/three-late-1920x1080.png` and `tests/results/three/three-late-740x360.png`.

## Skill-perspective check

Ran both required skills: `remove-ai-slops` and `programming`.

- `remove-ai-slops`: no deletion-only, tautological, or implementation-constant test was found. The new tests are observable behavior checks, including actual engine calls and pixel/state comparisons. The sole remaining issue is the documented-size exception.
- `programming`: no TypeScript escape hatch, brittle prompt test, untyped boundary escape hatch, or unnecessary production data projection remains in this update. The cohesive renderer exceeds the default size criterion; the user-approved exception must be made explicit.

## Limitations

No browser, build, or test command was run in this final pass. Browser evidence and final counts were inspected from their saved artifacts. `omo-agent-toolkit ulw-loop status --json` had previously returned a command syntax error, so this report remains at the required fallback path.

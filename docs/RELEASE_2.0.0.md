# Aura 2.0.0 — shared source shelf and persisted visual workflow studio

This release restructures the `dsh-ui-aura` package around a real host entry and a persisted, host-backed appearance model.

## Added

- A shared **Add sources** shelf beside **Run this workflow**, backed by the same native Harness conversation draft registry as the startup attachment button: upload status/retry/removal, image-limit checks, shared task draft, and native composer submission.
- A sequential **Agent Workflow** graph with the five standard roles plus up to seven custom stages, drag/keyboard/card reordering, and out→in port reconnection.
- **Provider cards** populated from the live catalogue, provider-scoped model selectors, and saved manual choices (auto-match remains a name heuristic, not a capability or price guarantee).
- Eight offline **Artisan UI Studio** palettes, including Vaporwave Sunset and Tanjore Regal, with adjustable glow/border/arch/lattice/backdrop controls.
- Validated host-backed `ui-aura` settings registration and a generated, synchronous pre-paint theme bootstrap with client-side adoption/cleanup.
- Bounded recipe-snippet imports, self-contained SVG validation, keyboard tabs/focus trap, and desktop/mobile layout fixes.
- Automated unit-like tests (`scripts/test-aura.mjs`) and an isolated real-Harness settings integration test (`scripts/test-settings.mjs`).

## Runtime boundaries (unchanged disclosures)

The installed Harness workflow API accepts provider/model routing but explicitly rejects per-stage `effort`, `isolation`, and `agentType` options. Aura's effort and tool controls are labeled **prompt guidance**, not native enforcement. Stage snippet selections are direct context routing, not security or access-control isolation. The editor represents one connected sequential pipeline, not a branching DAG. Notebook exports can be attached, but Aura does not connect to NotebookLM accounts or provide permanent source indexing. Provider pricing, quota, multimodal support, and ZDR are not verified.

## Structural changes

- New host entry `lib/host.js` registers the `ui-aura` settings namespace and injects the pre-paint bootstrap; `lib/index.js` re-exports it.
- `lib/bootstrap.generated.js` is a reproducible build artifact (run `npm run build`).
- `@deepseek-ai/schemastery` becomes a production dependency (host schema declaration).
- The root `test` script now runs the package's own test suite; the legacy 1.x `tests/*.cjs` regression scripts were superseded and removed.
- The package remains `private: true`; this is not an npm publish.

See `packages/dsh-ui-aura/CHANGELOG.md` for the local release verification record.

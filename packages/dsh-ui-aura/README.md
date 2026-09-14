# Aura Studio 2.0

A local DeepSeek Harness plugin for composing agent workflows, sharing sources with the native composer, and shaping the interface.

## Use

Open **Workflow → Open Aura Studio**.

- **Run this workflow** is at the top. Its task text is the same draft as the Harness startup composer.
- **Add sources** opens the shared document shelf. Choose or drop documents, notebook exports, code, or images. Upload status, retry, and removal are shared with the startup attachment button. Generic files upload to the local Harness when selected; images follow the native send path. Nothing is sent to a model until you submit. Sources are runtime drafts, not a permanent NotebookLM library; they are not included in recipe exports.
- **Agent Workflow** keeps Orchestrator, Scout, Implementer, Reviewer, and Verifier. Add up to seven custom stages. Drag cards, use arrows, or connect an Out port to an In port. Click the ports for keyboard operation. Reconnection preserves one sequential chain; arbitrary branching DAGs are not supported.
- Provider cards list your connected Harness providers. Each stage has a model selector scoped to that provider. Auto-match is a model-name heuristic, not a quota, capability, or price guarantee. Manual choices remain fixed until explicitly rematched.
- **Recipe snippets** stores up to eight text snippets, 32 KB each, with stage-context selections. The orchestrator sees the recipe; downstream outputs can carry context onward. These selections are not security boundaries or read-permission enforcement.
- **Jobs & Skills** offers a manually saved, browser-local recipe library and reusable notes. JSON export/import transfers recipes and snippets, not native attachments. Imports are limited to 2 MB and validated.
- **Artisan UI Studio** offers Vaporwave Sunset, Tanjore Regal, Primer, Catppuccin, Nord, Dracula, Rosé Pine, and Tokyo Night adaptations. Controls adjust glow, borders, curvature, lattice, and backdrop opacity/blur. Backdrops apply to the preview and Harness conversation-scroll surface. Built-in patterns work offline.

## Settings and privacy

Appearance uses Harness's `ui-aura` namespace in its own settings provider (normally `$DSH_HOME/settings.yaml`). Aura does not write YAML directly or replace unrelated settings. Only explicit appearance changes persist. Read-only/non-loopback connections report preview-only mode.

The host supplies trusted CSS and a synchronous pre-paint theme bootstrap. Client activation adopts the same style element. Light/dark preference remains owned by Harness. Rebuild the generated bootstrap whenever client palettes, visual logic, or CSS change.

Custom SVGs are bounded to 32 KB and restricted to self-contained shapes: scripts, event handlers, external references, image/use elements, and foreign objects are rejected. No custom theme JavaScript is executed.

Recipe drafts and the saved library stay in browser storage. Earlier browser-only appearance keys remain untouched; the host preference is authoritative. Do not export sensitive snippets for public sharing.

## Runtime boundaries

The installed Harness workflow API accepts provider/model routing, but explicitly rejects `effort`, `isolation`, and `agentType` options. Aura's low/medium/high slider and tool selections are therefore labeled **prompt guidance**, not native enforcement. Actual budgets, permissions, context support, and provider billing remain controlled by Harness. ZDR is not verified.

Sending compiles a native workflow-tool request and passes it through the resident composer. Harness handles admission, upload serialization, errors, and draft retention. The orchestrator must execute the workflow tool; Aura does not simulate a completed run. Structured reference-chip drafts are blocked from this compilation path to prevent silent flattening.

## Install or update

Install dependencies with `npm install --ignore-scripts`, then run `npm run build` and `npm test`.

Copy the package into the web profile's `packages/dsh-ui-aura` directory and add this entry to its existing patch list:

```yaml
- insert:
    - id: ui-aura
      name: ./packages/dsh-ui-aura/lib/host.js
```

The package's standard entry (`lib/index.js`) re-exports that host entry. Refresh the browser after client changes. Restart an idle Harness after host/bootstrap changes; do not restart during a running turn.

Required client services: sessions, slots, locale, remote.skills, remote.session, theme, conversation, and settingsScope. This release was checked against locally installed Harness 0.1.5-rc.2 API packages (CLI 0.1.5-rc.1).

## Verification

`npm test` checks schemas, safe SVGs, host injection, pre-paint DOM setup, pipeline routing and failure stopping, custom stages, graph validation, and snippet limits.

Optional integration test against an installed Harness:

```text
node scripts/test-settings.mjs <installed-node_modules-directory>
```

It creates a synthetic temporary settings document and checks durable writes, unrelated YAML/comment preservation, rejection rollback, rapid updates, and provider restart. It never opens your settings file.

See CHANGELOG.md for release verification and limits. Publishing to GitHub or npm is a separate maintainer action.

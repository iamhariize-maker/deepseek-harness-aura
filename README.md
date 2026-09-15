# DeepSeek Harness Aura 2.0.1

Aura adds a visual agent-workflow studio, a shared source/attachment shelf, connected-provider model routing, and eight offline whole-interface themes to DeepSeek Harness.

**Status:** Open-source web plugin for an existing DeepSeek Harness installation. It is not a hosted service or a model provider; you use your own Harness configuration and provider access. The source and tests are available here under MIT.

## Quick start

1. [Download this repository](https://github.com/iamhariize-maker/deepseek-harness-aura/archive/refs/heads/main.zip) or clone it. You need an existing DeepSeek Harness **web** profile.
2. Copy `packages/dsh-ui-aura` from the download into your profile at `<DSH_HOME>/profiles/web/packages/dsh-ui-aura` (`DSH_HOME` defaults to `~/.dsh`), then inside it run `npm install --ignore-scripts` and `npm run build`.
3. Add this entry to `<DSH_HOME>/profiles/web/cordis.patch.yml`, preserving its existing entries:

   ```yaml
   - insert:
       - id: ui-aura
         name: ./packages/dsh-ui-aura/lib/host.js
   ```

4. Restart the Harness web process (while no turn is running) and refresh the browser. Open **Workflow → Open Aura Studio**.

For a Windows PowerShell walkthrough, verification and removal, see [Installation](docs/INSTALL.md). This repository is currently a source distribution; it is not published as an npm package or a one-command `dsh plugin add` bundle.

## What Aura does

- **Add sources:** a shared shelf beside **Run this workflow**, backed by the same native Harness conversation draft registry as the startup attachment button (upload status/retry/removal, image-limit checks, shared task draft, native composer send).
- **Agent Workflow:** a sequential five-stage pipeline (Orchestrator, Scout, Implementer, Reviewer, Verifier) plus up to seven custom stages, with drag/keyboard/card reordering and out→in port reconnection.
- **Providers & models:** live provider cards and provider-scoped model selectors; manual choices persist until explicitly rematched.
- **Recipe snippets & Jobs/Skills:** bounded stage-context snippets and a manually saved, browser-local recipe library with JSON transfer.
- **Artisan UI Studio:** eight offline palettes (Vaporwave Sunset, Tanjore Regal, Primer, Catppuccin, Nord, Dracula, Rosé Pine, Tokyo Night) with glow/border/arch/lattice/backdrop controls.

## Use

Open **Workflow → Open Aura Studio** in Harness.

1. **Run this workflow** sits at the top; its task text is the same draft as the startup composer. **Add sources** shares documents, notebook exports, code and images with the native attachment shelf. Nothing is sent to a model until you submit.
2. Reorder stages by dragging cards, using arrows, or connecting an **Out** port to an **In** port (keyboard navigation is supported). Reconnection preserves one sequential chain; arbitrary branching DAGs are not supported.
3. Each stage has a model selector scoped to its provider card. Auto-match is a model-name heuristic, not a quota, capability or price guarantee.
4. Send a workflow request; Aura compiles a native `workflow` tool request and passes it through the resident composer. The orchestrator must invoke that tool; successful admission does not prove execution. Provider billing and quotas apply.
5. In **Artisan UI Studio**, pick a palette and adjust visual controls. Appearance persists through the host-backed `ui-aura` settings namespace (normally `$DSH_HOME/settings.yaml`) and is applied by a synchronous pre-paint bootstrap.

## Platform limits

The installed Harness workflow API accepts provider/model routing but explicitly rejects per-stage `effort`, `isolation`, and `agentType` options. Aura's effort and tool controls are therefore labeled **prompt guidance**, not native enforcement. Harness permissions, subagent model allowlists, total-agent limits, cancellation, budgets, context support and provider billing remain authoritative.

Stage snippet selections are direct context routing, not security or access-control isolation. The editor represents one connected sequential pipeline, not a branching DAG. Custom SVGs are bounded and restricted to self-contained shapes; untrusted content is never interpolated into raw HTML/CSS/scripts. NotebookLM exports can be attached, but Aura does not connect to NotebookLM accounts or provide permanent directory-style source indexing. Provider pricing, quota, multimodal support, ZDR and retention are not verified.

## Verify

Run `npm run build` then `npm test` using Node.js 22 or newer. Tests cover schemas, safe SVGs, host injection, pre-paint bootstrap, pipeline routing and failure, custom stages, graph validation, snippet bounds, and native composer integration seams. The optional isolated settings integration test runs against an installed Harness: `node packages/dsh-ui-aura/scripts/test-settings.mjs <installed-node_modules>` (it uses a synthetic temporary settings document). No inference is required for these tests.

## Security and license

No credentials, private conversations, research PDFs, `.dsh` settings, or local provider settings belong in this repository. Recipes are saved in the browser; provider credentials stay in Harness. See [SECURITY.md](SECURITY.md) for reporting guidance and [theme attribution](docs/THEME_SOURCES.md) for upstream notices.

Aura is released under the [MIT License](LICENSE). The theme projects retain their own licenses, copied into `docs/theme-licenses`.

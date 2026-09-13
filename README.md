# DeepSeek Harness Aura 1.3.1

Aura adds a model-assigned workflow editor, reusable workflow notes, a live activity inspector, and six whole-interface theme adaptations to DeepSeek Harness.

**Status:** Open-source web plugin for an existing DeepSeek Harness installation. It is not a hosted service or a model provider; you use your own Harness configuration and provider access. The source and tests are available here under MIT.

## Quick start

1. [Download this repository](https://github.com/iamhariize-maker/deepseek-harness-aura/archive/refs/heads/main.zip) or clone it. You need an existing DeepSeek Harness **web** profile.
2. Copy `packages/dsh-ui-aura` from the download into your profile at `<DSH_HOME>/profiles/web/packages/dsh-ui-aura` (`DSH_HOME` defaults to `~/.dsh`).
3. Add this entry to `<DSH_HOME>/profiles/web/cordis.patch.yml`, preserving its existing entries:

   ```yaml
   - insert:
       - id: ui-aura
         name: ./packages/dsh-ui-aura/lib/index.js
   ```

4. Restart the Harness web process and refresh the browser. Open **Workflow → Open Aura Studio**.

For a Windows PowerShell walkthrough, verification and removal, see [Installation](docs/INSTALL.md). This repository is currently a source distribution; it is not published as an npm package or a one-command `dsh plugin add` bundle.

## What Aura does

- **Agent Workflow:** choose the model for each role, reorder the five stages, save a recipe per conversation, and send a native Harness workflow request. Auto-match uses the live model catalogue and task description.
- **Jobs & Skills:** save versioned reusable notes and transfer recipes as JSON.
- **Live inspector:** see the active agent/job lineage reported by Harness.
- **UI Design:** apply six bundled palette adaptations across the Harness interface. These are theme palettes, not remote executable layouts.

## Use

Open **Workflow → Open Aura Studio** in Harness.

1. Aura selects a provider/model for each of the five roles from the live Harness catalogue. With no task description, it balances stronger planning, implementation and review models with faster scouting and checking models. Describing a coding, research, visual, reasoning or writing task re-ranks automatic choices. You can change a role manually; that choice stays fixed until you select **Auto-match all roles**. Credentials remain with Harness.
2. Drag cards or use their arrow buttons to arrange the chain. Assignments and ordering are saved separately for each conversation.
3. Enter a task and choose **Send workflow request**. Aura selects the orchestrator and sends the compiled native `workflow` tool request into that conversation. The model must invoke that tool; successful message admission does not prove the workflow executed. Actual execution appears in the Harness conversation and live inspector. Provider billing and quotas apply.
4. In **Jobs & Skills**, write reusable notes and save a version. Identical versions are deduplicated. Load or delete saved versions individually. JSON transfer includes model assignments and notes. New conversations begin with a fresh recipe.
5. In **UI Design**, select Primer, Catppuccin, Nord, Dracula, Rosé Pine, or Tokyo Night. Native semantic tokens recolor the whole app while preserving its light/dark mode. These are bundled palette adaptations, not downloaded executable layouts. See [theme attribution](docs/THEME_SOURCES.md).

The editor locks while its session lineage reports running agents/jobs. Start is also disabled during message admission. Export requests a browser download and exposes selectable JSON as a fallback for browsers that block downloads.

## Platform limits

The native workflow agent hook accepts provider/model overrides, but not enforced per-role tool restrictions or reasoning effort. Those settings are labelled guidance. Harness permissions, subagent model allowlists, total-agent limits and cancellation remain authoritative. A five-stage recipe needs a preset permitting at least five workflow agents; capped presets may reject it. Listed models may still lack quota or be disallowed for subagents. Aura does not silently replace unavailable routes or estimate bills from invented prices.

Automatic matching uses transparent role/task rules and model names available from Harness. The catalogue does not provide dependable live quota, route health or price data, so these recommendations cannot guarantee the cheapest working route. A disappeared or non-routable model is replaced from the current catalogue when models refresh; valid manual choices are preserved.

The native tool request is orchestrator-mediated, not a new deterministic host executor. No separate host controller, autonomous learning, arbitrary DAG branching, automatic GitHub updates, or cross-browser memory sync is claimed. Local recipe storage uses the existing v1 format with backward-compatible model and memory fields. Saved notes are supplied as workflow context when you send a task.

## Verify

Run `npm test` using Node.js 22 or newer. Tests cover recipe semantics, model/memory round-trip, executable workflow compilation with synthetic agents, stop-on-failure, theme maps, and the original session/job/skill integration. No inference is required for these tests.

## Security and license

No credentials, private conversations, research PDF, or local provider settings belong in this repository. Recipes are saved in the browser; provider credentials stay in Harness. See [SECURITY.md](SECURITY.md) for reporting guidance and [theme attribution](docs/THEME_SOURCES.md) for upstream notices.

Aura is released under the [MIT License](LICENSE). The theme projects retain their own licenses, copied into `docs/theme-licenses`.

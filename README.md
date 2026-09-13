# DeepSeek Harness Aura 1.3.1

Aura adds a model-assigned workflow editor, reusable workflow notes, a live activity inspector, and six whole-interface theme adaptations to DeepSeek Harness.

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

## Install

Copy `packages/dsh-ui-aura` into your Harness profile's `packages` directory and add a Cordis patch row named `./packages/dsh-ui-aura/lib/index.js`. Do not overwrite existing patch entries. The package declares its web client dependencies. Refresh the web page after updating.

## Verify

Run `npm test` using Node.js 22 or newer. Tests cover recipe semantics, model/memory round-trip, executable workflow compilation with synthetic agents, stop-on-failure, theme maps, and the original session/job/skill integration. No inference is required for these tests.

## Security and license

No credentials, private conversations, research PDF, or local provider settings belong in this repository. Recipes are saved in the browser; provider credentials stay in Harness. See [SECURITY.md](SECURITY.md) for reporting guidance and [theme attribution](docs/THEME_SOURCES.md) for upstream notices.

Aura is released under the [MIT License](LICENSE). The theme projects retain their own licenses, copied into `docs/theme-licenses`.

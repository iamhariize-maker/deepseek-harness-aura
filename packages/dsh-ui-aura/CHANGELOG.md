# Aura Studio 2.0 — local release

## Added

- Shared Harness attachment shelf beside Run this workflow: native drafts, uploads, retries, removal, image limits, and composer submission.
- Shared task text with the startup composer; no silent reference-chip flattening.
- Sequential pipeline ports with keyboard connection and drag/drop, card reordering, and custom stages.
- Connected-provider cards and provider-scoped model menus.
- Eight offline theme adaptations, artisan controls, and conversation-scroll backdrops.
- Host settings registration and generated, synchronous pre-paint theme injection.
- Safe SVG validation, bounded snippet imports, keyboard tabs, focus containment, and responsive layout fixes.
- Automated core tests and an isolated real-Harness settings integration test.

## Verified locally

- Synthetic attachment added in Aura appeared in the native startup composer.
- Native startup attachment appeared in Aura, reached uploaded status, and was removed from the shared draft.
- Workflow task text synchronized to the startup composer; test text was cleared without sending.
- Connection ports reordered the chain, then restored the original order.
- Host theme selection survived browser reload; one adopted CSS tag and one palette tag were present.
- Schema, SVG, workflow routing/failure, custom-stage and invalid-input tests passed.
- Real settings-provider integration preserved unrelated YAML and comments, rejected invalid writes, serialized updates, and survived provider restart.

## Deliberate limits

No billable model run was submitted during release verification. Native per-stage reasoning overrides and per-stage permission isolation are not supported by this installed Harness workflow API. The UI labels guidance honestly. The editor creates sequential pipelines, not branching graphs. The source shelf accepts notebook exports; it does not connect to the NotebookLM service or promise permanent source indexing.

Theme palettes are local adaptations/inspirations, not official integrations with those projects. Retain the destination repository's existing licensing and attribution policy when publishing.

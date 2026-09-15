# Aura 2.0.1 — live workflow topology

Aura 2.0.1 turns the workflow surface into a live, connected representation of the saved recipe rather than a passive list of agent records.

## Added

- A compact provider/model topology in the **Agent Workflow** dock. Each stage shows the exact saved `provider / model` route and opens its corresponding editor when selected.
- Real workflow-phase state mapping. A topology stage is shown as running only when the active Harness workflow reports that stage role; historical or unrelated subagents cannot make a stage look live.
- Live recipe synchronization between Aura Studio and the dock. Changes made to models, ordering, custom stages, or connections are reflected immediately.
- Richer pipeline cards in Aura Studio: route metadata, explicit ready/locked/link-source states, responsive graph layout, and visible linked connectors.

## Interaction model

- Drag a card or use its arrow controls to reorder the canonical sequential pipeline.
- Click an **Out** port and then an **In** port, or drag between them, to reconnect a stage. This updates the same recipe edge list used by workflow compilation; the rest of the sequential pipeline is regenerated safely.
- Editing is disabled while a Harness agent or job is active. The topology remains readable and continues to reflect reported live phases.

## Compatibility and limits

- Aura continues to use the native Harness workflow request and the user’s configured provider accounts. Nothing is sent until **Send workflow request** is used.
- The graph intentionally represents one sequential pipeline. It does not claim to support arbitrary branching DAGs.
- Provider availability, quotas, billing, and native permissions remain controlled by Harness.

## Verification

- `node --check packages/dsh-ui-aura/lib/client.js`
- `npm test`
- Manual localhost verification of the dock topology and editable Aura Studio chain.

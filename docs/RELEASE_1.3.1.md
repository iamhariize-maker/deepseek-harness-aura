# Aura 1.3.1 — automatic role matching

The workflow editor now fills every role from the live, routable Harness model catalogue. It derives a use case from the task description or recipe name and ranks available models by role. With no description, it uses a balanced default: capable planner/reviewer and coding implementer, with faster scout/verifier where offered. The UI labels automatic versus manual choices and provides **Auto-match all roles** to reset them intentionally.

Manual choices survive task edits and JSON transfer. Automatic choices update when the description changes. A route missing from a refreshed catalogue is replaced; a valid saved assignment is preserved on reload. No model is changed in the active Harness session until the user sends a workflow request.

Ranking is heuristic because the installed catalogue does not expose live price, quota, or account health. Provider selection remains subject to subagent allowlists and available credits. Tests use a synthetic catalogue and make no inference calls.

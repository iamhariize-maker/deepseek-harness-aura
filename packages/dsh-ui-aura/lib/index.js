/**
 * dsh-ui-aura — host (Node) half.
 *
 * This package is a pure client bundle: the host half only re-exports a
 * placeholder so the loader can mount the entry. The client half carries all
 * behavior and registers itself through `window.__ModuleLoader__.load`.
 */
export const name = "ui-aura";
export const inject = [];
export function apply() {}

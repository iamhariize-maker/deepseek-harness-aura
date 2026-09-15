/**
 * dsh-ui-aura — client bundle.
 *
 * A sleek, functionally-transparent layer for the DeepSeek Harness web GUI:
 *
 *  1. Refined design tokens (aurora accent, glass surfaces, calmer focus rings)
 *     added WITHOUT touching vendor hashed CSS-module classes, so existing
 *     layout contracts stay intact.
 *  2. A live **Agent Workflow** view — the orchestrator + subagent tree, driven
 *     by the real `sessions` store (`byId`, `current`, `subagentsByParent`,
 *     `jobsBySession`).
 *  3. A **Plugin Activity** view — the active background job plus a recommended
 *     skill for the current session, from the real `remote.skills` catalog.
 *  4. A compact always-visible header pill summarizing live agent/job activity,
 *     which expands the dock on click.
 *
 * Surfaces register into existing slots (`shell.overlay`,
 * `conversation.session.header.actions`) — nothing is monkey-patched.
 *
 * Loaded through the module-loader facade: `window.__ModuleLoader__.load`.
 * Hand-written CJS-factory form — no JSX, no build step.
 */
window.__ModuleLoader__.load({
	id: "dsh-ui-aura",
	factory: (require) => {
		"use strict";
		const React = require("react");
		const { useEffect, useMemo, useState, useCallback } = React;
		const r = React.createElement;

		const PLUGIN_ID = "dsh-ui-aura";
		const NS = "aura";

		/* ================================================================== */
		/* Stylesheet                                                          */
		/* ================================================================== */

		/**
		 * Global token refinements. Deliberately additive: we introduce
		 * `--aura-*` custom properties and refine a few universal behaviors.
		 * `data-ds-dark-theme` is set ON <body> by the theme presenter, so the
		 * dark selectors must be written `body[data-ds-dark-theme]`.
		 */
		const AURA_CSS = `
:root, body {
  --aura-accent: #6d7cff;
  --aura-accent-2: #22d3ee;
  --aura-accent-3: #a855f7;
  --aura-ok: #34d399;
  --aura-warn: #fbbf24;
  --aura-err: #f87171;
  --aura-running: #60a5fa;
  --aura-ease: cubic-bezier(.4, 0, .2, 1);
}

body {
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Light + dark glass surfaces. The dark attribute lives on <body> itself. */
body {
  --aura-glass: linear-gradient(180deg, rgba(255,255,255,.62), rgba(255,255,255,.30));
  --aura-node-bg: rgba(255,255,255,.55);
}
body[data-ds-dark-theme] {
  --aura-glass: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.012));
  --aura-node-bg: rgba(255,255,255,.045);
}

/* A calmer, more visible focus ring across the app. */
.aura-dock :focus-visible, .aura-pill:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--aura-accent) 62%, transparent);
  outline-offset: 1px;
}

/* ------------------------------ dock ------------------------------ */

/* div.aura-dock (specificity 0,1,1) outranks the shell overlay layer's
   "overlayLayer > *" pointer-events rule (0,1,0) deterministically, so the
   dock itself stays click-through while its children remain interactive.
   The bottom offset clears the conversation composer; panels grow upward. */
div.aura-dock {
  position: absolute;
  right: 18px;
  top: auto;
  bottom: 176px;
  width: 340px;
  max-width: calc(100vw - 36px);
  max-height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 10px;
  z-index: 5;
  pointer-events: none;
}
div.aura-dock > * { pointer-events: auto; }

.aura-panel {
  background: var(--aura-glass), var(--dsw-specific-menu, var(--dsw-alias-bg-module-platform));
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: .5px solid var(--dsw-alias-border-l1);
  border-radius: 18px;
  box-shadow: var(--dsw-elevation-prominent);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: auraIn .22s var(--aura-ease) both;
}
@keyframes auraIn {
  from { opacity: 0; transform: translateY(8px) scale(.985); }
  to   { opacity: 1; transform: none; }
}

.aura-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: .5px solid var(--dsw-alias-border-l2);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-secondary);
  flex: none;
}
.aura-panel__head-title { flex: 1 1 auto; min-width: 0; }
.aura-panel__count {
  flex: none;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.aura-panel__body {
  padding: 8px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 34vh;
}

/* live pulse */
.aura-pulse {
  width: 7px; height: 7px; border-radius: 50%;
  flex: none;
  background: var(--aura-accent);
  box-shadow: 0 0 0 0 rgba(109,124,255,.55);
  animation: auraPulse 1.9s var(--aura-ease) infinite;
}
.aura-pulse--idle {
  background: var(--dsw-alias-label-caption);
  animation: none;
  box-shadow: none;
}
@keyframes auraPulse {
  0%        { box-shadow: 0 0 0 0 rgba(109,124,255,.5); }
  70%, 100% { box-shadow: 0 0 0 8px rgba(109,124,255,0); }
}

/* ------------------------- workflow topology ------------------------- */
.aura-topology { position: relative; display: grid; gap: 0; padding: 10px; background: linear-gradient(90deg, color-mix(in srgb, var(--aura-accent) 5%, transparent) 1px, transparent 1px) 0 0/18px 18px, linear-gradient(color-mix(in srgb, var(--aura-accent) 5%, transparent) 1px, transparent 1px) 0 0/18px 18px; }
.aura-topology__node { --aura-stage: var(--aura-accent); position: relative; z-index: 1; display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: 9px; width: 100%; padding: 9px; border: .5px solid color-mix(in srgb, var(--aura-stage) 34%, var(--dsw-alias-border-l3)); border-radius: 12px; background: color-mix(in srgb, var(--aura-node-bg) 92%, var(--aura-stage) 8%); color: var(--dsw-alias-label-primary); text-align: left; cursor: pointer; transition: transform .16s var(--aura-ease), border-color .16s var(--aura-ease), box-shadow .16s var(--aura-ease); }
.aura-topology__node:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--aura-stage) 68%, transparent); }
.aura-topology__node:focus-visible { outline: 2px solid var(--aura-stage); outline-offset: 2px; }
.aura-topology__node--running { box-shadow: 0 0 0 1px color-mix(in srgb, var(--aura-stage) 36%, transparent), 0 0 20px color-mix(in srgb, var(--aura-stage) 22%, transparent); }
.aura-topology__index { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; background: color-mix(in srgb, var(--aura-stage) 18%, transparent); color: var(--aura-stage); font-size: 10px; font-weight: 750; font-variant-numeric: tabular-nums; }
.aura-topology__copy { display: grid; min-width: 0; gap: 2px; }
.aura-topology__role { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 700; }
.aura-topology__model { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-secondary); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; }
.aura-topology__state { align-self: start; padding: 3px 6px; border-radius: 999px; background: color-mix(in srgb, var(--aura-stage) 13%, transparent); color: var(--aura-stage); font-size: 9px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
.aura-topology__node--running .aura-topology__state { animation: auraTopologyPulse 1.4s var(--aura-ease) infinite; }
.aura-topology__edge { position: relative; z-index: 0; height: 15px; margin-left: 23px; border-left: 1px solid color-mix(in srgb, var(--aura-accent-2) 55%, var(--dsw-alias-border-l3)); }
.aura-topology__edge::after { content: ""; position: absolute; bottom: -1px; left: -4px; width: 7px; height: 7px; border-right: 1px solid var(--aura-accent-2); border-bottom: 1px solid var(--aura-accent-2); transform: rotate(45deg); }
@keyframes auraTopologyPulse { 50% { opacity: .55; } }

/* --------------------------- workflow tree --------------------------- */

.aura-node {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  border-radius: 11px;
  border: .5px solid transparent;
  font-size: 12.5px;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
  transition: background .16s var(--aura-ease), border-color .16s var(--aura-ease);
}
.aura-node--root {
  font-weight: 600;
  background: linear-gradient(118deg,
    color-mix(in srgb, var(--aura-accent) 15%, transparent),
    color-mix(in srgb, var(--aura-accent-2) 9%, transparent));
  border-color: color-mix(in srgb, var(--aura-accent) 32%, transparent);
}
.aura-node--child {
  margin-left: 15px;
  background: var(--aura-node-bg);
  border-color: var(--dsw-alias-border-l3);
}
/* Tree connectors: a horizontal tick plus a vertical rail continuing to the
   next sibling. The rail lives on ::after and stops at the tick for the last
   child of a branch. Both are drawn outside the node box, so .aura-node must
   NOT set overflow:hidden. (The running sweep uses the spark element's own
   ::after, so there is no pseudo-element collision.) */
.aura-node--child::before {
  content: "";
  position: absolute;
  left: -11px;
  top: 50%;
  width: 9px;
  height: .5px;
  background: var(--dsw-alias-border-l3);
}
.aura-node--child::after {
  content: "";
  position: absolute;
  left: -11px;
  top: -5px;
  width: .5px;
  background: var(--dsw-alias-border-l3);
}
.aura-node--child:not(.aura-node--last)::after { bottom: -5px; }
.aura-node--child.aura-node--last::after { height: calc(50% + 5px); }
.aura-node--current {
  border-color: color-mix(in srgb, var(--aura-accent) 55%, transparent);
  box-shadow: inset 0 0 0 .5px color-mix(in srgb, var(--aura-accent) 22%, transparent);
}
.aura-node__spark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
}
.aura-node--running .aura-node__spark::after {
  content: "";
  position: absolute;
  top: 0; bottom: 0;
  width: 80px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent);
  animation: auraSweep 2.3s linear infinite;
}
@keyframes auraSweep { from { left: -90px; } to { left: 100%; } }

.aura-node__dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-caption); }
.aura-node__dot--running { background: var(--aura-running); animation: auraDot 1.5s var(--aura-ease) infinite; }
.aura-node__dot--done    { background: var(--aura-ok); }
@keyframes auraDot { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

.aura-node__label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.aura-node__badge {
  flex: none;
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: .05em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-caption);
}
.aura-node__badge--running { color: var(--aura-running); }

.aura-empty {
  font-size: 11.5px;
  line-height: 17px;
  color: var(--dsw-alias-label-tertiary);
  padding: 12px 10px;
  text-align: center;
}

/* -------------------------- plugin activity -------------------------- */

.aura-activity {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border-radius: 11px;
  background: var(--aura-node-bg);
  border: .5px solid var(--dsw-alias-border-l3);
}
.aura-activity__icon {
  width: 27px; height: 27px;
  border-radius: 8px;
  flex: none;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--aura-accent) 22%, transparent),
    color-mix(in srgb, var(--aura-accent-3) 22%, transparent));
  color: var(--aura-accent);
  font-size: 12px; font-weight: 700;
}
.aura-activity__main { flex: 1 1 auto; min-width: 0; }
.aura-activity__name {
  font-size: 12.5px; font-weight: 600;
  color: var(--dsw-alias-label-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.aura-activity__sub {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.aura-state {
  flex: none;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase;
  color: var(--dsw-alias-label-caption);
}
.aura-state--running { color: var(--aura-running); }
.aura-state--stopping, .aura-state--killed { color: var(--aura-warn); }
.aura-state--failed { color: var(--aura-err); }
.aura-state--completed { color: var(--aura-ok); }

.aura-recommend {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 9px;
  border-radius: 11px;
  border: .5px dashed color-mix(in srgb, var(--aura-accent-2) 42%, transparent);
  background: color-mix(in srgb, var(--aura-accent-2) 7%, transparent);
}
.aura-recommend__label {
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .07em; text-transform: uppercase;
  color: var(--aura-accent-2);
}
.aura-recommend__name { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.aura-recommend__desc {
  font-size: 11px; line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ----------------------------- launcher ----------------------------- */

.aura-fab {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px 7px 11px;
  border-radius: 999px;
  cursor: pointer;
  border: .5px solid var(--dsw-alias-border-l1);
  background: var(--aura-glass), var(--dsw-specific-menu, var(--dsw-alias-bg-module-platform));
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  box-shadow: var(--dsw-elevation-soft);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  transition: color .16s var(--aura-ease), transform .16s var(--aura-ease), box-shadow .16s var(--aura-ease);
}
.aura-fab:hover {
  color: var(--dsw-alias-label-primary);
  transform: translateY(-1px);
  box-shadow: var(--dsw-elevation-prominent);
}
.aura-fab__count { font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary); font-weight: 550; }

/* ---------------------------- header pill ---------------------------- */

.aura-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 3px 9px 3px 7px;
  border-radius: 999px;
  cursor: pointer;
  border: .5px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 11.5px;
  font-weight: 550;
  font-variant-numeric: tabular-nums;
  transition: color .16s var(--aura-ease), border-color .16s var(--aura-ease), background .16s var(--aura-ease);
}
.aura-pill:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l1); }
.aura-pill--live {
  color: var(--dsw-alias-label-secondary);
  border-color: color-mix(in srgb, var(--aura-accent) 34%, transparent);
  background: color-mix(in srgb, var(--aura-accent) 9%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .aura-pulse,
  .aura-node__dot--running,
  .aura-node--running .aura-node__spark::after,
  .aura-panel { animation: none !important; }
  .aura-fab, .aura-pill, .aura-node { transition: none; }
}
/* Compact inspector: clear hierarchy, stable surfaces, no composer overlap. */
div.aura-dock { font-family: "Segoe UI", sans-serif; box-sizing: border-box; }
.aura-dock * { box-sizing: border-box; }
.aura-dock--open { overflow-y: auto; overscroll-behavior: contain; padding: 3px; }
.aura-panel { flex-shrink: 0; border-radius: 14px; animation: none; }
.aura-panel__head { padding: 13px 14px; }
.aura-panel__head-title { font-size: 13px; letter-spacing: 0; text-transform: none; }
.aura-panel__body { padding: 10px; }
.aura-node { min-height: 34px; }
.aura-recommend { border-style: solid; }
.aura-recommend__reason { font-size: 11px; line-height: 1.5; opacity: .8; }
.aura-recommend__label, .aura-state, .aura-node__badge { text-transform: none; }
.aura-activity__sub, .aura-recommend__desc { opacity: .85; }
.aura-recommend__desc { -webkit-line-clamp: 3; }
.aura-activity__sub { white-space: normal; line-height: 1.5; }
.aura-fab { min-height: 36px; }
.aura-dock--open > .aura-fab { order: -1; align-self: flex-end; flex-shrink: 0; }
.aura-retry { border: 1px solid currentColor; border-radius: 6px; padding: 5px 9px; background: transparent; color: inherit; align-self: flex-start; cursor: pointer; }
.aura-studio-launch { border: 1px solid color-mix(in srgb, var(--aura-accent) 45%, transparent); border-radius: 9px; padding: 9px 11px; background: color-mix(in srgb, var(--aura-accent) 12%, transparent); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; text-align: left; }
.aura-studio-launch:hover { background: color-mix(in srgb, var(--aura-accent) 20%, transparent); }
.aura-studio-backdrop { position: fixed; inset: 0; z-index: 10000; background: rgba(5,9,18,.66); display: grid; place-items: center; padding: 18px; pointer-events: auto; }
.aura-studio { width: min(1180px, 100%); max-height: min(780px, calc(100dvh - 36px)); overflow: hidden; display: flex; flex-direction: column; border-radius: 18px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-specific-menu, var(--dsw-alias-bg-module-platform)); color: var(--dsw-alias-label-primary); box-shadow: 0 24px 70px rgba(0,0,0,.35); font: 13px/1.4 "Segoe UI", sans-serif; }
.aura-studio * { box-sizing: border-box; }
.aura-studio__head { display: flex; flex-shrink:0; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.aura-studio__title { flex: 1; min-width: 0; }
.aura-studio__title strong { display: block; font-size: 19px; letter-spacing: -.02em; }
.aura-studio__title small { display: block; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.aura-studio__tabs { display: flex; flex-shrink:0; gap: 4px; padding: 8px 16px 0; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.aura-studio__tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary); padding: 9px 12px; font: inherit; cursor: pointer; }
.aura-studio__tabs button[aria-selected="true"] { color: var(--aura-accent); border-bottom-color: var(--aura-accent); font-weight: 700; }
.aura-studio__body { overflow: auto; padding: 18px 20px 22px; min-height: 0; }
.aura-studio__row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 14px; }
.aura-studio__row--between { justify-content: space-between; }
.aura-studio input, .aura-studio select, .aura-studio textarea { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--aura-node-bg); color: var(--dsw-alias-label-primary); font: inherit; padding: 8px 10px; min-height: 36px; }
.aura-studio input[type="checkbox"], .aura-studio input[type="color"] { min-height: auto; padding: 0; }
.aura-studio input[type="text"] { min-width: 180px; flex: 1; }
.aura-studio button { font: inherit; cursor: pointer; }
.aura-studio__button { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--aura-node-bg); color: var(--dsw-alias-label-primary); padding: 7px 10px; min-height: 34px; }
.aura-studio__button:hover { border-color: var(--aura-accent); }
.aura-studio__button:disabled { opacity: .45; cursor: not-allowed; }
.aura-studio__button--primary { background: var(--aura-accent); border-color: var(--aura-accent); color: #fff; font-weight: 700; }
.aura-studio__muted { color: var(--dsw-alias-label-secondary); font-size: 12px; max-width:80ch; line-height:1.55; }
.aura-studio__notice { padding: 10px 12px; border-radius: 9px; border: 1px solid color-mix(in srgb, var(--aura-accent) 35%, transparent); background: color-mix(in srgb, var(--aura-accent) 9%, transparent); margin: 0 0 14px; }
.aura-studio__notice--error { border-color: var(--aura-err); background: color-mix(in srgb, var(--aura-err) 10%, transparent); }
.aura-graph { display: flex; align-items: stretch; gap: 0; overflow-x: auto; padding: 8px 2px 16px; }
.aura-graph__step { display: flex; flex: 1 0 156px; min-width: 156px; align-items: center; }
.aura-graph__node { flex: 1; min-height: 120px; border: 1px solid color-mix(in srgb, var(--aura-accent) 35%, var(--dsw-alias-border-l1)); border-radius: 12px; padding: 11px; background: linear-gradient(155deg, color-mix(in srgb, var(--aura-accent) 12%, transparent), var(--aura-node-bg)); }
.aura-graph__node[draggable="true"] { cursor: grab; }
.aura-graph__node[aria-disabled="true"] { opacity: .65; }
.aura-graph__node strong { display: block; font-size: 14px; margin: 3px 0 5px; }
.aura-graph__node small { color: var(--dsw-alias-label-tertiary); }
.aura-graph__connector { flex: 0 0 24px; color: var(--aura-accent); font-size: 20px; text-align: center; }
.aura-graph__order { display: flex; justify-content: flex-end; gap: 3px; margin-top: 12px; }
.aura-graph__order button { border: 0; border-radius: 5px; background: var(--aura-node-bg); color: inherit; padding: 1px 6px; }
.aura-role-editor { display: grid; grid-template-columns: 120px minmax(180px,2fr) minmax(100px,1fr); align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--dsw-alias-border-l2); }
.aura-theme-card strong,.aura-theme-card small {display:block;margin-top:6px}.aura-theme-card small {line-height:1.45}.aura-studio a {color:var(--dsw-alias-link)}
 .aura-model-field {display:grid;gap:5px;min-width:0}.aura-model-field select {width:100%;min-width:0}.aura-model-badge {display:block;margin-top:8px;font-size:11px;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary)}
 .aura-studio textarea {display:block;width:100%;box-sizing:border-box;min-height:100px;padding:12px;margin:10px 0;color:inherit;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;resize:vertical;font:inherit}
 .aura-execution {margin-top:22px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1)}
 .aura-role-editor__tools { display: flex; flex-wrap: wrap; gap: 5px 10px; }
.aura-role-editor__tools label { white-space: nowrap; }
.aura-memory-card { border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 12px; margin: 9px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.aura-memory-card strong { flex: 1 1 170px; }
.aura-theme-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; }
.aura-theme-card { text-align: left; border: 2px solid transparent; border-radius: 12px; padding: 9px; background: var(--aura-node-bg); color: var(--dsw-alias-label-primary); }
.aura-theme-card[aria-pressed="true"] { border-color: var(--aura-accent); }
.aura-theme-swatch { display: block; height: 78px; border-radius: 8px; margin-bottom: 8px; }

/* -------------------- Artisan Studio / visual engine -------------------- */
.aura-studio { width:min(1320px,100%); border-radius:var(--aura-arch,18px); }
.aura-studio__head { background:linear-gradient(100deg,color-mix(in srgb,var(--aura-accent) 11%,transparent),transparent 44%); }
.aura-studio__tabs { overflow-x:auto; }
.aura-studio__tabs button { white-space:nowrap; }
.aura-studio__body { position:relative; isolation:isolate; background:linear-gradient(145deg,color-mix(in srgb,var(--aura-accent-2) 4%,transparent),transparent 42%); }
.aura-graph { position:relative; padding:26px 14px 28px; border:1px solid color-mix(in srgb,var(--aura-accent) 28%,var(--dsw-alias-border-l1)); border-radius:var(--aura-arch,16px); background:color-mix(in srgb,var(--aura-accent) 3%,var(--aura-node-bg)); isolation:isolate; }
.aura-graph::before { content:""; position:absolute; inset:0; pointer-events:none; z-index:-1; opacity:.38; background-image:linear-gradient(color-mix(in srgb,var(--aura-accent) 16%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--aura-accent) 16%,transparent) 1px,transparent 1px); background-size:24px 24px; mask-image:linear-gradient(to bottom,black,transparent); }
.aura-graph__step { flex:0 0 min(276px,78vw); min-width:240px; }
.aura-graph__node { position:relative; display:flex; flex-direction:column; gap:7px; min-height:186px; border-radius:calc(var(--aura-arch,16px) - 4px); padding:14px; box-shadow:0 8px 30px color-mix(in srgb,var(--aura-accent-2) calc(var(--aura-glow,55) * .15%),transparent); }
.aura-graph__node[data-stage-state="source"] { border-color:var(--aura-accent-2); box-shadow:0 0 0 2px color-mix(in srgb,var(--aura-accent-2) 32%,transparent),0 8px 30px color-mix(in srgb,var(--aura-accent-2) 24%,transparent); }
.aura-graph__node[data-stage-state="locked"] { filter:saturate(.65); }
.aura-graph__head { display:flex; align-items:center; justify-content:space-between; gap:8px; color:var(--dsw-alias-label-tertiary); font-size:11px; }
.aura-graph__index { font-variant-numeric:tabular-nums; }
.aura-graph__state { color:var(--aura-accent-2); font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
.aura-graph__route { display:block; min-height:18px; overflow:hidden; color:var(--dsw-alias-label-secondary); font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace; text-overflow:ellipsis; white-space:nowrap; }
.aura-graph__node::before { content:""; position:absolute; width:9px; height:9px; right:10px; top:10px; border-radius:50%; background:var(--aura-accent-2); box-shadow:0 0 calc(var(--aura-glow,55) * .22px) var(--aura-accent-2); }
.aura-graph__connector { display:grid; flex:0 0 40px; place-items:center; font-size:0; position:relative; }
.aura-graph__connector::before { content:""; width:100%; border-top:var(--aura-border-weight,2px) solid var(--aura-accent); opacity:.72; }
.aura-graph__connector::after { content:"›"; font-size:22px; position:absolute; right:0; color:var(--aura-accent); }
.aura-graph__connector--linked::before { box-shadow:0 0 12px color-mix(in srgb,var(--aura-accent) 52%,transparent); }
.aura-role-editor { grid-template-columns:150px minmax(220px,2fr) minmax(145px,1fr); padding:14px; border:1px solid var(--dsw-alias-border-l2); border-radius:var(--aura-arch,12px); background:color-mix(in srgb,var(--aura-accent) 4%,var(--aura-node-bg)); }
.aura-role-editor__controls { display:grid; gap:8px; }
.aura-effort { display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center; min-width:0; }
.aura-effort input { width:100%; min-height:auto; accent-color:var(--aura-accent); }
.aura-effort output { min-width:52px; font-size:11px; color:var(--aura-accent); font-weight:700; }
.aura-stage-adder,.aura-file-shelf,.aura-visual-controls { border:1px dashed color-mix(in srgb,var(--aura-accent) 46%,var(--dsw-alias-border-l1)); border-radius:var(--aura-arch,12px); padding:14px; margin-top:16px; background:color-mix(in srgb,var(--aura-accent) 5%,transparent); }
.aura-stage-adder h3,.aura-file-shelf h3,.aura-visual-controls h3 { margin:0 0 6px; font-size:14px; }
.aura-stage-adder__form { display:grid; grid-template-columns:minmax(170px,1fr) minmax(170px,1fr) auto; gap:8px; align-items:end; }
.aura-file-shelf__drop { min-height:84px; padding:14px; display:grid; place-items:center; text-align:center; border:1px dashed color-mix(in srgb,var(--aura-accent-2) 56%,var(--dsw-alias-border-l1)); border-radius:calc(var(--aura-arch,12px) - 3px); color:var(--dsw-alias-label-secondary); background:var(--aura-node-bg); }
.aura-file-shelf__drop[data-dragging="true"] { border-style:solid; background:color-mix(in srgb,var(--aura-accent-2) 12%,var(--aura-node-bg)); color:var(--aura-accent-2); }
.aura-file-card { display:grid; grid-template-columns:minmax(150px,1fr) auto; gap:10px; align-items:start; padding:11px 0; border-bottom:1px solid var(--dsw-alias-border-l2); }
.aura-file-card:last-child { border-bottom:0; }
.aura-file-card__readers { grid-column:1 / -1; display:flex; flex-wrap:wrap; gap:5px 10px; font-size:11px; }
.aura-file-card__readers label { white-space:nowrap; }
.aura-visual-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.aura-visual-grid label { display:grid; gap:5px; color:var(--dsw-alias-label-secondary); font-size:12px; }
.aura-visual-grid input[type="range"] { padding:0; accent-color:var(--aura-accent); }
.aura-backdrop-preview { position:relative; min-height:92px; overflow:hidden; border:1px solid var(--dsw-alias-border-l2); border-radius:var(--aura-arch,12px); background:var(--aura-node-bg); }
.aura-backdrop-preview::before { content:""; position:absolute; inset:0; opacity:var(--aura-backdrop-opacity,.08); filter:blur(var(--aura-backdrop-blur,0)); background-image:var(--aura-custom-backdrop); background-size:cover; background-position:center; }
body[data-aura-backdrop="sun-grid"] .aura-backdrop-preview::before { background-image:linear-gradient(#ff007f 1px,transparent 1px),linear-gradient(90deg,#00f0ff 1px,transparent 1px),radial-gradient(circle at 50% -12%,#ffbd3f 0 26%,transparent 27%); background-size:18px 18px,18px 18px,100% 100%; }
body[data-aura-backdrop="jali"] .aura-backdrop-preview::before { background-image:radial-gradient(circle at 50% 0,transparent 32%,#0d5c75 33% 36%,transparent 37%),linear-gradient(45deg,transparent 46%,#eaa221 47% 53%,transparent 54%),linear-gradient(-45deg,transparent 46%,#eaa221 47% 53%,transparent 54%); background-size:28px 28px; }
body[data-aura-backdrop="peacock"] .aura-backdrop-preview::before { background-image:radial-gradient(ellipse at center,#eaa221 0 14%,#0d5c75 15% 31%,transparent 32%),radial-gradient(ellipse at center,#b84a39 0 15%,transparent 16%); background-size:42px 42px,84px 84px; }
body[data-aura-skin="vaporwave-sunset"] .aura-studio { box-shadow:0 0 calc(var(--aura-glow,55) * .72px) rgba(255,0,127,.32),0 24px 70px rgba(0,0,0,.4); }
body[data-aura-skin="vaporwave-sunset"] .aura-studio__body { background-image:linear-gradient(145deg,rgba(255,0,127,.05),transparent 42%); }
body[data-aura-skin="vaporwave-sunset"] .aura-graph::before { opacity:.7; transform:perspective(440px) rotateX(52deg) scale(1.45) translateY(30%); transform-origin:center bottom; mask-image:none; }
body[data-aura-skin="vaporwave-sunset"] .aura-graph__node { box-shadow:0 0 calc(var(--aura-glow,55) * .12px) rgba(0,240,255,.12); }
body[data-aura-skin="tanjore-regal"] .aura-studio,body[data-aura-skin="tanjore-regal"] .aura-role-editor,body[data-aura-skin="tanjore-regal"] .aura-file-shelf { border-image:linear-gradient(135deg,#ecc94b,#d69e2e,#b7791f,#ecc94b) 1; }
body[data-aura-skin="tanjore-regal"] .aura-studio__head { background:linear-gradient(105deg,rgba(234,162,33,.18),rgba(13,92,117,.08) 55%,transparent); }
body[data-aura-skin="tanjore-regal"] .aura-studio__body::before { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; opacity:var(--aura-lattice-opacity,.08); background-image:radial-gradient(circle at 50% 0,transparent 34%,#eaa221 35% 38%,transparent 39%),linear-gradient(45deg,transparent 46%,#0d5c75 47% 53%,transparent 54%),linear-gradient(-45deg,transparent 46%,#0d5c75 47% 53%,transparent 54%); background-size:38px 38px; }
@media (max-width: 760px) { .aura-stage-adder__form,.aura-visual-grid { grid-template-columns:1fr; } .aura-role-editor { grid-template-columns:1fr; } .aura-file-card { grid-template-columns:1fr; } }
@media (max-width: 600px) {
  div.aura-dock { right: 10px; top: auto; bottom: 158px; max-width: calc(100vw - 20px); max-height: calc(100dvh - 250px); }
  .aura-panel__body { max-height: 24vh; }
  .aura-studio-backdrop { padding: 4px; }
  .aura-studio { max-height: calc(100dvh - 8px); border-radius: 10px; }
  .aura-studio__head { padding: 11px 13px; }
  .aura-studio__body { padding: 12px; }
  .aura-role-editor { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .aura-theme-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}

.aura-source-dock { border: 1px dashed var(--aura-accent); border-radius: 16px; padding: 18px; margin-block: 12px; background: var(--dsw-alias-bg-layer-1); }
body[data-aura-backdrop]:not([data-aura-backdrop="none"]) [data-conversation-scroll] { position:relative; isolation:isolate; }
body[data-aura-backdrop]:not([data-aura-backdrop="none"]) [data-conversation-scroll]::before { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; opacity:var(--aura-backdrop-opacity,.08); filter:blur(var(--aura-backdrop-blur,0)); background-image:var(--aura-custom-backdrop); background-size:cover; background-position:center; }
body[data-aura-backdrop="sun-grid"] [data-conversation-scroll]::before { background-image:linear-gradient(#ff007f 1px,transparent 1px),linear-gradient(90deg,#00f0ff 1px,transparent 1px),radial-gradient(circle at 50% -12%,#ffbd3f 0 26%,transparent 27%); background-size:18px 18px,18px 18px,100% 100%; }
body[data-aura-backdrop="jali"] [data-conversation-scroll]::before { background-image:radial-gradient(circle at 50% 0,transparent 32%,#0d5c75 33% 36%,transparent 37%),linear-gradient(45deg,transparent 46%,#eaa221 47% 53%,transparent 54%),linear-gradient(-45deg,transparent 46%,#eaa221 47% 53%,transparent 54%); background-size:28px 28px; }
body[data-aura-backdrop="peacock"] [data-conversation-scroll]::before { background-image:radial-gradient(ellipse at center,#eaa221 0 14%,#0d5c75 15% 31%,transparent 32%),radial-gradient(ellipse at center,#b84a39 0 15%,transparent 16%); background-size:42px 42px,84px 84px; }
body[data-aura-skin="vaporwave-sunset"] [data-state="running"] { box-shadow:0 0 calc(var(--aura-glow,55) * .15px) #ff007f30; }
body[data-aura-skin="tanjore-regal"] [data-composer-card] { border:var(--aura-border-weight,2px) solid #b7791f; border-radius:var(--aura-arch,16px); }
.aura-source-row { display: flex; align-items: center; gap: 10px; border-top: 1px solid var(--dsw-alias-border-l2); padding-block: 12px; }
.aura-source-row > div { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.aura-source-row small { display: block; margin-top: 4px; color: var(--dsw-alias-label-secondary); }
.aura-source-row button { flex-shrink: 0; }
.aura-ports { display:flex; justify-content:space-between; gap:8px; margin-block:10px 4px; }
.aura-ports button { border:1px solid var(--aura-accent); border-radius:16px; padding:5px 9px; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); cursor:crosshair; font:inherit; }
.aura-ports button[aria-pressed="true"] { background:var(--aura-accent); color:var(--dsw-alias-bg-base); }
.aura-provider-cards { display:flex; flex-wrap:wrap; gap:6px; grid-column:1/-1; }
.aura-provider-cards button { border:1px solid var(--dsw-alias-border-l2); border-radius:8px; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); font:inherit; padding:7px 10px; cursor:pointer; }
.aura-provider-cards button[aria-pressed="true"] { border-color:var(--aura-accent); color:var(--dsw-alias-label-primary); box-shadow:inset 0 -2px var(--aura-accent); }
.aura-provider-cards button:disabled { opacity:.45; cursor:not-allowed; }
.aura-studio__body > .aura-execution { margin-top:0; padding-top:0; border-top:0; padding-bottom:22px; border-bottom:1px solid var(--dsw-alias-border-l2); }
body[data-aura-skin="tanjore-regal"] .aura-studio__title strong { font-family:Georgia,serif; font-size:25px; }
@media(max-width:600px) { .aura-role-editor { grid-template-columns:1fr; } .aura-source-row { flex-wrap:wrap; } .aura-source-row > div { flex-basis:100%; } }
`;

		/* ================================================================== */
		/* Pure helpers                                                        */
		/* ================================================================== */

		function basename(p) {
			const parts = String(p).split(/[\\/]/).filter(Boolean);
			return parts.length ? parts[parts.length - 1] : String(p);
		}

		function shortId(id) {
			const s = String(id ?? "");
			return s.length > 14 ? `${s.slice(0, 10)}\u2026` : s;
		}

		function titleOf(summary, fallbackId) {
			if (summary && typeof summary.title === "string" && summary.title !== "") return summary.title;
			if (summary?.displayTitle) return summary.displayTitle;
			if (summary && typeof summary.cwd === "string" && summary.cwd !== "") return basename(summary.cwd);
			return shortId(fallbackId);
		}

		function catalogChildren(catalogs, id) {
			const catalog = catalogs ? catalogs[id] : void 0;
			const entries = catalog && Array.isArray(catalog.entries) ? catalog.entries : [];
			return entries.filter((e) => e && e.kind === "child");
		}

		/**
		 * Flatten the live session lineage into depth-ordered graph nodes.
		 * Reads store snapshot fields only; never mutates its inputs.
		 */
		function buildWorkflow(byId, current, subagentsByParent) {
			const summaries = byId ?? {};
			const catalogs = subagentsByParent ?? {};
			const nodes = [];
			const seen = new Set();

			if (!current) return nodes;
            let root = current;
            const ancestors = new Set();
            while (!ancestors.has(root)) {
                ancestors.add(root);
                const parent = summaries[root]?.parentId ?? summaries[root]?.parentSessionId
                    ?? Object.keys(catalogs).find(id => catalogChildren(catalogs, id).some(c => c.id === root));
                if (!parent || ancestors.has(parent)) break;
                root = parent;
            }
            const roots = [{ id: root }];

			// Depth-first so DOM order matches tree order, which is what the
			// CSS connector rails assume. `entry` carries the catalog row, so a
			// child whose session summary has not hydrated yet still renders its
			// real label and activity instead of a bare id.
			const visit = (id, depth, isLast, entry) => {
				if (!id || seen.has(id) || depth > 8) return;
				seen.add(id);
				const summary = summaries[id];
				const children = [...catalogChildren(catalogs, id)];
                for (const [childId, row] of Object.entries(summaries)) {
                    if ((row.parentId ?? row.parentSessionId) === id && !children.some(c => c.id === childId))
                        children.push({ id: childId, kind: "child" });
                }
				nodes.push({
					id,
					depth,
					title: summary ? titleOf(summary, id) : (entry && entry.label) || shortId(id),
					phase: summary?.phase ?? entry?.phase ?? null,
					isSubagent: depth > 0,
					isLast: isLast !== false,
					running: summary
						? summary.running === true
						: entry
							? entry.activity === "running"
							: false,
					isCurrent: id === current
				});
				for (let i = 0; i < children.length; i++) {
					const child = children[i];
					visit(child.id, depth + 1, i === children.length - 1, child);
				}
			};

			for (let i = 0; i < roots.length; i++) {
				visit(roots[i].id, 0, i === roots.length - 1, void 0);
			}

			return nodes;
		}

		/** Flatten a session-keyed job map into one ordered list (live first). */
		function collectJobs(jobsBySession, nodes) {
			const map = jobsBySession ?? {};
			const out = [];
			for (const sessionId of Object.keys(map)) {
				if (nodes && !nodes.some(n => n.id === sessionId)) continue;
				const list = map[sessionId];
				if (!Array.isArray(list)) continue;
				for (const job of list) if (job && !out.some(j => j.id === job.id)) out.push(job);
			}
			out.sort((a, b) => {
				const liveA = isLiveJob(a);
				const liveB = isLiveJob(b);
				if (liveA !== liveB) return liveA ? -1 : 1;
				if (liveA) return (a.startedAt ?? 0) - (b.startedAt ?? 0);
				return (b.finishedAt ?? b.startedAt ?? 0) - (a.finishedAt ?? a.startedAt ?? 0);
			});
			return out;
		}

		/** Conservative local title matching; never spends model tokens or invokes a skill. */
        function recommendSkill(skills, title) {
            const stop = new Set("the and for with this that from have task work help need make create using agent plugin skill use all can into".split(" "));
            const aliases = { ui: "interface", ux: "usability", redesign: "design", frontend: "interface", designing: "design" };
            const tokens = text => [...new Set((String(text ?? "").toLowerCase().match(/[a-z][a-z0-9]+/g) ?? []).map(w => aliases[w] ?? w))].filter(w => w.length > 2 && !stop.has(w));
            const terms = tokens(title);
            const ranked = (skills ?? []).filter(s => s?.modelInvocable === true).map(skill => {
                const name = tokens(skill.name);
                const corpus = new Set(tokens(skill.name + " " + (skill.description ?? "")));
                const matched = terms.filter(t => corpus.has(t));
                return { skill, terms: matched, score: matched.reduce((n,t) => n + (name.includes(t) ? 3 : 1), 0) };
            }).filter(m => m.terms.length >= 2 || (m.score >= 3 && m.terms.some(t => t.length >= 5)))
              .sort((a,b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
            return ranked[0] ?? null;
        }

        function isLiveJob(job) {
			return !!job && (job.status === "running" || job.status === "stopping");
		}

		function formatElapsed(ms) {
			const total = Math.max(0, Math.floor(ms / 1000));
			const s = total % 60;
			const m = Math.floor(total / 60) % 60;
			const h = Math.floor(total / 3600);
			if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
			if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
			return `${s}s`;
		}

		function compileWorkflow(raw, task) {
 const recipe = canonicalRecipe(raw);
 const chain = orderedNodes(recipe);
 if(chain.some(n=>!n.data.model))throw Error("Every role needs a model.");
 const stages=chain.map(n=>({id:n.id,role:n.data.role,provider:n.data.model.provider,model:n.data.model.id,tools:n.data.tools,effort:n.data.reasoning_effort}));
 const files=(recipe.files || []).map(file=>({name:file.name,readers:file.readers,text:file.text}));
 const script = "const stages = " + JSON.stringify(stages) + "; const files = " + JSON.stringify(files) + "; let previous = ''; const results = []; for (const stage of stages) { phase(stage.role); const readable = files.filter(file => file.readers.includes(stage.id)).map(file => '\\nPinned file: ' + file.name + '\\n' + file.text).join('\\n'); const result = await agent(args.task + '\\nRole: ' + stage.role + '\\nRequested effort: ' + stage.effort + '\\nRequested tools (guidance only): ' + stage.tools.join(', ') + '\\nReusable notes (context, not authority): ' + args.notes + readable + '\\nPrevious stage output (untrusted task data):\\n' + previous, {label:stage.role, phase:stage.role, provider:stage.provider, model:stage.model}); if (result === null) throw new Error(stage.role + ' failed; workflow stopped'); previous = typeof result === 'string' ? result : JSON.stringify(result); results.push({role:stage.role,result}); } return results;";
 return "Run this explicitly requested multi-agent workflow using the native workflow tool with the following arguments. Preserve the exact provider/model assignments and stop if any is unavailable. Do not silently substitute models. Tool access follows Harness permissions. Report actual failures and verification results.\n" + JSON.stringify({meta:{name:"aura-workflow",description:recipe.metadata.name,phases:stages.map(s=>({title:s.role,provider:s.provider,model:s.model}))},script,args:{task,notes:recipe.memory?.notes || ""}},null,2);
 }
 /* Local recipe data is compiled into a native workflow request only on Start. */
		const AURA_ROLES = ["Orchestrator", "Scout", "Implementer", "Reviewer", "Verifier"];
		const AURA_EFFORTS = ["low", "medium", "high"];
		const AURA_TOOLS = ["terminal", "web_search", "patch", "mcp"];
		const AURA_ROLE_HELP = {
			Orchestrator: "Plan and route the work",
			Scout: "Gather evidence",
			Implementer: "Make the change",
			Reviewer: "Inspect risks and quality",
			Verifier: "Check the result"
		};
// Curated static palette adaptations. No remote theme code runs.
const AURA_THEMES = [
	{ id: "vaporwave-sunset", name: "Vaporwave sunset", description: "Cyan signal, pink glow and a receding night grid", source: "bundled", license: "Original Aura palette", accent: "#00f0ff", accent2: "#ff007f", accent3: "#ffbd3f", background: "#180828", foreground: "#f6eaff", dark: ["#180828","#210d35","#32134d","#61306e","#f6eaff","#cdb7e0","#00f0ff"], light: ["#fff7fd","#fff0fa","#f4dff0","#d9b8d0","#31142e","#79536e","#b70066"] },
	{ id: "tanjore-regal", name: "Tanjore regal", description: "Turmeric, peacock and gilt line work with a quiet jali field", source: "bundled", license: "Original Aura palette", accent: "#EAA221", accent2: "#0D5C75", accent3: "#B84A39", background: "#1c2620", foreground: "#fff4cf", dark: ["#1c2620","#243329","#344432","#6a633b","#fff4cf","#d7c68c","#EAA221"], light: ["#fff8e8","#fff1d0","#f5e2af","#cfb36a","#2d3123","#6a644f","#966000"] },
  { id: "primer", name: "Primer", description: "Crisp GitHub surfaces and blue focus", source: "https://github.com/primer/primitives", license: "MIT", accent: "#58a6ff", accent2: "#3fb950", accent3: "#bc8cff", background: "#0d1117", foreground: "#e6edf3", dark: ["#0d1117","#161b22","#21262d","#30363d","#e6edf3","#b1bac4","#58a6ff"], light: ["#ffffff","#f6f8fa","#eaeef2","#d0d7de","#1f2328","#59636e","#0969da"] },
  { id: "catppuccin", name: "Catppuccin", description: "Soft Mocha nights and Latte days", source: "https://github.com/catppuccin/catppuccin", license: "MIT", accent: "#cba6f7", accent2: "#89dceb", accent3: "#f5c2e7", background: "#1e1e2e", foreground: "#cdd6f4", dark: ["#1e1e2e","#181825","#313244","#45475a","#cdd6f4","#bac2de","#cba6f7"], light: ["#eff1f5","#e6e9ef","#dce0e8","#bcc0cc","#4c4f69","#5c5f77","#8839ef"] },
  { id: "nord", name: "Nord", description: "Quiet arctic blues for focused work", source: "https://github.com/nordtheme/nord", license: "MIT", accent: "#88c0d0", accent2: "#a3be8c", accent3: "#b48ead", background: "#2e3440", foreground: "#eceff4", dark: ["#2e3440","#3b4252","#434c5e","#4c566a","#eceff4","#d8dee9","#88c0d0"], light: ["#eceff4","#e5e9f0","#d8dee9","#b5bdcb","#2e3440","#434c5e","#365f79"] },
  { id: "dracula", name: "Dracula", description: "High contrast charcoal and purple", source: "https://github.com/dracula/dracula-theme", license: "MIT", accent: "#bd93f9", accent2: "#8be9fd", accent3: "#ff79c6", background: "#282a36", foreground: "#f8f8f2", dark: ["#282a36","#21222c","#343746","#44475a","#f8f8f2","#c3c6d5","#bd93f9"], light: ["#faf8ff","#f0edf7","#e5dff0","#c6bdd7","#282a36","#555365","#7441b0"] },
  { id: "rose-pine", name: "Rosé Pine", description: "Warm Dawn light and muted pine dark", source: "https://github.com/rose-pine/rose-pine-theme", license: "MIT", accent: "#c4a7e7", accent2: "#9ccfd8", accent3: "#ebbcba", background: "#191724", foreground: "#e0def4", dark: ["#191724","#1f1d2e","#26233a","#403d52","#e0def4","#b6b2cf","#c4a7e7"], light: ["#faf4ed","#fffaf3","#f2e9e1","#d4c9c1","#575279","#6b6586","#907aa9"] },
  { id: "tokyo-night", name: "Tokyo Night", description: "Ink blue with electric blue highlights", source: "https://github.com/folke/tokyonight.nvim", license: "Apache-2.0", accent: "#7aa2f7", accent2: "#7dcfff", accent3: "#bb9af7", background: "#1a1b26", foreground: "#c0caf5", dark: ["#1a1b26","#16161e","#24283b","#414868","#c0caf5","#a9b1d6","#7aa2f7"], light: ["#e1e2e7","#ececf0","#d5d6db","#b4b5c0","#343b58","#565a6e","#2959aa"] }
];
function resolveAuraTheme(id) {
  const legacy = { aurora: "catppuccin", cobalt: "primer", jade: "nord", ember: "rose-pine", orchid: "dracula", slate: "tokyo-night" };
  return AURA_THEMES.find(theme => theme.id === (legacy[id] || id)) || AURA_THEMES[0];
}
function auraThemeTokens(theme) {
  function paletteTokens(p) {
    const [base, surface, raised, border, text, muted, accent] = p;
    const out = {};
    const put = (names, value) => names.split(" ").forEach(name => { out["--dsw-" + name] = value; });
    put("alias-bg-base alias-bg-module-platform specific-input-major specific-login-input", base);
    put("alias-bg-layer-1 alias-markdown-code-block alias-markdown-code-block-banner specific-sidebar-fill", surface);
    put("alias-bg-layer-2 alias-bg-layer-3 alias-bg-overlay alias-bg-skeleton alias-button-elevated-fill alias-button-floating-fill alias-button-tool-bar-fill alias-button-info-fill alias-markdown-inline-code alias-markdown-code-segment-unselected specific-menu specific-selector specific-bubble specific-tip alias-toast-bg alias-tooltip-bg", raised);
    put("alias-border-l1 alias-border-l2 alias-border-l2-darkmode-thin alias-border-l3 alias-border-l4 alias-scrollbar-bg-l1 alias-scrollbar-bg-l2", border);
    put("alias-label-primary alias-label-primary-bluish alias-label-primary-dimmed alias-label-primary-foreground", text);
    put("alias-label-secondary alias-label-tertiary alias-label-caption alias-label-dimmed alias-markdown-placeholder", muted);
    put("alias-brand-primary alias-brand-text alias-link alias-markdown-citation", accent);
    put("alias-interactive-bg-hover alias-interactive-bg-hover-solid alias-interactive-bg-active alias-button-info-hover alias-button-floating-hover alias-button-tool-bar-hover specific-sidebar-nav-item-hover specific-sidebar-nav-item-active", raised);
    put("alias-interactive-bg-hover-accent alias-bg-multi-select alias-button-ghost-active-fill alias-button-ghost-active-hover alias-markdown-code-segment-selected specific-bubble-highlight specific-sidebar-nav-item-active-accent", accent + "24");
    put("alias-button-ghost-active-border", accent);
    return out;
  }
  const light = paletteTokens(theme.light), dark = paletteTokens(theme.dark);
  const tokens = {};
  Object.keys(light).forEach(key => { tokens[key] = { light: light[key], dark: dark[key] }; });
  return tokens;
}
let disposeAuraTheme;
function applyTheme(id, runtime) {
  disposeAuraTheme?.();
  const theme = resolveAuraTheme(id);
  const dispose = runtime?.overrideTokens?.("dsh-ui-aura", auraThemeTokens(theme));
  const body = typeof document === "undefined" ? null : document.body;
  if (body) {
    const tag = document.querySelector('style[data-aura-palette]') ?? document.createElement('style');
    tag.dataset.auraPalette = 'true';
    const tokens = auraThemeTokens(theme);
    const rule = mode => Object.entries(tokens).map(([key,value])=>`${key}:${value[mode]}`).join(';');
    tag.textContent = `body[data-aura-skin]:not([data-ds-dark-theme]){${rule('light')}}body[data-aura-skin][data-ds-dark-theme]{${rule('dark')}}`;
    if (!tag.isConnected) document.head.appendChild(tag);
  }
  if (body) body.dataset.auraSkin = theme.id;
  const values = { "--aura-accent": theme.accent, "--aura-accent-2": theme.accent2, "--aura-accent-3": theme.accent3 };
  const previous = {};
  if (body) Object.entries(values).forEach(([key, value]) => { previous[key] = body.style.getPropertyValue(key); body.style.setProperty(key, value); });
  disposeAuraTheme = () => {
    if (typeof dispose === "function") dispose();
    if (body) Object.entries(values).forEach(([key, value]) => {
      if (body.style.getPropertyValue(key) !== value) return;
      if (previous[key]) body.style.setProperty(key, previous[key]); else body.style.removeProperty(key);
    });
  };
}

		function defaultVisualSettings() {
			return { backdrop: "none", backdropSvg: "", opacity: 8, blur: 0, glow: 55, border: 2, arch: 16, lattice: 8 };
		}
		function readVisualSettings() {
			try { return { ...defaultVisualSettings(), ...(auraSettingsScope?.getSnapshot().value ?? window.__AURA_BOOT__ ?? JSON.parse(window.localStorage.getItem("dsh.aura.ui.v2") || "{}")) }; }
			catch (_) { return defaultVisualSettings(); }
		}
		function applyVisualSettings(settings) {
			if (typeof document === "undefined") return;
			const root = document.documentElement;
			const body = document.body;
			const clean = { ...defaultVisualSettings(), ...settings };
			root.style.setProperty("--aura-glow", String(Math.max(0, Math.min(100, Number(clean.glow)))));
			root.style.setProperty("--aura-border-weight", `${Math.max(0, Math.min(8, Number(clean.border)))}px`);
			root.style.setProperty("--aura-arch", `${Math.max(0, Math.min(48, Number(clean.arch)))}px`);
			root.style.setProperty("--aura-lattice-opacity", String(Math.max(0, Math.min(30, Number(clean.lattice))) / 100));
			root.style.setProperty("--aura-backdrop-opacity", String(Math.max(0, Math.min(25, Number(clean.opacity))) / 100));
			root.style.setProperty("--aura-backdrop-blur", `${Math.max(0, Math.min(24, Number(clean.blur)))}px`);
			body.dataset.auraBackdrop = clean.backdrop || "none";
			if (clean.backdropSvg) root.style.setProperty("--aura-custom-backdrop", `url('${clean.backdropSvg.replace(/'/g, "%27")}')`);
			else root.style.removeProperty("--aura-custom-backdrop");
		}

		function defaultRecipe() {
			const efforts = ["high", "medium", "medium", "high", "medium"];
			const tools = [[], ["web_search"], ["terminal", "patch"], [], []];
			return {
			version: 2,
				metadata: { name: "New workflow", kys_status: "pending", role_distribution: [...AURA_ROLES] },
				nodes: AURA_ROLES.map((role, i) => ({ id: `role-${role.toLowerCase()}`, type: "agent_node", data: { role, reasoning_effort: efforts[i], tools: tools[i] } })),
				edges: AURA_ROLES.slice(1).map((role, i) => ({ source: `role-${AURA_ROLES[i].toLowerCase()}`, target: `role-${role.toLowerCase()}` })),
				privacy_rules: { zdr_enabled: false, redaction_level: "strict" },
				estimate: { input_tokens: null }
			};
		}
		function validateRecipe(value) {
			const errors = [];
			const warnings = [];
			if (!value || typeof value !== "object" || Array.isArray(value)) return { errors: ["Recipe must be an object."], warnings };
			if (![1, 2].includes(value.version)) errors.push("Only recipe versions 1 and 2 are supported.");
			if (typeof value.metadata?.name !== "string" || !value.metadata.name.trim() || value.metadata.name.length > 80) errors.push("Name must be 1–80 characters.");
			if (!Array.isArray(value.nodes) || value.nodes.length < 5 || value.nodes.length > 12) errors.push("Recipe must contain five to twelve stages.");
			if (!Array.isArray(value.edges) || value.edges.length !== Math.max(0, (value.nodes?.length || 0) - 1)) errors.push("A pipeline needs one link between each adjacent stage.");
			const ids = new Set();
			const roles = new Set();
			for (const node of (Array.isArray(value.nodes) ? value.nodes : [])) {
				if (!node || typeof node.id !== "string" || !/^[a-zA-Z0-9_-]{1,60}$/.test(node.id) || ids.has(node.id)) errors.push("Node IDs must be unique, short, and safe.");
				else ids.add(node.id);
				if (node?.type !== "agent_node" || typeof node?.data?.role !== "string" || !node.data.role.trim() || node.data.role.length > 60 || roles.has(node.data.role)) errors.push("Each stage needs one unique, short name.");
				else roles.add(node.data.role);
				if (node?.data?.model && (typeof node.data.model.provider !== "string" || typeof node.data.model.id !== "string" || !node.data.model.provider.trim() || !node.data.model.id.trim() || node.data.model.provider.length > 200 || node.data.model.id.length > 300)) errors.push("Model assignment requires a valid provider and model ID.");
				if (node?.data?.model_source != null && !["auto", "manual"].includes(node.data.model_source)) errors.push("Model selection source must be auto or manual.");
				if (!AURA_EFFORTS.includes(node?.data?.reasoning_effort)) errors.push("Each node needs a valid reasoning level.");
				if (!Array.isArray(node?.data?.tools) || node.data.tools.some(tool => !AURA_TOOLS.includes(tool)) || new Set(node.data.tools).size !== node.data.tools.length) errors.push("Node tools must use the allowed list without duplicates.");
			}
			if (AURA_ROLES.some(role => !roles.has(role))) errors.push("Orchestrator, Scout, Implementer, Reviewer and Verifier are required.");
			const adjacency = new Map([...ids].map(id => [id, []]));
			const edgeKeys = new Set();
			for (const edge of (Array.isArray(value.edges) ? value.edges : [])) {
				if (!edge || !ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) { errors.push("Links must connect distinct existing nodes."); continue; }
				const key = `${edge.source}>${edge.target}`;
				if (edgeKeys.has(key)) errors.push("Duplicate links are not allowed.");
				else { edgeKeys.add(key); adjacency.get(edge.source).push(edge.target); }
			}
			const visiting = new Set(), visited = new Set();
				function walk(id) { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); for (const next of adjacency.get(id) ?? []) if (walk(next)) return true; visiting.delete(id); visited.add(id); return false; }
			for (const id of ids) if (walk(id)) { errors.push("Workflow contains a cycle."); break; }
			if (ids.size >= 5 && Array.isArray(value.edges) && value.edges.length === ids.size - 1) {
				const incoming = new Map([...ids].map(id => [id, 0]));
				for (const edge of value.edges) if (ids.has(edge?.target) && ids.has(edge?.source)) incoming.set(edge.target, incoming.get(edge.target) + 1);
				const starts = [...ids].filter(id => incoming.get(id) === 0);
				let cursor = starts[0], visitedChain = new Set();
				while (cursor && !visitedChain.has(cursor)) { visitedChain.add(cursor); cursor = adjacency.get(cursor)?.[0]; }
				if (starts.length !== 1 || [...incoming.values()].some(n => n > 1) || [...adjacency.values()].some(a => a.length > 1) || visitedChain.size !== ids.size) errors.push("The editor requires one connected pipeline chain.");
			}
			if (value.privacy_rules?.redaction_level !== "strict") errors.push("Strict redaction is required for recipe drafts.");
			if (value.privacy_rules?.zdr_enabled === true) warnings.push("ZDR is requested in this file but cannot be verified by this editor.");
			const estimate = value.estimate?.input_tokens;
            if (value.files !== undefined && (!Array.isArray(value.files) || value.files.length > 8)) errors.push("Use at most eight recipe snippets.");
            const fileIds = new Set();
            for (const file of Array.isArray(value.files) ? value.files : []) {
                if (!file || typeof file.id !== "string" || !/^[a-zA-Z0-9_-]{1,60}$/.test(file.id) || fileIds.has(file.id)) errors.push("Snippet IDs must be unique and safe.");
                fileIds.add(file?.id);
                if (typeof file?.text !== "string" || new TextEncoder().encode(file.text).length > 32768 || file.text.includes('\u0000')) errors.push("Each snippet must contain at most 32 KB of text, without binary data.");
                if (typeof file?.name !== "string" || !file.name || file.name.length > 120 || !Number.isSafeInteger(file?.size) || file.size < 0 || file.size > 32768) errors.push("Invalid snippet name or byte size.");
                if (!Array.isArray(file?.readers) || file.readers.some(id => !ids.has(id))) errors.push("Snippet context stages must exist in the pipeline.");
            }
			if (estimate != null && (!Number.isSafeInteger(estimate) || estimate < 0)) errors.push("Estimated input tokens must be a non-negative integer.");
			if (estimate == null) warnings.push("No token estimate entered; cost cannot be projected.");
			else if (estimate >= 100000) warnings.push("Large context estimate: check the selected model's context limit and current provider pricing.");
			return { errors: [...new Set(errors)], warnings };
		}
		function canonicalRecipe(raw) {
			const source = raw?.version === 1 ? {
				...raw,
				version: 2,
				nodes: Array.isArray(raw.nodes) ? raw.nodes.map(node => ({ ...node, data: { ...node.data, reasoning_effort: ["none", "minimal"].includes(node?.data?.reasoning_effort) ? "low" : ["xhigh", "max", "ultra"].includes(node?.data?.reasoning_effort) ? "high" : node?.data?.reasoning_effort } })) : raw.nodes
			} : raw;
			const review = validateRecipe(source);
			if (review.errors.length) throw new Error(review.errors.join(" "));
			return {
				version: 2,
				metadata: { name: source.metadata.name.trim(), kys_status: "pending", role_distribution: source.nodes.map(n => n.data.role) },
				nodes: source.nodes.map(n => ({ id: n.id, type: "agent_node", data: { role: n.data.role, reasoning_effort: n.data.reasoning_effort, tools: [...n.data.tools], ...(n.data.model ? { model: { provider: n.data.model.provider, id: n.data.model.id }, model_source: n.data.model_source === "auto" ? "auto" : "manual" } : {}) } })),
				edges: source.edges.map(e => ({ source: e.source, target: e.target })),
				privacy_rules: { zdr_enabled: false, redaction_level: "strict" },
				estimate: { input_tokens: raw.estimate?.input_tokens ?? null },
 memory: { notes: String(source.memory?.notes ?? "").slice(0, 8000) },
 files: Array.isArray(source.files) ? source.files.slice(0, 8).map(file => ({ id: String(file?.id || ""), name: String(file?.name || "").slice(0, 120), type: String(file?.type || "").slice(0, 120), size: Number(file?.size || 0), text: String(file?.text || "").slice(0, 32768), readers: Array.isArray(file?.readers) ? file.readers.filter(id => source.nodes.some(node => node.id === id)) : [] })).filter(file => /^[a-zA-Z0-9_-]{1,60}$/.test(file.id) && file.name && file.size >= 0) : []
			};
		}
		function recipeKey(sessionId) { return `dsh.aura.recipe.v1.${String(sessionId ?? "new")}`; }
		function readRecipe(sessionId) {
			try { const raw = window.localStorage.getItem(recipeKey(sessionId)); return raw ? canonicalRecipe(JSON.parse(raw)) : defaultRecipe(); }
			catch (_) { return defaultRecipe(); }
		}
		function readLibrary() {
			try {
				const raw = JSON.parse(window.localStorage.getItem("dsh.aura.library.v1") ?? "[]");
				return Array.isArray(raw) ? raw.slice(0, 20).flatMap(row => { try { return [{ savedAt: String(row.savedAt), recipe: canonicalRecipe(row.recipe) }]; } catch (_) { return []; } }) : [];
			} catch (_) { return []; }
		}
		function replaceChain(nodes) { return nodes.slice(1).map((node, i) => ({ source: nodes[i].id, target: node.id })); }
        function connectPipeline(recipe, source, target) {
            if(source === target || !recipe.nodes.some(n=>n.id===source) || !recipe.nodes.some(n=>n.id===target)) return recipe;
            const chain = orderedNodes(recipe);
            const next = chain.filter(n=>n.id!==target);
            next.splice(next.findIndex(n=>n.id===source)+1,0,chain.find(n=>n.id===target));
            return {...recipe,nodes:next,edges:replaceChain(next)};
        }
		function orderedNodes(recipe) {
			const byId = new Map(recipe.nodes.map(node => [node.id, node]));
			const targets = new Set(recipe.edges.map(edge => edge.target));
			const start = recipe.nodes.find(node => !targets.has(node.id));
			const ordered = [], seen = new Set(); let cursor = start;
			while (cursor && !seen.has(cursor.id)) { ordered.push(cursor); seen.add(cursor.id); const next = recipe.edges.find(edge => edge.source === cursor.id); cursor = next ? byId.get(next.target) : null; }
			return ordered.length === recipe.nodes.length ? ordered : recipe.nodes;
		}
		/** Use only the connected Harness catalogue. Model names are hints, never cost claims. */
		function workflowUseCase(description) {
			const value = String(description ?? "").toLowerCase();
			if (/\b(code|coding|program|implement|refactor|debug|test|repository|repo|app|website|software|api)\b/.test(value)) return "coding";
			if (/\b(research|source|citation|literature|investigate|compare|evidence|search)\b/.test(value)) return "research";
			if (/\b(image|visual|screenshot|photo|diagram|video|design|ui|ux)\b/.test(value)) return "visual";
			if (/\b(math|quantitative|analyse|analyze|statistics|proof|reasoning)\b/.test(value)) return "reasoning";
			if (/\b(write|draft|summarize|summary|translate|document|email)\b/.test(value)) return "writing";
			return "general";
		}
		function rankWorkflowModel(model, role, useCase, defaultRoute) {
			const name = `${model.id} ${model.name ?? ""}`.toLowerCase();
			const strong = /pro|max|opus|sonnet|reason|thinking|120b|70b|405b|glm-5|v4-pro/.test(name);
			const fast = /flash|mini|nano|lite|small|20b|haiku|speed/.test(name);
			const coder = /coder|code|devstral/.test(name);
			const vision = /vision|multimodal|vl\b/.test(name);
			let score = 0;
			if (role === "Orchestrator" || role === "Reviewer") score += strong ? 10 : fast ? -3 : 3;
			if (role === "Scout") score += fast ? 9 : strong ? 1 : 4;
			if (role === "Implementer") score += coder ? 12 : strong ? 8 : fast ? 0 : 4;
			if (role === "Verifier") score += fast ? 7 : strong ? 4 : 3;
			if (useCase === "coding") score += coder ? 8 : strong ? 3 : 0;
			if (useCase === "research") score += role === "Scout" && strong ? 5 : 0;
			if (useCase === "visual") score += vision ? 12 : 0;
			if (useCase === "reasoning") score += strong ? 6 : 0;
			if (useCase === "writing") score += strong && role === "Reviewer" ? 3 : 0;
			if (model.provider === defaultRoute?.provider) score += 2;
			if (model.provider === defaultRoute?.provider && model.id === defaultRoute?.model) score += 1;
			return score;
		}
		function recommendWorkflowModels(recipe, catalog, description, replaceManual = false, refreshAuto = true) {
			const routable = new Set(catalog?.routableProviders ?? []);
			const choices = (catalog?.groups ?? []).flatMap(group => (group.models ?? []).map(model => ({ ...model, provider: group.id }))).filter(model => routable.has(model.provider));
			if (!choices.length) return recipe;
			const useCase = workflowUseCase(description);
			let changed = false;
			const nodes = recipe.nodes.map(node => {
				const current = node.data.model;
				const valid = choices.some(model => model.provider === current?.provider && model.id === current?.id);
				if (valid && !replaceManual && node.data.model_source !== "auto") return node;
				if (valid && !refreshAuto) return node;
				const selected = [...choices].sort((a, b) => rankWorkflowModel(b, node.data.role, useCase, catalog?.default) - rankWorkflowModel(a, node.data.role, useCase, catalog?.default) || a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id))[0];
				if (valid && current.provider === selected.provider && current.id === selected.id && node.data.model_source === "auto") return node;
				changed = true;
				return { ...node, data: { ...node.data, model: { provider: selected.provider, id: selected.id }, model_source: "auto" } };
			});
			return changed ? { ...recipe, nodes } : recipe;
		}


		/* ================================================================== */
		/* Icons (inline SVG — no primitive-package coupling)                  */
		/* ================================================================== */

		function IconClose() {
			return r("svg", { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
				r("path", { d: "M6 6l12 12M18 6L6 18", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" }));
		}

		function IconGraph() {
			return r("svg", { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
				r("circle", { cx: 6, cy: 6, r: 2.4, stroke: "currentColor", strokeWidth: 1.7 }),
				r("circle", { cx: 18, cy: 12, r: 2.4, stroke: "currentColor", strokeWidth: 1.7 }),
				r("circle", { cx: 6, cy: 18, r: 2.4, stroke: "currentColor", strokeWidth: 1.7 }),
				r("path", { d: "M8.2 7.1l7.6 3.8M8.2 16.9l7.6-3.8", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }));
		}

		/* ================================================================== */
		/* Components                                                          */
		/* ================================================================== */

		function NodeDot({ running, done }) {
			const cls = ["aura-node__dot"];
			if (running) cls.push("aura-node__dot--running");
			else if (done) cls.push("aura-node__dot--done");
			return r("span", { className: cls.join(" ") });
		}

		function WorkflowPanel({ nodes, recipe, onOpenStudio, t }) {
			const stages = orderedNodes(recipe ?? defaultRecipe());
			const anyRunning = nodes.some((n) => n.running);
			const palette = ["var(--aura-accent)", "var(--aura-accent-2)", "var(--aura-accent-3)", "var(--aura-ok)", "var(--aura-warn)"];
			const roleMatch = (role) => nodes.find((node) => node.running && [node.phase, node.title].some((value) => String(value ?? "").trim().toLowerCase() === role.toLowerCase()));
			return r("section", { className: "aura-panel", "aria-label": t("panel.workflow") },
				r("header", { className: "aura-panel__head" },
					r("span", { className: anyRunning ? "aura-pulse" : "aura-pulse aura-pulse--idle" }),
					r("span", { className: "aura-panel__head-title" }, t("panel.workflow")),
					r("span", { className: "aura-panel__count" }, t(nodes.length === 1 ? "count.agent" : "count.agents", { count: nodes.length }))
				),
				r("div", { className: "aura-topology", role: "list", "aria-label": `${t("panel.workflow")} topology` },
					stages.map((stage, index) => {
						const liveNode = roleMatch(stage.data.role);
						const model = stage.data.model;
						const route = model ? `${model.provider} / ${model.id}` : "Assign a model in Aura Studio";
						return r(React.Fragment, { key: stage.id },
							r("button", { type: "button", className: `aura-topology__node${liveNode ? " aura-topology__node--running" : ""}`, onClick: onOpenStudio, style: { "--aura-stage": palette[index % palette.length] }, title: `${stage.data.role}\n${route}`, role: "listitem", "aria-label": `${stage.data.role}: ${route}; ${liveNode ? t("state.running") : "ready"}` },
								r("span", { className: "aura-topology__index", "aria-hidden": "true" }, String(index + 1).padStart(2, "0")),
								r("span", { className: "aura-topology__copy" }, r("span", { className: "aura-topology__role" }, stage.data.role), r("span", { className: "aura-topology__model" }, route)),
								r("span", { className: "aura-topology__state" }, liveNode ? t("state.running") : "ready")
							),
							index < stages.length - 1 ? r("span", { className: "aura-topology__edge", "aria-hidden": "true" }) : null
						);
					})
				));
		}

		function ActivityPanel({ jobs, skills, skillsPhase, taskTitle, retrySkills, t }) {
			const [now, setNow] = useState(() => Date.now());
			const liveCount = useMemo(() => jobs.filter(isLiveJob).length, [jobs]);

			useEffect(() => {
				if (liveCount === 0) return void 0;
				setNow(Date.now());
				const timer = setInterval(() => setNow(Date.now()), 1000);
				return () => clearInterval(timer);
			}, [liveCount]);

			const visibleJobs = jobs;

			const activity = visibleJobs.length
				? visibleJobs.map(active => r("div", { className: "aura-activity", key: active.id },
					r("span", { className: "aura-activity__icon" },
						String(active.kind ?? "J").charAt(0).toUpperCase()),
					r("span", { className: "aura-activity__main" },
						r("div", { className: "aura-activity__name" }, active.label || String(active.kind || "job")),
						r("div", { className: "aura-activity__sub" },
							`${active.kind ?? "job"} \u00b7 ${formatElapsed(
								(isLiveJob(active) ? now : (active.finishedAt ?? now)) - (active.startedAt ?? now)
							)}`)),
					r("span", { className: `aura-state aura-state--${active.status}` },
						t(`status.${active.status}`))
				))
				: r("div", { className: "aura-activity" },
					r("span", { className: "aura-activity__icon", style: { opacity: .55 } }, "\u2726"),
					r("span", { className: "aura-activity__main" },
						r("div", { className: "aura-activity__name" }, t("activity.idle")),
						r("div", { className: "aura-activity__sub" }, t("activity.idleSub"))),
					r("span", { className: "aura-state" }, t("state.idle"))
				);

			const match = recommendSkill(skills, taskTitle);
            const rec = match?.skill;

			const recommend = r("div", { className: "aura-recommend" },
				r("span", { className: "aura-recommend__label" }, t("recommend.label")),
				rec
					? r(React.Fragment, null,
						r("span", { className: "aura-recommend__name" }, rec.name),
						rec.description ? r("span", { className: "aura-recommend__desc" }, rec.description) : null,
                        r("span", { className: "aura-recommend__reason" }, t("recommend.reason", { terms: match.terms.join(", ") })))
					: r("span", { className: "aura-recommend__desc" },
						skillsPhase === "error" ? t("recommend.unavailable") : skillsPhase === "loading" ? t("recommend.loading") : t("recommend.none")),
                skillsPhase === "error" ? r("button", { type: "button", className: "aura-retry", onClick: retrySkills }, t("recommend.retry")) : null
			);

			return r("section", { className: "aura-panel", "aria-label": t("panel.activity") },
				r("header", { className: "aura-panel__head" },
					r("span", { className: liveCount > 0 ? "aura-pulse" : "aura-pulse aura-pulse--idle" }),
					r("span", { className: "aura-panel__head-title" }, t("panel.activity")),
					r("span", { className: "aura-panel__count" }, t("count.jobs", { count: jobs.length }))
				),
				r("div", { className: "aura-panel__body", style: { maxHeight: "40vh" } },
					activity,
					recommend
				));
		}

		function AuraStudio({ sessionId, locked, onClose, onRecipeChange, runtime }) {
			const [tab, setTab] = useState("workflow");
 useEffect(() => { const previous=document.activeElement; const dialog=document.querySelector('.aura-studio'); const focusable=()=>Array.from(dialog?.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]') ?? []).filter(el=>el.getClientRects().length); focusable()[0]?.focus(); const trap=e=>{if(e.key!=="Tab")return;const list=focusable();const first=list[0],last=list[list.length-1];if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus()}};dialog?.addEventListener('keydown',trap);return()=>{dialog?.removeEventListener('keydown',trap);previous?.focus?.()};}, []);
			const [recipe, setRecipe] = useState(() => readRecipe(sessionId));
			const [library, setLibrary] = useState(readLibrary);
			const [themeId, setThemeState] = useState(() => auraSettingsScope?.getSnapshot().value?.skin ?? window.__AURA_BOOT__?.skin ?? "catppuccin");
			const [notice, setNotice] = useState("");
 const [catalog, setCatalog] = useState(null);
 const [modelError, setModelError] = useState("");
 const binding = runtime.sessions.binding(sessionId);
 const input = binding ? runtime.conversation.input.for(binding.ctx) : null;
 const [, refreshInput] = useState(0);
 useEffect(() => {
   if (!input) return;
   const refresh = () => refreshInput(n => n + 1);
   const a = input.state.subscribe(refresh);
   const b = runtime.conversation.fileUploads.subscribe(refresh);
   return () => { a(); b(); };
 }, [input, runtime]);
 const task = input?.state.getSnapshot().draft ?? "";
 const setTask = text => input?.setDraft(text);
 const attachmentIds = input?.state.getSnapshot().attachmentIds ?? [];
 const attachments = runtime.conversation.resolveDraftAttachments(attachmentIds);
 const uploads = runtime.conversation.fileUploads.getSnapshot();
 const attachmentsReady = attachments.every(a => a.kind === "image" || uploads[a.id]?.status === "ready");
 const [sourcesOpen, setSourcesOpen] = useState(false);
 const filePicker = React.useRef(null);
 const addAttachments = fileList => {
   if (locked || sending || !input || !binding || !fileList?.length) return;
   try {
     if (binding.session.getSnapshot().subagent != null) throw Error("Attach sources in the parent conversation, not a subagent.");
     if (input.state.getSnapshot().phase !== "plain") throw Error("Finish the current composer action before adding sources.");
     const files = Array.from(fileList);
     const limits = binding.session.projections.faceOf("imageLimits").getSnapshot();
     if (limits) {
       const incoming = files.filter(file=>limits.mediaTypes.includes(file.type));
       const existing = attachments.filter(file=>file.kind === "image");
       if(existing.length + incoming.length > limits.maxImagesPerMessage) throw Error(`This model accepts up to ${limits.maxImagesPerMessage} images per message.`);
       if(incoming.some(file=>file.size > limits.maxImageBytes)) throw Error("An image exceeds this model’s per-image size limit.");
       if(existing.reduce((sum,a)=>sum+a.file.size,0) + incoming.reduce((sum,file)=>sum+file.size,0) > limits.maxMessageImageBytes) throw Error("The images exceed this model’s combined message size limit.");
     }
     const drafts = runtime.conversation.createDrafts(sessionId, files);
     if (!input.addAttachments(drafts.map(d => d.id))) {
       runtime.conversation.releaseDraftAttachments(drafts);
       throw Error("The composer is busy. Try again after the current submission.");
     }
     setSourcesOpen(true);
   } catch (error) { setNotice("Could not attach: " + error.message); }
 };
 const [sending, setSending] = useState(false);
 const [transfer, setTransfer] = useState("");
			const [stageName, setStageName] = useState("");
			const [insertAfter, setInsertAfter] = useState("role-implementer");
            const [connecting, setConnecting] = useState(null);
            const connectTo = (target, source = connecting) => {
                if(locked || sending || !source) return;
                setRecipe(prev=>connectPipeline(prev,source,target)); setConnecting(null);
            };
			const [fileDragging, setFileDragging] = useState(false);
			const [visual, setVisualState] = useState(readVisualSettings);
 const persistVisual = patch => {
   const snapshot = auraSettingsScope?.getSnapshot();
   if (snapshot?.status !== "ready" || !snapshot.writable || snapshot.mode !== "host") {
     setNotice("Preview only: Harness settings are not writable on this connection."); return;
   }
   auraSettingsScope.mutate(Object.entries(patch).map(([key,value])=>({op:"set",path:[key],value})))
     .catch(error=>setNotice("Settings could not be saved: " + error.message));
 };
 const setThemeId = skin => { setThemeState(skin); persistVisual({skin}); };
 const setVisual = change => {
   const next = typeof change === "function" ? change(visual) : change;
   setVisualState(next);
   persistVisual(Object.fromEntries(Object.keys(defaultVisualSettings()).filter(key=>next[key] !== visual[key]).map(key=>[key,next[key]])));
 };
 useEffect(() => auraSettingsScope?.subscribe(() => {
   const snapshot = auraSettingsScope.getSnapshot();
   if(snapshot.status === "ready" && snapshot.value) { setThemeState(snapshot.value.skin); setVisualState({...defaultVisualSettings(),...snapshot.value}); }
 }), []);
 const loadModels = async () => { try { setModelError(""); const result = await runtime.remote.session.modelCatalog(); if (!result.ok) throw Error(result.error?.message || "Catalogue unavailable"); setCatalog(result.value); if (!locked) setRecipe(prev => recommendWorkflowModels(prev, result.value, task || prev.metadata.name, false, false)); } catch(e) { setModelError(e.message); } };
 useEffect(() => { let disposed = false; runtime.remote.session.modelCatalog().then(result => { if(disposed)return; if(result.ok) {setCatalog(result.value); if (!locked) setRecipe(prev => recommendWorkflowModels(prev, result.value, prev.metadata.name, false, false));} else setModelError(result.error?.message || "Catalogue unavailable"); }).catch(e => {if(!disposed)setModelError(e.message)}); return () => {disposed=true}; }, [runtime]);
 const choices = (catalog?.groups ?? []).flatMap(group => group.models.map(model => ({...model, provider:group.id})));
 const assignmentValid = recipe.nodes.every(node => choices.some(m => m.provider === node.data.model?.provider && m.id === node.data.model?.id) && catalog?.routableProviders?.includes(node.data.model?.provider));
 const startWorkflow = async () => {
 if(locked || sending || !assignmentValid || !task.trim() || !attachmentsReady || !input) return;
 setSending(true);
 try {
 const initialDraft = input.state.getSnapshot();
 if (initialDraft.phase !== "plain") throw Error("Finish the current composer action before running a workflow.");
 if (initialDraft.occurrences?.length) throw Error("This draft contains reference chips. Use file attachments or plain task text for a workflow so references are not silently flattened.");
 const binding = runtime.sessions.binding(sessionId);
 if (!binding) throw Error("Open a conversation before starting a workflow.");
 const orchestrator = recipe.nodes.find(n => n.data.role === "Orchestrator").data.model;
 const selected = await runtime.remote.session.selectModel({sessionId, provider:orchestrator.provider, model:orchestrator.id});
 if(!selected.ok) throw Error(selected.error?.message || "Cannot select orchestrator");
 if (input.state.getSnapshot().draftRev !== initialDraft.draftRev) throw Error("The shared draft changed while preparing. Review it and try again.");
 const payload = compileWorkflow(recipe, task);
 input.setDraft(payload);
 input.submit("queue");
 onClose();
 } catch(e) {setNotice("Could not start: " + e.message)} finally {setSending(false)}
 };
			const review = useMemo(() => validateRecipe(recipe), [recipe]);
			const chain = useMemo(() => orderedNodes(recipe), [recipe]);

			useEffect(() => {
				try { window.localStorage.setItem(recipeKey(sessionId), JSON.stringify(recipe)); }
				catch (_) { setNotice("Local draft storage is unavailable. Export this recipe to keep it."); }
				onRecipeChange?.(recipe);
			}, [recipe, sessionId, onRecipeChange]);
			useEffect(() => { applyTheme(themeId, runtime.theme); }, [themeId]);
			useEffect(() => { applyVisualSettings(visual); }, [visual]);

			const updateNode = (id, transform) => {
				if (locked || sending) return;
				setRecipe(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === id ? { ...n, data: transform(n.data) } : n) }));
			};
			const moveNode = (from, to) => {
				if (locked || sending || from === to) return;
				setRecipe(prev => {
					const list = orderedNodes(prev).slice();
					const fromIndex = list.findIndex(n => n.id === from), toIndex = list.findIndex(n => n.id === to);
					if (fromIndex < 0 || toIndex < 0) return prev;
					list.splice(toIndex, 0, list.splice(fromIndex, 1)[0]);
					return { ...prev, nodes: list, edges: replaceChain(list), metadata: { ...prev.metadata, role_distribution: list.map(n => n.data.role) } };
				});
			};
			const shiftNode = (id, delta) => { const index = chain.findIndex(n => n.id === id); const next = chain[index + delta]; if (next) moveNode(id, next.id); };
			const addStage = () => {
				const role = stageName.trim().replace(/\s+/g, " ");
				if (locked || sending || !role) return;
				if (role.length > 60 || recipe.nodes.some(node => node.data.role.toLowerCase() === role.toLowerCase())) { setNotice("Stage names must be unique and 60 characters or fewer."); return; }
				setRecipe(prev => {
					const list = orderedNodes(prev).slice();
					const used = new Set(list.map(node => node.id));
					const stem = role.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "custom-stage";
					let id = `stage-${stem}`, suffix = 2; while (used.has(id)) id = `stage-${stem}-${suffix++}`;
					const anchor = Math.max(0, list.findIndex(node => node.id === insertAfter));
					const inherited = list[anchor]?.data;
					list.splice(anchor + 1, 0, { id, type: "agent_node", data: { role, reasoning_effort: inherited?.reasoning_effort || "medium", tools: [], ...(inherited?.model ? { model: { ...inherited.model }, model_source: "auto" } : {}) } });
					const next = { ...prev, nodes: list, edges: replaceChain(list), metadata: { ...prev.metadata, role_distribution: list.map(node => node.data.role) } };
					return catalog ? recommendWorkflowModels(next, catalog, task || next.metadata.name, false) : next;
				});
				setStageName(""); setNotice(`${role} was added to the pipeline. Set its model and file access before running.`);
			};
			const removeStage = id => {
				if (locked || sending || AURA_ROLES.includes(recipe.nodes.find(node => node.id === id)?.data.role)) return;
				setRecipe(prev => { const list = orderedNodes(prev).filter(node => node.id !== id); return { ...prev, nodes: list, edges: replaceChain(list), metadata: { ...prev.metadata, role_distribution: list.map(node => node.data.role) } }; });
			};
			const pinFiles = async fileList => {
				if (locked || sending) return;
				const selected = Array.from(fileList || []).slice(0, 8);
				if (!selected.length) return;
				const remaining = Math.max(0, 8 - (recipe.files?.length || 0));
				if (!remaining) { setNotice("The shelf already has eight pinned files. Remove one before adding another."); return; }
				const accepted = [];
				for (const file of selected.slice(0, remaining)) {
					if (file.size > 32768) { setNotice(`${file.name} was skipped: files are limited to 32 KB each.`); continue; }
					try { const text = await file.text(); if (text.includes('\u0000') || new TextEncoder().encode(text).length > 32768) { setNotice(`${file.name} was skipped: only text files up to 32 KB can be pinned.`); continue; } accepted.push({ id: `file-${Date.now()}-${accepted.length}-${Math.random().toString(36).slice(2, 7)}`, name: file.name.slice(0, 120), type: String(file.type || "text/plain").slice(0, 120), size: file.size, text, readers: [] }); }
					catch (_) { setNotice(`${file.name} could not be read locally.`); }
				}
				if (accepted.length) { setRecipe(prev => ({ ...prev, files: [...(prev.files || []), ...accepted].slice(0, 8) })); setNotice(`${accepted.length} file${accepted.length === 1 ? "" : "s"} pinned locally. Choose which stages may receive each file.`); }
			};
			const updateFileReaders = (fileId, stageId, allowed) => setRecipe(prev => ({ ...prev, files: (prev.files || []).map(file => file.id !== fileId ? file : { ...file, readers: allowed ? [...new Set([...file.readers, stageId])] : file.readers.filter(id => id !== stageId) }) }));
			const removeFile = fileId => setRecipe(prev => ({ ...prev, files: (prev.files || []).filter(file => file.id !== fileId) }));
			const chooseBackdrop = async event => {
				const file = event.target.files?.[0]; event.target.value = "";
				if (!file) return;
				if (file.size > 32768 || !(file.type === "image/svg+xml" || /\.svg$/i.test(file.name))) { setNotice("A custom backdrop must be an SVG smaller than 32 KB."); return; }
				try { const svg = await file.text(); if (!/<svg\b/i.test(svg) || /<\s*(script|foreignObject|iframe|image|use)\b|\bon\w+\s*=|(?:href|src)\s*=|<!DOCTYPE|<!ENTITY|@import|url\s*\(/i.test(svg)) throw Error("Use a standalone SVG with paths and shapes only; scripts and external resources are not supported."); const encoded = btoa(unescape(encodeURIComponent(svg))); setVisual(prev => ({ ...prev, backdrop: "custom", backdropSvg: `data:image/svg+xml;base64,${encoded}` })); }
				catch (error) { setNotice(error.message || "The selected SVG could not be loaded."); }
			};
			const importFile = async event => {
				const file = event.target.files?.[0]; event.target.value = "";
				if (!file || locked) return;
				if (file.size > 2097152) { setNotice("Import rejected: file exceeds 2 MB."); return; }
				try {
					const incoming = canonicalRecipe(JSON.parse(await file.text()));
					setRecipe(incoming); setTab("workflow"); setNotice(`Imported ${incoming.metadata.name} as this session’s local draft.`);
				} catch (error) { setNotice(`Import rejected: ${error.message}`); }
			};
			const exportFile = async () => {
				try {
					const data = JSON.stringify(canonicalRecipe(recipe), null, 2) + "\n";
					setTransfer(data);
					const bytes = new TextEncoder().encode(data);
					const digest = await crypto.subtle.digest("SHA-256", bytes);
					const sha = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
					const url = URL.createObjectURL(new Blob([bytes], { type: "application/json" }));
					const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${recipe.metadata.name.trim().replace(/[^a-z0-9_-]+/gi, "-").slice(0, 60) || "aura-recipe"}.aura.json`;
					document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
					setNotice(`Download requested. If your browser blocks it, use Copy JSON. SHA-256: ${sha}`);
				} catch (error) { setNotice(`Export failed: ${error.message}`); }
			};
			const copyRecipe = async () => {
				try {
					const data = JSON.stringify(canonicalRecipe(recipe), null, 2) + "\n";
					setTransfer(data);
					await navigator.clipboard.writeText(data);
					setNotice("Recipe JSON copied to clipboard. Paste it into a .aura.json file to import elsewhere.");
				} catch (error) { setNotice(`Copy failed: ${error.message}`); }
			};
			const saveLibrary = () => {
				try {
					const entry = { savedAt: new Date().toISOString(), recipe: canonicalRecipe(recipe) };
					const next = [entry, ...readLibrary().filter(row => JSON.stringify(row.recipe) !== JSON.stringify(entry.recipe))].slice(0, 20);
					window.localStorage.setItem("dsh.aura.library.v1", JSON.stringify(next)); setLibrary(next); setNotice("Saved a version to the local Taskmaster library.");
				} catch (error) { setNotice(`Save failed: ${error.message}`); }
			};
			const button = (label, onClick, extra = {}) => r("button", { type: "button", className: "aura-studio__button", onClick, ...extra }, label);

			const workflow = r(React.Fragment, null,
				r("p", { className: "aura-studio__notice" }, locked ? "A Harness agent or job is active. Editing is locked until this run ends." : "Models are matched automatically to the task and each role. You can change any choice manually; your choices stay with this conversation."),
				r("div", { className: "aura-studio__row" },
					r("label", { htmlFor: "aura-recipe-name" }, "Recipe name"),
					r("input", { id: "aura-recipe-name", type: "text", maxLength: 80, value: recipe.metadata.name, disabled: locked, onChange: e => { const name=e.target.value; setRecipe(prev => {const next={...prev,metadata:{...prev.metadata,name}}; return catalog && !task.trim() ? recommendWorkflowModels(next,catalog,name) : next;});} }),
					button("Export JSON", exportFile, { disabled: review.errors.length > 0 }),
					button("Copy JSON", copyRecipe, { disabled: review.errors.length > 0 }),
					button("Import JSON", () => document.getElementById("aura-import-input")?.click(), { disabled: locked }),
					r("input", { id: "aura-import-input", type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: importFile })
				),
				r("div", { className: "aura-studio__row aura-studio__row--between" },
					r("strong", null, "Agent chain"),
					r("span", { className: "aura-studio__muted" }, connecting ? "Choose an In port to connect this stage. The remaining chain reconnects automatically." : "Drag cards to reorder, or drag an Out port to an In port. Click ports for keyboard access. Links form one sequential pipeline.")
				),
				r("div", { className: "aura-graph", role: "list", "aria-label": "Editable agent chain topology" }, chain.map((node, i) => {
					const route = node.data.model ? `${node.data.model.provider} / ${node.data.model.id}` : "Model unassigned";
					const stageState = locked ? "locked" : connecting === node.id ? "source" : "ready";
					const stateLabel = stageState === "source" ? "link source" : stageState;
					return r(React.Fragment, { key: node.id },
						r("div", { className: "aura-graph__step" },
							r("div", { className: "aura-graph__node", role: "listitem", draggable: !locked, "aria-disabled": locked ? "true" : "false", "data-stage-state": stageState, "aria-label": `${String(i + 1).padStart(2, "0")} ${node.data.role}; ${route}; ${stateLabel}`, onDragStart: e => e.dataTransfer.setData("text/plain", node.id), onDragOver: e => { if (!locked) e.preventDefault(); }, onDrop: e => { e.preventDefault(); moveNode(e.dataTransfer.getData("text/plain"), node.id); } },
								r("div", { className: "aura-graph__head" }, r("span", { className: "aura-graph__index" }, `${String(i + 1).padStart(2, "0")} · ${node.data.reasoning_effort} effort`), r("span", { className: "aura-graph__state", "aria-live": "polite" }, stateLabel)),
								r("strong", null, node.data.role),
								r("div", { className: "aura-ports" }, r("button", { type: "button", disabled: locked || sending, "aria-label": `Connect into ${node.data.role}`, onClick: () => connectTo(node.id), onDragOver: e => { e.preventDefault(); e.stopPropagation(); }, onDrop: e => { e.preventDefault(); e.stopPropagation(); connectTo(node.id, e.dataTransfer.getData("application/x-aura-port")); } }, "○ In"), r("button", { type: "button", disabled: locked || sending, draggable: !locked && !sending, "aria-label": `Connect from ${node.data.role}`, "aria-pressed": connecting === node.id, onClick: () => setConnecting(connecting === node.id ? null : node.id), onDragStart: e => { e.stopPropagation(); e.dataTransfer.setData("application/x-aura-port", node.id); setConnecting(node.id); } }, "Out ○")),
								r("small", null, AURA_ROLE_HELP[node.data.role] || "Custom stage"),
								r("span", { className: "aura-graph__route", title: route }, `${route} · ${node.data.model_source === "auto" ? "auto" : "manual"}`),
								r("div", { className: "aura-graph__order" }, button("←", () => shiftNode(node.id, -1), { disabled: locked || i === 0, "aria-label": `Move ${node.data.role} left` }), button("→", () => shiftNode(node.id, 1), { disabled: locked || i === chain.length - 1, "aria-label": `Move ${node.data.role} right` }), !AURA_ROLES.includes(node.data.role) ? button("Remove", () => removeStage(node.id), { disabled: locked, "aria-label": `Remove ${node.data.role}` }) : null)
							)
						), i < chain.length - 1 ? r("span", { className: "aura-graph__connector aura-graph__connector--linked", "aria-hidden": "true" }) : null
					);
				})),
				r("section", { className: "aura-stage-adder", "aria-label": "Add pipeline stage" },
					r("h3", null, "Add a stage"),
					r("p", { className: "aura-studio__muted" }, "Insert a custom stage into the connected pipeline. It can be dragged later, and will be routed only when you send this workflow."),
					r("div", { className: "aura-stage-adder__form" },
						r("label", null, "Stage name", r("input", { type: "text", value: stageName, maxLength: 60, disabled: locked || sending, placeholder: "Unit tests", onChange: e => setStageName(e.target.value), onKeyDown: e => { if (e.key === "Enter") { e.preventDefault(); addStage(); } } })),
						r("label", null, "Insert after", r("select", { value: insertAfter, disabled: locked || sending, onChange: e => setInsertAfter(e.target.value) }, chain.map(node => r("option", { key: node.id, value: node.id }, node.data.role)))),
						button("Add stage", addStage, { disabled: locked || sending || !stageName.trim() })
					)
				),
				r("div", {className:"aura-studio__row"}, r("strong", null, "Models for each role"), button("Auto-match all roles", () => setRecipe(prev => recommendWorkflowModels(prev,catalog,task || prev.metadata.name,true)), {disabled:locked || sending || !catalog}), button("Refresh models", loadModels)),
 r("p", {className:"aura-studio__muted"}, `Automatic match: ${workflowUseCase(task || recipe.metadata.name)}. Based on model names and roles; live quota and prices are not available here. Manual picks stay fixed until you choose Auto-match all roles.`),
 modelError ? r("p", {role:"alert"}, modelError) : !catalog ? r("p", null, "Loading your Harness models…") : null,
				chain.map(node => r("div", { className: "aura-role-editor", key: node.id },
					r("strong", null, node.data.role),
					r("div", { className: "aura-role-editor__controls" },
 r("div",{className:"aura-provider-cards","aria-label":node.data.role + " providers"},(catalog?.groups ?? []).map(group=>r("button",{key:group.id,type:"button","aria-pressed":node.data.model?.provider===group.id,disabled:locked || sending || !group.models.length || !catalog?.routableProviders?.includes(group.id),onClick:()=>updateNode(node.id,data=>({...data,model:{provider:group.id,id:group.models[0].id},model_source:"manual"}))},group.name || group.id))),
 r("label", {className:"aura-model-field"}, "Model endpoint", r("select", {value: node.data.model?.id || "", disabled:locked || sending, "aria-label":node.data.role + " model", onChange:e => updateNode(node.id,data=>({...data,model:{provider:data.model.provider,id:e.target.value},model_source:"manual"}))},r("option",{value:"",disabled:true},"Choose a connected provider"),(catalog?.groups.find(group=>group.id===node.data.model?.provider)?.models ?? []).map(model=>r("option",{key:model.id,value:model.id},model.name || model.id)))),
						r("div", { className: "aura-effort" }, r("label", { htmlFor: `aura-effort-${node.id}` }, "Effort"), r("input", { id: `aura-effort-${node.id}`, type: "range", min: 0, max: 2, step: 1, value: Math.max(0, AURA_EFFORTS.indexOf(node.data.reasoning_effort)), disabled: locked, "aria-label": `${node.data.role} reasoning effort`, onChange: e => updateNode(node.id, data => ({ ...data, reasoning_effort: AURA_EFFORTS[Number(e.target.value)] })) }), r("output", null, node.data.reasoning_effort))
					),
					r("span", { className: "aura-studio__muted" }, "Requested tools (not enforced by workflow API)"),
					r("div", { className: "aura-role-editor__tools" }, AURA_TOOLS.map(tool => r("label", { key: tool }, r("input", { type: "checkbox", disabled: locked, checked: node.data.tools.includes(tool), onChange: e => updateNode(node.id, data => ({ ...data, tools: e.target.checked ? [...data.tools, tool] : data.tools.filter(t => t !== tool) })) }), ` ${tool}`)))
				)),
				r("div", { className: "aura-studio__row" },
					r("label", { htmlFor: "aura-estimate" }, "Estimated input tokens"),
					r("input", { id: "aura-estimate", type: "number", min: 0, step: 1, value: recipe.estimate?.input_tokens ?? "", disabled: locked, onChange: e => setRecipe(prev => ({ ...prev, estimate: { input_tokens: e.target.value === "" ? null : Number(e.target.value) } })) }),
					r("span", { className: "aura-studio__muted" }, "Optional, manually entered; no live metering.")
				),
			r("div", { className: review.errors.length ? "aura-studio__notice aura-studio__notice--error" : "aura-studio__notice", role: "status" }, review.errors.length ? `Needs review: ${review.errors.join(" ")}` : `Draft valid: ${chain.length} stages, ${Math.max(0, chain.length - 1)} links, no cycles. ${review.warnings.join(" ")}`)
			);

			const execution = r("div", {className:"aura-execution"},
 r("div", {className:"aura-studio__row aura-studio__row--between"}, r("h3",null,"Run this workflow"),
 button(`＋ Add sources${attachments.length ? ` (${attachments.length})` : ""}`, () => setSourcesOpen(v => !v), {"aria-expanded":sourcesOpen,"aria-controls":"aura-shared-sources",disabled:!input || locked || sending})),
 r("p",{className:"aura-studio__muted"},"Shares the startup composer’s draft and attachments. Sends through your selected provider accounts and their billing. Effort and tool selections are prompt guidance; native budgets and permissions remain controlled by Harness."),
 sourcesOpen ? r("section", {id:"aura-shared-sources",className:"aura-source-dock","aria-label":"Shared Harness sources",onDragOver:e=>{e.preventDefault();e.stopPropagation();},onDrop:e=>{e.preventDefault();e.stopPropagation();addAttachments(e.dataTransfer.files);}},
 r("strong",null,"Sources for this conversation"),
 r("p",{className:"aura-studio__muted"},"Drop documents, notebook exports or images here. These are the same attachments shown in the Harness startup text box. Files upload to this Harness on selection; attached content can be used by the orchestrator and downstream agents."),
 button("Choose files",()=>filePicker.current?.click(),{disabled:!input || locked || sending}),
 r("input",{ref:filePicker,type:"file",multiple:true,hidden:true,"aria-label":"Attach shared Harness files",onChange:e=>{addAttachments(e.target.files);e.target.value="";}}),
 attachments.length ? attachments.map(a=>r("article",{key:a.id,className:"aura-source-row"},r("div",null,r("strong",null,a.file.name || "Image"),r("small",null,`${a.file.size.toLocaleString()} bytes · ${a.kind === "image" ? "Ready to send" : uploads[a.id]?.status === "ready" ? "Uploaded to Harness" : uploads[a.id]?.status === "error" ? uploads[a.id].message : "Uploading…"}`)),
 uploads[a.id]?.status === "error" ? button("Retry",()=>runtime.conversation.retryFileUpload(sessionId,a.id),{disabled:locked || sending}) : null,
 button("Remove",()=>{if(input.removeAttachment(a.id))runtime.conversation.releaseDraftAttachment(a.id);},{disabled:locked || sending,"aria-label":`Remove shared source ${a.file.name}`}))) : r("p",null,"No sources attached. Add files here or from the startup composer.")) : null,
 r("textarea",{value:task,disabled:!input || locked || sending,maxLength:16000,"aria-label":"Workflow task",placeholder:"Describe the outcome, workspace, and acceptance criteria…",onChange:e=>{const description=e.target.value;setTask(description);if(catalog)setRecipe(prev=>recommendWorkflowModels(prev,catalog,description || prev.metadata.name));}}),
 !input ? r("p",{role:"status"},"Choose a workspace in Harness to use its shared composer and sources.") : null,
 button(sending ? "Preparing…" : "Send workflow request",startWorkflow,{disabled:locked || sending || !input || !attachmentsReady || !assignmentValid || !task.trim() || review.errors.length>0,className:"aura-studio__button aura-studio__button--primary"}),
 !attachmentsReady ? r("p",{role:"status"},"Wait for uploads to finish, or retry/remove failed sources.") : null,
 !assignmentValid ? r("p",null,catalog ? "Some assigned models are no longer routable. Refresh models or use Auto-match all roles." : "Loading models before this workflow can start.") : null);
			const files = r("section", { className: "aura-file-shelf", "aria-label": "Pinned files and stage access" },
				r("h3", null, "Files & notebook context"),
				r("p", { className: "aura-studio__muted" }, "Optional recipe snippets, separate from shared Harness attachments beside Run this workflow. Checked stages receive direct context, but the orchestrator sees the recipe and outputs may carry context onward. These selections are not access-control boundaries."),
				r("div", { className: "aura-file-shelf__drop", "data-dragging": fileDragging ? "true" : "false", onDragOver: e => { if (!locked) { e.preventDefault(); setFileDragging(true); } }, onDragLeave: () => setFileDragging(false), onDrop: e => { e.preventDefault(); setFileDragging(false); pinFiles(e.dataTransfer.files); } },
					r("label", null, "Drop text files here or ", r("input", { type: "file", multiple: true, accept: ".txt,.md,.json,.yaml,.yml,.ts,.tsx,.js,.jsx,.css,.html,.py,.sql,.csv,text/plain,text/markdown,application/json", disabled: locked || sending, onChange: e => { pinFiles(e.target.files); e.target.value = ""; } })),
					r("small", null, " Up to 8 files, 32 KB each. Binary files are rejected.")
				),
				(recipe.files || []).length ? (recipe.files || []).map(file => r("article", { className: "aura-file-card", key: file.id },
					r("div", null, r("strong", null, file.name), r("div", { className: "aura-studio__muted" }, `${file.size.toLocaleString()} bytes · ${file.type || "text/plain"}`)),
					button("Remove", () => removeFile(file.id), { disabled: locked || sending, "aria-label": `Remove ${file.name}` }),
					r("div", { className: "aura-file-card__readers" }, r("span", null, "Direct context:"), chain.map(node => r("label", { key: node.id }, r("input", { type: "checkbox", disabled: locked || sending, checked: file.readers.includes(node.id), onChange: e => updateFileReaders(file.id, node.id, e.target.checked) }), ` ${node.data.role}`)))
				)) : r("p", { className: "aura-studio__muted" }, "No context files pinned yet.")
			);
 const memory = r(React.Fragment, null,
 r("label",null,"Reusable learning notes",r("textarea",{value:recipe.memory?.notes ?? "",maxLength:8000,disabled:locked,placeholder:"Record what worked, failed approaches to avoid, evidence, and when to reuse this workflow.",onChange:e=>setRecipe(prev=>({...prev,memory:{notes:e.target.value}}))})),
				r("p", { className: "aura-studio__notice" }, "Taskmaster keeps only versions you explicitly save. Load one into this session, then edit or export it. No task content is recorded automatically."),
				button("Save current recipe to library", saveLibrary, { disabled: locked || review.errors.length > 0, className: "aura-studio__button aura-studio__button--primary" }),
				library.length ? library.map((entry, index) => r("div", { className: "aura-memory-card", key: `${entry.savedAt}-${index}` },
					r("strong", null, entry.recipe.metadata.name),
					r("span", { className: "aura-studio__muted" }, new Date(entry.savedAt).toLocaleString()),
					button("Load into session", () => { setRecipe(canonicalRecipe(entry.recipe)); setTab("workflow"); setNotice("Loaded a saved version into this session draft."); }, { disabled: locked }), button("Delete saved version", () => { try { const next=library.filter((_,i)=>i!==index); window.localStorage.setItem("dsh.aura.library.v1",JSON.stringify(next));setLibrary(next); } catch(e){setNotice(e.message)} })
				)) : r("p", { className: "aura-studio__muted" }, "No saved recipes yet.")
			);

			const design = r(React.Fragment, null,
				r("p", { className: "aura-studio__notice" }, "Choose an Aura skin, then tune its materials live. All palettes, ornaments and SVG handling are bundled locally; no theme code is fetched or executed."),
 r("div", { className: "aura-theme-grid" }, AURA_THEMES.map(theme => r("button", { type: "button", className: "aura-theme-card", key: theme.id, "aria-pressed": resolveAuraTheme(themeId).id === theme.id, onClick: () => setThemeId(theme.id) },
					r("span", { className: "aura-theme-swatch", style: { background: theme.background, borderLeft: `28px solid ${theme.accent}`, boxShadow: `inset 0 -14px 0 ${theme.dark[2]}` } }),
					r("strong", null, theme.name), r("small",null,theme.description), r("small",null,theme.license)
				))),
				r("section", { className: "aura-visual-controls", "aria-label": "Live visual controls" },
					r("h3", null, "Live visual controls"),
					r("div", { className: "aura-visual-grid" },
						r("label", null, "Backdrop", r("select", { value: visual.backdrop, onChange: e => setVisual(prev => ({ ...prev, backdrop: e.target.value, backdropSvg: e.target.value === "custom" ? prev.backdropSvg : "" })) }, [["none", "None"], ["sun-grid", "Retro sun grid"], ["jali", "Mughal jali lattice"], ["peacock", "Madhubani peacock"], ["custom", "Custom SVG"]].map(([value, label]) => r("option", { key: value, value }, label)))),
						r("label", null, "Custom SVG", r("input", { type: "file", accept: ".svg,image/svg+xml", onChange: chooseBackdrop }), r("small", null, "Local SVG, max 32 KB")),
						[["glow", "Glow / neon intensity", 0, 100], ["border", "Border weight", 0, 8], ["arch", "Arch curvature", 0, 48], ["lattice", "Lattice opacity", 0, 30], ["opacity", "Backdrop opacity", 0, 25], ["blur", "Backdrop blur", 0, 24]].map(([key,label,min,max]) => r("label", { key }, label, r("input", { type: "range", min, max, value: visual[key], onChange: e => setVisual(prev => ({ ...prev, [key]: Number(e.target.value) })) }), r("output", null, visual[key]))),
						r("div", { className: "aura-backdrop-preview", "aria-label": "Backdrop preview" })
					),
					button("Reset visual controls", () => setVisual(defaultVisualSettings))
				)
			);

			return r("div", { className: "aura-studio-backdrop", onMouseDown: e => { if (e.target === e.currentTarget) onClose(); } },
				r("section", { className: "aura-studio", role: "dialog", "aria-modal": "true", "aria-label": "Aura Studio" },
					r("header", { className: "aura-studio__head" }, r("div", { className: "aura-studio__title" }, r("strong", null, "Aura Studio"), r("small", null, "Workflow routing, shared sources and live themes")), button("Close", onClose, { "aria-label": "Close Aura Studio" })),
					r("div", { className: "aura-studio__tabs", role: "tablist", "aria-label": "Aura Studio sections" }, [["workflow", "Agent Workflow"], ["files", "Recipe snippets"], ["memory", "Jobs & Skills"], ["design", "Artisan UI Studio"]].map(([id, label]) => r("button", { type: "button", key: id, role: "tab", id: `aura-tab-${id}`, "aria-controls":"aura-studio-panel", tabIndex:tab===id?0:-1, "aria-selected": tab === id, onKeyDown:e=>{const ids=["workflow","files","memory","design"];const step=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0;if(step){e.preventDefault();const next=ids[(ids.indexOf(id)+step+ids.length)%ids.length];setTab(next);document.getElementById(`aura-tab-${next}`)?.focus();}}, onClick: () => setTab(id) }, label))),
					r("div", { className: "aura-studio__body",id:"aura-studio-panel",role:"tabpanel","aria-labelledby":`aura-tab-${tab}` }, notice ? r("p", { className: "aura-studio__notice", role: "status" }, notice) : null, tab === "workflow" ? r(React.Fragment,null,execution,workflow) : tab === "files" ? files : tab === "memory" ? memory : design, transfer ? r("details",{open:true},r("summary",null,"Transfer JSON — select and save if download is unavailable"),r("textarea",{readOnly:true,value:transfer,"aria-label":"Exported recipe JSON",onFocus:e=>e.target.select()})) : null)
				));
		}

		/**
		 * Compact always-visible header pill: live agent + job counts for the
		 * session being viewed. Registered into
		 * `conversation.session.header.actions`.
		 */
		function AuraHeaderPill({ sessionId, useSessions, openDock, t }) {
			const byId = useSessions((s) => s.byId);
			const subagentsByParent = useSessions((s) => s.subagentsByParent);
			const jobsBySession = useSessions((s) => s.jobsBySession);

			const stats = useMemo(() => {
                const nodes = buildWorkflow(byId, sessionId, subagentsByParent);
                const jobs = collectJobs(jobsBySession, nodes);
                return { agents: nodes.length, jobs: jobs.length,
                    live: nodes.filter(n => n.running).length + jobs.filter(isLiveJob).length };

			}, [byId, subagentsByParent, jobsBySession, sessionId]);

			const total = stats.agents + stats.jobs + stats.live;
			if (total === 0) return null;

			const label = stats.live > 0
				? t("pill.live", { agents: stats.agents, jobs: stats.jobs })
				: t("pill.idle", { agents: stats.agents, jobs: stats.jobs });

			return r("button", {
				type: "button",
				className: stats.live > 0 ? "aura-pill aura-pill--live" : "aura-pill",
				onClick: openDock,
				title: t("pill.title"),
				"aria-label": label
			},
				r("span", { className: stats.live > 0 ? "aura-pulse" : "aura-pulse aura-pulse--idle" }),
				r("span", null, label)
			);
		}

		/* ================================================================== */
		/* Locales                                                             */
		/* ================================================================== */

		const zh = {
			"panel.workflow": "智能体工作流",
			"panel.activity": "任务与技能",
			"count.agent": "1 个节点",
            "count.agents": "{count} 个节点",
			"count.jobs": "{count} 个任务",
			"workflow.empty": "暂无智能体活动 — 发送消息后即可看到工作流图。",
			"state.running": "运行中",
			"state.idle": "空闲",
			"state.sub": "子代理",
			"status.running": "运行中",
			"status.stopping": "停止中",
			"status.completed": "已完成",
			"status.killed": "已取消",
			"status.failed": "已失败",
			"activity.idle": "空闲",
			"activity.idleSub": "此工作流暂无后台任务。工具调用显示在对话中。",
			"recommend.label": "推荐技能",
            "recommend.reason": "标题匹配：{terms}。仅推荐，尚未启用。",
            "recommend.none": "没有与此会话标题明确匹配的技能。",
            "recommend.retry": "重试加载",
			"recommend.loading": "正在加载技能目录…",
			"recommend.unavailable": "技能目录暂不可用",
			"dock.label": "工作流",
			"dock.open": "展开智能体工作流",
			"dock.close": "收起智能体工作流",
			"dock.collapse": "收起面板",
			"dock.live": "{count} 个进行中",
			"dock.idle": "空闲",
			"pill.live": "{agents} 代理 · {jobs} 任务 进行中",
			"pill.idle": "{agents} 代理 · {jobs} 任务",
			"pill.title": "查看智能体工作流与插件活动"
		};

		const en = {
			"panel.workflow": "Agent Workflow",
			"panel.activity": "Jobs & skills",
			"count.agent": "1 node",
            "count.agents": "{count} nodes",
			"count.jobs": "{count} jobs",
			"workflow.empty": "No agent activity yet \u2014 send a message to see the workflow graph.",
			"state.running": "running",
			"state.idle": "idle",
			"state.sub": "subagent",
			"status.running": "running",
			"status.stopping": "stopping",
			"status.completed": "done",
			"status.killed": "cancelled",
			"status.failed": "failed",
			"activity.idle": "Idle",
			"activity.idleSub": "No background jobs reported for this workflow. Tool calls remain in the conversation.",
			"recommend.label": "Suggested skill",
            "recommend.reason": "Title match: {terms}. Suggestion only; not activated.",
            "recommend.none": "No clear skill match for this session title.",
            "recommend.retry": "Retry catalog",
			"recommend.loading": "Loading skill catalog\u2026",
			"recommend.unavailable": "Skill catalog unavailable",
			"dock.label": "Workflow",
			"dock.open": "Expand agent workflow",
			"dock.close": "Collapse agent workflow",
			"dock.collapse": "Collapse panels",
			"dock.live": "{count} live",
			"dock.idle": "idle",
			"pill.live": "{agents} agents \u00b7 {jobs} jobs live",
			"pill.idle": "{agents} agents \u00b7 {jobs} jobs",
			"pill.title": "Inspect agent workflow and plugin activity"
		};

		/* ================================================================== */
		/* Plugin body                                                         */
		/* ================================================================== */

		let auraSettingsScope;
		const inject = ["sessions", "slots", "locale", "remote", "remote.skills", "remote.session", "theme", "conversation", "settingsScope"];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ui-aura: dictionaries");
            auraSettingsScope = ctx.settingsScope.bind({ namespace: "ui-aura" });
            ctx.effect(() => {
                const refresh = () => {
                    const snapshot = auraSettingsScope.getSnapshot();
                    const value = snapshot.value ?? window.__AURA_BOOT__;
                    if (!value) return;
                    applyTheme(value.skin, ctx.theme);
                    applyVisualSettings(value);
                };
                refresh();
                const unsubscribe = auraSettingsScope.subscribe(refresh);
                return () => {
                    unsubscribe(); disposeAuraTheme?.();
                    document.querySelector('style[data-aura-palette]')?.remove();
                    delete document.body.dataset.auraSkin; delete document.body.dataset.auraBackdrop;
                    for (const key of Array.from(document.documentElement.style)) if (key.startsWith('--aura-')) document.documentElement.style.removeProperty(key);
                };
            }, "ui-aura: shared settings");

			/* ---- global stylesheet, owned for exactly this plugin lifetime ---- */
			ctx.effect(() => {
				if (typeof document === "undefined") return void 0;
				const tagId = `${PLUGIN_ID}/aura.css`;
				const tag = document.querySelector(`style[data-plugin-css="${tagId}"]`) ?? document.createElement("style");
				tag.dataset.plugin = PLUGIN_ID;
				tag.dataset.pluginCss = tagId;
				tag.textContent = AURA_CSS;
				document.head.appendChild(tag);
				return () => { tag.remove(); for (const key of ["--aura-accent", "--aura-accent-2", "--aura-accent-3"]) document.body?.style?.removeProperty?.(key); };
			}, "ui-aura: stylesheet");

			/* ---- skill catalog: observable cache + subscription hook ---- */
			const skillsCache = new Map();   // sessionId -> skill[]
			const skillsPhase = new Map();   // sessionId -> "loading" | "ready" | "error"
			const skillsListeners = new Set();
			const inFlight = new Map();

			ctx.effect(() => () => { for (const abort of inFlight.values()) abort.abort(); skillsListeners.clear(); }, "ui-aura: requests");

            const notifySkills = () => {
				for (const listener of [...skillsListeners]) {
					try { listener(); } catch (error) { /* one bad listener must not break the rest */ }
				}
			};

			const loadSkills = (sessionId) => {
				if (sessionId === void 0 || sessionId === null) return;
				if (skillsCache.has(sessionId) || inFlight.has(sessionId)) return;

				const remote = ctx.remote;
				if (!remote || !remote.skills || typeof remote.skills.list !== "function") {
					skillsPhase.set(sessionId, "error");
					notifySkills();
					return;
				}

				skillsPhase.set(sessionId, "loading");
                notifySkills();
				const abort = new AbortController();
				inFlight.set(sessionId, abort);

                const detach = () => inFlight.delete(sessionId);

				Promise.resolve()
					.then(() => remote.skills.list({ sessionId }, abort.signal))
					.then((result) => {
						if (abort.signal.aborted) return;
                        if (result && result.ok) {
							const list = result.value && Array.isArray(result.value.skills) ? result.value.skills : [];
							skillsCache.set(sessionId, list);
							skillsPhase.set(sessionId, "ready");
						} else {
							skillsPhase.set(sessionId, "error");
						}
					})
					.catch(() => { skillsPhase.set(sessionId, "error"); })
					.then(() => { detach(); notifySkills(); });
			};

			/**
			 * Subscription hook over the catalog for one session. Array identity
			 * is stable between notifications because it is the cached list.
			 */
			function useSkillCatalog(sessionId) {
				const [, bump] = useState(0);

				useEffect(() => {
					const listener = () => bump((n) => n + 1);
					skillsListeners.add(listener);
					return () => { skillsListeners.delete(listener); };
				}, []);

				useEffect(() => {
					if (sessionId === void 0) return void 0;
					loadSkills(sessionId);
				}, [sessionId]);

				const skills = sessionId === void 0 ? null : (skillsCache.get(sessionId) ?? null);
				const phase = sessionId === void 0
					? "idle"
					: (skillsPhase.get(sessionId) ?? (skills ? "ready" : "loading"));
				return { skills, phase };
			}

			/* ---- dock-open signal, so the header pill can expand the dock ---- */
			const dockListeners = new Set();
			const requestDockOpen = () => {
				for (const listener of [...dockListeners]) {
					try { listener(); } catch (error) { /* isolated */ }
				}
			};

			/** Persist the dock's expanded state so a reload keeps the layout. */
			const OPEN_KEY = "dsh.aura.dockOpen";
			const readOpen = () => {
				try { return window.localStorage.getItem(OPEN_KEY) === "1"; } catch (error) { return false; }
			};
			const writeOpen = (value) => {
				try { window.localStorage.setItem(OPEN_KEY, value ? "1" : "0"); } catch (error) { /* storage blocked */ }
			};

			/**
			 * The floating dock. Collapsed by default to a compact pill so it
			 * never covers the conversation or the right panel; expanding
			 * reveals the workflow graph and plugin activity.
			 */
			function AuraDock({ useSessions, t }) {
				const [open, setOpenState] = useState(readOpen);
				const [studioOpen, setStudioOpen] = useState(false);
				const [recipe, setRecipe] = useState(() => readRecipe());

				const setOpen = useCallback((value) => {
					setOpenState(value);
					writeOpen(value);
				}, []);

				useEffect(() => {
					const listener = () => setOpen(true);
					dockListeners.add(listener);
					return () => { dockListeners.delete(listener); };
				}, [setOpen]);

				// Stable property-access selectors only. Returning an object or
				// array literal here would break snapshot-hook identity and
				// re-render forever.
				const byId = useSessions((s) => s.byId);
				const current = useSessions((s) => s.current);
				const subagentsByParent = useSessions((s) => s.subagentsByParent);
				const jobsBySession = useSessions((s) => s.jobsBySession);
				useEffect(() => { setRecipe(readRecipe(current)); }, [current]);

				const nodes = useMemo(
					() => buildWorkflow(byId, current, subagentsByParent),
					[byId, current, subagentsByParent]
				);
				const jobs = useMemo(() => collectJobs(jobsBySession, nodes), [jobsBySession, nodes]);
				const { skills, phase } = useSkillCatalog(current);

				const liveAgents = nodes.filter((n) => n.running).length;
				const liveJobs = jobs.filter(isLiveJob).length;
				const live = liveAgents + liveJobs;

				const expand = useCallback(() => setOpen(true), [setOpen]);
				const collapse = useCallback(() => setOpen(false), [setOpen]);

				useEffect(() => {
                    if (!open) return;
					const onKey = event => { if (event.key === "Escape") { if (studioOpen) setStudioOpen(false); else { setOpen(false); document.querySelector('.aura-fab')?.focus(); } } };
					document.addEventListener("keydown", onKey);
					return () => document.removeEventListener("keydown", onKey);
				}, [open, studioOpen, setOpen]);

                if (!open) {
					return r("div", { className: "aura-dock" },
						r("button", {
							type: "button",
							className: "aura-fab",
							onClick: expand,
							"aria-expanded": "false",
							"aria-label": t("dock.open"),
							title: t("dock.open")
						},
							r("span", { className: live > 0 ? "aura-pulse" : "aura-pulse aura-pulse--idle" }),
							r(IconGraph),
							r("span", null, t("dock.label")),
							r("span", { className: "aura-fab__count" },
								live > 0 ? t("dock.live", { count: live }) : t("dock.idle"))
						)
					);
				}

				return r("div", { className: "aura-dock aura-dock--open", "aria-label": t("dock.label") },
					r(WorkflowPanel, { nodes, recipe, onOpenStudio: () => setStudioOpen(true), t }),
					r(ActivityPanel, { jobs, skills, skillsPhase: phase, taskTitle: byId?.[current]?.title ?? byId?.[current]?.displayTitle, retrySkills: () => loadSkills(current), t }),
					r("button", { type: "button", className: "aura-studio-launch", onClick: () => setStudioOpen(true) }, "Open Aura Studio · recipes, memory, design →"),
					studioOpen ? r(AuraStudio, { key: String(current ?? "new"), sessionId: current, runtime: ctx, locked: live > 0, onClose: () => setStudioOpen(false), onRecipeChange: setRecipe }) : null,
					r("button", {
						type: "button",
						className: "aura-fab",
						onClick: collapse,
						"aria-expanded": "true",
						"aria-label": t("dock.close"),
						title: t("dock.close")
					},
						r(IconClose),
						r("span", null, t("dock.collapse"))
					)
				);
			}

			/* ---- slot registrations ---- */

			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "aura-dock",
				order: 50,
				locale: NS
			}, AuraDock));

			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "aura-header-pill",
				order: 15,
				locale: NS,
				inject: () => ({ openDock: requestDockOpen })
			}, AuraHeaderPill));
		}

		return { inject, apply };
	}
});

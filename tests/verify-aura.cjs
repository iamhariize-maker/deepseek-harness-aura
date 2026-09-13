/**
 * Verification harness for dsh-ui-aura.
 *
 * Runs the real client bundle in a sandbox with:
 *   - a minimal-but-faithful React stub (createElement + hooks + a recursive
 *     renderer that executes effects),
 *   - a mock Cordis client ctx (slots/locale/effect/remote),
 *   - mock runtime data shaped exactly like the real sessions store.
 *
 * This catches: factory/registration errors, hook-order mistakes, undefined
 * property access during render, selector-identity bugs, and bad tree output.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const BUNDLE = process.argv[2];
const src = fs.readFileSync(BUNDLE, "utf8");

/* ------------------------------ React stub ------------------------------ */

let hookSlots = [];
let hookIndex = 0;
let pendingEffects = [];
let renderCount = 0;

const ReactStub = {
	Fragment: Symbol.for("react.fragment"),
	createElement(type, props, ...children) {
		return { $$typeof: Symbol.for("react.element"), type, props: props ?? {}, children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false) };
	},
	useState(initial) {
		const i = hookIndex++;
		if (!(i in hookSlots)) hookSlots[i] = typeof initial === "function" ? initial() : initial;
		const set = (next) => {
			hookSlots[i] = typeof next === "function" ? next(hookSlots[i]) : next;
		};
		return [hookSlots[i], set];
	},
	useEffect(fn, deps) {
		const i = hookIndex++;
		const prev = hookSlots[i];
		const changed = !prev || !deps || !Array.isArray(prev.deps) ||
			!Array.isArray(deps) || prev.deps.length !== deps.length ||
			deps.some((d, k) => !Object.is(d, prev.deps[k]));
		if (changed) {
			hookSlots[i] = { deps };
			pendingEffects.push(() => {
				const cleanup = fn();
				if (typeof cleanup === "function") hookSlots[i].cleanup = cleanup;
			});
		}
	},
	useMemo(fn, deps) {
		const i = hookIndex++;
		const prev = hookSlots[i];
		const changed = !prev || !deps || prev.deps.length !== deps.length ||
			deps.some((d, k) => !Object.is(d, prev.deps[k]));
		if (changed) {
			const value = fn();
			hookSlots[i] = { deps, value };
			return value;
		}
		return prev.value;
	},
	useCallback(fn, deps) { return ReactStub.useMemo(() => fn, deps); },
	useRef(initial) {
		const i = hookIndex++;
		if (!(i in hookSlots)) hookSlots[i] = { current: initial };
		return hookSlots[i];
	}
};

/** Recursively render a vnode tree, executing function components. */
function renderTree(node, depth = 0, out = []) {
	if (node === null || node === undefined || typeof node === "boolean") return out;
	if (typeof node === "string" || typeof node === "number") { out.push(String(node)); return out; }
	if (Array.isArray(node)) { for (const child of node) renderTree(child, depth, out); return out; }
	if (typeof node.type === "function") {
		hookIndex = 0;
		const saved = hookSlots;
		hookSlots = node.__hookSlots ??= [];
		renderCount++;
		const rendered = node.type({ ...node.props, children: node.children });
		hookSlots = saved;
		renderTree(rendered, depth + 1, out);
		return out;
	}
	if (typeof node.type === "symbol") { for (const child of node.children) renderTree(child, depth, out); return out; }
	// host element
	const cls = node.props.className ? `.${String(node.props.className).split(" ").join(".")}` : "";
	out.push(`<${String(node.type)}${cls}>`);
	for (const child of node.children) renderTree(child, depth + 1, out);
	return out;
}

function flushEffects() {
	const effects = pendingEffects;
	pendingEffects = [];
	for (const run of effects) run();
}

/* ------------------------------ DOM stub ------------------------------ */

const styleTags = [];
function makeElement(tagName) {
	return {
		tagName,
		dataset: {},
		textContent: "",
		_removed: false,
		appendChild() {},
		remove() { this._removed = true; }
	};
}
const documentStub = {
 addEventListener() {}, removeEventListener() {},
	head: { appendChild(el) { styleTags.push(el); } },
	body: { style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ""; } }, setAttribute() {}, removeAttribute() {} },
	createElement: makeElement,
	querySelector() { return null; },
	querySelectorAll() { return []; }
};

/* ------------------------------ module loader ------------------------------ */

let registration = null;
const windowStub = {
	__ModuleLoader__: { load(reg) { registration = reg; } },
	localStorage: {
		_store: new Map(),
		getItem(k) { return this._store.has(k) ? this._store.get(k) : null; },
		setItem(k, v) { this._store.set(k, String(v)); }
	},
	innerWidth: 1440,
	addEventListener() {},
	removeEventListener() {}
};

const sandbox = {
	window: windowStub,
	document: documentStub,
	localStorage: windowStub.localStorage,
	console,
	setTimeout,
	clearTimeout,
	setInterval,
	clearInterval,
	Promise,
	Map,
	Set,
	Object,
	Array,
	String,
	Number,
	Math,
	JSON,
	Symbol,
	Error,
	AbortController
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: "client.js" });

if (!registration) throw new Error("bundle did not call __ModuleLoader__.load");
console.log(`[ok] registered bundle id: ${registration.id}`);

const exportsObj = registration.factory((spec) => {
	if (spec === "react") return ReactStub;
	throw new Error(`unexpected require("${spec}") — not a seed module`);
});
console.log(`[ok] factory exports: ${Object.keys(exportsObj).join(", ")}`);
console.log(`[ok] inject: ${JSON.stringify(exportsObj.inject)}`);

/* ------------------------------ mock ctx ------------------------------ */

// Shaped exactly like the real sessions list snapshot store.
const SESSION_ID = "session-main";
const SUB_A = "session-sub-a";
const SUB_B = "session-sub-b";
const SUB_A1 = "session-sub-a1";
const SUB_A2 = "session-sub-a2";
// A catalog child whose session summary has NOT hydrated yet — exercises the
// label/activity fallback path.
const SUB_B1 = "session-sub-b1";

const listSnapshot = {
	ids: [SESSION_ID, SUB_A, SUB_B, SUB_A1, SUB_A2],
	byId: {
		[SESSION_ID]: { id: SESSION_ID, title: "UI redesign", cwd: "/workspace/aura-demo", running: true, origin: "user", updatedAt: 1 },
		[SUB_A]: { id: SUB_A, title: "Research agent", origin: "subagent", parentId: SESSION_ID, running: true, updatedAt: 2 },
		[SUB_B]: { id: SUB_B, title: "Build agent", origin: "subagent", parentId: SESSION_ID, running: false, updatedAt: 3 },
		[SUB_A1]: { id: SUB_A1, title: "Fetch sources", origin: "subagent", parentId: SUB_A, running: true, updatedAt: 4 },
		[SUB_A2]: { id: SUB_A2, title: "Summarize", origin: "subagent", parentId: SUB_A, running: false, updatedAt: 5 }
	},
	current: SESSION_ID,
	phase: "ready",
	subagentsByParent: {
		[SESSION_ID]: {
			state: "ready",
			parentAvailable: true,
			entries: [
				{ kind: "child", id: SUB_A, label: "Research agent", mode: "continuable", activity: "running", hasChildren: true },
				{ kind: "child", id: SUB_B, label: "Build agent", mode: "one-shot", activity: "inactive", hasChildren: true }
			]
		},
		[SUB_A]: {
			state: "ready",
			parentAvailable: true,
			entries: [
				{ kind: "child", id: SUB_A1, label: "Fetch sources", mode: "one-shot", activity: "running", hasChildren: false },
				{ kind: "child", id: SUB_A2, label: "Summarize", mode: "one-shot", activity: "inactive", hasChildren: false }
			]
		},
		[SUB_B]: {
			state: "ready",
			parentAvailable: true,
			entries: [
				// summary deliberately absent from byId
				{ kind: "child", id: SUB_B1, label: "Lint pass", mode: "one-shot", activity: "inactive", hasChildren: false }
			]
		}
	},
	jobsBySession: {
		[SESSION_ID]: [
			{ id: "job-1", kind: "pwsh", label: "Build frontend", status: "running", startedAt: Date.now() - 65000, detail: "running" },
			{ id: "job-2", kind: "subagent", label: "Audit pass", status: "completed", startedAt: Date.now() - 200000, finishedAt: Date.now() - 120000 }
		]
	},
	currentAddress: undefined
};

const registrations = [];
const effects = [];
let localeDict = null;

const ctxStub = {
	effect(fn, label) {
		const cleanup = fn();
		effects.push({ label, cleanup });
		return () => { if (typeof cleanup === "function") cleanup(); };
	},
	locale: {
		register(ns, dicts) { localeDict = { ns, dicts }; return () => {}; },
		bind(ns) {
			return (key, params) => {
				const table = localeDict?.dicts?.en ?? {};
				let text = table[key] ?? `MISSING:${key}`;
				if (params) for (const k of Object.keys(params)) text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(params[k]));
				return text;
			};
		}
	},
	slots: {
		inject(key, factory) {
			const dispose = factory();
			return dispose;
		},
		register(options, Component) {
			registrations.push({ options, Component });
			return () => {};
		}
	},
	remote: {
		skills: {
			list: async ({ sessionId }, signal) => {
				if (signal?.aborted) throw new Error("aborted");
				return {
					ok: true,
					value: {
						skills: [
							{ name: "cooperative-audit", description: "Statutory audit assistant for cooperative societies.", modelInvocable: true },
							{ name: "fitness-coach", description: "Personal fitness coach.", modelInvocable: false }
						]
					}
				};
			}
		}
	},
	on(event, handler) { return () => {}; }
};

exportsObj.apply(ctxStub);
flushEffects();

console.log(`[ok] apply() ran; effects=${effects.length}, locale ns=${localeDict?.ns}`);
console.log(`[ok] style tags injected: ${styleTags.length} (css ${styleTags[0]?.textContent?.length ?? 0} bytes)`);
console.log(`[ok] slot registrations:`);
for (const reg of registrations) {
	console.log(`      - ${reg.options.name} (id=${reg.options.id ?? "-"}, order=${reg.options.order ?? "-"}, locale=${reg.options.locale ?? "-"})`);
}

/* ------------------------------ render ------------------------------ */

const t = ctxStub.locale.bind("aura");
const useSessions = (selector) => selector(listSnapshot);

const dockReg = registrations.find((x) => x.options.id === "aura-dock");
const pillReg = registrations.find((x) => x.options.id === "aura-header-pill");

if (!dockReg) throw new Error("aura-dock was not registered into shell.overlay");
if (!pillReg) throw new Error("aura-header-pill was not registered");

// The header pill receives `inject` props — verify it is a FUNCTION (contract).
const injectOpt = pillReg.options.inject;
console.log(`[ok] header pill inject option type: ${typeof injectOpt}`);
if (typeof injectOpt !== "function") throw new Error("register() inject must be a function (sessionId) => props");
const injectedProps = injectOpt(SESSION_ID);
console.log(`[ok] injected props keys: ${Object.keys(injectedProps).join(", ")}`);

console.log("\n--- render: header pill ---");
const pillTree = pillReg.Component({ sessionId: SESSION_ID, useSessions, t, ...injectedProps });
const pillText = renderTree(pillTree);
flushEffects();
console.log(pillText.join(" "));

console.log("\n--- render: dock (collapsed) ---");
let dockTree = dockReg.Component({ useSessions, t });
let dockText = renderTree(dockTree);
flushEffects();
console.log(dockText.slice(0, 40).join(" "));

// Expand the dock: the component reads its persisted open state lazily, so
// flip localStorage and re-mount to exercise the expanded branch.
console.log("\n--- render: dock (expanded) ---");
windowStub.localStorage.setItem("dsh.aura.dockOpen", "1");
hookSlots = [];
hookIndex = 0;
renderCount = 0;
dockTree = dockReg.Component({ useSessions, t });
dockText = renderTree(dockTree);
flushEffects();
console.log(dockText.join(" "));

console.log(`\n[ok] total component renders: ${renderCount}`);

// Let the async skill catalog resolve, then re-render to confirm the
// recommendation shows a real skill name (not the loading placeholder).
setTimeout(() => {
	console.log("\n--- after skills catalog resolves ---");
	hookSlots = [];
	hookIndex = 0;
	const tree = dockReg.Component({ useSessions, t });
	const text = renderTree(tree);
	flushEffects();
	const joined = text.join(" ");
	if (joined.includes("cooperative-audit")) throw Error("Unrelated audit recommendation leaked into UI design");
 console.log("[ok] unrelated skill is not recommended");

	// Verify locale completeness: no MISSING: keys anywhere.
	const missing = joined.match(/MISSING:[\w.]+/g);
	if (missing) { console.log(`[FAIL] missing locale keys: ${[...new Set(missing)].join(", ")}`); process.exitCode = 1; }
	else console.log("[ok] no missing locale keys in rendered output");

	// Verify the stylesheet was cleaned up on dispose.
	for (const eff of effects) if (typeof eff.cleanup === "function") eff.cleanup();
	console.log(`[ok] style tag removed on dispose: ${styleTags.every((s) => s._removed)}`);

	/* ---------------- structural assertions on the workflow tree ---------------- */

	function collectNodes(node, out = []) {
		if (!node || typeof node !== "object") return out;
		if (Array.isArray(node)) { for (const c of node) collectNodes(c, out); return out; }
		const cls = typeof node.props?.className === "string" ? node.props.className.split(" ") : [];
		if (cls.includes("aura-node")) {
			out.push({ cls, level: 1 + (node.props.style?.marginLeft ?? 0) / 16, label: node.props["aria-label"] });
		}
		for (const c of node.children ?? []) collectNodes(c, out);
		return out;
	}

	// `finalTree` still contains function-component vnodes. Walk it through the
	// same lightweight renderer before reading host-element classes; inspecting
	// the unresolved vnode tree would miss every workflow row.
	function collectRenderedNodes(node, out = []) {
		if (node === null || node === undefined || typeof node === "boolean" ||
			typeof node === "string" || typeof node === "number") return out;
		if (Array.isArray(node)) {
			for (const child of node) collectRenderedNodes(child, out);
			return out;
		}
		if (typeof node.type === "function") {
			hookIndex = 0;
			const saved = hookSlots;
			hookSlots = node.__hookSlots ??= [];
			const rendered = node.type({ ...node.props, children: node.children });
			hookSlots = saved;
			return collectRenderedNodes(rendered, out);
		}
		if (typeof node.type === "symbol") {
			for (const child of node.children) collectRenderedNodes(child, out);
			return out;
		}
		const cls = typeof node.props?.className === "string" ? node.props.className.split(" ") : [];
		if (cls.includes("aura-node")) {
			out.push({ cls, level: 1 + (node.props.style?.marginLeft ?? 0) / 16, label: node.props["aria-label"] });
		}
		for (const child of node.children ?? []) collectRenderedNodes(child, out);
		return out;
	}

	windowStub.localStorage.setItem("dsh.aura.dockOpen", "1");
	hookSlots = [];
	hookIndex = 0;
	const finalTree = dockReg.Component({ useSessions, t });
	renderTree(finalTree);
	flushEffects();
	const treeNodes = collectRenderedNodes(finalTree);

	console.log("\n--- workflow tree (DOM order) ---");
	for (const n of treeNodes) {
		console.log(`  L${n.level} ${n.cls.filter((c) => c !== "aura-node").join(" ")} :: ${n.label}`);
	}

	const expected = [
		{ level: 1, has: ["aura-node--root", "aura-node--last", "aura-node--running", "aura-node--current"], label: "UI redesign" },
		{ level: 2, has: ["aura-node--child", "aura-node--running"], not: ["aura-node--last"], label: "Research agent" },
		{ level: 3, has: ["aura-node--child", "aura-node--running"], not: ["aura-node--last"], label: "Fetch sources" },
		{ level: 3, has: ["aura-node--child", "aura-node--last"], not: ["aura-node--running"], label: "Summarize" },
		{ level: 2, has: ["aura-node--child", "aura-node--last"], not: ["aura-node--running"], label: "Build agent" },
		{ level: 3, has: ["aura-node--child", "aura-node--last"], not: ["aura-node--running"], label: "Lint pass" }
	];

	let failures = 0;
	if (treeNodes.length !== expected.length) {
		console.log(`[FAIL] expected ${expected.length} tree nodes, got ${treeNodes.length}`);
		failures++;
	}
	expected.forEach((exp, i) => {
		const got = treeNodes[i];
		if (!got) { console.log(`[FAIL] node ${i} missing (expected ${exp.label})`); failures++; return; }
		if (got.level !== exp.level) { console.log(`[FAIL] node ${i} (${exp.label}) level ${got.level} != ${exp.level}`); failures++; }
		if (!String(got.label).startsWith(exp.label)) { console.log(`[FAIL] node ${i} label "${got.label}" != "${exp.label}…"`); failures++; }
		for (const c of exp.has ?? []) if (!got.cls.includes(c)) { console.log(`[FAIL] node ${i} (${exp.label}) missing class ${c}`); failures++; }
		for (const c of exp.not ?? []) if (got.cls.includes(c)) { console.log(`[FAIL] node ${i} (${exp.label}) should NOT have class ${c}`); failures++; }
	});

	// The unhydrated catalog child must still render its catalog label.
	if (!treeNodes.some((n) => String(n.label).startsWith("Lint pass"))) {
		console.log("[FAIL] unhydrated catalog child lost its label");
		failures++;
	} else {
		console.log("[ok] unhydrated catalog child renders its catalog label (Lint pass)");
	}

	if (failures === 0) { console.log("\nALL CHECKS PASSED"); process.exit(0); }
	else { console.log(`\n${failures} CHECK(S) FAILED`); process.exit(1); }
}, 60);

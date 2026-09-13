const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../packages/dsh-ui-aura/lib/client.js'), 'utf8')
  .replace('return { inject, apply };', 'return { inject, apply, __auraRecipe: { defaultRecipe, validateRecipe, canonicalRecipe, orderedNodes, replaceChain } };');
let factory;
vm.runInNewContext(source, { window: { __ModuleLoader__: { load(bundle) { factory = bundle.factory; } } } });
assert.equal(typeof factory, 'function');
const { __auraRecipe: core } = factory(() => ({ createElement() {} }));

const clone = value => JSON.parse(JSON.stringify(value));
const recipe = core.defaultRecipe();
assert.equal(core.validateRecipe(recipe).errors.length, 0);
assert.deepEqual(Array.from(core.orderedNodes(recipe), n => n.data.role), ['Orchestrator', 'Scout', 'Implementer', 'Reviewer', 'Verifier']);

const reordered = clone(recipe);
reordered.nodes = [reordered.nodes[0], reordered.nodes[2], reordered.nodes[1], reordered.nodes[3], reordered.nodes[4]];
reordered.edges = core.replaceChain(reordered.nodes);
assert.equal(core.validateRecipe(reordered).errors.length, 0);
assert.deepEqual(Array.from(core.orderedNodes(reordered), n => n.data.role), ['Orchestrator', 'Implementer', 'Scout', 'Reviewer', 'Verifier']);

const cycle = clone(recipe);
cycle.edges[3].target = cycle.nodes[0].id;
assert.match(core.validateRecipe(cycle).errors.join(' '), /cycle|chain/i);

const fork = clone(recipe);
fork.edges[1].source = fork.nodes[0].id;
assert.match(core.validateRecipe(fork).errors.join(' '), /chain/i);

const badTool = clone(recipe);
badTool.nodes[2].data.tools = ['terminal', 'shell_exec'];
assert.match(core.validateRecipe(badTool).errors.join(' '), /tools/i);

const duplicate = clone(recipe);
duplicate.nodes[1].id = duplicate.nodes[0].id;
assert.match(core.validateRecipe(duplicate).errors.join(' '), /unique/i);

const oversized = clone(recipe);
oversized.estimate.input_tokens = 272000;
assert.match(core.validateRecipe(oversized).warnings.join(' '), /272K/i);

const hostile = JSON.parse(JSON.stringify(recipe));
hostile.metadata.kys_status = 'verified';
hostile.privacy_rules.zdr_enabled = true;
hostile.__proto_pollution = { admin: true };
const safe = core.canonicalRecipe(hostile);
assert.equal(safe.metadata.kys_status, 'pending');
assert.equal(safe.privacy_rules.zdr_enabled, false);
assert.equal(Object.hasOwn(safe, '__proto_pollution'), false);

console.log('PASS: defaults, ordering, cycle/fork rejection, tool/ID validation, token warning and import sanitization.');

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import { UiSettings, validateUi, apply } from '../lib/host.js';
import { css, bootstrap, skinIds } from '../lib/bootstrap.generated.js';

const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
new Script(source);
new Script(bootstrap);
let api;
runInNewContext(source.replace('return { inject, apply };', 'return { inject, apply, defaultRecipe, canonicalRecipe, validateRecipe, orderedNodes, replaceChain, compileWorkflow, auraThemeTokens, AURA_THEMES };'), {
  TextEncoder,
  window: {__ModuleLoader__: {load: bundle => { api = bundle.factory(() => ({createElement(){}})); }}},
});
const defaults = UiSettings({});
assert.equal(defaults.skin, 'catppuccin');
assert.throws(() => UiSettings({glow:101}));
assert.throws(() => UiSettings({skin:'remote-css'}));
const encodeSvg = svg => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
validateUi({...defaults,backdropSvg:encodeSvg('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10"/></svg>')});
for(const svg of ['<svg><script>alert(1)</script></svg>','<svg onload="run()"/>','<svg><image href="https://example.com"/></svg>','<svg><style>@import "x";</style></svg>']) {
  assert.throws(()=>validateUi({...defaults,backdropSvg:encodeSvg(svg)}));
}
assert.throws(()=>validateUi({...defaults,backdropSvg:'https://example.com/x.svg'}));
assert.throws(()=>validateUi({...defaults,backdropSvg:encodeSvg('<svg>'+'x'.repeat(32769)+'</svg>')}));
let section = defaults, collect;
apply({inject(names,callback){callback({settings:{register(ns,schema,options){assert.equal(ns,'ui-aura');assert.equal(schema,UiSettings);assert.equal(options.validate,validateUi);}}});},on(event,callback){assert.equal(event,'webserver/index-inject');collect=callback;},get(){return {get:()=>section};}});
const rows=[];collect(rows);
assert.deepEqual(rows.map(row=>row.kind),['global','html','script']);
assert.ok(rows[1].html.includes('data-plugin-css="dsh-ui-aura/aura.css"'));
section={...defaults,skin:'tanjore-regal'};
const updated=[];collect(updated);assert.equal(updated[0].value.skin,'tanjore-regal');
assert.ok(!/<\/script/i.test(bootstrap));assert.ok(!/<\/style/i.test(css));

// Execute the exact pre-paint bundle without React or a mounted page root.
const style = () => { const values=new Map();return {setProperty:(k,v)=>values.set(k,v),getPropertyValue:k=>values.get(k)??'',removeProperty:k=>values.delete(k)}; };
const tags=[];
const body={dataset:{},style:style()};
const document={body,documentElement:{style:style()},querySelector:()=>tags[0]??null,createElement:()=>({dataset:{},textContent:'',isConnected:false}),head:{appendChild:tag=>{tag.isConnected=true;tags.push(tag);}}};
runInNewContext(bootstrap,{document,window:{__AURA_BOOT__:{...defaults,skin:'tanjore-regal',glow:23}}});
assert.equal(body.dataset.auraSkin,'tanjore-regal');
assert.equal(document.documentElement.style.getPropertyValue('--aura-glow'),'23');
assert.match(tags[0].textContent,/data-ds-dark-theme/);
assert.equal(tags.length,1);

const recipe=api.defaultRecipe();
assert.equal(api.validateRecipe(recipe).errors.length,0);
recipe.nodes.forEach(node=>node.data.model={provider:'test',id:'fixture-model'});
const payload=api.compileWorkflow(recipe,'Synthetic test');
const request=JSON.parse(payload.slice(payload.indexOf('\n')+1));
const routed=[];
const execute = new Function('agent','phase','args',`return (async()=>{${request.script}})()`);
const results=await execute(async(prompt,options)=>{routed.push(options);return 'Verified synthetic output';},()=>{},request.args);
assert.equal(results.length,5);
assert.deepEqual(routed.map(x=>x.label),['Orchestrator','Scout','Implementer','Reviewer','Verifier']);
assert.ok(routed.every(x=>x.provider==='test' && x.model==='fixture-model'));
assert.ok(routed.every(x=>!('effort' in x))); // Installed Harness explicitly rejects this option.
await assert.rejects(()=>execute(async()=>null,()=>{},request.args),/workflow stopped/);
const six=structuredClone(recipe);
six.nodes.splice(4,0,{id:'unit-tests',type:'agent_node',data:{role:'Unit tests',reasoning_effort:'medium',tools:[],model:{provider:'test',id:'fixture-model'}}});
six.edges=api.replaceChain(six.nodes);
assert.equal(api.canonicalRecipe(six).nodes.length,6);
const cyclic=structuredClone(recipe);cyclic.edges[0]={source:cyclic.nodes[0].id,target:cyclic.nodes[0].id};
assert.ok(api.validateRecipe(cyclic).errors.length);
const snippet={id:'doc',name:'notes.txt',type:'text/plain',size:4,text:'note',readers:[recipe.nodes[0].id]};
recipe.files=[snippet];assert.equal(api.canonicalRecipe(recipe).files.length,1);
recipe.files=[{...snippet,text:'a\0b'}];assert.throws(()=>api.canonicalRecipe(recipe),/binary/);
recipe.files=[{...snippet,text:'x'.repeat(32769)}];assert.throws(()=>api.canonicalRecipe(recipe),/32 KB/);
recipe.files=[snippet,snippet];assert.throws(()=>api.canonicalRecipe(recipe),/unique/);
assert.ok(api.inject.includes('conversation') && api.inject.includes('settingsScope'));
assert.ok(source.includes('input.submit("queue")'));
assert.ok(source.includes('runtime.conversation.createDrafts(sessionId'));
assert.ok(source.includes('runtime.conversation.releaseDraftAttachments(drafts)'));
assert.equal(skinIds.length,8);
console.log('PASS: schema, safe SVGs, live host injection, pre-paint bootstrap, pipeline routing/failures, custom stages, invalid graphs, snippet bounds, and native composer integration seams.');

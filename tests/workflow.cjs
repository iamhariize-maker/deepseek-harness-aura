const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let factory;vm.runInNewContext(fs.readFileSync('packages/dsh-ui-aura/lib/client.js','utf8').replace('return { inject, apply };','return { inject, apply, defaultRecipe, canonicalRecipe, compileWorkflow, recommendWorkflowModels, AURA_THEMES, auraThemeTokens };'),{window:{__ModuleLoader__:{load:x=>factory=x.factory}}});
const api=factory(()=>({createElement(){}}));
(async()=>{const catalogue={default:{provider:'synthetic',model:'swift-flash'},routableProviders:['synthetic'],groups:[{id:'synthetic',models:[{id:'swift-flash',name:'Swift Flash'},{id:'deep-pro',name:'Deep Pro'},{id:'code-coder',name:'Code Coder'},{id:'image-vision',name:'Image Vision'}]}]};
const baseline=api.recommendWorkflowModels(api.defaultRecipe(),catalogue,'');assert.equal(baseline.nodes[0].data.model.id,'deep-pro');assert.equal(baseline.nodes[1].data.model.id,'swift-flash');assert.equal(baseline.nodes[2].data.model.id,'code-coder');assert.equal(baseline.nodes[0].data.model_source,'auto');
const visual=api.recommendWorkflowModels(baseline,catalogue,'Review screenshots and visual design');assert.equal(visual.nodes[1].data.model.id,'image-vision');
const manual=JSON.parse(JSON.stringify(baseline));manual.nodes[0].data.model={provider:'synthetic',id:'swift-flash'};manual.nodes[0].data.model_source='manual';assert.equal(api.recommendWorkflowModels(manual,catalogue,'debug repository').nodes[0].data.model.id,'swift-flash');assert.equal(api.recommendWorkflowModels(manual,catalogue,'debug repository',true).nodes[0].data.model_source,'auto');
const unavailable={...catalogue,groups:[{id:'synthetic',models:catalogue.groups[0].models.filter(m=>m.id!=='swift-flash')}]};assert.notEqual(api.recommendWorkflowModels(manual,unavailable,'').nodes[0].data.model.id,'swift-flash');
const recipe=api.defaultRecipe();recipe.nodes.forEach((n,i)=>n.data.model={provider:'synthetic',id:'model-'+i});recipe.memory={notes:'Reusable note'};
const safe=api.canonicalRecipe(recipe);assert.equal(safe.nodes[3].data.model.id,'model-3');assert.equal(safe.memory.notes,'Reusable note');
const prompt=api.compileWorkflow(recipe,'Test "quotes" and\nnewlines');const payload=JSON.parse(prompt.slice(prompt.indexOf('{')));const calls=[];
const fn=new (Object.getPrototypeOf(async function(){}).constructor)('agent','phase','args',payload.script);
const result=await fn(async(p,o)=>{calls.push(o);return 'ok'},()=>{},payload.args);assert.equal(result.length,5);assert.equal(calls[4].model,'model-4');
await assert.rejects(()=>fn(async()=>null,()=>{},payload.args),/failed/);
assert.equal(api.AURA_THEMES.length,6);for(const theme of api.AURA_THEMES){const tokens=api.auraThemeTokens(theme);assert.ok(Object.keys(tokens).length>40);for(const p of Object.values(tokens)){assert.match(p.light,/^#[\da-f]{6,8}$/i);assert.match(p.dark,/^#[\da-f]{6,8}$/i)}}
console.log('PASS: model and memory round-trip, executable workflow script, route preservation, stop on failure, six static whole-app theme maps.');})();

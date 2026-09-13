const fs=require('fs'), vm=require('vm'), assert=require('node:assert/strict');
let entry;
const file=process.argv[2] || 'packages/dsh-ui-aura/lib/client.js';
const src=fs.readFileSync(file,'utf8').replace('return { inject, apply };','return { buildWorkflow, collectJobs, recommendSkill, ActivityPanel, en };');
vm.runInNewContext(src,{window:{__ModuleLoader__:{load:e=>entry=e}}});
const api=entry.factory(()=>({createElement:(type,props,...children)=>({type,props,children}),useState:f=>[typeof f==='function'?f():f,()=>{}],useEffect:()=>{},useMemo:f=>f()}));
const {buildWorkflow,collectJobs,recommendSkill}=api;
const rows={ main:{id:'main',title:'UI redesign',running:false}, child:{id:'child',parentId:'main',running:true}, other:{id:'other',running:true} };
const nodes=buildWorkflow(rows,'child',{});
assert.equal(nodes.map(n=>n.id).join(','),'main,child');
assert.equal(nodes[1].isCurrent,true);
assert.equal(nodes[1].depth,1);
assert.equal(buildWorkflow(rows,undefined,{}).length,0);
const catalog={main:{entries:[{kind:'child',id:'pending',label:'Design review',activity:'running'}]}};
assert.equal(buildWorkflow(rows,'main',catalog).find(n=>n.id==='pending').title,'Design review');
const cycle={main:{entries:[{kind:'child',id:'child'}]},child:{entries:[{kind:'child',id:'main'}]}};
assert.equal(buildWorkflow(rows,'main',cycle).length,2);
const job={id:'j1',status:'running',startedAt:1};
assert.equal(collectJobs({main:[job],child:[job],other:[{id:'j2',status:'running'}]},nodes).length,1);
const skills=[{name:'cooperative-audit',description:'Audit accounts and financial records',modelInvocable:true},{name:'frontend-design',description:'Build polished web interfaces',modelInvocable:true}];
assert.equal(recommendSkill(skills,'redesign the UI to be').skill.name,'frontend-design');
assert.equal(recommendSkill(skills,'hello world'),null);
assert.equal(recommendSkill([], 'UI design'),null);
assert.equal(recommendSkill([{...skills[1],modelInvocable:false}],'UI design'),null);
console.log('PASS: actual id schema, selected lineage, parent fallback, catalog children, cycle safety, job isolation/deduplication, relevant matching and neutral fallbacks.');
function text(node){ return typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):node?.children?text(node.children):''; }
for (const [phase,expected] of [['ready','No clear skill match'],['idle','No clear skill match'],['loading','Loading skill catalog'],['error','Retry catalog']]) {
 const view=api.ActivityPanel({jobs:[],skills:[],skillsPhase:phase,taskTitle:'test',retrySkills:()=>{},t:key=>api.en[key]});
 assert.ok(text(view).includes(expected),phase);
}
console.log('PASS: ready-empty, no-selection, loading and actionable catalog error states.');

// Offline validation only. No n8n/GitHub/network operations are performed.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const directory = path.resolve(__dirname, '../../submission/superResult');
const load = name => JSON.parse(fs.readFileSync(path.join(directory, name + '.json'), 'utf8'));
const main = load('04_auto_fix_bug');
const wait = load('05_wait_actions');
const errors = load('06_auto_fix_errors');

function classes(workflow) {
  const names = new Set(workflow.nodes.map(n => n.name));
  assert.equal(names.size, workflow.nodes.length, 'Duplicate node names');
  for (const [source, connections] of Object.entries(workflow.connections)) {
    assert(names.has(source), source);
    for (const outputs of Object.values(connections)) for (const edges of outputs) for (const edge of edges) {
      assert(names.has(edge.node), edge.node);
    }
  }
  for (const node of workflow.nodes) {
    if (node.type === 'n8n-nodes-base.code') {
      new Function('$input', '$', '$execution', '$now', node.parameters.jsCode);
    }
    const serialized = JSON.stringify(node.parameters);
    for (const match of serialized.matchAll(/\$\('([^']+)'\)/g)) assert(names.has(match[1]), `${node.name}: ${match[1]}`);
    function visit(value) {
      if (typeof value === 'string' && value.startsWith('={{') && value.endsWith('}}')) {
        new Function('$', '$json', '$execution', '$now', `return (${value.slice(3, -2)});`);
      } else if (value && typeof value === 'object') Object.values(value).forEach(visit);
    }
    visit(node.parameters);
  }
  assert.equal(workflow.active, false);
}
[main, wait, errors].forEach(classes);

function simulate(scenario = {}) {
  const nodes = new Map(main.nodes.map(n => [n.name, structuredClone(n)]));
  const data = new Map();
  const rows = scenario.duplicate ? [{issue_key:'ramilEmazanov/RouteFinder#42', status:'merged'}] : [];
  const requests = [];
  const visited = [];
  const base = 'b'.repeat(40);
  const head = 'a'.repeat(40);
  let ciPolls = 0;
  const lookup = name => ({
    first: () => { assert(data.get(name)?.length, 'No data for ' + name); return {json:data.get(name)[0]}; },
    all: () => (data.get(name) ?? []).map(json => ({json})),
  });
  const now = {toISO:() => '2026-11-20T12:00:00.000Z'};
  function expression(value, input) {
    if (typeof value !== 'string' || !value.startsWith('={{')) return value;
    return new Function('$', '$json', '$execution', '$now', `return (${value.slice(3,-2)});`)(lookup,input,{id:'12345'},now);
  }
  function http(node,input) {
    const url = new URL(expression(node.parameters.url,input));
    const body = node.parameters.jsonBody ? expression(node.parameters.jsonBody,input) : null;
    requests.push({node:node.name,url:String(url),body});
    const ctx = () => data.get('Fix Context')[0];
    const pr = () => ({number:77,html_url:'https://github.com/ramilEmazanov/RouteFinder/pull/77',state:'open',draft:false,mergeable:true,changed_files:2,
      head:{sha:head,ref:ctx().branch,repo:{full_name:ctx().repo}},base:{ref:'master',repo:{full_name:ctx().repo}}});
    switch(node.name) {
      case 'Read Bug Report': return [{number:42,state:'open',labels:[{name:scenario.noLabel?'task':'bug'}],title:'Boundary bug',body:'Steps and expected result',html_url:'https://github.com/ramilEmazanov/RouteFinder/issues/42'}];
      case 'Get Base SHA': return [{object:{sha:base}}];
      case 'Dispatch Fix':
        assert.equal(body.inputs.base_sha,base); assert.equal(body.inputs.run_id,'12345');
        return [{workflow_run_id:501}];
      case 'Get Fix Branch': return [{object:{sha:head}}];
      case 'Create Fix PR': assert.equal(body.base,'master'); assert(body.body.startsWith('Closes #42')); return [pr()];
      case 'Dispatch Validation': assert.equal(body.inputs.head_sha,head);return [{workflow_run_id:502}];
      case 'Read PR For Review':return [pr()];
      case 'Get PR Files':return [
        {filename:'src/a.cpp',status:'modified',patch:scenario.missingPatch?undefined:'@@ -1 +1 @@\n-old\n+fixed'},
        {filename:'tests/a.cpp',status:'modified',patch:'@@ -1 +1 @@\n-old test\n+regression test'},
      ];
      case 'Publish AI Review': assert(body.body.includes(head));return [{id:900}];
      case 'Fresh PR': { const value=pr(); if(scenario.headChanged)value.head.sha='c'.repeat(40);return [value]; }
      case 'Fresh Base':return [{object:{sha:scenario.baseChanged?'c'.repeat(40):base}}];
      case 'Candidate Check Runs':
        ciPolls++;
        return [{total_count:1,check_runs:[{name:'unit',head_sha:head,status:scenario.pendingCI&&ciPolls===1?'in_progress':'completed',conclusion:scenario.badCI?'failure':'success'}]}];
      case 'Candidate Statuses':return [{total_count:0,statuses:[]}];
      case 'Merge Fix PR':assert.equal(body.sha,head);return [{merged:true,sha:'d'.repeat(40)}];
      default:throw new Error('Unhandled HTTP ' + node.name);
    }
  }
  let current='Run Auto Fix Manually';let input=[{}];let count=0;
  while(current) {
    assert(++count<160,'Unexpected loop');
    const node=nodes.get(current);visited.push(current);
    let output=input;let port=0;
    const short=node.type.split('.').at(-1);
    if(short==='manualTrigger') output=[{}];
    else if(short==='set') {
      output=input.map(item=>{
        const result=node.parameters.includeOtherFields?{...item}:{};
        for(const field of node.parameters.assignments.assignments)result[field.name]=expression(field.value,item);
        if(node.name==='Manual Bug Input')result.issue_number=scenario.badNumber?0:42;
        if(node.name==='Auto Fix Config') {
          result.bug_fixes_table_id='table123';result.wait_workflow_id='wait123';result.enable_merge=Boolean(scenario.merge);
          result.required_ci_names_json='["unit"]';
        }
        return result;
      });
    } else if(short==='code') {
      output=new Function('$input','$','$execution','$now',node.parameters.jsCode)(
        {first:()=>({json:input[0]}),all:()=>input.map(json=>({json}))},lookup,{id:'12345'},now).map(i=>i.json);
    } else if(short==='if') {
      const value=expression(node.parameters.conditions.conditions[0].leftValue,input[0]);
      assert.equal(typeof value,'boolean',node.name);port=value?0:1;
    } else if(short==='httpRequest')output=http(node,input[0]);
    else if(short==='dataTable') {
      const match=()=>rows.filter(r=>node.parameters.filters.conditions.every(c=>r[c.keyName]===expression(c.keyValue,input[0])));
      if(node.parameters.operation==='get')output=match();
      else {
        const value=Object.fromEntries(Object.entries(node.parameters.columns.value).map(([k,v])=>[k,expression(v,input[0])]));
        if(node.parameters.operation==='insert'){rows.push({...value});output=[value];}
        else {const targets=match();targets.forEach(r=>Object.assign(r,value));output=targets.map(r=>({...r}));}
      }
      if(!output.length&&node.alwaysOutputData)output=[{}];
    } else if(short==='executeWorkflow') {
      const args=Object.fromEntries(Object.entries(node.parameters.workflowInputs.value).map(([k,v])=>[k,expression(v,input[0])]));
      assert.equal(args.actions_run_id,node.name==='Wait Fix Result'?'501':'502');
      output=[{...args,completed:true,conclusion:(node.name==='Wait Fix Result'&&scenario.fixFailed)||(node.name==='Validate Result'&&scenario.validationFailed)?'failure':'success',actions_url:'https://github.com/ramilEmazanov/RouteFinder/actions/runs/'+args.actions_run_id}];
    } else if(short==='chainLlm') {
      output=[{output:{reviewed_sha:scenario.wrongReviewSHA?'wrong':head,verdict:scenario.rejected?'request_changes':'approve',summary:'Review result',findings:scenario.serious?[{severity:'high',file:'src/a.cpp',reason:'Serious regression'}]:[]}}];
    } else if(short==='wait') { /* Simulate elapsed polling interval without real sleep. */ }
    else throw new Error('Unexpected node '+node.type);
    data.set(current,output);
    const edges=main.connections[current]?.main?.[port]??[];
    assert(edges.length<=1,'Unexpected main branching at '+current);
    current=output.length&&edges[0]?.node;input=output;
  }
  return {rows,requests,visited,result:input[0]};
}
for(const [scenario,status] of [
  [{},'ready_for_merge'],[{merge:true},'merged'],[{merge:true,pendingCI:true},'merged'],
  [{merge:true,serious:true},'rejected'],[{merge:true,rejected:true},'rejected'],
  [{merge:true,fixFailed:true},'failed'],[{merge:true,validationFailed:true},'failed'],
  [{merge:true,headChanged:true},'blocked'],[{merge:true,baseChanged:true},'blocked'],[{merge:true,badCI:true},'blocked'],
  [{duplicate:true},'duplicate_skipped'],
]) {
  const result=simulate(scenario);
  assert.equal(result.result.status,status,JSON.stringify(scenario));
  assert.equal(result.requests.some(r=>r.node==='Merge Fix PR'),status==='merged');
}
for(const scenario of [{badNumber:true},{noLabel:true},{wrongReviewSHA:true},{missingPatch:true}]) assert.throws(()=>simulate(scenario));

const waitCode = name => wait.nodes.find(n=>n.name===name).parameters.jsCode;
const start = new Function('$input',waitCode('Wait Input'))({first:()=>({json:{repo:'ramilEmazanov/RouteFinder',actions_run_id:'501',expected_title:'ai-fix-12345',expected_path:'.github/workflows/ai-fix.yml',expected_sha:'',timeout_seconds:1500,poll_seconds:15}})})[0].json;
const run={id:501,repository:{full_name:start.repo},event:'workflow_dispatch',display_title:start.expected_title,path:start.expected_path,status:'in_progress',conclusion:null,html_url:'https://github.com/example'};
function inspect(value,context=start){return new Function('$input','$',waitCode('Inspect Run'))({first:()=>({json:value})},()=>({first:()=>({json:context})}))[0].json;}
assert.equal(inspect(run).completed,false);
assert.equal(inspect({...run,status:'completed',conclusion:'success'}).completed,true);
assert.throws(()=>inspect({...run,id:999}));assert.throws(()=>inspect({...run,event:'push'}));
assert.throws(()=>inspect(run,{...start,started_ms:Date.now()-1600000}));
console.log('Passed: workflow structure and expressions; 11 full orchestration scenarios; 4 invalid-input/diff/review cases; polling success, pending, identity and timeout checks. No live services called.');

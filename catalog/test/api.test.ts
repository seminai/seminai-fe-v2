import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listRules,getRule,rulePages,PublicApiError} from '../src/lib/api.ts';
const rule={id:'synthetic-id',slug:'synthetic-rule',name:'Synthetic public rule',description:'Synthetic source data',category:'STANDARD',region:null,version:null,creatorName:'Synthetic publisher',createdAt:'2026-01-01',updatedAt:'2026-01-01'};
const envelope=(data:unknown)=>new Response(JSON.stringify({status:'success',data}),{headers:{'Content-Type':'application/json'}});
test('anonymous origin reads cannot be extended by a backend cache',async()=>{
 await listRules('https://example.invalid',new URLSearchParams(),async(_input,init)=>{
  assert.equal(init?.credentials,'omit');assert.equal(init?.cache,'no-store');assert.equal(new Headers(init?.headers).get('Cookie'),null);
  return envelope({rules:{items:[rule],total:1,page:1,limit:50,hasNextPage:false}});
 });
});
test('publication, changes and removal are read from the current source',async()=>{
 let current:typeof rule|null=rule;
 const fetcher:typeof fetch=async()=>current?envelope({rule:current}):new Response('',{status:404});
 assert.equal((await getRule('https://example.invalid','synthetic-rule',fetcher)).name,rule.name);
 current={...rule,name:'Synthetic updated rule'};assert.equal((await getRule('https://example.invalid','synthetic-rule',fetcher)).name,current.name);
 current=null;await assert.rejects(getRule('https://example.invalid','synthetic-rule',fetcher),(error:unknown)=>error instanceof PublicApiError&&error.status===404);
});
test('an outage or malformed envelope is never an empty valid catalogue',async()=>{
 await assert.rejects(listRules('https://example.invalid',new URLSearchParams(),async()=>new Response('',{status:503})),PublicApiError);
 await assert.rejects(listRules('https://example.invalid',new URLSearchParams(),async()=>envelope({})),PublicApiError);
});
test('sitemap traversal exceeds the previous 1250-rule cap',async()=>{
 let count=0;
 const fetcher:typeof fetch=async(input)=>{const page=Number(new URL(String(input)).searchParams.get('page'));return envelope({rules:{items:Array.from({length:50},(_,index)=>({...rule,slug:`synthetic-${page}-${index}`})),total:1300,page,limit:50,hasNextPage:page<26}});};
 for await(const rules of rulePages('https://example.invalid',fetcher))count+=rules.length;
 assert.equal(count,1300);
});

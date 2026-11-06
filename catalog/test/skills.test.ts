import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listSkills,getSkill,skillPages} from '../src/lib/skills-api.ts';
import {localizeSkill,skillFingerprint,skillTranslations} from '../src/lib/skill-localization.ts';
import {skillListing} from '../src/lib/skill-listing.ts';
import {PublicApiError} from '../src/lib/api.ts';
import type {PublicSkillDetail, SkillTranslation} from '../src/lib/skill-types.ts';

const source:PublicSkillDetail={slug:'synthetic-skill',name:'Flusso sintetico',description:'Dati di prova',instructions:'Istruzioni sintetiche'};
const envelope=(data:unknown)=>new Response(JSON.stringify({status:'success',data}));
const translation:SkillTranslation={listFingerprint:await skillFingerprint(source),detailFingerprint:await skillFingerprint(source,true),
 it:{name:'Flusso sintetico',description:'Dati di prova',instructions:'Istruzioni sintetiche'},
 en:{name:'Synthetic workflow',description:'Test data',instructions:'Synthetic instructions'}};
const dictionary={[source.slug]:translation};
const item={slug:source.slug,name:source.name,description:source.description,sourceFingerprint:translation.detailFingerprint};

test('complete bilingual editorial copy is available for all 50 official skills',()=>{
 assert.equal(Object.keys(skillTranslations).length,50);
 for(const [slug,entry] of Object.entries(skillTranslations)) {
  assert.match(slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.match(entry.listFingerprint,/^[a-f0-9]{64}$/);assert.match(entry.detailFingerprint,/^[a-f0-9]{64}$/);
  for(const lang of ['it','en'] as const) {
   assert.ok(entry[lang].name && entry[lang].description);
   assert.match(entry[lang].instructions,lang==='it'?/^Obiettivo:/:/^Goal:/);
   assert.match(entry[lang].instructions,lang==='it'?/Input richiesti:/:/Required input:/);
   assert.match(entry[lang].instructions,/\n1\..*\n2\..*\n3\./);
   assert.match(entry[lang].instructions,lang==='it'?/Output atteso:/:/Expected output:/);
   assert.match(entry[lang].instructions,/\nGuardrail: .+/);
  }
 }
});
test('list and detail consume only public fields without credentials or source rule metadata',async()=>{
 const fetcher:typeof fetch=async(_input,init)=>{
  assert.equal(init?.cache,'no-store');assert.equal(init?.credentials,'omit');
  assert.equal(new Headers(init?.headers).get('Authorization'),null);
  return envelope({skills:{items:[{...item,sourceRuleName:'Synthetic private rule',creatorName:'Synthetic private creator'}],total:1,page:1,limit:20,hasNextPage:false}});
 };
 const page=await listSkills('https://example.invalid',new URLSearchParams(),fetcher);
 assert.equal('sourceRuleName' in page.items[0],false);assert.equal('creatorName' in page.items[0],false);
 const detail=await getSkill('https://example.invalid',source.slug,async()=>envelope({skill:{...source,sourceRuleName:'Synthetic private rule'}}));
 assert.equal('sourceRuleName' in detail,false);
});
test('translations require matching source text and instructions, never updatedAt',async()=>{
 assert.equal((await localizeSkill(item,'en',dictionary)).name,'Synthetic workflow');
 assert.equal((await localizeSkill(source,'en',dictionary)).instructions,'Synthetic instructions');
 for(const modified of [{...source,instructions:'Revised source'}, {...item,sourceFingerprint:'0'.repeat(64)}, {...item,name:'Changed title'}, {...source,slug:'new-synthetic-skill'}]) {
  const actual=await localizeSkill(modified,'en',dictionary);
  assert.equal(actual.translated,false);assert.equal(actual.name,modified.name);
 }
});
test('bilingual search traverses the whole public list before filtering and paginating',async()=>{
 const fetcher:typeof fetch=async(input)=>{
  const page=Number(new URL(String(input)).searchParams.get('page'));
  const items=page===1?Array.from({length:50},(_,index)=>({...item,slug:`synthetic-other-${index}`})):[item];
  return envelope({skills:{items,total:51,page,limit:50,hasNextPage:page===1}});
 };
 const result=await skillListing('https://example.invalid','it',1,'workflow',fetcher,dictionary);
 assert.equal(result.total,1);assert.equal(result.publicTotal,51);assert.equal(result.items[0].name,'Flusso sintetico');
});
test('a local translation never makes an unpublished skill visible',async()=>{
 const result=await skillListing('https://example.invalid','en',1,'workflow',async()=>envelope({skills:{items:[],total:0,page:1,limit:50,hasNextPage:false}}),dictionary);
 assert.equal(result.total,0);
 await assert.rejects(getSkill('https://example.invalid',source.slug,async()=>new Response('',{status:404})),error=>error instanceof PublicApiError && error.status===404);
});
test('malformed pages and failed traversal cannot turn into a valid empty catalogue',async()=>{
 for(const data of [{skills:{}},{skills:{items:[],total:1,page:1,limit:50,hasNextPage:false}}])
  await assert.rejects(listSkills('https://example.invalid',new URLSearchParams(),async()=>envelope(data)),PublicApiError);
 let calls=0;
 const fetcher:typeof fetch=async()=>envelope({skills:{items:[item],total:51,page:++calls,limit:50,hasNextPage:calls===1}});
 await assert.rejects(async()=>{for await(const _page of skillPages('https://example.invalid',fetcher)){}},PublicApiError);
});

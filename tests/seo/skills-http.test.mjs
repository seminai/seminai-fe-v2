import {test,after} from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.SEO_CATALOG_BASE??'http://127.0.0.1:4322';
const control=mode=>fetch(`http://127.0.0.1:9876/__control?mode=${mode}`);
after(()=>control('published'));

test('skills are separate from rules and paginate beyond 50 without JavaScript',async()=>{
 await control('published');
 for(const path of ['/skills/','/en/skills/']) {
  const response=await fetch(base+path),html=await response.text();
  assert.equal(response.status,200);assert.match(html,new RegExp(`<html lang="${path.startsWith('/en/')?'en':'it'}"`));
  assert.equal((html.match(/class="rule-card skill-card"/g)??[]).length,20);
  assert.match(html,/53/);assert.match(html,/page=2/);assert.match(html,/\/regole\/|\/en\/rules\//);
  assert.doesNotMatch(html,/PRIVATE RULE MUST NEVER APPEAR|PRIVATE CREATOR MUST NEVER APPEAR/);
  assert.match(response.headers.get('cache-control'),/s-maxage=60/);
 }
 const response=await fetch(base+'/en/skills/?page=3'),html=await response.text();
 assert.equal((html.match(/class="rule-card skill-card"/g)??[]).length,13);
 assert.match(html,/https:\/\/seminai.tech\/en\/skills\/\?page=3/);
 assert.equal((await fetch(base+'/en/skills/?page=4')).status,404);
 assert.equal((await fetch(base+'/skills/?page=-1')).status,404);
});
test('unreviewed or revised source stays visible in original text and noindex',async()=>{
 await control('updated');
 const response=await fetch(base+'/en/skills/synthetic-skill-1/'),html=await response.text();
 assert.equal(response.status,200);assert.match(html,/Revised synthetic instructions/);
 assert.match(html,/Translation pending review/);assert.match(html,/noindex, follow/);
 assert.equal(response.headers.get('x-robots-tag'),'noindex');
 assert.doesNotMatch(html,/hreflang="en" href=/);
 const sitemap=await(await fetch(base+'/sitemap-skills.xml')).text();
 assert.doesNotMatch(sitemap,/synthetic-skill-1/);
});
test('removal produces a real 404; errors never publish an empty successful catalogue',async()=>{
 await control('removed');
 const removed=await fetch(base+'/skills/synthetic-skill-1/');
 assert.equal(removed.status,404);assert.equal(removed.headers.get('cache-control'),'no-store');
 for(const mode of ['outage','malformed']) {
  await control(mode);
  for(const path of ['/skills/','/sitemap-skills.xml']) {
   const response=await fetch(base+path);
   assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'60');
  }
 }
});
test('HTML and explicit Markdown use the same current content and HTML canonical',async()=>{
 await control('published');
 const response=await fetch(base+'/en/skills/synthetic-skill-1.md');
 const markdown=await response.text();
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/markdown/);
 assert.match(response.headers.get('link'),/https:\/\/seminai.tech\/en\/skills\/synthetic-skill-1\//);
 assert.match(markdown,/Istruzioni sintetiche|Obiettivo: analizzare dati sintetici/);
  const negotiated=await fetch(base+'/en/skills/synthetic-skill-1/',{headers:{Accept:'text/markdown'}});
  assert.equal(negotiated.headers.get('content-type'),'text/markdown; charset=utf-8');
  assert.equal(await negotiated.text(),markdown);
 assert.doesNotMatch(markdown,/PRIVATE RULE MUST NEVER APPEAR|PRIVATE CREATOR MUST NEVER APPEAR/);
 const filtered=await fetch(base+'/skills/?search=sintetica');
 assert.equal(filtered.headers.get('x-robots-tag'),'noindex');
});
test('hostile publisher text is escaped and a true empty catalogue stays noindex',async()=>{
 await control('hostile');
 const html=await(await fetch(base+'/skills/synthetic-skill-1/')).text();
 assert.doesNotMatch(html,/<script>alert\("synthetic"\)<\/script>|<img src=x onerror=/);
 assert.match(html,/&lt;img/);assert.match(html,/\\u003cimg/);
 await control('empty');
 const response=await fetch(base+'/skills/');
 assert.equal(response.status,200);assert.match(await response.text(),/noindex, follow/);
});

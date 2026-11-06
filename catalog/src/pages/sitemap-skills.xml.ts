import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {skillPages} from '../lib/skills-api';
import {localizeSkill} from '../lib/skill-localization';

/** Only live public records with current, complete bilingual copy can enter this sitemap. */
export const GET: APIRoute=async()=>{
  try {
    const entries:string[]=[];
    let count=0;
    for await(const skills of skillPages(env.HUB_API_BASE_URL)) {
      count+=skills.length;
      for(const skill of skills) {
        if(!(await localizeSkill(skill,'it')).translated) continue;
        for(const prefix of ['/skills/','/en/skills/']) entries.push(`<url><loc>https://seminai.tech${prefix}${skill.slug}/</loc></url>`);
      }
    }
    if(count>0) for(const prefix of ['/skills/','/en/skills/']) for(let page=1;page<=Math.ceil(count/20);page++) entries.push(`<url><loc>https://seminai.tech${prefix}${page>1?`?page=${page}`:''}</loc></url>`);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=60, must-revalidate'}});
  } catch {
    return new Response('Sitemap temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60','X-Robots-Tag':'noindex'}});
  }
};

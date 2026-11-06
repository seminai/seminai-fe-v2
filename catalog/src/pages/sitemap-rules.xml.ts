import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {rulePages} from '../lib/api';
const escapeXml=(value:string)=>value.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]!));
export const GET: APIRoute=async()=>{
 try {
  // Complete traversal before responding: an upstream failure must not produce a partial sitemap.
  const entries: string[]=[];
  for await(const rules of rulePages(env.HUB_API_BASE_URL)) for(const rule of rules) for(const prefix of ['/regole/','/en/rules/']) entries.push(`<url><loc>https://seminai.tech${prefix}${escapeXml(rule.slug)}/</loc></url>`);
  for(const prefix of ['/regole/','/en/rules/']) entries.push(`<url><loc>https://seminai.tech${prefix}</loc></url>`);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=60, must-revalidate'}});
 } catch {
  return new Response('Sitemap temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}});
 }
};

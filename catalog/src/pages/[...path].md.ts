import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {resolveSkillView} from '../lib/skill-page';
import {skillMarkdown} from '../lib/skill-markdown';

/** Explicit endpoint prevents Astro's directory trailing-slash policy from rewriting .md URLs. */
export const GET:APIRoute=async({url,params,request})=>{
  const path=`/${params.path}/`;
  if(!/^\/(?:en\/)?skills\//.test(path)) return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
  const view=await resolveSkillView(url,path,env.HUB_API_BASE_URL);
  const headers=new Headers({
    'Content-Type':'text/markdown; charset=utf-8',
    'Cache-Control':view.status===200?'public, max-age=0, s-maxage=60, must-revalidate':'no-store',
    'Link':`<${view.canonical}>; rel="canonical"`,
    'Vary':'Accept',
  });
  if(view.noindex) headers.set('X-Robots-Tag','noindex');
  if(view.status===503) headers.set('Retry-After','60');
  return new Response(request.method==='HEAD'?null:skillMarkdown(view),{status:view.status,headers});
};
export const HEAD=GET;

import {absolute, demoPath, skillsPath} from './paths.ts';
import type {SkillView} from './skill-page.ts';

const text = (value: string) => value.replace(/([\\`*_{}[\]()#+!<>])/g, '\\$1');

export function skillMarkdown(view: SkillView): string {
  const en = view.lang === 'en';
  if (view.status !== 200) return view.status === 404 ? 'Not found' : 'Service temporarily unavailable';
  const lines = [`# ${text(view.title)}`, '', text(view.description), ''];
  if (view.skill) {
    if (!view.skill.translated) lines.push(en ? 'Original publisher content. Translation pending review; source language is not declared.' : 'Contenuto originale del pubblicatore. Traduzione in attesa di revisione; lingua sorgente non dichiarata.', '');
    lines.push(`## ${en ? 'Workflow instructions' : 'Istruzioni del workflow'}`, '', text(view.skill.instructions ?? ''), '');
  } else if (view.listing) {
    lines.push(`${view.listing.total} ${en ? 'public skills' : 'skill pubbliche'}`, '');
    for (const skill of view.listing.items) lines.push(`- [${text(skill.name)}](${absolute(`${skillsPath(view.lang)}${skill.slug}/`)}): ${text(skill.description ?? '')}`);
    const query = (page: number) => new URLSearchParams({...(view.search ? {search: view.search} : {}), page: String(page)});
    if (view.listing.page > 1) lines.push('', `[${en ? 'Previous' : 'Precedente'}](${absolute(view.path)}?${query(view.listing.page - 1)})`);
    if (view.listing.hasNextPage) lines.push('', `[${en ? 'Next' : 'Successiva'}](${absolute(view.path)}?${query(view.listing.page + 1)})`);
  }
  lines.push('', en ? 'These pages document workflows; browsing does not execute a skill or certify an outcome.' : 'Queste pagine descrivono workflow: la consultazione non esegue una skill e non certifica un risultato.', '', `[${en ? 'Request a demo' : 'Richiedi una demo'}](${absolute(demoPath(view.lang))})`);
  return lines.join('\n');
}

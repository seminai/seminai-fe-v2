import {PublicApiError} from './api.ts';
import {getSkill} from './skills-api.ts';
import {localizeSkill} from './skill-localization.ts';
import {skillListing} from './skill-listing.ts';
import {absolute, skillsPath, type Language} from './paths.ts';
import type {LocalizedSkill, LocalizedSkillPage} from './skill-types.ts';

export interface SkillView {
  lang: Language;
  path: string;
  canonical: string;
  title: string;
  description: string;
  status: number;
  noindex: boolean;
  search: string;
  skill?: LocalizedSkill;
  listing?: LocalizedSkillPage;
}

/** A single presentation model feeds HTML, Markdown and structured data. */
export async function resolveSkillView(url: URL, path: string, base: string): Promise<SkillView> {
  const lang = path.startsWith('/en/') ? 'en' : 'it';
  const en = lang === 'en';
  const search = url.searchParams.get('search')?.trim() ?? '';
  const pageText = url.searchParams.get('page') ?? '1';
  const page = Number(pageText);
  let status = 200;
  let skill: LocalizedSkill | undefined;
  let listing: LocalizedSkillPage | undefined;
  try {
    const suffix = path.slice(skillsPath(lang).length).replace(/\/$/, '');
    if (suffix) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suffix)) throw new PublicApiError(404);
      skill = await localizeSkill(await getSkill(base, suffix), lang);
    } else {
      if (!/^\d+$/.test(pageText) || !Number.isSafeInteger(page) || page < 1) throw new PublicApiError(404);
      listing = await skillListing(base, lang, page, search);
    }
  } catch (error) {
    status = error instanceof PublicApiError ? error.status : 503;
    if (status === 503) console.error(JSON.stringify({event: 'public_skills_upstream_error', status}));
  }
  const canonical = absolute(path) + (listing && listing.page > 1 ? `?page=${listing.page}` : '');
  const heading = en ? 'Public AI skills catalogue' : 'Catalogo delle skill AI pubbliche';
  const title = status === 404 ? (en ? 'Skill not found' : 'Skill non trovata')
    : status === 503 ? (en ? 'Skills temporarily unavailable' : 'Skill temporaneamente non disponibili')
    : skill?.name ?? heading + (listing && listing.page > 1 ? ` · ${en ? 'Page' : 'Pagina'} ${listing.page}` : '');
  const description = skill?.description ?? (en
    ? 'Explore public AI workflows for agriculture, sales and production: goals, required inputs, steps, expected outputs and operating limits.'
    : 'Esplora workflow AI pubblici per agricoltura, vendite e produzione: obiettivi, dati richiesti, passaggi, risultati attesi e limiti operativi.');
  return {lang, path, canonical, title, description, status, search, skill, listing,
    noindex: status !== 200 || url.searchParams.has('search') || Boolean(skill && !skill.translated) || listing?.total === 0};
}

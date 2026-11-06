import {PublicApiError} from './api.ts';
import {listSkills, skillPages} from './skills-api.ts';
import {localizeSkill, skillTranslations} from './skill-localization.ts';
import type {Language} from './paths.ts';
import type {LocalizedSkill, LocalizedSkillPage, SkillTranslation} from './skill-types.ts';

const PAGE_SIZE = 20;
const searchable = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();

export async function skillListing(base: string, lang: Language, page: number, search: string,
  fetcher: typeof fetch = fetch, dictionary: Readonly<Record<string, SkillTranslation>> = skillTranslations): Promise<LocalizedSkillPage> {
  if (!search) {
    const result = await listSkills(base, new URLSearchParams({page: String(page), limit: String(PAGE_SIZE)}), fetcher);
    if (result.page !== page || (page > 1 && result.items.length === 0)) throw new PublicApiError(404);
    return {...result, publicTotal: result.total, items: await Promise.all(result.items.map(skill => localizeSkill(skill, lang, dictionary)))};
  }
  const items: LocalizedSkill[] = [];
  let publicTotal = 0;
  for await (const skills of skillPages(base, fetcher)) {
    publicTotal += skills.length;
    for (const skill of skills) {
      const copies = await Promise.all([localizeSkill(skill, 'it', dictionary), localizeSkill(skill, 'en', dictionary)]);
      if (copies.some(copy => searchable(`${copy.name} ${copy.description ?? ''}`).includes(searchable(search)))) items.push(copies[lang === 'en' ? 1 : 0]);
    }
  }
  if (page > 1 && (page - 1) * PAGE_SIZE >= items.length) throw new PublicApiError(404);
  return {items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: items.length, publicTotal,
    page, limit: PAGE_SIZE, hasNextPage: page * PAGE_SIZE < items.length};
}

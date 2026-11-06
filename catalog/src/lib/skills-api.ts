import {PublicApiError, readPublic} from './api.ts';
import type {PublicSkill, PublicSkillDetail, SkillPage} from './skill-types.ts';

function isSkill(value: unknown): value is PublicSkill {
  if (!value || typeof value !== 'object') return false;
  const skill = value as Partial<PublicSkill>;
  return typeof skill.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.slug)
    && typeof skill.name === 'string' && skill.name.length > 0
    && (skill.description === null || typeof skill.description === 'string')
    && (skill.sourceFingerprint === undefined || (typeof skill.sourceFingerprint === 'string' && /^[a-f0-9]{64}$/.test(skill.sourceFingerprint)));
}

/** Consume only anonymous public fields; publisher identities and rule associations are not copied. */
export async function listSkills(base: string, query: URLSearchParams, fetcher: typeof fetch = fetch): Promise<SkillPage> {
  const data = await readPublic<{skills: SkillPage}>(base, `/public/skills?${query}`, fetcher).catch(error => {
    if (error instanceof PublicApiError && error.status === 404) throw new PublicApiError(503);
    throw error;
  });
  const value = data.skills;
  if (!value || !Array.isArray(value.items) || !value.items.every(isSkill)
    || !Number.isSafeInteger(value.total) || value.total < 0
    || !Number.isSafeInteger(value.page) || value.page < 1
    || !Number.isSafeInteger(value.limit) || value.limit < 1 || value.limit > 50
    || typeof value.hasNextPage !== 'boolean' || value.items.length !== Math.min(value.limit, Math.max(value.total - (value.page - 1) * value.limit, 0))
    || value.hasNextPage !== (value.page * value.limit < value.total)) throw new PublicApiError(503);
  return {...value, items: value.items.map(({slug, name, description, sourceFingerprint}) => ({slug, name, description, sourceFingerprint}))};
}

export async function getSkill(base: string, slug: string, fetcher: typeof fetch = fetch): Promise<PublicSkillDetail> {
  const data = await readPublic<{skill: PublicSkillDetail}>(base, `/public/skills/${encodeURIComponent(slug)}`, fetcher);
  const skill = data.skill;
  if (!isSkill(skill) || typeof skill.instructions !== 'string' || skill.slug !== slug) throw new PublicApiError(503);
  return {slug: skill.slug, name: skill.name, description: skill.description, instructions: skill.instructions};
}

/** Traverse every public page, failing closed on inconsistent pagination instead of truncating the catalogue. */
export async function* skillPages(base: string, fetcher: typeof fetch = fetch): AsyncGenerator<PublicSkill[]> {
  const seen = new Set<string>();
  let expectedTotal: number | undefined;
  for (let page = 1; ; page++) {
    const result = await listSkills(base, new URLSearchParams({page: String(page), limit: '50'}), fetcher);
    if (result.page !== page || (expectedTotal !== undefined && result.total !== expectedTotal)) throw new PublicApiError(503);
    expectedTotal = result.total;
    for (const skill of result.items) {
      if (seen.has(skill.slug)) throw new PublicApiError(503);
      seen.add(skill.slug);
    }
    if ((result.hasNextPage && result.items.length === 0) || (!result.hasNextPage && seen.size !== result.total)) throw new PublicApiError(503);
    yield result.items;
    if (!result.hasNextPage) return;
  }
}

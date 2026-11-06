import type {Language} from './paths.ts';
import type {PublicSkill, PublicSkillDetail, LocalizedSkill, SkillTranslation} from './skill-types.ts';
import translations from '../content/skills.json' with {type: 'json'};

export const skillTranslations: Readonly<Record<string, SkillTranslation>> = translations;

/** Hash source text, never updatedAt: historical view counts changed that timestamp. */
export async function skillFingerprint(skill: PublicSkill, detail = false): Promise<string> {
  const fields = [skill.name, skill.description];
  if (detail) fields.push((skill as PublicSkillDetail).instructions);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(fields)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function localizeSkill(skill: PublicSkill | PublicSkillDetail, lang: Language,
  dictionary: Readonly<Record<string, SkillTranslation>> = skillTranslations): Promise<LocalizedSkill> {
  const detail = 'instructions' in skill;
  const entry = Object.hasOwn(dictionary, skill.slug) ? dictionary[skill.slug] : undefined;
  const translated = Boolean(entry && await skillFingerprint(skill, detail) === (detail ? entry.detailFingerprint : entry.listFingerprint)
    && (detail || skill.sourceFingerprint === entry.detailFingerprint));
  if (!translated || !entry) return {...skill, translated: false};
  const copy = entry[lang];
  return {slug: skill.slug, name: copy.name, description: copy.description,
    ...(detail ? {instructions: copy.instructions} : {}), translated: true};
}

export interface PublicSkill {
  slug: string;
  name: string;
  description: string | null;
  sourceFingerprint?: string;
}

export interface PublicSkillDetail extends PublicSkill {
  instructions: string;
}

export interface SkillPage {
  items: PublicSkill[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

export interface SkillCopy {
  name: string;
  description: string | null;
  instructions: string;
}

export interface SkillTranslation {
  listFingerprint: string;
  detailFingerprint: string;
  it: SkillCopy;
  en: SkillCopy;
}

export interface LocalizedSkill extends PublicSkill {
  instructions?: string;
  translated: boolean;
}

export interface LocalizedSkillPage extends Omit<SkillPage, 'items'> {
  items: LocalizedSkill[];
  publicTotal: number;
}

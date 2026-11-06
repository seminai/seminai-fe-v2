export type Language = 'it' | 'en';
export const rulesPath = (lang: Language) => lang === 'en' ? '/en/rules/' : '/regole/';
export const skillsPath = (lang: Language) => lang === 'en' ? '/en/skills/' : '/skills/';
export const categoryPath = (lang: Language, category: string) => `${rulesPath(lang)}${lang === 'en' ? 'category' : 'categoria'}/${category.toLowerCase()}/`;
export const demoPath = (lang: Language) => lang === 'en' ? '/en/request-a-demo/' : '/richiedi-demo/';
export const absolute = (path: string) => `https://seminai.tech${path}`;
export function safeSource(value: string | null | undefined): string | undefined {
 try { const url = new URL(value ?? ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
export const categoryLabels: Record<string, [string, string]> = { DISCIPLINARE: ['Disciplinari', 'Production rules'], STANDARD: ['Standard di certificazione', 'Certification standards'], BEST_PRACTICE: ['Buone pratiche', 'Best practices'], METHODOLOGY: ['Metodologie', 'Methods'], CUSTOM: ['Regole personalizzate', 'Custom rules'] };
export const label = (category: string, lang: Language) => categoryLabels[category]?.[lang === 'en' ? 1 : 0] ?? category;

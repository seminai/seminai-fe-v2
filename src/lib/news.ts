/**
 * News (blog) content: MDX articles in src/content/news/<lang>/<slug>.mdx.
 *
 * Front matter is loaded eagerly (lists, homepage, sitemap); article bodies are
 * separate chunks loaded on demand. The build-time prerender waits for them, so
 * every article page ships fully rendered HTML.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { MDXProps } from "mdx/types";
import { z } from "zod";

export type NewsLang = "it" | "en";

const isoDate = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
);

const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: isoDate,
  updated: isoDate.optional(),
  /** Shows the "Aggiornato al" box under the title (regulatory articles). */
  showUpdated: z.boolean().default(false),
  author: z.string().default("Redazione Seminai"),
  lang: z.enum(["it", "en"]),
  /** Same value on the IT and EN version of an article: links them for hreflang. */
  translationKey: z.string().optional(),
  category: z.string().optional(),
  keyword: z.string().optional(),
  tags: z.array(z.string()).default([]),
  /** Cover photo (cards and top of the article), files in public/news/. */
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  /** Card teaser; defaults to the first paragraph (see the news-frontmatter plugin). */
  excerpt: z.string().default(""),
  series: z.string().optional(),
  seriesOrder: z.number().int().optional(),
  relatedKeys: z.array(z.string()).default([]),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  sources: z
    .array(z.object({ title: z.string(), url: z.string().url(), accessed: isoDate }))
    .default([]),
});

export type NewsFrontmatter = z.infer<typeof frontmatterSchema>;

export interface NewsPost extends NewsFrontmatter {
  slug: string;
  /** Public path, with trailing slash (e.g. /news/<slug>/). */
  path: string;
  file: string;
}

type ArticleModule = { default: ComponentType<MDXProps> };

// `?meta` is served by the news-frontmatter plugin in vite.config.ts: front matter only.
const frontmatters = import.meta.glob<Record<string, unknown>>("/src/content/news/*/*.mdx", {
  eager: true,
  query: "?meta",
  import: "default",
});
const loaders = import.meta.glob<ArticleModule>("/src/content/news/*/*.mdx");

export function newsIndexPath(lang: NewsLang): string {
  return lang === "en" ? "/en/news/" : "/news/";
}

export function newsPostPath(lang: NewsLang, slug: string): string {
  return `${newsIndexPath(lang)}${slug}/`;
}

function toPost(file: string, raw: Record<string, unknown>): NewsPost {
  const match = file.match(/\/news\/(it|en)\/([^/]+)\.mdx$/);
  if (!match) throw new Error(`news: unexpected file path ${file}`);
  const [, dirLang, slug] = match;
  const parsed = frontmatterSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`news: invalid front matter in ${file}: ${parsed.error.message}`);
  }
  if (parsed.data.lang !== dirLang) {
    throw new Error(`news: ${file} has lang "${parsed.data.lang}" but sits in /${dirLang}/`);
  }
  return { ...parsed.data, slug, path: newsPostPath(parsed.data.lang, slug), file };
}

/** All articles, newest first. */
export const NEWS_POSTS: NewsPost[] = Object.entries(frontmatters)
  .map(([file, raw]) => toPost(file.replace(/\?.*$/, ""), raw))
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

export function postsByLang(lang: NewsLang): NewsPost[] {
  return NEWS_POSTS.filter((post) => post.lang === lang);
}

export function findPost(lang: NewsLang, slug: string): NewsPost | undefined {
  return NEWS_POSTS.find((post) => post.lang === lang && post.slug === slug);
}

/** Short label above the card title: the category, else the first tag. */
export function newsLabel(post: NewsPost): string {
  return (post.category ?? post.tags[0] ?? "Seminai").replace(/-/g, " ");
}

/** The other-language version of a post, when it exists. */
export function translationOf(post: NewsPost): NewsPost | undefined {
  if (!post.translationKey) return undefined;
  return NEWS_POSTS.find(
    (other) => other.translationKey === post.translationKey && other.lang !== post.lang,
  );
}

export function relatedPosts(post: NewsPost): NewsPost[] {
  return post.relatedKeys.flatMap((key) => {
    const match = NEWS_POSTS.find(
      (other) => other.translationKey === key && other.lang === post.lang,
    );
    return match ? [match] : [];
  });
}

const articleCache = new Map<string, LazyExoticComponent<ComponentType<MDXProps>>>();

/** Lazy article body. Cached so re-renders keep the same component identity. */
export function articleComponent(post: NewsPost): LazyExoticComponent<ComponentType<MDXProps>> {
  let component = articleCache.get(post.file);
  if (!component) {
    const load = loaders[post.file];
    if (!load) throw new Error(`news: no loader for ${post.file}`);
    component = lazy(load);
    articleCache.set(post.file, component);
  }
  return component;
}

export function formatNewsDate(date: string, lang: NewsLang): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

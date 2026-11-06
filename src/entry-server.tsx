/**
 * Server entry used ONLY at build time by scripts/prerender.mjs (vite build --ssr).
 *
 * It deliberately mounts a MINIMAL public-only router instead of the full <App/>: the
 * protected routes import leaflet/socket.io which touch `window` at module load and would
 * crash Node. The runtime client router (src/App.tsx) is unchanged. Markup rendered here
 * for each public URL matches what the client renders for the same URL, so hydration is clean.
 *
 * `prerenderToNodeStream` (not renderToString) waits for lazy chunks, so news article
 * bodies, loaded on demand in the browser, are fully present in the static HTML.
 */
import { prerenderToNodeStream } from "react-dom/static";
import { Suspense } from "react";
import { StaticRouter } from "react-router";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import i18n from "./i18n/public";
import {
  NEWS_POSTS,
  newsIndexPath,
  translationOf,
  type NewsLang,
} from "./lib/news";

import PublicApp from "./PublicApp";
import { PUBLIC_PAGES } from "./config/publicPages";

export interface RenderResult {
  html: string;
  head: string;
}

export interface PublicRoute {
  url: string;
  /** Output path relative to dist/. */
  out: string;
  lng: NewsLang;
}

export interface SitemapEntry {
  path: string;
  lastmod: string;
  alternates: Array<{ hrefLang: string; path: string }>;
}

function outFor(url: string): string {
  return `${url.replace(/^\//, "")}index.html`;
}

/** News pages to prerender, on top of the fixed public routes listed in prerender.mjs. */
export function newsRoutes(): PublicRoute[] {
  const langs: NewsLang[] = ["it", "en"];
  return [
    ...langs.map((lng) => ({
      url: newsIndexPath(lng),
      out: outFor(newsIndexPath(lng)),
      lng,
    })),
    ...NEWS_POSTS.map((post) => ({
      url: post.path,
      out: outFor(post.path),
      lng: post.lang,
    })),
  ];
}

export function newsSitemap(): SitemapEntry[] {
  const latest = (lang: NewsLang) =>
    NEWS_POSTS.filter((post) => post.lang === lang)
      .map((post) => post.updated ?? post.date)
      .sort()
      .at(-1) ?? "";
  const indexAlternates = [
    { hrefLang: "it", path: newsIndexPath("it") },
    { hrefLang: "en", path: newsIndexPath("en") },
    { hrefLang: "x-default", path: newsIndexPath("it") },
  ];
  return [
    {
      path: newsIndexPath("it"),
      lastmod: latest("it"),
      alternates: indexAlternates,
    },
    {
      path: newsIndexPath("en"),
      lastmod: latest("en"),
      alternates: indexAlternates,
    },
    ...NEWS_POSTS.map((post) => {
      const translation = translationOf(post);
      const italian = post.lang === "it" ? post : translation;
      return {
        path: post.path,
        lastmod: post.updated ?? post.date,
        alternates: translation
          ? [
              { hrefLang: post.lang, path: post.path },
              { hrefLang: translation.lang, path: translation.path },
              { hrefLang: "x-default", path: (italian ?? post).path },
            ]
          : [],
      };
    }),
  ];
}

/** Decodes as a stream so accented characters split across chunks stay intact. */
async function streamToString(
  stream: AsyncIterable<string | Uint8Array>,
): Promise<string> {
  const decoder = new TextDecoder();
  let html = "";
  for await (const chunk of stream) {
    html +=
      typeof chunk === "string"
        ? chunk
        : decoder.decode(chunk, { stream: true });
  }
  return html + decoder.decode();
}

export async function render(url: string, lng = "it"): Promise<RenderResult> {
  await i18n.changeLanguage(lng);

  const helmetContext: { helmet?: HelmetServerState } = {};

  const { prelude } = await prerenderToNodeStream(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <Suspense fallback={null}>
          <PublicApp />
        </Suspense>
      </StaticRouter>
    </HelmetProvider>,
  );
  const html = await streamToString(prelude);

  const { helmet } = helmetContext;
  const head = helmet
    ? [
        helmet.title.toString(),
        helmet.meta.toString(),
        helmet.link.toString(),
        helmet.script.toString(),
      ]
        .filter(Boolean)
        .join("")
    : "";

  return { html, head };
}

export function staticRoutes(): PublicRoute[] {
  return [
    { url: "/", out: "index.html", lng: "it" },
    { url: "/en/", out: "en/index.html", lng: "en" },
    ...["privacy-policy", "cookie-policy", "terms-of-service"].map((slug) => ({
      url: `/${slug}/`,
      out: `${slug}/index.html`,
      lng: "it" as const,
    })),
    { url: "/richiedi-demo/", out: "richiedi-demo/index.html", lng: "it" },
    {
      url: "/en/request-a-demo/",
      out: "en/request-a-demo/index.html",
      lng: "en",
    },
    ...PUBLIC_PAGES.map((page) => ({
      url: page.path,
      out: outFor(page.path),
      lng: page.lang,
    })),
  ];
}

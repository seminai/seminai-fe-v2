import type { ReactNode } from "react";
import type { NewsLang } from "@/lib/news";
import { NEWS_COPY } from "./copy";

/**
 * Components available inside news MDX without an import, e.g.
 * <ResearchNote source="..." href="...">...</ResearchNote>.
 */
export function buildMdxComponents(lang: NewsLang) {
  const copy = NEWS_COPY[lang];

  function ResearchNote({
    source,
    href,
    label = copy.researchLabel,
    children,
  }: {
    source: string;
    href: string;
    label?: string;
    children: ReactNode;
  }) {
    return (
      <aside className="news-note">
        <p className="news-note-kicker">{label}</p>
        {children}
        <p className="news-note-source">
          <a href={href} target="_blank" rel="noopener noreferrer">
            {source}
          </a>
        </p>
      </aside>
    );
  }

  /** "In pratica" box: 3 to 5 operative points for the farm. */
  function InPratica({ title = copy.inPractice, children }: { title?: string; children: ReactNode }) {
    return (
      <aside className="news-box news-practice">
        <p className="news-box-title">{title}</p>
        {children}
      </aside>
    );
  }

  /**
   * Infographic: the image when `src` is set, otherwise a placeholder with the alt text.
   * The Canva brief stays as an MDX comment next to the component in the article file.
   */
  function Infografica({ src, alt, caption }: { src?: string; alt: string; caption: string }) {
    return (
      <figure className="news-figure">
        {src ? (
          <img src={src} alt={alt} loading="lazy" />
        ) : (
          <div className="news-figure-placeholder" role="img" aria-label={alt}>
            <span>{copy.infographic}</span>
            <span>{alt}</span>
          </div>
        )}
        <figcaption>{caption}</figcaption>
      </figure>
    );
  }

  return { ResearchNote, InPratica, Infografica };
}
